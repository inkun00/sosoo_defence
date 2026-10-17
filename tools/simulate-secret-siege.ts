import {writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {SecretSiege} from '../src/secret-siege-model';
import {ARMY,type ArmyId} from '../src/secret-siege-types';
import type {Difficulty} from '../src/difficulty';
import {numberText} from '../src/math';
import {SIEGE_STAGES} from '../src/secret-siege-stages';

export interface SiegePlan{name:string;guard:number;striker:number;scout:number;order:'guard-first'|'striker-first'|'scout-first';rally:boolean;}
export function simulateSecretSiege(difficulty:Difficulty,plan:SiegePlan,stageId=1){
 const game=new SecretSiege(difficulty,stageId),ids:ArmyId[]=['guard','striker','scout'];
 for(const id of ids)for(let index=0;index<plan[id];index++){
  if(!game.requestRecruit(id)||!game.answer(numberText(game.pendingQuestion!.answer,2)))throw Error('Illegal recruitment: '+plan.name);
 }
 const keys:ArmyId[]=plan.order==='guard-first'?['guard','striker','scout']:plan.order==='striker-first'?['striker','guard','scout']:['scout','striker','guard'];
 const order=keys.flatMap(id=>Array<ArmyId>(plan[id]).fill(id));
 if(!game.start())throw Error('Plan must contain a scout and another troop');
 let next=0,enemyShots=0,armyDamage=0;const firingTowers=new Set<string>();
 for(let tick=0;tick<2000&&game.phase==='playing';tick++){
  if(next<order.length&&game.deploy(order[next]))next++;
  const active=game.units.filter(unit=>unit.hp>0),missing=active.reduce((sum,unit)=>sum+unit.maxHp-unit.hp,0);
  if(plan.rally&&game.canRally&&missing>=1800){
   if(!game.requestRally()||!game.answer(numberText(game.pendingQuestion!.answer,2)))throw Error('Illegal rally');
  }
  game.step(.1);
  for(const event of game.events){if(event.type==='shot'&&!event.friendly)enemyShots++;if(event.type==='hit'&&!event.friendly)armyDamage+=event.damage??0;}
  for(const shot of game.projectiles)if(shot.source==='enemy'){
   const source=game.targets.find(target=>target.kind==='tower'&&target.id===shot.sourceId);if(source)firingTowers.add(source.id);
  }
  game.events.length=0;
 }
 return {stageId,difficulty,...plan,phase:game.phase,elapsed:Number(game.elapsed.toFixed(1)),castle:game.castle,alive:game.units.filter(unit=>unit.hp>0).length,remainingMoney:game.money,rallies:3-game.ralliesLeft,stars:game.stars,recruited:game.recruited,deployed:game.deployed,towersDestroyed:game.targets.filter(target=>target.kind==='tower'&&target.hp===0).length,firingTowers:firingTowers.size,enemyShots,armyDamage};
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
 const lines=[
  '# 비밀 원정 10단계 역공격 밸런스 검증','',
  '모든 실행은 공개 API로 정확한 모집 뺄셈 문제를 풀고, 실제 보유 군대만 출격시켰습니다. 돈·체력·시간·명중 판정에 대한 주입이나 전투 중 수치 변경은 없습니다. 자동 전략의 성공 비율이며 실제 어린이의 성공률을 뜻하지 않습니다.','',
  '시작 코인 9.90, 동시 보유 한도 12명, 제한 시간 180초입니다. 출격은 0.65초 이상 간격을 지켰습니다. 집결 전략은 살아 있는 병력의 전체 결손 체력이 1.80 이상일 때 덧셈 문제에 정답을 제출해 사용했습니다. 문제를 푸는 동안 전투·발사체·시간은 정지합니다.','',
  '마력탑·독탑 네 기를 경로 거리 240 / 430 / 620 / 800에서 차례로 파괴해야 성을 공격할 수 있습니다. 1단계의 타워 체력은 2.40 / 3.60 / 4.50 / 5.40이며 단계마다 각각 0.45씩 증가합니다. 10단계는 6.45 / 7.65 / 8.55 / 9.45입니다. 성의 체력은 학습 수 범위를 지키기 위해 모든 단계에서 9.99이며 공격력·사거리·사격 빈도가 증가합니다. 모든 개별 체력과 공격력은 10 미만의 소수 두 자리 범위를 유지합니다.','',
  '기본 사격 간격(네 타워 / 성)은 연습 2.10 / 2.00 / 1.90 / 1.80 / 1.65초, 표준 1.60 / 1.55 / 1.50 / 1.40 / 1.20초, 도전 1.25 / 1.20 / 1.15 / 1.10 / 0.95초입니다. 단계마다 사격 배율이 0.018씩 감소하며 10단계는 기본 간격의 0.838배입니다. 타워는 사거리 안 가장 앞선 병사를 조준하며 발사체는 0.5초 후 명중합니다. 파괴된 타워의 비행 중 공격은 취소됩니다. 아군의 초과 공격은 무효이며 0.01 정찰병이 소수 두 자리 나머지를 마무리합니다.','',
  '각 단계는 앞 단계보다 타워 체력·모든 적 공격력·사거리가 높고 사격 간격이 짧습니다. 정확한 나머지를 마무리하는 소요 시간과 피격 대상이 달라져 모든 자동 편성의 클리어 시간이나 받은 피해가 매 단계 단조롭게 증가하지는 않습니다. 난이도는 적의 실제 수치와 아래의 전투 지표를 함께 검증했습니다.','',
  '| 단계 | 이름 | 타워 체력 | 타워 공격력 | 성 공격력 | 사거리 증가 | 사격 간격 배율 |','|---:|---|---|---|---:|---:|---:|',
 ];
 for(const stage of SIEGE_STAGES)lines.push(`| ${stage.id} | ${stage.name} | ${stage.towerHp.map(hp=>numberText(hp,2)).join(' / ')} | ${stage.towerAttack.map(attack=>numberText(attack,2)).join(' / ')} | ${numberText(stage.castleAttack,2)} | +${stage.castleRange-240} | ${stage.cooldownScale} |`);
 lines.push('','총 1,080회: 10단계 × 3가지 기본 난이도 × 6가지 편성 × 3가지 출격 순서 × 집결 사용 여부.','',
  '| 단계 | 연습 성공 / 36 | 표준 성공 / 36 | 도전 성공 / 36 |','|---:|---:|---:|---:|');
 for(const stage of SIEGE_STAGES){const wins=(difficulty:Difficulty)=>results.filter(result=>result.stageId===stage.id&&result.difficulty===difficulty&&result.phase==='won').length;lines.push(`| ${stage.id} | ${wins('practice')} | ${wins('standard')} | ${wins('challenge')} |`);}
 lines.push('','균형 편성(방패 3 / 돌격 6 / 정찰 2, 9.90 코인), 방패 우선 출격, 실제 덧셈 집결 3회 사용의 비교입니다. 모든 단계와 기본 난이도에서 합법적으로 클리어할 수 있습니다.','',
  '| 단계 | 난이도 | 결과 | 경과 초 | 적 발사 | 받은 피해 | 생존 / 11 |','|---:|---|---|---:|---:|---:|---:|');
 for(const result of results.filter(result=>result.name==='균형 편성'&&result.order==='guard-first'&&result.rally))lines.push(`| ${result.stageId} | ${result.difficulty} | ${result.phase} | ${result.elapsed} | ${result.enemyShots} | ${numberText(result.armyDamage,2)} | ${result.alive} |`);
 lines.push('','<details><summary>전체 자동 전략 1,080회 결과</summary>','',
  '| 단계 | 편성 | 난이도 | 순서 | 집결 | 결과 | 경과 초 | 성 잔여 체력 | 생존 | 타워 파괴 | 적 발사 | 받은 피해 |','|---:|---|---|---|---|---|---:|---:|---:|---:|---:|---:|');
 for(const result of results)lines.push(`| ${result.stageId} | ${result.name} | ${result.difficulty} | ${result.order} | ${result.rally?'사용':'없음'} | ${result.phase} | ${result.elapsed} | ${numberText(result.castle,2)} | ${result.alive} | ${result.towersDestroyed} / 4 | ${result.enemyShots} | ${numberText(result.armyDamage,2)} |`);
 lines.push('','</details>');
 lines.push('','재현: `npx tsx tools/simulate-secret-siege.ts`','');
 return {results,markdown:lines.join('\n')};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const report=siegeSimulationReport();writeFileSync('docs/secret-siege-balance.md',report.markdown);
 for(const stage of SIEGE_STAGES){const runs=report.results.filter(result=>result.stageId===stage.id);console.log('stage',stage.id,...(['practice','standard','challenge'] as const).map(difficulty=>`${difficulty} ${runs.filter(result=>result.difficulty===difficulty&&result.phase==='won').length}/36`));}
 if(report.results.some(result=>result.phase==='playing'))throw Error('A strategy did not terminate');
 for(const stage of SIEGE_STAGES)for(const difficulty of ['practice','standard','challenge'] as const)if(!report.results.some(result=>result.stageId===stage.id&&result.difficulty===difficulty&&result.phase==='won'))throw Error('No legal clear for stage '+stage.id+' '+difficulty);
 for(const result of report.results){
  if(result.phase==='won'&&result.towersDestroyed!==4)throw Error('Castle fell before all towers: '+result.name);
  if(result.name==='균형 편성'&&result.order==='guard-first'&&result.rally&&(result.phase!=='won'||result.firingTowers!==4))throw Error('Balanced rally formation must defeat all four active towers: stage '+result.stageId+' '+result.difficulty);
 }
 if(!report.results.some(result=>result.name==='정찰 중심 편성'&&result.phase==='lost'))throw Error('Unbalanced scouts unexpectedly clear every run');
}
