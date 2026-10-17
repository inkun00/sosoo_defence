import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Defense} from '../src/model';
import {LEVELS} from '../src/levels';
import {numberText,purchaseCoins} from '../src/math';
import {TOWERS,towerPrice,borrowingPlaces} from '../src/towers';
import {classify,loadLearning,recordLearning,type LearningSample} from '../src/learning';
import {createDuel,joinDuel,applyDuel} from '../src/multiplayer/duel';

function withStorage(run:()=>void){
 const previous=Object.getOwnPropertyDescriptor(globalThis,'localStorage'),data=new Map<string,string>();
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>data.set(key,value)}});
 try{run();}finally{if(previous)Object.defineProperty(globalThis,'localStorage',previous);else Reflect.deleteProperty(globalThis,'localStorage');}
}
const finalModel=()=>new Defense(LEVELS.at(-1)!);

test('the final stage shows 19.98 − 2.00 = 17.98 then 17.98 − 2.01 = 15.97 using the complete wallet',()=>{
 const model=finalModel();assert.ok(model.requestPurchase({x:1,y:3},'catapult'));
 let question=model.pendingPurchase!;
 assert.deepEqual([question.wallet,question.before,question.cost],[19980,19980,2000]);
 assert.ok(model.answerPurchase('17.98'));assert.equal(model.money,17980);
 assert.equal(model.towers[0].cost,2000);assert.equal(model.purchaseAnswers,1);
 assert.ok(model.events.some(event=>event.type==='money'&&event.message==='19.98 − 2.00 = 17.98 · 투석기 설치'));
 assert.ok(model.requestPurchase({x:2,y:3},'catapult'));question=model.pendingPurchase!;
 assert.deepEqual([question.wallet,question.before,question.cost],[17980,17980,2010]);
 assert.equal(model.answerPurchase('7.97'),false);assert.equal(model.money,17980);assert.equal(model.towers.length,1);assert.equal(model.pendingPurchase,question);
 assert.ok(model.answerPurchase('15.97'));assert.equal(model.money,15970);assert.equal(model.purchaseAnswers,2);
 assert.ok(model.events.some(event=>event.type==='money'&&event.message==='17.98 − 2.01 = 15.97 · 투석기 설치'));
 assert.deepEqual(model.purchaseWrongAttempts,[0,1]);
 model.sellTower(model.towers[1].id);assert.equal(model.money,17980);
 model.sellTower(model.towers[0].id);assert.equal(model.money,19980);assert.equal(model.earnedCoins,0);
});

test('wrong truncated answers and cancellations never spend money or place towers, and repeated quotes retain normal price variation',()=>{
 const model=finalModel();assert.ok(model.requestPurchase({x:1,y:3},'catapult'));const first=model.pendingPurchase!;
 for(const wrong of ['7.98','9.98','0','abc','17.980']){assert.equal(model.answerPurchase(wrong),false);assert.equal(model.money,19980);assert.equal(model.pendingPurchase,first);assert.equal(model.towers.length,0);}
 model.cancelPurchase();assert.equal(model.money,19980);assert.equal(model.pendingPurchase,null);
 assert.ok(model.requestPurchase({x:1,y:3},'catapult'));const second=model.pendingPurchase!;
 assert.equal(second.before,19980);assert.equal(second.cost,2010);assert.notEqual(second.cost,first.cost);
 assert.equal(model.purchaseVariation.lastBefore,purchaseCoins(second.before),'variation keeps its shared bounded quote key, not the story operand');
 model.cancelPurchase();assert.equal(model.money,19980);assert.equal(model.earnedCoins,0);
});

test('every story stage and researched tower uses the full 98.76 wallet, preserving exact answers and refunds',()=>{
 for(const level of LEVELS)for(const type of TOWERS){
  const model=new Defense(level,undefined,'standard',TOWERS.map(tower=>tower.id));if(!model.canUseTower(type.id))continue;
  model.money=98760;const expected=towerPrice(type,model.money,level.id,model.purchaseVariation);
  assert.ok(model.requestPurchase({x:1,y:3},type.id),`${level.id}:${type.id}`);const question=model.pendingPurchase!;
  assert.equal(question.before,98760);assert.equal(question.wallet,98760);assert.equal(question.cost,expected);
  const answer=question.before-question.cost;assert.ok(model.answerPurchase(numberText(answer,2)));assert.equal(model.money,answer);
  model.sellTower(model.towers[0].id);assert.equal(model.money,98760);assert.equal(model.earnedCoins,0);
 }
});

