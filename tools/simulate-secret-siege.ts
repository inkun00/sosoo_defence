import {writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {SecretSiege} from '../src/secret-siege-model';
import {ARMY,type ArmyId} from '../src/secret-siege-types';
import type {Difficulty} from '../src/difficulty';
import {numberText} from '../src/math';
import {SIEGE_STAGES} from '../src/secret-siege-stages';
import {REVIVED_WIZARD} from '../src/secret-siege-boss';

export interface SiegePlan{name:string;guard:number;striker:number;scout:number;order:'guard-first'|'striker-first'|'scout-first';rally:boolean;rallyTiming?:'early'|'boss-spell';rallyDelay?:number;deployGap?:number;rallySpells?:readonly number[];reinforcements?:readonly ArmyId[];}
export function simulateSecretSiege(difficulty:Difficulty,plan:SiegePlan,stageId=1,dt=.1){
 if(!Number.isFinite(dt)||dt<=0||dt>.1)throw new RangeError('Simulation step must be in (0, .1]');
 const game=new SecretSiege(difficulty,stageId),ids:ArmyId[]=['guard','striker','scout'];let spent=0;
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
 return {stageId,difficulty,...plan,phase:game.phase,elapsed:Number(game.elapsed.toFixed(1)),castle:game.castle,boss:game.boss?.hp??0,spells:game.bossState?.spellCount??0,alive:game.units.filter(unit=>unit.hp>0).length,remainingMoney:game.money,earnedCoins:game.earnedCoins,spent,peakArmyCount,supportHealed,reinforcementsRecruited:reinforcement,monsterSpawned:game.monsterSpawned,monstersDefeated:game.monsters.filter(monster=>monster.hp===0).length,rallies:3-game.ralliesLeft,stars:game.stars,recruited:game.recruited,deployed:game.deployed,towersDestroyed:game.targets.filter(target=>target.kind==='tower'&&target.hp===0).length,firingTowers:firingTowers.size,enemyShots,armyDamage};
}

export const SIEGE_REINFORCEMENT_ORDER:readonly ArmyId[]=['knight','priest','ranger','champion','knight','champion','priest','ranger'];
export const SIEGE_ADAPTIVE_PLAN:SiegePlan={name:'혼합 정예 재투자',guard:3,striker:3,scout:2,order:'guard-first',rally:true,rallyTiming:'boss-spell',deployGap:.7,reinforcements:SIEGE_REINFORCEMENT_ORDER};
export function siegeSimulationReport(){
 const difficulties=['practice','standard','challenge'] as const,orders=['guard-first','striker-first','scout-first'] as const;
 const compositions=[
  {name:'기본 균형 편성',guard:3,striker:4,scout:2},{name:'기본 대규모 편성',guard:4,striker:4,scout:2},
  {name:'돌격 중심 편성',guard:1,striker:8,scout:2},{name:'방패 중심 편성',guard:6,striker:1,scout:2},
  {name:'정찰 중심 편성',guard:1,striker:0,scout:11},{name:'소규모 편성',guard:1,striker:1,scout:1},
 ];
 const investments=[SIEGE_ADAPTIVE_PLAN,{...SIEGE_ADAPTIVE_PLAN,name:'기사 집중 투자',reinforcements:Array<ArmyId>(8).fill('knight')},{...SIEGE_ADAPTIVE_PLAN,name:'사제 집중 투자',reinforcements:Array<ArmyId>(8).fill('priest')}];
 const results=SIEGE_STAGES.flatMap(stage=>difficulties.flatMap(difficulty=>compositions.flatMap(composition=>orders.flatMap(order=>[false,true].map(rally=>simulateSecretSiege(difficulty,{...composition,order,rally,deployGap:.7},stage.id))))));
 const investmentResults=SIEGE_STAGES.flatMap(stage=>difficulties.flatMap(difficulty=>investments.flatMap(plan=>[false,true].map(rally=>simulateSecretSiege(difficulty,{...plan,rally},stage.id)))));
 const timingResults=difficulties.flatMap(difficulty=>investments.flatMap(plan=>[.7,1,1.6].flatMap(deployGap=>[0,.5,1].map(rallyDelay=>simulateSecretSiege(difficulty,{...plan,deployGap,rallyDelay},10)))));
 const stabilityResults=difficulties.flatMap(difficulty=>SIEGE_STAGES.flatMap(stage=>[.1,.05,1/60].map(dt=>({dt,...simulateSecretSiege(difficulty,SIEGE_ADAPTIVE_PLAN,stage.id,dt)}))));
 const controlPlans=[{...SIEGE_ADAPTIVE_PLAN,name:'혼합 정예 · 무회복',rally:false},{...SIEGE_ADAPTIVE_PLAN,name:'혼합 정예 · 회복 조기 소진',rallyTiming:'early' as const},{...SIEGE_ADAPTIVE_PLAN,name:'보상 재투자 무시',reinforcements:[]},{...SIEGE_ADAPTIVE_PLAN,name:'정찰병 편중',guard:1,striker:0,scout:11,reinforcements:[]}];
 const controlResults=difficulties.flatMap(difficulty=>controlPlans.map(plan=>simulateSecretSiege(difficulty,plan,10)));
 const all=[...results,...investmentResults,...timingResults,...stabilityResults,...controlResults];
 const lines=[
  '# 비밀 원정: 정예 부대·타워 보상·수비 몬스터 밸런스 검증','',
  `총 ${all.length.toLocaleString('ko-KR')}회 = 기본 편성 ${results.length}회 + 보상 투자 ${investmentResults.length}회 + 최종 출격·회복 타이밍 ${timingResults.length}회 + 10~60fps 대표 전략 ${stabilityResults.length}회 + 최종 통제 전략 ${controlResults.length}회입니다.`,
  '공개 API로 실제 뺄셈·회복 덧셈 정답을 제출하고, 파괴한 타워의 보상으로만 추가 모집합니다. 돈·체력·시간 주입이나 전투 중 능력치 변경은 없습니다. 자동 전략의 결과이며 실제 어린이의 성공률을 뜻하지 않습니다.','',
  '## 전투 중 실제 경제','',
  '시작 코인 9.90, 동시 보유 병력 12명, 제한 180초, 수동 회복 지원 3회입니다. 모집 성공마다 모든 병종의 다음 가격에 0.01코인을 가산합니다. 준비 비축에도 같은 인상이 적용되며 출격 시 이중 차감하지 않습니다. 전사·취소·오답은 누적 모집 수를 초기화하지 않습니다. 새 원정은 기본 가격과 9.90코인으로 시작합니다.',
  '네 타워를 실제로 파괴할 때 각각 1.50 / 2.00 / 2.50 / 3.00코인을 지급합니다. 총 9.00이며 같은 타워의 보상은 한 번뿐입니다. 별도 상점 지갑이 아니라 현재 전투 지갑에 들어오며, 해금된 정예 부대를 즉시 모집할 수 있습니다. 몬스터·성·보스 처치에는 타워 보상을 지급하지 않습니다.',
  '보상으로 코인이 9.99를 넘으면 모집 문제도 현재 전체 지갑에서 가격을 빼고 실제 잔액을 답하도록 냅니다. 정수 천분위로 계산하되 최대 소수 두 자리만 사용합니다. 회복 덧셈 문제는 기존 10 미만 학습 범위를 유지합니다. 오래된 잔액·모집가 견적은 재검증합니다.','',
  '| 병종 | 기본 가격 | 체력 | 공격 | 사거리 | 공격 간격 | 필요 타워 파괴 | 역할 |','|---|---:|---:|---:|---:|---:|---:|---|'];
 for(const army of ARMY)lines.push(`| ${army.name} | ${numberText(army.cost,2)} | ${numberText(army.hp,2)} | ${numberText(army.attack,2)} | ${army.range} | ${army.cooldown}초 | ${army.requiredTowers} | ${army.description}${army.supportHeal?` · 반경 ${army.supportRange}, ${army.supportCooldown}초마다 아군 1명 +${numberText(army.supportHeal,2)}`:''} |`);
 lines.push('','왕국 기사는 첫 타워, 장궁 명사수와 왕국 사제는 둘째 타워, 해방군 검투사는 셋째 타워 파괴 후 열립니다. 사제는 사거리 안에서 결손 체력이 가장 큰 살아 있는 아군 한 명을 회복하며, 최대 체력을 넘기거나 전사자를 부활시키지 않습니다. 자동 회복은 수동 회복 횟수·코인을 쓰지 않습니다.',
  '초기 사제 회복 0.30은 도전에서 사제 집중 투자로 수동 회복 없이 승리하는 사례가 있어 0.20/3초로 보정했습니다. 혼합 편성은 모든 난이도·갱신 간격에서 클리어하지만 사제 집중 투자는 수동 회복 여부에 관계없이 최종 단계에서 실패합니다.','',
  '## 성에서 출격하는 수비 몬스터','',
  '10초부터 적의 성 거리 950에서 왼쪽으로 출격합니다. 1단계는 임프, 4단계부터 그림자 야수, 7단계부터 오염된 골렘이 순환 출현합니다. 단계마다 체력 배율은 1 + (단계−1) × 0.10, 공격 배율은 1 + (단계−1) × 0.06이며 소수 두 자리로 맞춥니다. 출현 간격은 13.5초에서 단계마다 0.6초씩 줄어 10단계 8.1초가 됩니다. 총 13~21마리, 동시 생존 8마리 한도로 쌓이는 수를 제한합니다.',
  '양쪽 모두 가까운 실제 상대를 사거리에서 정지해 공격하고, 발사체가 도착할 때 피해를 적용합니다. 아군은 이동 경로의 수비 몬스터와 먼저 싸웁니다. 몬스터에게는 초과 피해로 처치할 수 있고, 타워·마법사·성은 기존처럼 정확한 뺄셈만 유효합니다. 새 목표 때문에 뒤로 순간이동하지 않습니다.',
  '문제·일시정지 중에는 수비 몬스터의 출격·이동·공격·탄과 사제 회복도 정지합니다. 적 성이 파괴되거나 전투가 끝나면 추가 출격은 없습니다. 승리 후 남은 몬스터는 무해하게 멈추고 모든 탄을 제거합니다.','',
  '## 단계 수비력과 최종 마법사','',
  `기존 타워·보스 능력치는 유지했습니다. 최종 단계는 네 타워 → 부활한 마법사 ${numberText(REVIVED_WIZARD.hp,2)} → 성 9.99 순서입니다. 본편 최종 보스 체력 99.90보다 높은 체력, 마력탄·광역 파동·속박·격노를 유지합니다. 보스가 살아 있을 때 성은 공격·피격 모두 보호막으로 정지합니다.`,
  '| 단계 | 이름 | 네 타워 체력 | 성 공격 | 몬스터 간격 | 출현 총한도 |','|---:|---|---|---:|---:|---:|');
 for(const stage of SIEGE_STAGES)lines.push(`| ${stage.id} | ${stage.name} | ${stage.towerHp.map(hp=>numberText(hp,2)).join(' / ')} | ${numberText(stage.castleAttack,2)} | ${stage.monsterSpawnInterval}초 | ${stage.monsterLimit} |`);
 lines.push('','## 실제 보상으로 정예 부대에 재투자하는 대표 전략','',
  '초기에 방패 3 / 돌격 3 / 정찰 2, 총 8명을 7.48코인으로 준비하고 방패 → 돌격 → 정찰 순으로 약 0.7초마다 출격합니다. 타워 파괴·잔액·정원 조건을 실제로 충족할 때 기사 → 사제 → 명사수 → 검투사 → 기사 순서로 모집·출격합니다. 병력이 쓰러져 정원이 비어야 추가 모집할 수 있으므로 총 모집 수가 12를 넘어도 동시 12명 한도는 유지합니다.',
  '1~9단계는 부상에 맞춰 회복하고, 10단계는 보스의 처음 세 번 광역 마법이 명중한 뒤 회복합니다. 사제는 별도로 부상 아군을 자동 회복합니다. 10단계 × 3난이도 × 10 / 20 / 60fps 대표 전략 90회가 모두 승리합니다. 아래는 60fps 결과입니다.','',
  '| 단계 | 난이도 | 결과 | 경과 초 | 수입 | 지출 | 잔액 | 정예 추가 | 몬스터 처치/출현 | 생존 |','|---:|---|---|---:|---:|---:|---:|---:|---:|---:|');
 for(const result of stabilityResults.filter(result=>result.dt===1/60))lines.push(`| ${result.stageId} | ${result.difficulty} | ${result.phase} | ${result.elapsed} | ${numberText(result.earnedCoins,2)} | ${numberText(result.spent,2)} | ${numberText(result.remainingMoney,2)} | ${result.reinforcementsRecruited} | ${result.monstersDefeated}/${result.monsterSpawned} | ${result.alive} |`);
 lines.push('','## 최종 단계 통제 비교','',
  '같은 혼합 편성이라도 회복을 쓰지 않거나 타워 구간에서 회복을 소진하면 최종 단계에서 실패합니다. 보상 투자를 무시하거나 정찰병만 몰아도 세 난이도에서 실패합니다. 자동 회복 병종을 포함해도 수동 회복 시점을 선택해야 하므로 버튼 연타만으로 모든 전략이 승리하지 않습니다.','',
  '| 난이도 | 통제 전략 | 결과 | 경과 초 | 보스 잔여 | 성 잔여 |','|---|---|---|---:|---:|---:|');
 for(const result of controlResults)lines.push(`| ${result.difficulty} | ${result.name} | ${result.phase} | ${result.elapsed} | ${numberText(result.boss,2)} | ${numberText(result.castle,2)} |`);
 lines.push('','## 전략 탐색 집계','',
  '| 단계 | 기본 연습 승/36 | 기본 표준 승/36 | 기본 도전 승/36 | 투자 연습 승/6 | 투자 표준 승/6 | 투자 도전 승/6 |','|---:|---:|---:|---:|---:|---:|---:|');
 for(const stage of SIEGE_STAGES){const count=(rows:typeof results,difficulty:Difficulty)=>rows.filter(result=>result.stageId===stage.id&&result.difficulty===difficulty&&result.phase==='won').length;lines.push(`| ${stage.id} | ${count(results,'practice')} | ${count(results,'standard')} | ${count(results,'challenge')} | ${count(investmentResults,'practice')} | ${count(investmentResults,'standard')} | ${count(investmentResults,'challenge')} |`);}
 lines.push('','최종 타이밍 탐색은 혼합 / 기사 집중 / 사제 집중 투자 × 출격 간격 0.7 / 1 / 1.6초 × 마법 후 회복 반응 0 / 0.5 / 1초입니다.','',
  '| 난이도 | 타이밍 승 / 27 |','|---|---:|');
 for(const difficulty of difficulties)lines.push(`| ${difficulty} | ${timingResults.filter(result=>result.difficulty===difficulty&&result.phase==='won').length} |`);
 lines.push('','재현: `npx tsx tools/simulate-secret-siege.ts`','');
 return {results,investmentResults,timingResults,stabilityResults,controlResults,markdown:lines.join('\n')};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const report=siegeSimulationReport(),all=[...report.results,...report.investmentResults,...report.timingResults,...report.stabilityResults,...report.controlResults];
 if(all.some(result=>result.phase==='playing'))throw Error('A strategy did not terminate');
 if(report.stabilityResults.some(result=>result.phase!=='won'))throw Error('A demonstrated investment strategy failed');
 if(report.controlResults.some(result=>result.phase!=='lost'))throw Error('A final control strategy unexpectedly won');
 for(const result of all){
  if(result.phase==='won'&&(result.towersDestroyed!==4||result.boss!==0))throw Error('Castle fell before all towers and boss');
  if(result.remainingMoney!==9900+result.earnedCoins-result.spent||result.remainingMoney<0||result.peakArmyCount>12)throw Error('Illegal money or army limit');
 }
 writeFileSync('docs/secret-siege-balance.md',report.markdown);
 for(const difficulty of ['practice','standard','challenge'] as const)console.log(difficulty,'stable',report.stabilityResults.filter(result=>result.difficulty===difficulty&&result.phase==='won').length+'/30','boss timing',report.timingResults.filter(result=>result.difficulty===difficulty&&result.phase==='won').length+'/27');
 console.log('controls failed',report.controlResults.length,'total simulations',all.length);
}
