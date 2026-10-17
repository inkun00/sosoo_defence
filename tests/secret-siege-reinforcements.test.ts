import {test} from 'node:test';
import assert from 'node:assert/strict';
import {SecretSiege} from '../src/secret-siege-model';
import {ARMY,type ArmyId} from '../src/secret-siege-types';
import {siegeMonster,SIEGE_MONSTERS} from '../src/secret-siege-monsters';
import {numberText} from '../src/math';
import {simulateSecretSiege,simulateSecretSiegeCampaign} from '../tools/simulate-secret-siege';

function recruit(game:SecretSiege,id:ArmyId){assert.ok(game.requestRecruit(id));assert.ok(game.answer(numberText(game.pendingQuestion!.answer,2)));}
function advance(game:SecretSiege,seconds:number){for(let tick=0;tick<Math.ceil(seconds*100);tick++)game.step(.01);}
function prepared(stage=1){const game=new SecretSiege('standard',stage);recruit(game,'guard');recruit(game,'scout');assert.ok(game.start());return game;}
function scoutFixture(){const game=prepared();assert.ok(game.deploy('scout'));for(const target of game.targets)target.reload=999;return game;}
const adaptive={name:'보상 재투자',guard:3,striker:3,scout:2,order:'guard-first',rally:true,rallyTiming:'boss-spell',deployGap:.7,reinforcements:['knight','priest','ranger','champion','knight','champion','priest','ranger']} as const;

test('seven human roles require permanent research and never unlock automatically from tower destruction',()=>{
 const game=new SecretSiege('standard');assert.equal(ARMY.length,7);assert.equal(new Set(ARMY.map(army=>army.id)).size,7);
 assert.deepEqual(ARMY.map(army=>army.row),[0,1,2,3,4,5,6]);
 for(const army of ARMY){assert.equal(game.armyUnlocked(army.id),army.researchCost===0);if(army.researchCost)assert.equal(game.requestRecruit(army.id),false);}
 const towers=game.targets.filter(target=>target.kind==='tower');
 for(let index=0;index<4;index++){towers[index].hp=0;assert.equal(game.destroyedTowers,index+1);for(const army of ARMY)assert.equal(game.armyUnlocked(army.id),army.researchCost===0);}
 assert.equal(game.earnedCoins,0,'a displayed unlock count does not manufacture a reward without a real hit');
});

test('tower destruction pays each tower exactly once and later rewards increase the same battle wallet',()=>{
 const game=scoutFixture(),scout=game.units[0],before=game.money;
 for(let index=0;index<4;index++){
  const tower=game.targets[index];tower.hp=10;scout.distance=tower.distance-95;scout.reload=0;advance(game,.4);
  assert.equal(tower.hp,0);assert.equal(game.earnedCoins,game.stage.towerRewards.slice(0,index+1).reduce((sum,coins)=>sum+coins,0));
 }
 assert.equal(game.earnedCoins,18000);assert.equal(game.money,before+18000);assert.equal(game.events.filter(event=>event.type==='reward').length,4);
 const first=game.targets[0];first.hp=10;scout.distance=first.distance-95;scout.reload=0;advance(game,.4);
 assert.equal(first.hp,0);assert.equal(game.money,before+18000);assert.equal(game.events.filter(event=>event.type==='reward').length,4);
 assert.ok(game.money>9990);assert.equal(game.requestRecruit('champion'),false,'tower income cannot bypass permanent research');assert.ok(game.requestRecruit('striker'));const question=game.pendingQuestion!;
 assert.equal(question.a,game.money);assert.equal(question.answer,question.a-question.b);assert.ok(question.answer>=10000);
 assert.equal(game.answer(numberText(question.answer-10000,2)),false);assert.ok(game.answer(numberText(question.answer,2)));assert.equal(game.money,question.answer);
 const retry=new SecretSiege(game.difficulty);assert.equal(retry.money,9900);assert.equal(retry.earnedCoins,0);assert.equal(retry.destroyedTowers,0);assert.equal(retry.armyUnlocked('knight'),false);
});

