import {test} from 'node:test';
import assert from 'node:assert/strict';
import {SecretSiege,SIEGE_RECRUIT_INCREMENT} from '../src/secret-siege-model';
import {ARMY,SIEGE_ARMY_LIMIT,type ArmyId} from '../src/secret-siege-types';
import {learningValue,numberText} from '../src/math';

const army=(id:ArmyId)=>ARMY.find(spec=>spec.id===id)!;
function recruit(game:SecretSiege,id:ArmyId){assert.ok(game.requestRecruit(id),id);const question=game.pendingQuestion!;assert.ok(game.answer(numberText(question.answer,2)));return question;}
function advance(game:SecretSiege,seconds:number){for(let tick=0;tick<Math.ceil(seconds*10);tick++)game.step(.1);}

test('each successful troop reservation increases every following troop price before any deployment',()=>{
 const game=new SecretSiege('standard');assert.equal(SIEGE_RECRUIT_INCREMENT,10);
 assert.deepEqual(ARMY.map(spec=>game.recruitCost(spec.id)),ARMY.map(spec=>spec.cost));
 let wallet=9900;
 for(const [index,id] of (['guard','striker','scout','striker'] as const).entries()){
  const cost=army(id).cost+index*SIEGE_RECRUIT_INCREMENT;assert.equal(game.recruitCost(id),cost);assert.ok(game.canRecruit(id));
  assert.ok(game.requestRecruit(id));assert.equal(game.recruited,index);assert.equal(game.deployed,0);assert.equal(game.money,wallet);assert.equal(game.canRecruit(id),false);
  const question=game.pendingQuestion!;assert.deepEqual([question.a,question.b,question.answer],[wallet,cost,wallet-cost]);
  assert.ok(game.answer(numberText(question.answer,2)));wallet-=cost;assert.equal(game.money,wallet);assert.equal(game.recruited,index+1);
  for(const spec of ARMY)assert.equal(game.recruitCost(spec.id),spec.cost+(index+1)*SIEGE_RECRUIT_INCREMENT);
 }
 assert.equal(game.deployed,0);assert.equal(game.armyCount,4,'stockpiling pays the same escalation as field reinforcements');
});

test('wrong answers, cancellation, duplicate submissions and pauses never increase a troop price',()=>{
 const game=new SecretSiege('standard');assert.ok(game.requestRecruit('guard'));const first=game.pendingQuestion!;
 for(const text of ['8.69','8.701','-1','NaN',''])assert.equal(game.answer(text),false);
 assert.equal(game.money,9900);assert.equal(game.recruited,0);assert.equal(game.recruitCost('guard'),1200);
 game.cancelQuestion();assert.ok(game.requestRecruit('guard'));assert.equal(game.pendingQuestion!.id,first.id);assert.equal(game.pendingQuestion!.b,first.b);
 assert.ok(game.answer(numberText(first.answer,2)));const price=game.recruitCost('guard'),wallet=game.money;
 assert.equal(game.answer(numberText(first.answer,2)),false);assert.equal(game.recruitCost('guard'),price);assert.equal(game.money,wallet);
 recruit(game,'scout');assert.ok(game.start());game.togglePause();const before=game.recruitCost('scout');
 assert.equal(game.canRecruit('scout'),false);assert.equal(game.requestRecruit('scout'),false);advance(game,10);assert.equal(game.recruitCost('scout'),before);
});

test('deployment consumes a prepaid troop exactly once without charging or escalating the reserved price again',()=>{
 const game=new SecretSiege('standard');recruit(game,'guard');recruit(game,'scout');const wallet=game.money;
 assert.ok(game.start());assert.ok(game.deploy('guard'));assert.equal(game.money,wallet);assert.equal(game.recruited,2);assert.equal(game.deployed,1);
 assert.equal(game.deploy('scout'),false);advance(game,.7);assert.ok(game.deploy('scout'));assert.equal(game.money,wallet);
 assert.equal(game.recruited,2);assert.equal(game.deployed,2);assert.equal(game.recruitCost('striker'),900+2*SIEGE_RECRUIT_INCREMENT);
 advance(game,.7);assert.equal(game.deploy('guard'),false);assert.equal(game.money,wallet);
});

