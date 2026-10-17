import {writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {SecretSiege} from '../src/secret-siege-model';
import {ARMY,type ArmyId} from '../src/secret-siege-types';
import type {Difficulty} from '../src/difficulty';
import {numberText} from '../src/math';

export interface SiegePlan{name:string;guard:number;striker:number;scout:number;order:'guard-first'|'striker-first'|'scout-first';rally:boolean;}
export function simulateSecretSiege(difficulty:Difficulty,plan:SiegePlan){
 const game=new SecretSiege(difficulty),ids:ArmyId[]=['guard','striker','scout'];
 for(const id of ids)for(let index=0;index<plan[id];index++){
  if(!game.requestRecruit(id)||!game.answer(numberText(game.pendingQuestion!.answer,2)))throw Error('Illegal recruitment: '+plan.name);
 }
 const keys:ArmyId[]=plan.order==='guard-first'?['guard','striker','scout']:plan.order==='striker-first'?['striker','guard','scout']:['scout','striker','guard'];
 const order=keys.flatMap(id=>Array<ArmyId>(plan[id]).fill(id));
 if(!game.start())throw Error('Plan must contain a scout and another troop');
 let next=0;
 for(let tick=0;tick<2000&&game.phase==='playing';tick++){
  if(next<order.length&&game.deploy(order[next]))next++;
  const active=game.units.filter(unit=>unit.hp>0),missing=active.reduce((sum,unit)=>sum+unit.maxHp-unit.hp,0);
  if(plan.rally&&game.canRally&&missing>=1800){
   if(!game.requestRally()||!game.answer(numberText(game.pendingQuestion!.answer,2)))throw Error('Illegal rally');
  }
  game.step(.1);game.events.length=0;
 }
 return {difficulty,...plan,phase:game.phase,elapsed:Number(game.elapsed.toFixed(1)),castle:game.castle,alive:game.units.filter(unit=>unit.hp>0).length,remainingMoney:game.money,rallies:3-game.ralliesLeft,stars:game.stars,recruited:game.recruited,deployed:game.deployed};
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
 const results=(['practice','standard','challenge'] as const).flatMap(difficulty=>compositions.flatMap(composition=>(['guard-first','striker-first','scout-first'] as const).flatMap(order=>[false,true].map(rally=>simulateSecretSiege(difficulty,{...composition,order,rally})))));
 const lines=[
  '# 비밀 스테이지 역공격 밸런스 검증','',
  '모든 실행은 공개 API로 정확한 모집 뺄셈 문제를 풀고, 실제 보유 군대만 출격시켰습니다. 돈·체력·시간·명중 판정에 대한 주입이나 전투 중 수치 변경은 없습니다. 자동 전략의 성공 비율이며 실제 어린이의 성공률을 뜻하지 않습니다.','',
  '시작 코인 9.90, 동시 보유 한도 12명, 제한 시간 180초입니다. 출격은 0.65초 이상 간격을 지켰습니다. 집결 전략은 살아 있는 병력의 전체 결손 체력이 1.80 이상일 때 덧셈 문제에 정답을 제출해 사용했습니다. 문제를 푸는 동안 전투·발사체·시간은 정지합니다.','',
  '감시탑 체력 3.60, 경비탑 5.40, 마법사의 성 9.99. 적 공격은 0.10 / 0.20 / 0.30이며, 연습·표준·도전은 적 사격 간격만 다릅니다. 아군의 초과 공격은 무효이고, 0.01 정찰병이 소수 두 자리 나머지를 마무리합니다.','',
  '| 난이도 | 성공 / 실행 | 성공 비율 |','|---|---:|---:|',
 ];
 for(const difficulty of ['practice','standard','challenge'] as const){const subset=results.filter(result=>result.difficulty===difficulty),wins=subset.filter(result=>result.phase==='won').length;lines.push(`| ${difficulty} | ${wins} / ${subset.length} | ${(wins/subset.length*100).toFixed(1)}% |`);}
 lines.push('','| 편성 | 난이도 | 순서 | 집결 | 결과 | 경과 초 | 성 잔여 체력 | 생존 |','|---|---|---|---|---|---:|---:|---:|');
 for(const result of results)lines.push(`| ${result.name} | ${result.difficulty} | ${result.order} | ${result.rally?'사용':'없음'} | ${result.phase} | ${result.elapsed} | ${numberText(result.castle,2)} | ${result.alive} |`);
 lines.push('','재현: `npx tsx tools/simulate-secret-siege.ts`','');
 return {results,markdown:lines.join('\n')};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const report=siegeSimulationReport();writeFileSync('docs/secret-siege-balance.md',report.markdown);
 for(const difficulty of ['practice','standard','challenge'] as const){const runs=report.results.filter(result=>result.difficulty===difficulty);console.log(difficulty,`${runs.filter(result=>result.phase==='won').length}/${runs.length}`,runs.filter(result=>result.name==='균형 편성').map(result=>`${result.order}/${result.rally}:${result.phase}@${result.elapsed}`).join(' '));}
 if(report.results.some(result=>result.phase==='playing'))throw Error('A strategy did not terminate');
 for(const difficulty of ['practice','standard','challenge'] as const)if(!report.results.some(result=>result.difficulty===difficulty&&result.phase==='won'))throw Error('No legal clear for '+difficulty);
 if(!report.results.some(result=>result.name==='정찰 중심 편성'&&result.phase==='lost'))throw Error('Unbalanced scouts unexpectedly clear every run');
}