test('monster deaths never pay tower coins',()=>{
 const game=scoutFixture(),unit=game.units[0],enemy=siegeMonster(1,0,'standard',0);enemy.hp=10;enemy.distance=unit.distance+40;enemy.reload=999;game.monsters.push(enemy);
 advance(game,.4);assert.equal(enemy.hp,0);assert.equal(game.earnedCoins,0);assert.equal(game.events.some(event=>event.type==='reward'),false);
});

test('monster flight damage is cancelled when its shooter dies and freezes with questions and pause',()=>{
 const game=prepared();assert.ok(game.deploy('guard'));const unit=game.units[0],monster=siegeMonster(1,0,'standard',0);monster.distance=100;game.monsters.push(monster);for(const target of game.targets)target.reload=999;
 for(let tick=0;tick<300&&!game.projectiles.some(shot=>shot.sourceId===monster.id);tick++)game.step(.01);
 assert.ok(game.projectiles.some(shot=>shot.sourceId===monster.id));assert.ok(game.requestRecruit('scout'));
 const snapshot=()=>JSON.stringify({units:game.units,monsters:game.monsters,shots:game.projectiles,elapsed:game.elapsed,spawned:game.monsterSpawned});
 let before=snapshot();advance(game,10);assert.equal(snapshot(),before);game.cancelQuestion();game.togglePause();before=snapshot();advance(game,10);assert.equal(snapshot(),before);game.togglePause();
 const health=unit.hp;monster.hp=0;advance(game,.4);assert.equal(unit.hp,health);assert.equal(game.projectiles.some(shot=>shot.sourceId===monster.id),false);
});

test('the castle regularly sends progressively stronger monsters with new kinds and a bounded total and live population',()=>{
 const first=prepared(),last=prepared(10);advance(first,9.99);assert.equal(first.monsterSpawned,0);advance(first,.01);assert.equal(first.monsterSpawned,1);assert.equal(first.monsters[0].typeId,'imp');
 assert.ok(first.monsters[0].distance<950);assert.ok(last.stage.monsterSpawnInterval<first.stage.monsterSpawnInterval);assert.ok(last.monsterLimit>first.monsterLimit);
 for(const type of SIEGE_MONSTERS){const index=SIEGE_MONSTERS.indexOf(type),strong=siegeMonster(10,index,'standard',0);assert.equal(strong.typeId,type.id);assert.ok(strong.hp>type.hp);assert.ok(strong.attack>type.attack);}
 advance(last,179);assert.equal(last.monsters.filter(monster=>monster.hp>0).length,last.monsterAliveLimit);assert.ok(last.monsterSpawned<=last.monsterLimit);assert.ok(last.monsterSpawned<=8);
 const ids=new Set(last.monsters.map(monster=>monster.typeId));assert.deepEqual(ids,new Set(['imp','warg','golem']));
 const frozen=JSON.stringify(last.monsters);last.phase='won';advance(last,30);assert.equal(JSON.stringify(last.monsters),frozen);
});

test('both sides stop at their own attack range and deal damage only when their projectiles arrive',()=>{
 const game=prepared();assert.ok(game.deploy('guard'));const unit=game.units[0],monster=siegeMonster(1,0,'standard',0);monster.distance=100;game.monsters.push(monster);for(const target of game.targets)target.reload=999;
 for(let tick=0;tick<300&&!game.projectiles.some(shot=>shot.sourceId===monster.id);tick++)game.step(.01);
 const shot=game.projectiles.find(shot=>shot.sourceId===monster.id)!;assert.ok(shot);assert.equal(monster.targetId,unit.id);assert.equal(unit.targetId,monster.id);
 assert.ok(monster.attacking);assert.ok(Math.abs(monster.distance-unit.distance)<=monster.range+1e-6);const hp=unit.hp;game.step(.01);assert.equal(unit.hp,hp);
 advance(game,.3);assert.equal(unit.hp,hp-monster.attack);
 const previous=unit.distance;monster.distance=unit.distance-20;game.step(.01);assert.equal(unit.distance,previous,'an enemy behind the unit never teleports the unit backward');
});

