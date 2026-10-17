import {test} from 'node:test';
import assert from 'node:assert/strict';
import {SecretSiege} from '../src/secret-siege-model';
import {SIEGE_STAGE_COUNT,SIEGE_STAGES,siegeStage} from '../src/secret-siege-stages';
import {learningValue} from '../src/math';
import {simulateSecretSiege,simulateSecretSiegeCampaign} from '../tools/simulate-secret-siege';

const balanced={name:'균형 편성',guard:3,striker:3,scout:2,order:'guard-first',rally:true,deployGap:.7,reinforcements:['knight','priest','ranger','champion','knight','champion','priest','ranger']} as const;

test('비밀 원정은 이름이 다른 정확히 10단계이며 유효한 정수 ID만 받는다',()=>{
 assert.equal(SIEGE_STAGE_COUNT,10);assert.equal(SIEGE_STAGES.length,10);
 assert.deepEqual(SIEGE_STAGES.map(stage=>stage.id),[1,2,3,4,5,6,7,8,9,10]);
 assert.equal(new Set(SIEGE_STAGES.map(stage=>stage.name)).size,10);
 for(const stage of SIEGE_STAGES){assert.equal(siegeStage(stage.id),stage);assert.ok(stage.subtitle.length>0);assert.ok(stage.darkness>=0&&stage.darkness<=1);assert.ok(Object.isFrozen(stage)&&Object.isFrozen(stage.towerHp));}
 for(const id of [0,-1,11,1.5,NaN,Infinity]){
  assert.throws(()=>siegeStage(id),RangeError);assert.throws(()=>new SecretSiege('standard',id),RangeError);
 }
});

test('모든 단계의 성과 네 타워 체력·공격력은 자연수 부분 한 자리인 정확한 소수 두 자리 범위다',()=>{
 for(const stage of SIEGE_STAGES){
  const game=new SecretSiege('standard',stage.id);
  assert.equal(game.stageId,stage.id);assert.equal(game.stage,stage);assert.equal(game.targets.length,stage.id===10?6:5);
  assert.deepEqual(game.targets.slice(0,4).map(target=>target.hp),stage.towerHp);assert.equal(game.castle,stage.castleHp);
  assert.deepEqual(game.targets.slice(0,4).map(target=>target.attack),stage.towerAttack);assert.equal(game.targets.find(target=>target.kind==='castle')!.attack,stage.castleAttack);
  for(const target of game.targets.filter(target=>target.kind!=='boss')){assert.ok(learningValue(target.hp)&&target.hp>0);assert.ok(learningValue(target.attack)&&target.attack>0);assert.equal(target.hp,target.maxHp);}
  assert.equal(game.money,9900);assert.equal(game.ralliesLeft,3);assert.equal(game.elapsed,0);
 }
});

for(const difficulty of ['practice','standard','challenge'] as const)test(`${difficulty}: 단계가 오를 때 체력·공격력·사거리는 증가하고 사격 간격은 감소한다`,()=>{
 for(let id=2;id<=SIEGE_STAGE_COUNT;id++){
  const before=new SecretSiege(difficulty,id-1),after=new SecretSiege(difficulty,id);
  assert.ok(after.stage.darkness>before.stage.darkness);
  for(let index=0;index<5;index++){
   const a=before.targets.filter(target=>target.kind!=='boss')[index],b=after.targets.filter(target=>target.kind!=='boss')[index];
   assert.equal(a.id,b.id);assert.equal(a.distance,b.distance);assert.equal(a.kind,b.kind);
   assert.ok(b.hp>=a.hp);if(b.kind==='tower')assert.ok(b.hp>a.hp);
   assert.ok(b.attack>a.attack);assert.ok(b.range>a.range);assert.ok(b.cooldown<a.cooldown);
  }
 }
});

for(const difficulty of ['practice','standard','challenge'] as const)test(`${difficulty}: 최초 9.90에서 잔액과 유료 연구를 이월하는 연속 원정 10단계를 클리어할 수 있다`,()=>{
 const results=simulateSecretSiegeCampaign(difficulty).results;assert.equal(results.length,10);
 for(const result of results){
  assert.equal(result.phase,'won',`stage ${result.stageId}`);assert.equal(result.castle,0);assert.ok(result.remainingMoney>=7480);assert.equal(result.earnedCoins,18000);
  assert.ok(result.recruited>=8);assert.equal(result.deployed,result.recruited);assert.equal(result.towersDestroyed,4);assert.equal(result.firingTowers,4);
  assert.ok(result.elapsed<180);assert.equal(result.rallies,3);assert.ok(result.enemyShots>0);assert.ok(result.armyDamage>0);
 }
 const first=results[0],last=results[9];
 assert.ok(last.enemyShots>first.enemyShots,'최종 수비진은 실제 발사 횟수도 더 많다');
 assert.ok(last.armyDamage>first.armyDamage*2,'최종 수비진은 실제 받은 피해도 두 배 이상이다');
 assert.ok(last.recruited-last.alive>first.recruited-first.alive,'추가 훈련이 가능해도 최종 수비진에서 실제 사상자가 더 많다');
});

test('최종 단계도 정찰 편중과 소규모 군대로 자동 돌파할 수 없다',()=>{
 for(const difficulty of ['practice','standard','challenge'] as const)for(const plan of [
  {...balanced,name:'정찰 편중',guard:1,striker:0,scout:11},
  {...balanced,name:'소규모',guard:1,striker:1,scout:1},
 ]){
  const result=simulateSecretSiege(difficulty,plan,10);
  assert.equal(result.phase,'lost');assert.ok(result.castle>0);assert.ok(result.enemyShots>0);assert.ok(result.armyDamage>0);
 }
});

test('마지막 단계의 승리는 앞선 원정과 다른 최종 구원 문구를 발행한다',()=>{
 for(const stageId of [1,10]){
  const game=new SecretSiege('practice',stageId);
  for(const id of ['guard','striker','scout'] as const){assert.ok(game.requestRecruit(id));assert.ok(game.answer(String(game.pendingQuestion!.answer/1000)));}
  assert.ok(game.start());assert.ok(game.deploy('scout'));
  for(const target of game.targets)target.hp=target.kind==='castle'?10:0;
  game.units[0].distance=game.targets.find(target=>target.kind==='castle')!.distance-95;
  for(let tick=0;tick<10&&game.phase==='playing';tick++)game.step(.1);
  assert.equal(game.phase,'won');const message=game.events.find(event=>event.type==='won')!.message;
  assert.match(message,stageId===10?/세상에 빛/:/다음 원정길/);
 }
});
