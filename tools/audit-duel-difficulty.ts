import {writeFileSync,mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {ComputerPeer,additionSlots,strategicDuelCells} from '../src/multiplayer/computer-peer';
import {COMPUTER_OPPONENTS} from '../src/multiplayer/computer-opponents';
import {DuelAction,DuelState,Side,applyDuel,duelLevel,duelTowerLevel,duelHeroLearningLevel,canUseDuelTower,validDuelCell,duelScore,duelKillScore,DUEL_PREPARATION_SECONDS,DUEL_SECONDS,DUEL_TOTAL_SECONDS,DUEL_START_MONEY} from '../src/multiplayer/duel';
import {DUEL_MAPS,DEFAULT_DUEL_MAP_ID,duelMap,duelPathPosition} from '../src/multiplayer/duel-maps';
import {heroesAtLevel} from '../src/multiplayer/heroes';
import {TOWERS,towerPrice,towerPriceBand} from '../src/towers';
import {numberText,minimumHits} from '../src/math';
import {simulateComputerDuel} from './computer-duel-simulation';

/** Assumed legal decision policies: these labels are NOT measured student cohorts. */
export type Policy={id:string;prepThinkMs:number;prepChooseMs:number;buildMs:number;fusionMs:number;mistakeRate:number;maxTowers:number;heroLevel:number;placement:'row'|'strategic'|'coverage';noFusion?:boolean;cheapOnly?:boolean;upgradeDefense?:boolean};
const POLICIES:Policy[]=[
 {id:'weak',prepThinkMs:7000,prepChooseMs:2000,buildMs:8000,fusionMs:12000,mistakeRate:.25,maxTowers:6,heroLevel:2,placement:'row'},
 {id:'ordinary',prepThinkMs:4000,prepChooseMs:1500,buildMs:4000,fusionMs:7000,mistakeRate:.15,maxTowers:10,heroLevel:4,placement:'strategic'},
 {id:'fast',prepThinkMs:2000,prepChooseMs:800,buildMs:1500,fusionMs:3000,mistakeRate:.05,maxTowers:14,heroLevel:10,placement:'strategic'},
];
export const DUEL_AUDIT_POLICIES=POLICIES;
const SEEDS=[17,91,203,912,1027];
function rng(seed:number){let n=seed>>>0;return ()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};}
function stockCount(stock:Record<string,number>){return Object.values(stock).reduce((a,b)=>a+b,0);}
function mean(ns:number[]){return Number((ns.reduce((a,b)=>a+b,0)/Math.max(1,ns.length)).toFixed(2));}
/** A second legal placement policy values every covered path segment on bent maps. */
function coverageCells(s:DuelState,unit:number,radius:number){
 const half=duelMap(s.mapId).length/2,steps=Math.ceil(half/.4),preferred=unit>=1000?.2:unit<=50?.84:.52;
 const samples=Array.from({length:steps+1},(_,i)=>({progress:i/steps,...duelPathPosition(s.mapId,half*(1-i/steps))}));
 const cells=[2,4,1,5,0,6,3].flatMap(y=>Array.from({length:10},(_,i)=>({x:i+1,y}))).filter(c=>validDuelCell(s,0,c.x,c.y));
 return cells.map((c,order)=>{const covered=samples.reduce((total,p)=>total+(Math.hypot(c.x-p.x,c.y-p.y)<=radius?Math.exp(-Math.abs(p.progress-preferred)*4):0),0),crowding=s.players[0].towers.reduce((total,t)=>total+Math.max(0,2-Math.hypot(c.x-t.x,c.y-t.y)),0);return {...c,order,score:covered-crowding*.2};}).filter(c=>c.score>0).sort((a,b)=>b.score-a.score||a.order-b.order);
}

