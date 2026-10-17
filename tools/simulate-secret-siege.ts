import {writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {SecretSiege} from '../src/secret-siege-model';
import {ARMY,type ArmyId} from '../src/secret-siege-types';
import type {Difficulty} from '../src/difficulty';
import {numberText} from '../src/math';
import {SIEGE_STAGES} from '../src/secret-siege-stages';
import {REVIVED_WIZARD} from '../src/secret-siege-boss';

export interface SiegePlan{name:string;guard:number;striker:number;scout:number;order:'guard-first'|'striker-first'|'scout-first';rally:boolean;rallyTiming?:'early'|'boss-spell';rallyDelay?:number;deployGap?:number;rallySpells?:readonly number[];}
export function simulateSecretSiege(difficulty:Difficulty,plan:SiegePlan,stageId=1,dt=.1){
 if(!Number.isFinite(dt)||dt<=0||dt>.1)throw new RangeError('Simulation step must be in (0, .1]');
 const game=new SecretSiege(difficulty,stageId),ids:ArmyId[]=['guard','striker','scout'];
 for(const id of ids)for(let index=0;index<plan[id];index++){
  if(!game.requestRecruit(id)||!game.answer(numberText(game.pendingQuestion!.answer,2)))throw Error('Illegal recruitment: '+plan.name);
 }
 const keys:ArmyId[]=plan.order==='guard-first'?['guard','striker','scout']:plan.order==='striker-first'?['striker','guard','scout']:['scout','striker','guard'];
 const order=keys.flatMap(id=>Array<ArmyId>(plan[id]).fill(id));
 if(!game.start())throw Error('Plan must contain a scout and another troop');
 let next=0,enemyShots=0,armyDamage=0,nextDeploy=0,lastRally=-999;const firingTowers=new Set<string>();
 for(let tick=0;tick<Math.ceil(181/dt)&&game.phase==='playing';tick++){
  if(next<order.length&&game.elapsed>=nextDeploy&&game.deploy(order[next])){next++;nextDeploy=game.elapsed+(plan.deployGap??.65);}
  const active=game.units.filter(unit=>unit.hp>0),missing=active.reduce((sum,unit)=>sum+unit.maxHp-unit.hp,0);
  const rallyDue=plan.rallyTiming==='boss-spell'&&game.bossState?game.bossState.phase!=='dormant'&&game.bossState.lastSpellAt>lastRally&&game.elapsed>=game.bossState.lastSpellAt+(plan.rallyDelay??0)&&game.bossState.spellCount>=(plan.rallySpells?.[3-game.ralliesLeft]??0):missing>=1800;
  if(plan.rally&&game.canRally&&rallyDue){
   if(!game.requestRally()||!game.answer(numberText(game.pendingQuestion!.answer,2)))throw Error('Illegal rally');
   lastRally=game.elapsed;
  }
  game.step(dt);
  for(const event of game.events){if(event.type==='shot'&&!event.friendly)enemyShots++;if(event.type==='hit'&&!event.friendly)armyDamage+=event.damage??0;}
  for(const shot of game.projectiles)if(shot.source==='enemy'){
   const source=game.targets.find(target=>target.kind==='tower'&&target.id===shot.sourceId);if(source)firingTowers.add(source.id);
  }
  game.events.length=0;
 }
 return {stageId,difficulty,...plan,phase:game.phase,elapsed:Number(game.elapsed.toFixed(1)),castle:game.castle,boss:game.boss?.hp??0,spells:game.bossState?.spellCount??0,alive:game.units.filter(unit=>unit.hp>0).length,remainingMoney:game.money,rallies:3-game.ralliesLeft,stars:game.stars,recruited:game.recruited,deployed:game.deployed,towersDestroyed:game.targets.filter(target=>target.kind==='tower'&&target.hp===0).length,firingTowers:firingTowers.size,enemyShots,armyDamage};
}

export function siegeSimulationReport(){
 const difficulties=['practice','standard','challenge'] as const,orders=['guard-first','striker-first','scout-first'] as const;
 const compositions=[
  {name:'균형 편성',guard:3,striker:4,scout:2},
  {name:'최종 결전 편성',guard:4,striker:4,scout:2},
  {name:'돌격 중심 편성',guard:1,striker:8,scout:2},
  {name:'방패 중심 편성',guard:6,striker:1,scout:2},
  {name:'정찰 중심 편성',guard:1,striker:0,scout:11},
  {name:'소규모 편성',guard:1,striker:1,scout:1},
 ];
 const results=SIEGE_STAGES.flatMap(stage=>difficulties.flatMap(difficulty=>compositions.flatMap(composition=>orders.flatMap(order=>[false,true].map(rally=>simulateSecretSiege(difficulty,{...composition,order,rally,deployGap:.7},stage.id))))));
 const timingResults=difficulties.flatMap(difficulty=>compositions.flatMap(composition=>orders.flatMap(order=>[.7,1,1.6].flatMap(deployGap=>[0,.5,1].map(rallyDelay=>simulateSecretSiege(difficulty,{...composition,order,rally:true,rallyTiming:'boss-spell',rallySpells:[1,2,4],rallyDelay,deployGap},10))))));
 const finalPlan={...compositions[1],order:'guard-first',rally:true,rallyTiming:'boss-spell',rallySpells:[1,2,4],deployGap:1.6} as const;
 const stabilityResults=difficulties.flatMap(difficulty=>[.1,.05,1/60].flatMap(dt=>[0,.5,1].map(rallyDelay=>({dt,...simulateSecretSiege(difficulty,{...finalPlan,rallyDelay},10,dt)}))));
 const campaignStabilityResults=difficulties.flatMap(difficulty=>SIEGE_STAGES.filter(stage=>stage.id<10).flatMap(stage=>[.1,.05,1/60].map(dt=>({dt,...simulateSecretSiege(difficulty,{...compositions[0],order:'guard-first',rally:true,deployGap:.7},stage.id,dt)}))));
 const all=[...results,...timingResults,...stabilityResults,...campaignStabilityResults];
 const lines=[
  '# 비밀 원정 10단계 역공격 밸런스 검증','',
  `총 ${all.length.toLocaleString('ko-KR')}회 = 기본 ${results.length}회 + 보스 회복 타이밍 ${timingResults.length}회 + 최종 갱신 간격·반응 지연 ${stabilityResults.length}회 + 1~9단계 갱신 간격 ${campaignStabilityResults.length}회입니다.`,
  '모든 실행은 공개 API로 정확한 모집 뺄셈과 회복 덧셈에 답하고, 실제 보유 군대만 출격시킵니다. 돈·체력·시간·명중 판정 주입이나 전투 중 수치 변경은 없습니다. 자동 전략 결과이며 실제 어린이의 성공률을 뜻하지 않습니다.','',
  '## 모집가 누적 인상','',
  '시작 코인 9.90, 동시 보유 한도 12명, 제한 시간 180초, 회복 지원 3회는 유지합니다. 병사를 한 명 확보할 때마다 모든 병종의 다음 모집가가 0.01코인씩 올라갑니다. 기본가는 방패 1.20 / 돌격 0.90 / 정찰 0.45이며, n명을 이미 모집했다면 다음 가격은 기본가 + n × 0.01입니다. 총 n명의 가격에는 0.01 × n × (n−1) / 2가 더해집니다.',
  '모집할 때 출격 비용을 선납하므로 준비 중 대량 비축해도 인상을 우회할 수 없습니다. 전투의 출격 버튼에서는 비축 병력만 소모하고 다시 차감하지 않습니다. 오답·취소에는 가격이 오르지 않고, 병사가 전사해도 누적 모집 수는 줄지 않습니다. 재도전은 코인 9.90과 기본 가격으로 새로 시작합니다.',
  '준비 중에는 다음 인상분까지 포함한 필수 정찰병·다른 병종의 코인과 자리를 남깁니다. 견적의 잔액·가격·정답을 실제 상태와 다시 검증하므로 오래된 가격으로 구매할 수 없습니다. 모집 가격은 9.99 이하이며 실제 가능한 모집·회복 문제의 피연산자와 답은 10 미만·소수 두 자리 범위를 유지합니다.',
  '기존 3방패·6돌격·2정찰 11명은 인상 후 10.45코인이라 새 규칙에서 불법입니다. 이를 코인 주입이나 가격 할인으로 유지하지 않고, 아래의 새 합법 편성을 검증했습니다.','',
  '| 편성 | 방패 | 돌격 | 정찰 | 인상 포함 총 코인 |','|---|---:|---:|---:|---:|',
 ];
 for(const plan of compositions){const count=plan.guard+plan.striker+plan.scout,cost=plan.guard*1200+plan.striker*900+plan.scout*450+count*(count-1)/2*10;lines.push(`| ${plan.name} | ${plan.guard} | ${plan.striker} | ${plan.scout} | ${numberText(cost,2)} |`);}
 lines.push('','## 10단계의 수비진','',
  '마력탑·독탑 네 기를 경로 거리 240 / 430 / 620 / 800에서 차례로 파괴합니다. 타워 체력·공격력·사거리·사격 빈도는 단계마다 증가하며 성 체력은 9.99입니다. 아군의 초과 공격은 무효이므로 0.01 정찰병이 작은 나머지를 마무리해야 합니다.',
  '이번 변경은 병력의 체력·공격력·이동 속도·사격 간격과 적의 모든 능력치를 바꾸지 않았습니다. 실제 발사체는 직전 변경의 20% 빠른 이동 속도를 유지하며 도착 시 피해를 줍니다. 파괴된 타워의 비행 중 공격은 취소됩니다.',
  `최종 단계는 네 타워 → 부활한 저주 마법사 ${numberText(REVIVED_WIZARD.hp,2)} → 성 순서입니다. 본편 11단계의 99.90보다 높은 보스 체력과 직접 마력탄·암흑 파동·영혼의 속박·격노를 유지합니다. 서로 다른 모드의 실제 사람 성공률을 수치로 비교한 것은 아닙니다.`,
  '보스의 기본 마력탄은 공격 0.26, 사거리 240이며 격노 후 0.34로 강해집니다. 암흑 파동은 2.8초 예고 후 고정 범위에 0.44 피해, 영혼의 속박은 0.20 피해와 3.5초 공격 간격 증가를 줍니다. 시전 중 기본 사격은 쉬며, 보스가 살아 있는 동안 성은 사격·피격 모두 보호막으로 정지합니다.',
  '문제를 푸는 동안 전투·발사체·마법 예고·속박·제한 시간은 함께 멈춥니다. 보스의 큰 체력은 학습 문제로 출제하지 않습니다.','',
  '| 단계 | 이름 | 타워 체력 | 타워 공격력 | 성 공격력 | 사거리 증가 | 사격 간격 배율 |','|---:|---|---|---|---:|---:|---:|');
 for(const stage of SIEGE_STAGES)lines.push(`| ${stage.id} | ${stage.name} | ${stage.towerHp.map(hp=>numberText(hp,2)).join(' / ')} | ${stage.towerAttack.map(attack=>numberText(attack,2)).join(' / ')} | ${numberText(stage.castleAttack,2)} | +${stage.castleRange-240} | ${stage.cooldownScale} |`);
 lines.push('','## 기본 전략 탐색','',
  '10단계 × 3난이도 × 6편성 × 3출격 순서 × 회복 여부입니다. 병력은 약 0.7초마다 출격하고, 기본 회복 전략은 전체 결손 체력 1.80 이상일 때 바로 사용합니다.','',
  '| 단계 | 연습 성공 / 36 | 표준 성공 / 36 | 도전 성공 / 36 |','|---:|---:|---:|---:|');
 for(const stage of SIEGE_STAGES){const wins=(difficulty:Difficulty)=>results.filter(result=>result.stageId===stage.id&&result.difficulty===difficulty&&result.phase==='won').length;lines.push(`| ${stage.id} | ${wins('practice')} | ${wins('standard')} | ${wins('challenge')} |`);}
 lines.push('','## 최종 결전의 실제 공략과 회복 시점','',
  '새 최종 편성은 방패 4 / 돌격 4 / 정찰 2이며 인상분 0.45를 포함해 총 9.75코인입니다. 방패 → 돌격 → 정찰 순서로 약 1.6초마다 출격하고, 보스의 첫째·둘째·넷째 광역 마법이 명중한 뒤 회복합니다. 셋째 마법에는 회복을 아껴 둡니다.',
  '기본 전략과 별도로 6편성 × 3난이도 × 3순서 × 출격 간격 0.7 / 1.0 / 1.6초 × 마법 후 반응 지연 0 / 0.5 / 1초를 탐색했습니다. 회복은 첫째·둘째·넷째 마법 뒤 사용합니다.','',
  '| 난이도 | 타이밍 전략 성공 / 162 |','|---|---:|');
 for(const difficulty of difficulties)lines.push(`| ${difficulty} | ${timingResults.filter(result=>result.difficulty===difficulty&&result.phase==='won').length} |`);
 lines.push('','최종 대표 편성은 3난이도 × 갱신 간격 0.1 / 0.05 / 1/60초 × 반응 지연 0 / 0.5 / 1초에서 모두 합법적으로 클리어합니다. 타워 구간에서 회복을 소진하거나 회복 없이 진행한 같은 편성은 세 난이도 모두 실패합니다.','',
  '| 난이도 | 갱신 간격 | 회복 반응 초 | 결과 | 경과 초 | 생존 | 보스 마법 | 받은 피해 |','|---|---:|---:|---|---:|---:|---:|---:|');
 for(const result of stabilityResults)lines.push(`| ${result.difficulty} | ${result.dt.toFixed(4)} | ${result.rallyDelay} | ${result.phase} | ${result.elapsed} | ${result.alive} | ${result.spells} | ${numberText(result.armyDamage,2)} |`);
 lines.push('','1~9단계의 대표 3방패·4돌격·2정찰 편성은 총 8.46코인입니다. 약 0.7초마다 출격하고 전체 결손 체력이 1.80 이상이면 회복합니다. 3난이도 × 9단계 × 3갱신 간격의 81회 모두 승리합니다. 아래는 0.1초 갱신 결과입니다.','',
  '| 단계 | 난이도 | 결과 | 경과 초 | 적 발사 | 받은 피해 | 생존 / 9 |','|---:|---|---|---:|---:|---:|---:|');
 for(const result of campaignStabilityResults.filter(result=>result.dt===.1))lines.push(`| ${result.stageId} | ${result.difficulty} | ${result.phase} | ${result.elapsed} | ${result.enemyShots} | ${numberText(result.armyDamage,2)} | ${result.alive} |`);
 lines.push('','<details><summary>기본 자동 전략 전체 결과</summary>','',
  '| 단계 | 편성 | 난이도 | 순서 | 회복 | 결과 | 경과 초 | 성 잔여 체력 | 생존 | 타워 파괴 | 적 발사 | 받은 피해 |','|---:|---|---|---|---|---|---:|---:|---:|---:|---:|---:|');
 for(const result of results)lines.push(`| ${result.stageId} | ${result.name} | ${result.difficulty} | ${result.order} | ${result.rally?'사용':'없음'} | ${result.phase} | ${result.elapsed} | ${numberText(result.castle,2)} | ${result.alive} | ${result.towersDestroyed} / 4 | ${result.enemyShots} | ${numberText(result.armyDamage,2)} |`);
 lines.push('','</details>','','재현: `npx tsx tools/simulate-secret-siege.ts`','');
 return {results,timingResults,stabilityResults,campaignStabilityResults,markdown:lines.join('\n')};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const report=siegeSimulationReport(),all=[...report.results,...report.timingResults,...report.stabilityResults,...report.campaignStabilityResults];
 if(all.some(result=>result.phase==='playing'))throw Error('A strategy did not terminate');
 for(const stage of SIEGE_STAGES)for(const difficulty of ['practice','standard','challenge'] as const)if(!all.some(result=>result.stageId===stage.id&&result.difficulty===difficulty&&result.phase==='won'))throw Error('No legal clear for stage '+stage.id+' '+difficulty);
 for(const result of all)if(result.phase==='won'&&(result.towersDestroyed!==4||result.boss!==0))throw Error('Castle fell before all towers and boss: '+result.name);
 if([...report.stabilityResults,...report.campaignStabilityResults].some(result=>result.phase!=='won'))throw Error('The demonstrated formation must clear at every tested frame rate');
 if(!report.results.some(result=>result.name==='정찰 중심 편성'&&result.phase==='lost'))throw Error('Unbalanced scouts unexpectedly clear every run');
 writeFileSync('docs/secret-siege-balance.md',report.markdown);
 for(const stage of SIEGE_STAGES){const runs=report.results.filter(result=>result.stageId===stage.id);console.log('stage',stage.id,...(['practice','standard','challenge'] as const).map(difficulty=>`${difficulty} ${runs.filter(result=>result.difficulty===difficulty&&result.phase==='won').length}/36`));}
 for(const difficulty of ['practice','standard','challenge'] as const)console.log('boss timing',difficulty,report.timingResults.filter(result=>result.difficulty===difficulty&&result.phase==='won').length+'/162');
 console.log('stable final clears',report.stabilityResults.length,'stable stages 1-9 clears',report.campaignStabilityResults.length,'total simulations',all.length);
}