test('fallen troops free army slots without resetting the successful recruitment counter or reinforcement price',()=>{
 const game=new SecretSiege('challenge',10);recruit(game,'guard');recruit(game,'scout');assert.ok(game.start());assert.ok(game.deploy('guard'));
 for(let tick=0;tick<1800&&game.units[0].hp>0;tick++)game.step(.1);
 assert.equal(game.units[0].hp,0);assert.equal(game.phase,'playing');assert.equal(game.armyCount,1);assert.equal(game.recruited,2);
 const cost=game.recruitCost('scout'),wallet=game.money;assert.equal(cost,450+2*SIEGE_RECRUIT_INCREMENT);
 const question=recruit(game,'scout');assert.equal(question.b,cost);assert.equal(game.money,wallet-cost);assert.equal(game.recruited,3);
 const retry=new SecretSiege(game.difficulty,game.stageId);assert.equal(retry.money,9900);assert.equal(retry.recruited,0);assert.equal(retry.recruitCost('scout'),450);
});

test('stale wallet, changed recruitment count and forged low-price quotes cannot reserve a troop',()=>{
 const walletChanged=new SecretSiege('standard');walletChanged.requestRecruit('guard');let question=walletChanged.pendingQuestion!;walletChanged.money-=10;
 assert.equal(walletChanged.answer(numberText(question.answer,2)),false);assert.equal(walletChanged.money,9890);assert.equal(walletChanged.recruited,0);assert.equal(walletChanged.reserve.guard,0);
 const countChanged=new SecretSiege('standard');countChanged.requestRecruit('guard');question=countChanged.pendingQuestion!;countChanged.recruited=1;
 assert.equal(countChanged.answer(numberText(question.answer,2)),false);assert.equal(countChanged.money,9900);assert.equal(countChanged.recruited,1);assert.equal(countChanged.reserve.guard,0);
 const forged=new SecretSiege('standard');recruit(forged,'scout');assert.ok(forged.requestRecruit('guard'));question=forged.pendingQuestion!;
 question.b=army('guard').cost;question.answer=question.a-question.b;const before=forged.money;
 assert.equal(forged.answer(numberText(question.answer,2)),false);assert.equal(forged.money,before);assert.equal(forged.reserve.guard,0);assert.equal(forged.recruited,1);
});

test('preparation reserves the future increased price and slot needed to start a legal scout and frontline formation',()=>{
 for(const id of ['guard','striker','scout'] as const){
  const game=new SecretSiege('standard');while(game.canRecruit(id))recruit(game,id);
  assert.ok(game.armyCount>0);assert.ok(game.armyCount<SIEGE_ARMY_LIMIT);assert.equal(game.requestRecruit(id),false);
  const missing=id==='scout'?'striker':'scout';assert.ok(game.money>=game.recruitCost(missing));assert.ok(game.canRecruit(missing));recruit(game,missing);
  assert.ok(game.start(),`${id} spam must still leave an affordable legal starting formation`);
 }
});

test('every reachable preparation quote stays in the 9.90 wallet and two-decimal learning range under the army limit',()=>{
 const pending:[ArmyId[],number][]=[[[],9900]],seen=new Set<string>();let checked=0;
 while(pending.length){
  const [ids,wallet]=pending.shift()!,counts=ARMY.map(spec=>ids.filter(id=>id===spec.id).length),key=counts.join(':');if(seen.has(key))continue;seen.add(key);
  const game=new SecretSiege('standard');for(const id of ids)recruit(game,id);assert.equal(game.money,wallet);assert.ok(game.armyCount<=SIEGE_ARMY_LIMIT);
  for(const spec of ARMY){
   const price=game.recruitCost(spec.id);assert.ok(learningValue(price)&&price>0);if(!game.canRecruit(spec.id))continue;
   assert.ok(game.requestRecruit(spec.id));const question=game.pendingQuestion!;
   assert.ok([question.a,question.b,question.answer].every(learningValue));assert.ok(question.a<=9900&&question.answer>=0);assert.equal(question.b,price);
   pending.push([[...ids,spec.id],wallet-price]);game.cancelQuestion();checked++;
  }
 }
 assert.ok(checked>100);assert.ok(seen.size>100);
});

test('exhaustion uses the increased cheapest reinforcement price rather than the original scout price',()=>{
 const game=new SecretSiege('standard');game.phase='playing';game.recruited=4;game.money=game.recruitCost('scout')-10;
 assert.ok(game.money>=army('scout').cost);assert.equal(game.canRecruit('scout'),false);game.step(.1);assert.equal(game.phase,'lost');
 const capped=new SecretSiege('standard');capped.recruited=1000000;for(const spec of ARMY){assert.equal(capped.recruitCost(spec.id),9990);assert.equal(capped.canRecruit(spec.id),false);}
});