export function simulateDuelDifficulty(level:number,seed:number,policy:Policy,mapId=DEFAULT_DUEL_MAP_ID,accountLevel=level,rewardHero?:string){
 let now=100000,nonce=0;
 const initial=now,random=rng(seed^123456789),peer=new ComputerPeer({uid:'audit',name:'감사 정책',accountLevel,rewardHeroes:rewardHero?[rewardHero]:[],rewardHero},level,{seed,mapId,clock:()=>now,autoTick:false});
 const s=peer.state,p=s.players[0],cpu=s.players[1]!;
 const preferences=policy.cheapOnly?['basic','double','needle','pebble']:['basic','double','needle','pebble','frost','catapult','lightning','sniper','ice','crystal','siege','rune'];
 let nextPrep=now+1800,answerAt=Infinity,nextBuild=Infinity,nextFuse=now+policy.fusionMs,nextSummon=Infinity,battle=false,zeroCombatCoins=false,legal=true,noBattleFusion=true;
 let prepared=[0,0],prepRemaining=[0,0],cashBuilds=[0,0],stockBuilds=[0,0],earned=[0,0],firstKill:number[]=[-1,-1],mistakes=[0,0],hatches:number[][]=[[],[]],maxMoney=[0,0];
 let preparedGrowth=[0,0],spentGrowth=[0,0],battleSolved:number[]=[];
 const seenHeroIds=new Set<number>(),samples:unknown[]=[],preparedTypes:Record<string,number>[]=[];
 const act=(action:DuelAction)=>{const oldMoney=p.money,oldGrowth=p.egg,r=applyDuel(s,0,action,now,'audit-'+(++nonce));s.revision++;if(r.ok&&action.type==='build'){if(p.money<oldMoney)cashBuilds[0]++;else stockBuilds[0]++;}if(r.ok&&action.type==='hatch')spentGrowth[0]+=oldGrowth-p.egg;return r;};
 act({type:'ready'});
 while((s.status==='preparing'||s.status==='playing')&&now-initial<=(DUEL_TOTAL_SECONDS+1)*1000){
  const wasPlaying=s.status==='playing',oldMoney=s.players.map(a=>a!.money),oldCpuGrowth=cpu.egg,oldCpuTowers=[...cpu.towers],oldKills=s.players.map(a=>a!.kills??0);
  now+=100;peer.step(now);
  if(wasPlaying){
   spentGrowth[1]+=oldCpuGrowth-cpu.egg;
   const fresh=cpu.towers.filter(t=>!oldCpuTowers.some(o=>o.id===t.id)),sold=oldCpuTowers.filter(t=>!cpu.towers.some(o=>o.id===t.id));
   stockBuilds[1]+=fresh.filter(t=>t.prepared).length;cashBuilds[1]+=fresh.filter(t=>!t.prepared).length;
   earned[0]+=p.money-oldMoney[0];earned[1]+=cpu.money-oldMoney[1]+fresh.filter(t=>!t.prepared).reduce((n,t)=>n+t.cost,0)-sold.filter(t=>!t.prepared).reduce((n,t)=>n+t.cost,0);
  }
  for(const side of [0,1] as Side[]){const a=s.players[side]!;legal&&=a.money>=0&&a.escrow>=0&&Number.isSafeInteger(a.egg)&&a.egg>=0&&stockCount(a.stock)>=0&&[...Object.values(a.stock),...Object.values(a.heroStock??{})].every(n=>Number.isSafeInteger(n)&&n>=0)&&a.towers.length<=14&&a.towers.filter(t=>t.typeId==='needle').length<=3&&(s.status!=='playing'||a.quote===null);if(s.status==='playing')maxMoney[side]=Math.max(maxMoney[side],a.money);if((a.kills??0)>oldKills[side]&&firstKill[side]<0)firstKill[side]=Number(s.elapsed.toFixed(1));}
  for(const e of s.enemies){if(e.hero&&!seenHeroIds.has(e.id)){seenHeroIds.add(e.id);hatches[e.owner].push(e.level);}}
  if(s.status==='preparing'){
   if(p.quote&&now>=answerAt){
    const q=p.quote,incorrect=random()<policy.mistakeRate;
    const r=act({type:'answer',nonce:q.nonce,answer:numberText(q.before-q.cost+(incorrect?100:0))});
    if(r.ok){nextPrep=now+policy.prepChooseMs;answerAt=Infinity;}else{mistakes[0]++;answerAt=now+policy.prepThinkMs;}
   }else if(!p.quote&&now>=nextPrep&&stockCount(p.stock)<policy.maxTowers){
    const count=(id:string)=>p.stock[id]??0;
    const candidates=TOWERS.filter(t=>preferences.includes(t.id)&&towerPrice(t,p.money,duelTowerLevel(s),p.purchaseVariation)<=p.money&&!(t.id==='needle'&&count(t.id)>=3));
    candidates.sort((a,b)=>count(a.id)-count(b.id)||preferences.indexOf(a.id)-preferences.indexOf(b.id));
    const plan=['basic','double','needle','pebble','catapult','sniper','frost','basic','double','needle'];
    const selected=policy.upgradeDefense&&!policy.cheapOnly?candidates.find(t=>t.id===plan[stockCount(p.stock)])??candidates[0]:candidates[0];
    if(selected&&act({type:'prepare-quote',typeId:selected.id}).ok)answerAt=now+policy.prepThinkMs;
    else nextPrep=now+policy.prepChooseMs;
   }
   if(!policy.noFusion){
    if(now>=nextFuse){
     nextFuse=now+policy.fusionMs;const correct=additionSlots(p.board);
     if(correct){let slots=correct;if(random()<policy.mistakeRate){const badIndex=p.board.findIndex((n,i)=>!correct.slice(0,2).includes(i)&&n!==p.board[correct[0]]+p.board[correct[1]]);if(badIndex>=0)slots=[correct[0],correct[1],badIndex];}if(!act({type:'fuse',round:p.round,slots,operation:'+'}).ok)mistakes[0]++;}
    }
   }
   continue;
  }
  if(!battle&&s.status==='playing'){
   battle=true;zeroCombatCoins=s.players.every(a=>a!.money===0&&a!.escrow===0);prepared=s.players.map(a=>stockCount(a!.stock));
   preparedTypes.push({...p.stock},{...cpu.stock});
   // Balances just before the reset are reconstructed from the last preparation tick.
   prepRemaining=oldMoney;
   preparedGrowth=s.players.map(a=>a!.egg);battleSolved=s.players.map(a=>a!.solved);
   nextBuild=s.startedAt+1800;nextSummon=s.startedAt+policy.fusionMs;
  }
  noBattleFusion&&=s.players.every((a,i)=>a!.solved===battleSolved[i]);
  if(s.status!=='playing')break;
  if(Math.round(s.elapsed*10)%300===0)samples.push({seconds:Number(s.elapsed.toFixed(1)),scores:[duelScore(p),duelScore(cpu)],money:[p.money,cpu.money],flame:[p.flame,cpu.flame],towers:[p.towers.length,cpu.towers.length],solved:[p.solved,cpu.solved],heroLearningStages:[duelHeroLearningLevel(p),duelHeroLearningLevel(cpu)]});
  if(now>=nextBuild&&(p.towers.length<policy.maxTowers||policy.upgradeDefense)){
   nextBuild=now+policy.buildMs;
   const count=(id:string)=>p.towers.filter(t=>t.typeId===id).length;
   const wave=duelLevel(s),priority=[...(wave>=2&&count('needle')<2?['needle']:[]),...(wave>=3&&count('catapult')<2?['catapult']:[]),...(wave>=6&&count('sniper')<2?['sniper']:[]),...(wave>=8&&count('rune')<1?['rune']:[]),...(wave>=3&&count('frost')<2?['frost']:[]),...(wave>=4&&count('lightning')<1?['lightning']:[]),...(wave>=5&&count('crystal')<1?['crystal']:[])];
   let upgrading='';
   if(p.towers.length>=policy.maxTowers){
    const old=p.towers.find(t=>['basic','double','pebble','needle'].includes(t.typeId)&&count(t.typeId)>(t.typeId==='needle'?2:1));
    const upgrade=old&&priority.map(id=>TOWERS.find(t=>t.id===id&&canUseDuelTower(s,0,id)&&p.stock[id]>0)).find(Boolean);
    if(old&&upgrade&&act({type:'sell',towerId:old.id}).ok)upgrading=upgrade.id;
    else upgrading='skip';
   }
   const candidates=TOWERS.filter(t=>preferences.includes(t.id)&&canUseDuelTower(s,0,t.id)&&p.stock[t.id]>0&&!(t.id==='needle'&&count(t.id)>=3));
   candidates.sort((a,b)=>Number(p.stock[b.id]>0)-Number(p.stock[a.id]>0)||count(a.id)-count(b.id)||preferences.indexOf(a.id)-preferences.indexOf(b.id));
   const desired=policy.upgradeDefense?priority.map(id=>candidates.find(t=>t.id===id)).find(Boolean):undefined;
   const type=upgrading==='skip'?undefined:candidates.find(t=>t.id===upgrading)??(candidates.some(t=>p.stock[t.id]>0)?candidates[0]:desired??candidates[0]);
   if(type){const radius=type.effect==='range'?4:3,cells=policy.placement==='strategic'?strategicDuelCells(s,0,type.unit,radius):policy.placement==='coverage'?coverageCells(s,type.unit,radius):[2,4,1,5,0,6].flatMap(y=>[9,6,3,7,4,1,8,5,10,2].map(x=>({x,y})));const cell=cells.find(c=>validDuelCell(s,0,c.x,c.y));if(cell)act({type:'build',typeId:type.id,...cell});}
  }
  if(now>=nextSummon){
   const remaining=p.egg>0?heroesAtLevel(Math.min(10,policy.heroLevel,p.egg))[1]:undefined;
   const action:DuelAction|undefined=!p.rewardUsed&&p.rewardHero?{type:'summon-reward'}:remaining?{type:'hatch',heroId:remaining.id}:undefined;
   if(action&&act(action).ok)nextSummon=now+Math.max(1000,policy.fusionMs);
  }
 }
 const growthRemaining=s.players.map(a=>a!.egg),growthConserved=preparedGrowth.every((amount,i)=>amount===spentGrowth[i]+growthRemaining[i]);
 const result={level,seed,policy:policy.id,mapId,accountLevel,rewardHero:rewardHero??null,winner:s.winner,status:s.status,reason:s.reason,totalSeconds:Number(((now-initial)/1000).toFixed(1)),battleSeconds:Number(s.elapsed.toFixed(1)),zeroCombatCoins,legal,noBattleFusion,growthConserved,prepared,preparedGrowth,spentGrowth,growthRemaining,preparedTypes,prepRemaining,stockBuilds,cashBuilds,earned,firstKill,mistakes,hatches,maxMoney,scores:s.players.map(a=>duelScore(a)),combatScores:s.players.map(a=>a!.combatScore??0),questionScores:s.players.map(a=>a!.questionScore??0),answered:s.players.map(a=>a!.answeredQuestions??0),solved:s.players.map(a=>a!.solved),heroLearningStages:s.players.map(a=>duelHeroLearningLevel(a!)),kills:s.players.map(a=>a!.kills??0),flames:s.players.map(a=>a!.flame),money:s.players.map(a=>a!.money),towerTypes:s.players.map(a=>a!.towers.map(t=>t.typeId)),towerPositions:s.players.map(a=>a!.towers.map(t=>({type:t.typeId,x:t.x,y:t.y,prepared:!!t.prepared,cost:t.cost}))),waves:s.wave,samples};
 peer.dispose();return result;
}
const simulate=simulateDuelDifficulty;
type Match=ReturnType<typeof simulate>;
function summarize(matches:Match[]){return {n:matches.length,wins:matches.filter(m=>m.winner===0).length,losses:matches.filter(m=>m.winner===1).length,draws:matches.filter(m=>m.winner===null).length,timeout:matches.filter(m=>m.reason.startsWith(DUEL_TOTAL_SECONDS/60+'분 종료')).length,meanPlayerScore:mean(matches.map(m=>m.scores[0])),meanCpuScore:mean(matches.map(m=>m.scores[1])),meanPlayerCombat:mean(matches.map(m=>m.combatScores[0])),meanCpuCombat:mean(matches.map(m=>m.combatScores[1])),meanPlayerQuestions:mean(matches.map(m=>m.questionScores[0])),meanCpuQuestions:mean(matches.map(m=>m.questionScores[1])),meanPlayerSolved:mean(matches.map(m=>m.solved[0])),meanCpuSolved:mean(matches.map(m=>m.solved[1])),meanPlayerPrepared:mean(matches.map(m=>m.prepared[0])),meanCpuPrepared:mean(matches.map(m=>m.prepared[1])),meanPlayerFlame:mean(matches.map(m=>m.flames[0])),meanCpuFlame:mean(matches.map(m=>m.flames[1])),meanPlayerEarned:mean(matches.map(m=>m.earned[0])),meanCpuEarned:mean(matches.map(m=>m.earned[1])),meanPlayerCashBuilds:mean(matches.map(m=>m.cashBuilds[0])),meanCpuCashBuilds:mean(matches.map(m=>m.cashBuilds[1])),maxCpuHero:Math.max(0,...matches.flatMap(m=>m.hatches[1])),allLegal:matches.every(m=>m.legal&&m.zeroCombatCoins&&m.noBattleFusion&&m.growthConserved&&m.cashBuilds.every(n=>n===0)&&m.status==='finished')};}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
const main=POLICIES.flatMap(policy=>Array.from({length:10},(_,i)=>SEEDS.map(seed=>simulate(i+1,seed,policy))).flat());
const byPolicy=POLICIES.map(policy=>({policy:policy.id,levels:Array.from({length:10},(_,i)=>({level:i+1,...summarize(main.filter(m=>m.policy===policy.id&&m.level===i+1))}))}));
const maps=DUEL_MAPS.flatMap(map=>POLICIES.map(policy=>simulate(10,912,policy,map.id)));
const fast=POLICIES[2],ordinary=POLICIES[1];
const controls=[
 {...fast,id:'fast-perfect',mistakeRate:0},
 {...fast,id:'fast-no-fusion',mistakeRate:0,noFusion:true},
 {...fast,id:'fast-hero1',mistakeRate:0,heroLevel:1},
 {...fast,id:'fast-hero4',mistakeRate:0,heroLevel:4},
 {...fast,id:'fast-cheap-only',mistakeRate:0,cheapOnly:true},
 {...ordinary,id:'ordinary-perfect',mistakeRate:0},
 {...ordinary,id:'ordinary-fast-fusion',fusionMs:3000},
 {...fast,id:'fast-fusion6',mistakeRate:0,fusionMs:6000},
 {...fast,id:'fast-fusion10',mistakeRate:0,fusionMs:10000},
 {...fast,id:'fast-row',mistakeRate:0,placement:'row' as const},
 {...fast,id:'fast-minimal6',mistakeRate:0,maxTowers:6},
 {...fast,id:'fast-cheap8',mistakeRate:0,maxTowers:8,cheapOnly:true},
 {...fast,id:'fast-minimal5',mistakeRate:0,maxTowers:5},
 {...fast,id:'fast-minimal6-row',mistakeRate:0,maxTowers:6,placement:'row' as const},
 {...fast,id:'fast-cheap10',mistakeRate:0,maxTowers:10,cheapOnly:true},
 {...fast,id:'fast-cheap12',mistakeRate:0,maxTowers:12,cheapOnly:true},
 {...fast,id:'fast-strong-defense',mistakeRate:0,upgradeDefense:true},
 {...fast,id:'fast-strong-defense-5pct',upgradeDefense:true},
 {...fast,id:'strong-defense-no-fusion',mistakeRate:0,upgradeDefense:true,noFusion:true},
 {...fast,id:'strong-defense-fusion6-errors15',mistakeRate:.15,upgradeDefense:true,fusionMs:6000},
 {...fast,id:'fast-coverage-defense-5pct',upgradeDefense:true,placement:'coverage' as const},
];
const counterfactuals=controls.flatMap(policy=>SEEDS.map(seed=>simulate(10,seed,policy)));
const upperPolicies=[fast,controls.find(p=>p.id==='ordinary-fast-fusion')!,controls.find(p=>p.id==='fast-minimal6-row')!,controls.find(p=>p.id==='fast-strong-defense')!,controls.find(p=>p.id==='strong-defense-no-fusion')!,controls.find(p=>p.id==='strong-defense-fusion6-errors15')!];
const upperControls=upperPolicies.flatMap(policy=>[8,9,10].flatMap(level=>SEEDS.map(seed=>simulate(level,seed,policy))));
const validationPolicies=[controls.find(p=>p.id==='fast-minimal6-row')!,controls.find(p=>p.id==='fast-strong-defense-5pct')!];
const upperMapValidation=validationPolicies.flatMap(policy=>[8,9,10].flatMap(level=>DUEL_MAPS.flatMap(map=>[203,912].map(seed=>simulate(level,seed,policy,map.id)))));
const coveragePolicy=controls.find(p=>p.id==='fast-coverage-defense-5pct')!;
const coverageMapValidation=DUEL_MAPS.flatMap(map=>[203,912].map(seed=>simulate(10,seed,coveragePolicy,map.id)));
const accountControls=SEEDS.map(seed=>simulate(10,seed,{...fast,id:'fast-account1',mistakeRate:0},DEFAULT_DUEL_MAP_ID,1));
const rewardControls=SEEDS.map(seed=>simulate(10,seed,{...ordinary,id:'ordinary-reward10',mistakeRate:0},DEFAULT_DUEL_MAP_ID,10,'hero-10-0'));
const existing=Array.from({length:10},(_,i)=>SEEDS.map(seed=>simulateComputerDuel(i+1,seed))).flat();
const existingBurst=SEEDS.map(seed=>simulateComputerDuel(10,seed,'burst'));
function compact(policy:string,matches:Match[]){const a=summarize(matches);return {policy,n:a.n,wins:a.wins,losses:a.losses,timeouts:a.timeout,meanScoresPlayerCpu:`${a.meanPlayerScore} : ${a.meanCpuScore}`,meanCombatPlayerCpu:`${a.meanPlayerCombat} : ${a.meanCpuCombat}`,meanQuestionPlayerCpu:`${a.meanPlayerQuestions} : ${a.meanCpuQuestions}`,questionSharePercentPlayerCpu:`${(a.meanPlayerQuestions/a.meanPlayerScore*100).toFixed(1)} : ${(a.meanCpuQuestions/a.meanCpuScore*100).toFixed(1)}`,meanFlamePlayerCpu:`${a.meanPlayerFlame} : ${a.meanCpuFlame}`,meanPreparedPlayerCpu:`${a.meanPlayerPrepared} : ${a.meanCpuPrepared}`,meanCashBuildsPlayerCpu:`${a.meanPlayerCashBuilds} : ${a.meanCpuCashBuilds}`};}
const allNew=[...main,...maps,...counterfactuals,...upperControls,...upperMapValidation,...coverageMapValidation,...accountControls,...rewardControls];
const inferiorVictories=counterfactuals.filter(m=>m.winner===0&&m.flames[0]<m.flames[1]);
const summary={policyLabelsAreAssumptions:true,totalMatchExecutions:allNew.length+existing.length+existingBurst.length,breakdown:{main:main.length,mapSweep:maps.length,cpu10Controls:counterfactuals.length,upperControls:upperControls.length,upperMapValidation:upperMapValidation.length,coverageMapValidation:coverageMapValidation.length,accountControl:accountControls.length,rewardHeroControl:rewardControls.length,existingHarness:existing.length+existingBurst.length},uniqueSeeds:SEEDS.length,seeds:SEEDS,currentSelectableMaps:DUEL_MAPS.length,uniqueMapsIncludingLegacy:DUEL_MAPS.length+1,mainMap:DEFAULT_DUEL_MAP_ID,mapSweepSeed:912,meanDefinition:'Arithmetic mean of final scores/health/counts over the selected completed trials, including any early destruction. Money/HP use integer thousandths (9000 = 9.0). Question share = sum(questionScore)/sum(totalScore). Summary pairs use player : CPU; raw numerical arrays are retained in detailed summaries/matches.',cpu10Policies:POLICIES.map(p=>compact(p.id,main.filter(m=>m.policy===p.id&&m.level===10))),cpu10Controls:controls.map(p=>compact(p.id,counterfactuals.filter(m=>m.policy===p.id))),upperControlSummaries:upperPolicies.flatMap(p=>[8,9,10].map(level=>({level,...compact(p.id,upperControls.filter(m=>m.policy===p.id&&m.level===level))}))),upperMapValidation:validationPolicies.flatMap(p=>[8,9,10].map(level=>({level,...compact(p.id,upperMapValidation.filter(m=>m.policy===p.id&&m.level===level))}))),coverageMapValidation:{level:10,...compact(coveragePolicy.id,coverageMapValidation)},weakWinsByLevel:byPolicy[0].levels.map(l=>l.wins),ordinaryWinsByLevel:byPolicy[1].levels.map(l=>l.wins),fastWinsByLevel:byPolicy[2].levels.map(l=>l.wins),cpu10AllMapWins:POLICIES.map(p=>({policy:p.id,n:10,wins:maps.filter(m=>m.policy===p.id&&m.winner===0).length})),winsWithInferiorFlame:[...new Set(inferiorVictories.map(m=>m.policy))].map(id=>compact(id,inferiorVictories.filter(m=>m.policy===id))),allNewAuditsLegal:allNew.every(m=>m.legal&&m.zeroCombatCoins&&m.noBattleFusion&&m.growthConserved&&m.cashBuilds.every(n=>n===0)&&m.status==='finished'),allExistingAuditsLegal:[...existing,...existingBurst].every(m=>m.legalEconomy&&m.zeroCombatCoins&&m.noBattleFusion&&m.growthConserved&&m.playerCashBuilt===0&&m.computerCashBuilt===0&&m.status==='finished')};
const report={summary,description:'Read-only current-engine audit; weak/ordinary/fast are assumed decision policies, not observed children. All actions use applyDuel/ComputerPeer with 100ms ticks, 180s of tower inventory and uncapped hero-growth preparation, and 180s of stock-only combat with level-cost hero summons. Hero addition stages start at 1 for every account and advance at 5, 10, and 15 correct hero answers; this tool itself never changes game rules.',policies:POLICIES,controlPolicies:controls,seeds:SEEDS,currentDefaultMap:DEFAULT_DUEL_MAP_ID,constants:{preparation:DUEL_PREPARATION_SECONDS,battle:DUEL_SECONDS,preparationStartMoney:DUEL_START_MONEY},cpuSettings:COMPUTER_OPPONENTS,byPolicy,mapSummaries:POLICIES.map(p=>({policy:p.id,...summarize(maps.filter(m=>m.policy===p.id))})),counterfactualSummaries:controls.map(p=>({policy:p.id,...summarize(counterfactuals.filter(m=>m.policy===p.id))})),accountSummary:summarize(accountControls),rewardSummary:summarize(rewardControls),existingSummary:Array.from({length:10},(_,i)=>({level:i+1,n:5,wins:existing.filter(m=>m.level===i+1&&m.winner===0).length,cpuWins:existing.filter(m=>m.level===i+1&&m.winner===1).length})),existingBurstSummary:{wins:existingBurst.filter(m=>m.winner===0).length,n:existingBurst.length},waveRewards:Array.from({length:10},(_,i)=>{const stage=i+1,hp=Math.round((200+stage*320)/ (stage===1?100:10))*(stage===1?100:10),units=TOWERS.filter(t=>t.unlock<=stage).map(t=>t.unit),minimum=minimumHits(hp,units);return {stage,hp,minimumHits:minimum,combatCoins:0,scorePerfect:duelKillScore(minimum),preparationBasicCost:towerPriceBand(TOWERS[0],stage).low};}),limits:['Arithmetic choices are oracle-selected then delayed, with assumed per-attempt error rates. This is a policy comparison, not a real student win-rate estimate.','No mouse/touch time, distraction, network jitter or human learning is modeled.','Main comparison uses the current default map and selected CPU tower challenge; original map sweep has one seed; upper map validation has seeds 203/912. Account-level invariance of hero learning and owned-hero advantages are separate controls.','Collected reward hero is absent in main runs; a level-10 collected hero is tested as an explicit advantage control.','Prepared and cash placement counters observe CPU tower diffs once per tick, so sell/build replacement is reconstructed from tower IDs.'],matches:main,mapMatches:maps,counterfactuals,upperControls,upperMapValidation,coverageMapValidation,accountControls,rewardControls,existing,existingBurst};
const outputIndex=process.argv.indexOf('--output'),output=outputIndex<0?'test-results/difficulty-audit-duel.json':process.argv[outputIndex+1];
if(!output||output.startsWith('--'))throw Error('--output requires a file path');
mkdirSync(dirname(output),{recursive:true});writeFileSync(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({output,summary},null,2));
}