test('wallet changes invalidate an old full-wallet question without applying the old price or answer',()=>{
 const model=finalModel();assert.ok(model.requestPurchase({x:1,y:3},'catapult'));const question=model.pendingPurchase!;
 model.money+=100;assert.equal(model.answerPurchase(numberText(question.before-question.cost)),false);
 assert.equal(model.money,20080);assert.equal(model.towers.length,0);assert.equal(model.pendingPurchase,null);assert.equal(model.purchaseAnswers,0);
});

test('full-wallet money subtraction keeps wrong, help and correct learning evidence with per-question deduplication',()=>withStorage(()=>{
 const model=finalModel();assert.ok(model.requestPurchase({x:1,y:3},'catapult'));const question=model.pendingPurchase!;
 const sample:LearningSample={a:question.before,b:question.cost,operation:'-',digits:question.digits,context:'money'},kind=classify(sample)!;
 assert.equal(kind,'sub-2-align');assert.ok(recordLearning(sample,'help','full-wallet-q1'));assert.ok(recordLearning(sample,'help','full-wallet-q1'));
 assert.equal(model.answerPurchase('7.98'),false);assert.ok(recordLearning(sample,'wrong','full-wallet-q1'));
 assert.equal(model.answerPurchase('7.98'),false);assert.ok(recordLearning(sample,'wrong','full-wallet-q1'));
 assert.ok(model.answerPurchase('17.98'));assert.ok(recordLearning(sample,'correct','full-wallet-q1'));assert.ok(recordLearning(sample,'correct','full-wallet-q1'));
 assert.deepEqual(loadLearning().counts[kind],{wrong:2,help:1,correct:1});assert.equal(model.money,17980);
 assert.equal(classify({a:20000,b:2010,operation:'-',digits:2,context:'money'}),'sub-2-chain');
}));

test('the large-operand exception is limited to exact money subtraction with a normal tower price',()=>{
 for(const context of ['wall','battle','concept'] as const)assert.equal(classify({a:19980,b:2000,operation:'-',digits:2,context}),null);
 for(const sample of [
  {a:19980,b:2000,operation:'+' as const,context:'money' as const},
  {a:19980,b:10000,operation:'-' as const,context:'money' as const},
  {a:19985,b:2000,operation:'-' as const,context:'money' as const},
  {a:Infinity,b:2000,operation:'-' as const,context:'money' as const},
  {a:Number.MAX_SAFE_INTEGER+1,b:2000,operation:'-' as const,context:'money' as const},
  {a:1000,b:2000,operation:'-' as const,context:'money' as const},
 ])assert.equal(classify(sample),null);
 assert.ok(classify({a:98760,b:2000,operation:'-',digits:2,context:'money'}));
});

test('full-wallet questions track borrowing across all whole-number places for help and learning evidence',()=>{
 assert.deepEqual(borrowingPlaces(100500,2000),[1000,10000]);
 assert.deepEqual(borrowingPlaces(1000500,2000),[1000,10000,100000]);
 const model=finalModel();model.money=100980;assert.ok(model.requestPurchase({x:1,y:3},'catapult'));const question=model.pendingPurchase!;
 assert.deepEqual([question.before,question.cost],[100980,2000]);assert.deepEqual(question.borrowing,[1000,10000]);
 assert.equal(classify({a:question.before,b:question.cost,operation:'-',digits:2,context:'money'}),'sub-2-chain');
 assert.ok(model.answerPurchase('98.98'));assert.equal(model.money,98980);
});

test('duel preparation keeps its bounded purchase questions and preserves the separate remaining wallet',()=>{
 const now=100000,duel=createDuel('a','가',17,now,10);joinDuel(duel,'b','나',now,10);
 assert.ok(applyDuel(duel,0,{type:'ready'},now,'r0').ok);assert.ok(applyDuel(duel,1,{type:'ready'},now,'r1').ok);
 duel.players[0].money=19980;assert.ok(applyDuel(duel,0,{type:'prepare-quote',typeId:'catapult'},now,'q').ok);const question=duel.players[0].quote!;
 assert.equal(question.before,purchaseCoins(19980));assert.ok(question.before<10000);assert.ok(question.before-question.cost<10000);
 assert.ok(applyDuel(duel,0,{type:'answer',nonce:'q',answer:numberText(question.before-question.cost)},now,'a').ok);
 assert.equal(duel.players[0].money,19980-question.cost);assert.equal(duel.players[0].stock.catapult,1);
});
