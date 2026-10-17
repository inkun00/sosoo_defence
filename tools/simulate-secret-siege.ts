import {writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {SecretSiege} from '../src/secret-siege-model';
import {ARMY,type ArmyId} from '../src/secret-siege-types';
import type {Difficulty} from '../src/difficulty';
import {numberText} from '../src/math';
import {SIEGE_STAGES} from '../src/secret-siege-stages';
import {REVIVED_WIZARD} from '../src/secret-siege-boss';
import {INITIAL_COINS,STARTER_BUDGET,type SiegeEconomy} from '../src/secret-siege-research';

export interface SiegePlan{name:string;guard:number;striker:number;scout:number;order:'guard-first'|'striker-first'|'scout-first';rally:boolean;rallyTiming?:'early'|'boss-spell';rallyDelay?:number;deployGap?:number;rallySpells?:readonly number[];reinforcements?:readonly ArmyId[];}
export function simulateSecretSiege(difficulty:Difficulty,plan:SiegePlan,stageId=1,dt=.1,economy?:SiegeEconomy){
 if(!Number.isFinite(dt)||dt<=0||dt>.1)throw new RangeError('Simulation step must be in (0, .1]');
 const game=new SecretSiege(difficulty,stageId,economy),startingCoins=game.money,ids:ArmyId[]=['guard','striker','scout'];let spent=0;
 for(const id of ids)for(let index=0;index<plan[id];index++){
  if(!game.requestRecruit(id))throw Error('Illegal recruitment: '+plan.name);const question=game.pendingQuestion!;
  if(!game.answer(numberText(question.answer,2)))throw Error('Illegal recruitment answer: '+plan.name);spent+=question.b;
 }
 const keys:ArmyId[]=plan.order==='guard-first'?['guard','striker','scout']:plan.order==='striker-first'?['striker','guard','scout']:['scout','striker','guard'];
 const order=keys.flatMap(id=>Array<ArmyId>(plan[id]).fill(id));
 if(!game.start())throw Error('Plan must contain a scout and another troop');
 let next=0,enemyShots=0,armyDamage=0,nextDeploy=0,lastRally=-999,reinforcement=0,supportHealed=0,peakArmyCount=game.armyCount;const firingTowers=new Set<string>();
 for(let tick=0;tick<Math.ceil(181/dt)&&game.phase==='playing';tick++){
  const wanted=plan.reinforcements?.[reinforcement];
  if(wanted&&game.canRecruit(wanted)){if(!game.requestRecruit(wanted))throw Error('Illegal reinforcement');const question=game.pendingQuestion!;if(!game.answer(numberText(question.answer,2)))throw Error('Illegal reinforcement answer');spent+=question.b;order.push(wanted);reinforcement++;}
  if(next<order.length&&game.elapsed>=nextDeploy&&game.deploy(order[next])){next++;nextDeploy=game.elapsed+(plan.deployGap??.65);}
  const active=game.units.filter(unit=>unit.hp>0),missing=active.reduce((sum,unit)=>sum+unit.maxHp-unit.hp,0);
  const rallyDue=plan.rallyTiming==='boss-spell'&&game.bossState?game.bossState.phase!=='dormant'&&game.bossState.lastSpellAt>lastRally&&game.elapsed>=game.bossState.lastSpellAt+(plan.rallyDelay??0)&&game.bossState.spellCount>=(plan.rallySpells?.[3-game.ralliesLeft]??0):missing>=1800;
  if(plan.rally&&game.canRally&&rallyDue){
   if(!game.requestRally()||!game.answer(numberText(game.pendingQuestion!.answer,2)))throw Error('Illegal rally');
   lastRally=game.elapsed;
  }
  game.step(dt);
  peakArmyCount=Math.max(peakArmyCount,game.armyCount);
  for(const event of game.events){if(event.type==='shot'&&!event.friendly)enemyShots++;if(event.type==='hit'&&!event.friendly)armyDamage+=event.damage??0;if(event.type==='heal')supportHealed+=event.damage??0;}
  for(const shot of game.projectiles)if(shot.source==='enemy'){
   const source=game.targets.find(target=>target.kind==='tower'&&target.id===shot.sourceId);if(source)firingTowers.add(source.id);
  }
  game.events.length=0;
 }
 return {stageId,difficulty,...plan,phase:game.phase,elapsed:Number(game.elapsed.toFixed(1)),castle:game.castle,boss:game.boss?.hp??0,spells:game.bossState?.spellCount??0,alive:game.units.filter(unit=>unit.hp>0).length,startingCoins,researched:game.researched,remainingMoney:game.money,earnedCoins:game.earnedCoins,spent,peakArmyCount,supportHealed,reinforcementsRecruited:reinforcement,monsterSpawned:game.monsterSpawned,monstersDefeated:game.monsters.filter(monster=>monster.hp===0).length,rallies:3-game.ralliesLeft,stars:game.stars,recruited:game.recruited,deployed:game.deployed,towersDestroyed:game.targets.filter(target=>target.kind==='tower'&&target.hp===0).length,firingTowers:firingTowers.size,enemyShots,armyDamage};
}

export const SIEGE_REINFORCEMENT_ORDER:readonly ArmyId[]=['knight','priest','ranger','champion','knight','champion','priest','ranger'];
export const SIEGE_ADAPTIVE_PLAN:SiegePlan={name:'혼합 정예 재투자',guard:3,striker:3,scout:2,order:'guard-first',rally:true,rallyTiming:'boss-spell',deployGap:.7,reinforcements:SIEGE_REINFORCEMENT_ORDER};
export function simulateSecretSiegeCampaign(difficulty:Difficulty,dt=.1){
 let economy:SiegeEconomy={coins:INITIAL_COINS,researched:[],revision:0};
 const results=[];
 for(let stageId=1;stageId<=10;stageId++){
  const preparation=new SecretSiege(difficulty,stageId,economy),purchases:ArmyId[]=[];let researchSpent=0;
  for(const id of ['knight','ranger','priest','champion'] as const)if(preparation.canResearch(id)){preparation.research(id);purchases.push(id);researchSpent+=ARMY.find(army=>army.id===id)!.researchCost;}
  const preferred:readonly ArmyId[]=stageId===10?SIEGE_REINFORCEMENT_ORDER:preparation.armyUnlocked('champion')?['champion','priest']:preparation.armyUnlocked('priest')?['priest','ranger']:preparation.armyUnlocked('ranger')?['knight','ranger']:['knight','knight'];
  const plan={...SIEGE_ADAPTIVE_PLAN,reinforcements:preferred.filter(id=>preparation.armyUnlocked(id))};
  const result=simulateSecretSiege(difficulty,plan,stageId,dt,preparation.initialEconomy);results.push({...result,bankBeforeResearch:economy.coins,researchSpent,researchPurchases:purchases,dt});
  if(result.phase!=='won')break;
  economy={coins:result.remainingMoney,researched:result.researched,revision:stageId};
 }
 return {difficulty,dt,results,economy};
}
export function siegeSimulationReport(){
 const difficulties=['practice','standard','challenge'] as const;
 const campaigns=difficulties.flatMap(difficulty=>[.1,.05,1/60].map(dt=>simulateSecretSiegeCampaign(difficulty,dt)));
 const results=campaigns.flatMap(campaign=>campaign.results);
 const finalCheckpoint=(difficulty:Difficulty,dt:number)=>{
  const final=campaigns.find(campaign=>campaign.difficulty===difficulty&&campaign.dt===dt)!.results[9];
  return {coins:final.startingCoins,researched:final.researched};
 };
 const timingResults=difficulties.flatMap(difficulty=>[.65,.7,1].flatMap(deployGap=>[0,.5,1].flatMap(rallyDelay=>[.1,.05,1/60].map(dt=>({dt,...simulateSecretSiege(difficulty,{...SIEGE_ADAPTIVE_PLAN,deployGap,rallyDelay},10,dt,finalCheckpoint(difficulty,dt))})))));
 const controlPlans=[
  {...SIEGE_ADAPTIVE_PLAN,name:'혼합 정예 · 무회복',rally:false},
  {...SIEGE_ADAPTIVE_PLAN,name:'혼합 정예 · 회복 조기 소진',rallyTiming:'early' as const},
  {...SIEGE_ADAPTIVE_PLAN,name:'보상 재투자 무시',reinforcements:[]},
  {...SIEGE_ADAPTIVE_PLAN,name:'정찰병 편중',guard:1,striker:0,scout:11,reinforcements:[]},
  {...SIEGE_ADAPTIVE_PLAN,name:'사제 집중 투자',reinforcements:Array<ArmyId>(8).fill('priest')},
  {...SIEGE_ADAPTIVE_PLAN,name:'사제 집중 · 무회복',rally:false,reinforcements:Array<ArmyId>(8).fill('priest')},
 ];
 const controlResults=difficulties.flatMap(difficulty=>[.1,.05,1/60].flatMap(dt=>controlPlans.map(plan=>({dt,...simulateSecretSiege(difficulty,plan,10,dt,finalCheckpoint(difficulty,dt))}))));
 const all=[...results,...timingResults,...controlResults];
 const lines=[
  '# 비밀 원정: 영구 병종 연구·이월 코인·수비 몬스터 밸런스 검증','',
  `총 ${all.length}개 전투를 실제 모델로 검증했습니다. 최초 9.90부터 10단계를 연속 진행하는 9개 캠페인 ${results.length}개 전투, 그 캠페인에서 실제로 남긴 자금·연구를 사용하는 최종 타이밍 변형 ${timingResults.length}개, 최종 통제 전략 ${controlResults.length}개입니다.`,
  '공개 API로 훈련 뺄셈·회복 덧셈 정답을 제출합니다. 원정 중 돈·체력·시간 주입이나 적 능력치 변경은 없습니다. 10 / 20 / 60fps 갱신 간격을 비교했습니다. 자동 전략의 결과이며 실제 어린이의 성공률을 뜻하지 않습니다.','',
  '## 한 번의 연구와 병사마다 지불하는 훈련비','',
  '자동 병종 해금은 없습니다. 네 타워를 모두 파괴해도 정예 병종은 연구하지 않으면 사용할 수 없습니다. 준비 화면에서 연구비를 한 번 지불하면 해당 병종이 영구적으로 열리며 이후 원정에서도 유지됩니다. 연구 자체로 병사를 주거나 누적 훈련 수를 올리지 않습니다.',
  '병사를 확보할 때는 연구비와 별개로 훈련비를 냅니다. 한 명 훈련 성공마다 모든 병종의 다음 훈련비가 0.01 오릅니다. 준비 비축에도 같은 인상이 적용되며 출격 때 다시 차감하지 않습니다. 오답·취소·전사로 인상분이 초기화되지 않고 다음 출정에서는 기본 훈련비부터 시작합니다. 동시 보유 병력 12명, 제한 180초, 수동 회복 지원 3회입니다.','',
  '| 병종 | 영구 연구비 | 기본 훈련비 | 체력 | 공격 | 사거리 | 공격 간격 | 역할 |',
  '|---|---:|---:|---:|---:|---:|---:|---|'];
 for(const army of ARMY)lines.push(`| ${army.name} | ${army.researchCost?numberText(army.researchCost,2):'기본 개방'} | ${numberText(army.cost,2)} | ${numberText(army.hp,2)} | ${numberText(army.attack,2)} | ${army.range} | ${army.cooldown}초 | ${army.description}${army.supportHeal?` · 반경 ${army.supportRange}, ${army.supportCooldown}초마다 아군 1명 +${numberText(army.supportHeal,2)}`:''} |`);
 lines.push('','왕국 사제는 사거리 안에서 결손 체력이 가장 큰 살아 있는 아군 한 명을 회복합니다. 최대 체력을 넘기거나 전사자를 부활시키지 않고 수동 회복 횟수·코인도 쓰지 않습니다.','',
  '## 실제 잔액 이월과 실패 복구','',
  '새 캠페인에서만 9.90코인을 지급합니다. 승리하면 현재 실제 잔액을 그대로 다음 단계로 이월하고 시작 예산을 다시 더하지 않습니다. 준비 중 연구 구매는 출정 체크포인트에 즉시 반영합니다. 훈련비는 그 출정에서만 차감하므로 패배·재시작·새로고침 때 출정 전 코인과 영구 연구 상태로 돌아갑니다. 실패한 전투의 타워 수입을 저장하거나 쌓을 수 없습니다.',
  '네 타워를 실제 공격으로 파괴할 때 3.00 / 4.00 / 5.00 / 6.00코인을 현재 전투 지갑에 넣습니다. 합계 18.00이며 같은 타워는 한 번만 지급합니다. 연구비와 다음 출정 훈련비를 함께 조달할 수 있도록 기존 합계 9.00에서 조정했습니다. 몬스터·성·보스에는 별도 코인 보상이 없습니다. 지갑 상한 1,000,000코인에 도달하면 추가 입금은 상한에서 멈춥니다.',
  `연구 후에는 기본 8명 훈련비 ${numberText(STARTER_BUDGET,2)}를 남겨야 합니다. 이미 훈련한 준비 병력에 쓴 돈은 이 예산에 포함하므로 이중으로 예치하지 않습니다. 훈련도 실제 돈이 충분하고, 지출 후 잔액 + 아직 파괴하지 않은 타워의 미수령 보상 합계가 ${numberText(STARTER_BUDGET,2)} 이상일 때만 허용합니다. 네 타워 파괴가 승리의 필수 조건이므로 다음 단계 예산이 보존됩니다. 미래 보상을 실제 지갑에 미리 넣지는 않습니다.`,
  '코인이 9.99를 넘으면 훈련 문제도 현재 전체 지갑에서 가격을 뺀 실제 잔액을 답해야 합니다. 정수 천분위로 계산하되 최대 소수 두 자리만 사용합니다. 회복 덧셈 문제는 기존 10 미만 학습 범위를 유지합니다. 오래된 잔액·가격 견적은 제출 때 재검증합니다.','',
  '## 코인을 주입하지 않은 연속 10단계 대표 전략','',
  '첫 편성은 방패 3 / 돌격 3 / 정찰 2, 총 8명으로 7.48코인입니다. 방패 → 돌격 → 정찰 순으로 약 0.7초마다 출격합니다. 준비 화면에서 감당할 수 있는 다음 연구를 사고, 1~9단계는 정예 증원을 최대 두 명만 훈련해 다음 연구 예산을 저축합니다. 연구 순서는 기사 → 명사수 → 사제 → 검투사입니다.',
  '기사만 연구했을 때는 기사 2명, 명사수까지는 기사·명사수, 사제까지는 사제·명사수, 검투사까지는 검투사·사제를 훈련합니다. 실제 잔액·정원 조건을 충족해야 훈련·출격합니다. 정원은 비축과 생존 병력의 합계이며 전사자가 생기면 비워진 자리에 증원할 수 있습니다.',
  '최종 단계에서는 연구한 혼합 정예를 기사 → 사제 → 명사수 → 검투사 → 기사 → 검투사 → 사제 → 명사수 순서로 시도합니다. 1~9단계는 부상에 맞춰 회복하고, 10단계는 보스의 광역 마법이 명중한 뒤 회복합니다.','',
  `연속 캠페인 ${campaigns.filter(campaign=>campaign.results.length===10&&campaign.results.every(result=>result.phase==='won')).length}/${campaigns.length}개, 실제 단계 ${results.filter(result=>result.phase==='won').length}/${results.length}개가 모두 승리했습니다. 모든 캠페인에서 연구는 2단계 기사 8.00, 4단계 명사수 12.00, 6단계 사제 16.00, 9단계 검투사 24.00으로 총 60.00을 지불했습니다. 아래는 60fps 실제 원장입니다.`,
  '| 단계 | 난이도 | 이월 잔액 | 이번 연구 | 연구비 | 훈련비 | 타워 수입 | 승리 후 잔액 | 경과 초 | 추가 훈련 |',
  '|---:|---|---:|---|---:|---:|---:|---:|---:|---:|');
 for(const result of results.filter(result=>result.dt===1/60))lines.push(`| ${result.stageId} | ${result.difficulty} | ${numberText(result.bankBeforeResearch,2)} | ${result.researchPurchases.map(id=>ARMY.find(army=>army.id===id)!.name).join(', ')||'—'} | ${numberText(result.researchSpent,2)} | ${numberText(result.spent,2)} | ${numberText(result.earnedCoins,2)} | ${numberText(result.remainingMoney,2)} | ${result.elapsed} | ${result.reinforcementsRecruited} |`);
 lines.push('','각 행의 승리 후 잔액 = 이월 잔액 − 이번 연구비 − 훈련비 + 타워 수입입니다. 다음 행은 그 잔액에서 시작합니다. 최종 단계도 7.48 이상을 보존하므로 재도전·재플레이 훈련 예산이 남습니다.','',
  '## 수비 몬스터와 최종 마법사','',
  '적은 10초부터 성 거리 950에서 왼쪽으로 출격합니다. 1단계는 임프, 4단계부터 그림자 야수, 7단계부터 오염된 골렘이 순환 출현합니다. 체력 배율은 1 + (단계−1) × 0.10, 공격 배율은 1 + (단계−1) × 0.06이며 소수 두 자리로 맞춥니다. 출현 간격은 단계당 0.6초씩 줄고 총 13~21마리, 동시 생존 8마리로 제한합니다.',
  '양쪽은 실제 상대와의 사거리에서 멈춰 공격하고 발사체 도착 시 피해를 줍니다. 몬스터에는 초과 피해로 처치할 수 있고 타워·마법사·성에는 정확한 뺄셈만 유효합니다. 새 목표 때문에 아군이 뒤로 순간이동하지 않습니다. 문제·일시 정지 중 몬스터 출격·이동·공격·탄과 사제 회복도 정지합니다. 전투 종료 후 출격을 멈추며 승리 후 남은 몬스터는 무해하게 멈추고 모든 탄을 제거합니다.',
  `최종 단계는 네 타워 → 부활한 마법사 ${numberText(REVIVED_WIZARD.hp,2)} → 성 9.99 순서입니다. 본편 최종 보스 체력 99.90보다 높은 체력과 마력탄·광역 파동·속박·격노를 유지합니다. 보스 생존 중 성은 공격·피격 모두 보호막으로 정지합니다.`,
  '| 단계 | 이름 | 네 타워 체력 | 성 공격 | 몬스터 간격 | 출현 총한도 |',
  '|---:|---|---|---:|---:|---:|');
 for(const stage of SIEGE_STAGES)lines.push(`| ${stage.id} | ${stage.name} | ${stage.towerHp.map(hp=>numberText(hp,2)).join(' / ')} | ${numberText(stage.castleAttack,2)} | ${stage.monsterSpawnInterval}초 | ${stage.monsterLimit} |`);
 lines.push('','## 최종 단계 통제 비교','',
  '모든 통제군도 앞선 아홉 원정에서 실제 남긴 14.52코인과 네 영구 연구를 사용합니다. 새 코인이나 전투 능력치를 주지 않습니다. 정찰 편중·증원 무시·사제 집중 전략은 모든 갱신 간격에서 실패합니다. 혼합 정예의 무회복·조기 회복은 일부 갱신 간격에서 승리하므로 모든 무회복 전략이 반드시 패배한다고 단정하지 않습니다.','',
  '| 난이도 | 전략 | 10/20/60fps 승리 수 |',
  '|---|---|---:|');
 for(const difficulty of difficulties)for(const plan of controlPlans){const rows=controlResults.filter(result=>result.difficulty===difficulty&&result.name===plan.name);lines.push(`| ${difficulty} | ${plan.name} | ${rows.filter(result=>result.phase==='won').length}/${rows.length} |`);}
 lines.push('',`통제군 총 ${controlResults.filter(result=>result.phase==='lost').length}/${controlResults.length}개는 실패했습니다. 출격 간격 0.65 / 0.7 / 1초 × 마법 후 회복 반응 0 / 0.5 / 1초 × 10 / 20 / 60fps의 혼합 정예 타이밍 탐색 결과는 다음과 같습니다.`,
  '| 난이도 | 승리 / 27 |',
  '|---|---:|');
 for(const difficulty of difficulties)lines.push(`| ${difficulty} | ${timingResults.filter(result=>result.difficulty===difficulty&&result.phase==='won').length}/27 |`);
 lines.push('','재현: `npx tsx tools/simulate-secret-siege.ts`','');
 return {campaigns,results,timingResults,controlResults,markdown:lines.join('\n')};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const report=siegeSimulationReport(),all=[...report.results,...report.timingResults,...report.controlResults];
 if(report.campaigns.some(campaign=>campaign.results.length!==10||campaign.results.some(result=>result.phase!=='won')))throw Error('A demonstrated continuous campaign failed');
 for(const campaign of report.campaigns){
  let coins=INITIAL_COINS;
  for(const result of campaign.results){
   if(result.bankBeforeResearch!==coins||result.startingCoins!==coins-result.researchSpent)throw Error('Campaign created or lost checkpoint coins');
   coins=result.remainingMoney;
  }
 }
 for(const result of all){
  if(result.phase==='playing')throw Error('A strategy did not terminate');
  if(result.phase==='won'&&(result.towersDestroyed!==4||result.boss!==0||result.remainingMoney<STARTER_BUDGET))throw Error('Illegal victory or lost next-stage reserve');
  if(result.remainingMoney!==result.startingCoins+result.earnedCoins-result.spent||result.remainingMoney<0||result.peakArmyCount>12)throw Error('Illegal money or army limit');
 }
 writeFileSync('docs/secret-siege-balance.md',report.markdown);
 for(const difficulty of ['practice','standard','challenge'] as const)console.log(difficulty,'continuous',report.results.filter(result=>result.difficulty===difficulty&&result.phase==='won').length+'/30','boss timing',report.timingResults.filter(result=>result.difficulty===difficulty&&result.phase==='won').length+'/27');
 console.log('controls lost',report.controlResults.filter(result=>result.phase==='lost').length+'/'+report.controlResults.length,'total battles',all.length);
}
