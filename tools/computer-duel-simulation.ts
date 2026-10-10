import {pathToFileURL} from 'node:url';
import {ComputerPeer,additionSlots,strategicDuelCells} from '../src/multiplayer/computer-peer';
import {DuelAction,applyDuel,duelTowerLevel,canUseDuelTower,validDuelCell,DUEL_PREPARATION_SECONDS,DUEL_SECONDS,duelScore} from '../src/multiplayer/duel';
import {DUEL_MAPS} from '../src/multiplayer/duel-maps';
import {TOWERS,towerPrice} from '../src/towers';
import {numberText} from '../src/math';
import {heroesAtLevel,heroSpec} from '../src/multiplayer/heroes';

type Strategy='baseline'|'burst';
/** Fixed legal player policies for regression checks, not claims about real children. */
export function simulateComputerDuel(level:number,seed:number,strategy:Strategy='baseline',mapId?:string){
 let now=100000;const peer=new ComputerPeer({uid:'baseline',name:'기준 수호자',accountLevel:level},level,{seed,mapId,clock:()=>now,autoTick:false}),s=peer.state,p=s.players[0];
 const burst=strategy==='burst',think=burst?2000:3000,build=burst?7000:10000,fuse=burst?3000:10000,hatch=burst?30000:26000,max=burst?14:8;
 const initialNow=now,preferences=['basic','double','needle','pebble','frost','catapult','lightning','sniper'];
 let nonce=0,nextBuild=now+1800,answerAt=0,nextFuse=now+fuse,nextHatch=now+hatch,nextSummon=0,computerHatched=false,traversedBend=false,battleStarted=false,zeroCombatCoins=false,legalEconomy=true,noBattleFusion=true;
 let playerPrepared=0,computerPrepared=0,playerStockPlaced=0,computerStockPlaced=0,playerCashBuilt=0,computerCashBuilt=0,playerEarned=0,computerEarned=0;
 let playerHeroPrepared=0,computerHeroPrepared=0;let battleSolved:number[]=[];
 const act=(action:DuelAction)=>{const reply=applyDuel(s,0,action,now,'baseline-'+(++nonce));s.revision++;return reply;};act({type:'ready'});
 while((s.status==='preparing'||s.status==='playing')&&now-initialNow<(DUEL_PREPARATION_SECONDS+DUEL_SECONDS+1)*1000){
  const previousMoney=p.money,previousComputerMoney=s.players[1]!.money,previousComputerTowers=[...s.players[1]!.towers],wasPlaying=s.status==='playing';
  now+=100;peer.step(now);legalEconomy&&=s.players.every(player=>!!player&&player.money>=0&&player.escrow>=0&&Object.values(player.stock).every(n=>Number.isSafeInteger(n)&&n>=0)&&player.towers.length<=14&&player.towers.filter(t=>t.typeId==='needle').length<=3&&(s.status!=='playing'||player.quote===null));
  if(wasPlaying){
   playerEarned+=p.money-previousMoney;
   const current=s.players[1]!.towers,newTowers=current.filter(t=>!previousComputerTowers.some(old=>old.id===t.id)),sold=previousComputerTowers.filter(t=>!current.some(newTower=>newTower.id===t.id));
   computerStockPlaced+=newTowers.filter(t=>t.prepared).length;computerCashBuilt+=newTowers.filter(t=>!t.prepared).length;
   computerEarned+=s.players[1]!.money-previousComputerMoney+newTowers.filter(t=>!t.prepared).reduce((n,t)=>n+t.cost,0)-sold.filter(t=>!t.prepared).reduce((n,t)=>n+t.cost,0);
  }
  if(s.status==='preparing'){
   if(p.quote&&now>=answerAt){act({type:'answer',nonce:p.quote.nonce,answer:numberText(p.quote.before-p.quote.cost)});nextBuild=now+build;}
   else if(!p.quote&&now>=nextBuild&&Object.values(p.stock).reduce((n,count)=>n+count,0)<max){
    nextBuild=now+build;const towerLevel=duelTowerLevel(s),count=(id:string)=>p.stock[id]??0;
    const types=TOWERS.filter(t=>preferences.includes(t.id)&&canUseDuelTower(s,0,t.id)&&towerPrice(t,p.money,towerLevel,p.purchaseVariation)<=p.money&&!(t.id==='needle'&&count(t.id)>=3));
    const type=types.sort((a,b)=>count(a.id)-count(b.id)||preferences.indexOf(a.id)-preferences.indexOf(b.id))[0];
    if(type&&act({type:'prepare-quote',typeId:type.id}).ok)answerAt=now+think;
   }
   const desired=burst?10:3;
   if(p.egg>=desired&&now>=nextHatch){const hero=heroesAtLevel(p.egg)[burst?1:(p.solved+1)%3];if(hero&&act({type:'hatch',heroId:hero.id}).ok)nextHatch=now+hatch;}
   else if(p.egg<desired&&now>=nextFuse){nextFuse=now+fuse;const slots=additionSlots(p.board);if(slots)act({type:'fuse',round:p.round,slots,operation:'+'});}
   continue;
  }
  if(!battleStarted&&s.status==='playing'){
   battleStarted=true;zeroCombatCoins=s.players.every(player=>player!.money===0);playerPrepared=Object.values(p.stock).reduce((n,count)=>n+count,0);computerPrepared=Object.values(s.players[1]!.stock).reduce((n,count)=>n+count,0);
   playerHeroPrepared=Object.values(p.heroStock??{}).reduce((n,count)=>n+count,0);computerHeroPrepared=Object.values(s.players[1]!.heroStock??{}).reduce((n,count)=>n+count,0);battleSolved=s.players.map(player=>player!.solved);
   nextBuild=s.startedAt+1800;nextSummon=s.startedAt+hatch;
  }
  noBattleFusion&&=s.players.every((player,i)=>player!.solved===battleSolved[i]);
  computerHatched||=s.enemies.some(e=>e.owner===1&&!!e.hero);traversedBend||=s.enemies.some(e=>typeof e.y==='number'&&Math.abs(e.y-3)>.05);if(s.status!=='playing')break;
  if(now>=nextBuild&&p.towers.length<max){
   nextBuild=now+build;
   const types=TOWERS.filter(t=>preferences.includes(t.id)&&canUseDuelTower(s,0,t.id)&&p.stock[t.id]>0&&!(t.id==='needle'&&p.towers.filter(t=>t.typeId==='needle').length>=3));
   const count=(id:string)=>p.towers.filter(t=>t.typeId===id).length;types.sort((a,b)=>Number(p.stock[b.id]>0)-Number(p.stock[a.id]>0)||count(a.id)-count(b.id)||preferences.indexOf(a.id)-preferences.indexOf(b.id));
   const type=types[0],cells=type&&s.mapId?strategicDuelCells(s,0,type.unit,type.effect==='range'?4:3):[2,4].flatMap(y=>[9,6,3,7,4,1,8,5].map(x=>({x,y}))),cell=cells.find(c=>validDuelCell(s,0,c.x,c.y));
   if(type&&cell){const stored=p.stock[type.id]>0;if(act({type:'build',typeId:type.id,...cell}).ok){if(stored)playerStockPlaced++;else playerCashBuilt++;}}
  }
  if(now>=nextSummon){
   const remaining=p.egg>0?heroesAtLevel(p.egg)[burst?1:(p.solved+1)%3]:undefined;
   const stored=Object.entries(p.heroStock??{}).filter(([,n])=>n>0).map(([id])=>heroSpec(id)).filter(h=>!!h).sort((a,b)=>b!.level-a!.level)[0];
   const action:DuelAction|undefined=remaining?{type:'hatch',heroId:remaining.id}:stored?{type:'summon',heroId:stored.id}:undefined;
   if(action&&act(action).ok)nextSummon=now+hatch;
  }
 }
 const result={level,seed,strategy,mapId:s.mapId??'legacy-straight',status:s.status,winner:s.winner,reason:s.reason,playerScore:duelScore(p),computerScore:duelScore(s.players[1]!),playerCombatScore:p.combatScore??0,computerCombatScore:s.players[1]!.combatScore??0,playerQuestionScore:p.questionScore??0,computerQuestionScore:s.players[1]!.questionScore??0,preparationSeconds:s.preparationElapsed,seconds:Math.round(s.elapsed),totalSeconds:Math.round((now-initialNow)/1000),zeroCombatCoins,legalEconomy,noBattleFusion,playerPrepared,computerPrepared,playerHeroPrepared,computerHeroPrepared,playerStockPlaced,computerStockPlaced,playerCashBuilt,computerCashBuilt,playerEarned,computerEarned,waves:s.wave,computerHatched,traversedBend,playerFlame:p.flame,computerFlame:s.players[1]!.flame,playerPurchased:p.purchases,computerSolved:s.players[1]!.solved,computerPurchased:s.players[1]!.purchases};peer.dispose();return result;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const seeds=[17,91,203,912,1027],baseline=Array.from({length:10},(_,i)=>{
  const matches=seeds.map(seed=>simulateComputerDuel(i+1,seed));return {level:i+1,computerWins:matches.filter(m=>m.winner===1).length,playerWins:matches.filter(m=>m.winner===0).length,draws:matches.filter(m=>m.winner===null).length,matches};
 });
 const maps=DUEL_MAPS.map(map=>({mapId:map.id,name:map.name,matches:Array.from({length:10},(_,i)=>simulateComputerDuel(i+1,912,'baseline',map.id))}));
 console.log(JSON.stringify({description:'2분 동안 실제 뺄셈과 덧셈 정답으로 타워·영웅을 비축하고, 0코인에서 시작한 3분 전투 중 준비한 타워만 배치하며 영웅 소환 시점을 고르는 기준 전략. 기존 직선 맵의 5개 시드와 선택 맵 10종 × CPU 10레벨 완주를 검증하며 실제 학생 승률을 예측하지 않는다.',baseline,level10Burst:seeds.map(seed=>simulateComputerDuel(10,seed,'burst')),maps},null,2));
}
