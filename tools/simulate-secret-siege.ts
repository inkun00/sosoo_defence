import {writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {SecretSiege} from '../src/secret-siege-model';
import {ARMY,type ArmyId} from '../src/secret-siege-types';
import type {Difficulty} from '../src/difficulty';
import {numberText} from '../src/math';
import {SIEGE_STAGES} from '../src/secret-siege-stages';
import {REVIVED_WIZARD} from '../src/secret-siege-boss';

export interface SiegePlan{name:string;guard:number;striker:number;scout:number;order:'guard-first'|'striker-first'|'scout-first';rally:boolean;rallyTiming?:'early'|'boss-spell';rallyDelay?:number;deployGap?:number;}
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
  const rallyDue=plan.rallyTiming==='boss-spell'&&game.bossState?game.bossState.phase!=='dormant'&&game.bossState.lastSpellAt>lastRally&&game.elapsed>=game.bossState.lastSpellAt+(plan.rallyDelay??0):missing>=1800;
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
 const compositions=[
  {name:'균형 편성',guard:3,striker:6,scout:2},
  {name:'정찰 지원 편성',guard:2,striker:5,scout:5},
  {name:'돌격 중심 편성',guard:1,striker:8,scout:2},
  {name:'방패 중심 편성',guard:6,striker:1,scout:4},
  {name:'정찰 중심 편성',guard:1,striker:0,scout:11},
  {name:'소규모 편성',guard:1,striker:1,scout:1},
 ];
 const results=SIEGE_STAGES.flatMap(stage=>(['practice','standard','challenge'] as const).flatMap(difficulty=>compositions.flatMap(composition=>(['guard-first','striker-first','scout-first'] as const).flatMap(order=>[false,true].map(rally=>simulateSecretSiege(difficulty,{...composition,order,rally},stage.id))))));
 const difficulties=['practice','standard','challenge'] as const,orders=['guard-first','striker-first','scout-first'] as const;
 const timingResults=difficulties.flatMap(difficulty=>compositions.flatMap(composition=>orders.flatMap(order=>[.7,1,1.5].flatMap(deployGap=>[0,.5,1].map(rallyDelay=>simulateSecretSiege(difficulty,{...composition,order,rally:true,rallyTiming:'boss-spell',rallyDelay,deployGap},10))))));
 const stabilityPlans=[{name:'균형 편성',guard:3,striker:6,scout:2,deployGap:1},{name:'정찰 지원 결전 편성',guard:3,striker:5,scout:4,deployGap:.7}];
 const stabilityResults=difficulties.flatMap(difficulty=>stabilityPlans.flatMap(plan=>[.1,.05,1/60].map(dt=>({dt,...simulateSecretSiege(difficulty,{...plan,order:'guard-first',rally:true,rallyTiming:'boss-spell',rallyDelay:.5},10,dt)}))));
 const lines=[
  '# 비밀 원정 10단계 역공격 밸런스 검증','',
  '모든 실행은 공개 API로 정확한 모집 뺄셈 문제를 풀고, 실제 보유 군대만 출격시켰습니다. 돈·체력·시간·명중 판정에 대한 주입이나 전투 중 수치 변경은 없습니다. 자동 전략의 성공 비율이며 실제 어린이의 성공률을 뜻하지 않습니다.','',
  '시작 코인 9.90, 동시 보유 한도 12명, 제한 시간 180초입니다. 출격은 0.65초 이상 간격을 지켰습니다. 기본 1,080회 전략은 살아 있는 병력의 전체 결손 체력이 1.80 이상일 때 덧셈 문제에 정답을 제출해 집결을 사용했습니다. 추가 486회는 집결을 아껴 보스의 마법이 명중한 후 사용했습니다. 문제를 푸는 동안 전투·발사체·마법 예고·속박·시간은 정지합니다.','',
  '마력탑·독탑 네 기를 경로 거리 240 / 430 / 620 / 800에서 차례로 파괴해야 합니다. 1단계 타워 체력은 2.40 / 3.60 / 4.50 / 5.40이며 단계마다 각각 0.45씩 증가합니다. 10단계는 6.45 / 7.65 / 8.55 / 9.45입니다. 성의 체력은 모든 단계에서 9.99이며 공격력·사거리·사격 빈도가 증가합니다. 모집·회복 문제의 피연산자와 답은 기존 10 미만 소수 두 자리 범위를 유지합니다. 보스의 큰 체력은 학습 문제로 출제하지 않습니다.','',
  '기본 사격 간격(네 타워 / 성)은 연습 2.10 / 2.00 / 1.90 / 1.80 / 1.65초, 표준 1.60 / 1.55 / 1.50 / 1.40 / 1.20초, 도전 1.25 / 1.20 / 1.15 / 1.10 / 0.95초입니다. 단계마다 사격 배율이 0.018씩 감소하며 10단계는 기본 간격의 0.838배입니다. 타워는 사거리 안 가장 앞선 병사를 조준하며 발사체는 기존 0.5초를 1.2로 나눈 약 0.417초 후 명중합니다. 방패병·돌격병·정찰병의 비행 시간도 각각 0.5 / 0.6 / 0.35초의 1/1.2로 줄여 모든 발사체의 이동 속도를 20% 높였습니다. 사격 간격·공격력·체력·마법 시전 시간은 유지합니다. 파괴된 타워의 비행 중 공격은 취소됩니다. 아군의 초과 공격은 무효이며 0.01 정찰병이 소수 두 자리 나머지를 마무리합니다.','',
  '1~9단계의 적·군대 능력치는 유지했으며 발사체 이동 속도 변경 후 대표 편성 27회의 경과 시간·발사 수·받은 피해·생존 수를 다시 검증했습니다. 정확한 나머지를 마무리하는 소요 시간과 피격 대상이 달라져 모든 편성의 경과 시간과 피해가 매 단계 단조롭게 증가하지는 않습니다.','',
  '## 마지막 단계: 부활한 저주 마법사','',
  `10단계에서는 네 타워 → 부활한 저주 마법사 → 성을 차례로 쓰러뜨려야 합니다. 보스의 체력은 ${numberText(REVIVED_WIZARD.hp,2)}로 본편 11단계 마법사 체력 99.90보다 20.00 높습니다. 본편 마법사는 주변 몬스터 강화가 주 역할이지만, 부활한 마법사는 직접 마력탄과 두 가지 광역 마법으로 군대와 싸웁니다. 서로 다른 모드이므로 두 모드의 실제 사람 성공률을 수치로 비교한 것은 아닙니다.`,'',
  '- 네 타워가 살아 있는 동안에는 대기합니다. 보스가 살아 있는 동안 성은 공격과 피격 모두 보호막으로 정지하므로 성·보스 공격이 겹쳐 즉시 전멸하지 않습니다.',
  '- 기본 마력탄은 공격 0.26, 사거리 240, 비행 0.5/1.2초(약 0.417초)입니다. 사격 간격은 연습 1.80 / 표준 1.55 / 도전 1.30초입니다.',
  '- 체력 40% 이하에서는 격노해 마력탄이 0.34, 사격 간격이 기본의 0.8배가 됩니다. 마법 후 휴식도 5.2초에서 3.8초로 줄어듭니다.',
  '- 암흑 파동: 2.8초 고정 범위 예고 후 반경 80 안 아군에게 0.44 피해를 한 번 줍니다. 효과는 1.4초 동안 보입니다.',
  '- 영혼의 속박: 같은 2.8초 예고 후 범위 안 아군에게 0.20 피해를 주고 3.5초 동안 공격 간격을 1.6배로 늦춥니다. 파동과 번갈아 사용합니다.',
  '- 마법을 예고·시전하는 동안 기본 마력탄은 쉬므로 대응 시간이 생깁니다. 광역 마법이 명중한 뒤 부상병이 함께 모였을 때 집결을 쓰거나 후발 병력을 보낼 수 있습니다. 예고 범위는 병력을 따라 움직이지 않습니다.',
  '- 보스가 죽으면 남은 마법·비행 중 마력탄이 취소되고 성의 보호막이 사라집니다. 보스가 살아 있다면 성의 체력을 0으로 바꾸더라도 승리하지 않습니다.','',
  '| 단계 | 이름 | 타워 체력 | 타워 공격력 | 성 공격력 | 사거리 증가 | 사격 간격 배율 |','|---:|---|---|---|---:|---:|---:|',
 ];
 for(const stage of SIEGE_STAGES)lines.push(`| ${stage.id} | ${stage.name} | ${stage.towerHp.map(hp=>numberText(hp,2)).join(' / ')} | ${stage.towerAttack.map(attack=>numberText(attack,2)).join(' / ')} | ${numberText(stage.castleAttack,2)} | +${stage.castleRange-240} | ${stage.cooldownScale} |`);
 lines.push('','총 1,080회: 10단계 × 3가지 기본 난이도 × 6가지 편성 × 3가지 출격 순서 × 집결 사용 여부.','',
  '| 단계 | 연습 성공 / 36 | 표준 성공 / 36 | 도전 성공 / 36 |','|---:|---:|---:|---:|');
 for(const stage of SIEGE_STAGES){const wins=(difficulty:Difficulty)=>results.filter(result=>result.stageId===stage.id&&result.difficulty===difficulty&&result.phase==='won').length;lines.push(`| ${stage.id} | ${wins('practice')} | ${wins('standard')} | ${wins('challenge')} |`);}
 lines.push('','기본 전략에서는 집결을 타워 구간에서 소진하므로 마지막 보스전 108회가 모두 실패합니다. 집결을 누르지 않은 균형 편성 역시 세 난이도에서 전멸합니다. 아래 추가 검증에서는 마법에 맞은 뒤에 회복하는 전략으로 마지막 단계의 합법적인 클리어 경로를 확인했습니다.','',
  '## 보스전의 출격·회복 타이밍 탐색','',
  '추가 486회 = 6가지 편성 × 3난이도 × 3출격 순서 × 출격 간격 0.7 / 1.0 / 1.5초 × 마법 명중 후 반응 지연 0 / 0.5 / 1초입니다. 최초 세 번의 마법 명중 후 집결을 사용하며, 덧셈을 푸는 동안은 전투 시간이 진행하지 않습니다.','',
  '| 난이도 | 타이밍 전략 성공 / 162 |','|---|---:|');
 for(const difficulty of difficulties)lines.push(`| ${difficulty} | ${timingResults.filter(result=>result.difficulty===difficulty&&result.phase==='won').length} |`);
 lines.push('','화면에서 실행할 수 있는 공략은 방패 3 → 돌격 6 → 정찰 2 순서로 약 1초마다 출격하고, 처음 세 번의 광역 마법이 맞은 직후 집결을 사용하는 것입니다. 대안은 같은 순서로 방패 3 / 돌격 5 / 정찰 4를 약 0.7초마다 출격하는 정찰 지원 결전 편성입니다. 발사체 20% 가속 후 기존 방패 2 / 돌격 7 / 정찰 2·1초 출격 전략은 도전의 0.1초 갱신 간격에서 성 체력 0.64를 남기고 실패해, 능력치 변경 없이 합법적인 대안 편성을 탐색했습니다. 마지막 18회는 이 두 검증된 편성을 3난이도 × 10 / 20 / 60fps의 전투 갱신 간격으로 재현한 것으로, 모두 0.5초 반응 지연과 집결 정답 제출을 포함합니다.','',
  '| 편성 | 난이도 | 갱신 간격 | 결과 | 경과 초 | 생존 | 보스 마법 | 받은 피해 |','|---|---|---:|---|---:|---:|---:|---:|');
 for(const result of stabilityResults)lines.push(`| ${result.name} | ${result.difficulty} | ${result.dt.toFixed(4)} | ${result.phase} | ${result.elapsed} | ${result.alive} | ${result.spells} | ${numberText(result.armyDamage,2)} |`);
 lines.push('','총 1,584회 = 기본 1,080회 + 보스 타이밍 486회 + 갱신 간격 검증 18회. 아래는 각 단계의 대표 균형 편성 결과입니다. 1~9단계는 기존 집결 전략, 10단계는 마법 후 집결·1초 출격 간격·0.5초 반응 전략입니다.','',
  '| 단계 | 난이도 | 결과 | 경과 초 | 적 발사 | 받은 피해 | 생존 / 11 |','|---:|---|---|---:|---:|---:|---:|');
 for(const result of [...results.filter(result=>result.stageId<10&&result.name==='균형 편성'&&result.order==='guard-first'&&result.rally),...stabilityResults.filter(result=>result.name==='균형 편성'&&result.dt===.1)])lines.push(`| ${result.stageId} | ${result.difficulty} | ${result.phase} | ${result.elapsed} | ${result.enemyShots} | ${numberText(result.armyDamage,2)} | ${result.alive} |`);
 lines.push('','<details><summary>전체 자동 전략 1,080회 결과</summary>','',
  '| 단계 | 편성 | 난이도 | 순서 | 집결 | 결과 | 경과 초 | 성 잔여 체력 | 생존 | 타워 파괴 | 적 발사 | 받은 피해 |','|---:|---|---|---|---|---|---:|---:|---:|---:|---:|---:|');
 for(const result of results)lines.push(`| ${result.stageId} | ${result.name} | ${result.difficulty} | ${result.order} | ${result.rally?'사용':'없음'} | ${result.phase} | ${result.elapsed} | ${numberText(result.castle,2)} | ${result.alive} | ${result.towersDestroyed} / 4 | ${result.enemyShots} | ${numberText(result.armyDamage,2)} |`);
 lines.push('','</details>');
 lines.push('','재현: `npx tsx tools/simulate-secret-siege.ts`','');
 return {results,timingResults,stabilityResults,markdown:lines.join('\n')};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const report=siegeSimulationReport();writeFileSync('docs/secret-siege-balance.md',report.markdown);
 for(const stage of SIEGE_STAGES){const runs=report.results.filter(result=>result.stageId===stage.id);console.log('stage',stage.id,...(['practice','standard','challenge'] as const).map(difficulty=>`${difficulty} ${runs.filter(result=>result.difficulty===difficulty&&result.phase==='won').length}/36`));}
 const all=[...report.results,...report.timingResults,...report.stabilityResults];
 if(all.some(result=>result.phase==='playing'))throw Error('A strategy did not terminate');
 for(const stage of SIEGE_STAGES)for(const difficulty of ['practice','standard','challenge'] as const)if(!all.some(result=>result.stageId===stage.id&&result.difficulty===difficulty&&result.phase==='won'))throw Error('No legal clear for stage '+stage.id+' '+difficulty);
 for(const result of all){
  if(result.phase==='won'&&(result.towersDestroyed!==4||result.boss!==0))throw Error('Castle fell before all towers and boss: '+result.name);
  if(result.stageId<10&&result.name==='균형 편성'&&result.order==='guard-first'&&result.rally&&(result.phase!=='won'||result.firingTowers!==4))throw Error('Balanced rally formation must defeat all four active towers: stage '+result.stageId+' '+result.difficulty);
 }
 if(report.stabilityResults.some(result=>result.phase!=='won'))throw Error('The demonstrated timed formation must clear at every tested frame rate');
 if(report.results.some(result=>result.stageId===10&&result.phase==='won'))throw Error('Last stage unexpectedly permits an unadapted early-rally strategy');
 for(const difficulty of ['practice','standard','challenge'] as const)console.log('boss timing',difficulty,report.timingResults.filter(result=>result.difficulty===difficulty&&result.phase==='won').length+'/162');
 console.log('stable timed clears',report.stabilityResults.filter(result=>result.phase==='won').length+'/18','total simulations',all.length);
 if(!report.results.some(result=>result.name==='정찰 중심 편성'&&result.phase==='lost'))throw Error('Unbalanced scouts unexpectedly clear every run');
}