test('troops may overkill monsters while exact subtraction still prevents oversized attacks against structures',()=>{
 const game=prepared();assert.ok(game.deploy('guard'));const unit=game.units[0],monster=siegeMonster(1,0,'standard',0);monster.hp=10;monster.distance=40;monster.reload=999;game.monsters.push(monster);for(const target of game.targets)target.reload=999;
 advance(game,.6);assert.equal(monster.hp,0);assert.ok(game.events.some(event=>event.type==='hit'&&event.targetId===monster.id&&event.damage===10));
 game.monsters=[];const tower=game.targets[0];tower.hp=10;unit.distance=tower.distance-40;unit.reload=0;advance(game,1);
 assert.equal(tower.hp,10);assert.ok(!game.projectiles.some(shot=>shot.source==='army'&&shot.targetId===tower.id));
});

test('priests automatically heal one nearby injured living ally, respect health caps and cooldown, and pause with questions',()=>{
 const game=new SecretSiege('standard',1,{coins:9900,researched:['priest']});recruit(game,'guard');recruit(game,'scout');recruit(game,'priest');for(const target of game.targets)target.reload=999;assert.ok(game.start());
 for(const id of ['guard','scout','priest'] as const){assert.ok(game.deploy(id));advance(game,.7);}for(const target of game.targets)target.reload=999;
 const guard=game.units[0],priest=game.units[2];guard.hp=guard.maxHp-100;const money=game.money,rallies=game.ralliesLeft;game.step(.01);
 assert.equal(guard.hp,guard.maxHp);assert.equal(priest.lastHeal,game.elapsed);assert.equal(game.money,money);assert.equal(game.ralliesLeft,rallies);
 const heals=game.events.filter(event=>event.type==='heal');assert.equal(heals.at(-1)!.targetId,guard.id);assert.equal(heals.at(-1)!.damage,100);
 guard.hp-=600;advance(game,1);assert.equal(guard.hp,guard.maxHp-600);assert.ok(game.requestRecruit('scout'));const snapshot=JSON.stringify({units:game.units,monsters:game.monsters,elapsed:game.elapsed});advance(game,10);assert.equal(JSON.stringify({units:game.units,monsters:game.monsters,elapsed:game.elapsed}),snapshot);game.cancelQuestion();
 advance(game,2.1);assert.ok(guard.hp>guard.maxHp-600);guard.hp=0;advance(game,3.1);assert.equal(guard.hp,0,'automatic healing cannot resurrect a dead ally');
});

for(const difficulty of ['practice','standard','challenge'] as const)test(`${difficulty}: a fresh continuous campaign researches elites using carried tower rewards and defeats defending monsters`,()=>{
 for(const dt of [.1,.05,1/60])for(const result of simulateSecretSiegeCampaign(difficulty,dt).results){
  assert.equal(result.phase,'won',`stage=${result.stageId}, dt=${dt}`);assert.equal(result.castle,0);assert.equal(result.boss,0);
  assert.equal(result.earnedCoins,18000);assert.equal(result.towersDestroyed,4);assert.ok(result.monstersDefeated>0);assert.ok(result.elapsed<180);assert.ok(result.remainingMoney>=7480);
 }
});

for(const difficulty of ['practice','standard','challenge'] as const)test(`${difficulty}: the final boss still defeats no-heal, early-heal, no-investment, scout-heavy and priest-only investment strategies`,()=>{
 for(const plan of [
  {...adaptive,rally:false},
  {...adaptive,rallyTiming:'early' as const},
  {...adaptive,reinforcements:[]},
  {...adaptive,guard:1,striker:0,scout:11,reinforcements:[]},
  {...adaptive,reinforcements:Array<ArmyId>(8).fill('priest')},
  {...adaptive,rally:false,reinforcements:Array<ArmyId>(8).fill('priest')},
 ]){
  const final=simulateSecretSiegeCampaign(difficulty).results[9],result=simulateSecretSiege(difficulty,plan,10,.1,{coins:final.startingCoins,researched:final.researched});assert.equal(result.phase,'lost');assert.ok(result.castle>0||result.boss>0);assert.ok(result.peakArmyCount<=12);assert.equal(result.remainingMoney,result.startingCoins+result.earnedCoins-result.spent);
 }
});
