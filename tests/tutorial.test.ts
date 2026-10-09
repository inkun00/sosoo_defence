import assert from 'node:assert/strict';
import test from 'node:test';
import {TutorialSession,TUTORIAL_TOWER_CELL,TUTORIAL_WALL_CELL} from '../src/tutorial';
import {numberText} from '../src/math';
import {LEVELS} from '../src/levels';
import {WALL_DURABILITY} from '../src/model';

function purchase(session:TutorialSession){
 assert.ok(session.selectTower('basic'));
 assert.ok(session.model.requestPurchase(TUTORIAL_TOWER_CELL,'basic'));
 const question=session.model.pendingPurchase!;
 assert.ok(session.model.answerPurchase(numberText(question.before-question.cost)));
 session.sync();
}
function prepare(session:TutorialSession){
 assert.ok(session.begin());purchase(session);
 assert.ok(session.openForge());
 assert.ok(session.model.fuse(session.model.bricks.map(brick=>brick.id),'+'));
 session.sync();
 assert.ok(session.model.placeWall(TUTORIAL_WALL_CELL));session.sync();
}

test('tutorial guides real subtraction purchase, addition fusion, and road-only walls in order',()=>{
 const session=new TutorialSession();
 assert.equal(session.step,'welcome');
 assert.equal(session.start(),false);
 assert.equal(session.model.requestPurchase(TUTORIAL_TOWER_CELL,'basic'),false);
 assert.ok(session.begin());assert.equal(session.step,'tower');
 assert.equal(session.selectTower('double'),false);
 assert.ok(session.selectTower('basic'));assert.equal(session.step,'place-tower');
 assert.equal(session.model.requestPurchase(TUTORIAL_WALL_CELL,'basic'),false);
 assert.ok(session.model.requestPurchase(TUTORIAL_TOWER_CELL,'basic'));
 session.sync();assert.equal(session.step,'purchase');
 assert.equal(session.model.answerPurchase('0'),false);session.sync();assert.equal(session.step,'purchase');
 const question=session.model.pendingPurchase!;
 assert.ok(session.model.answerPurchase(numberText(question.before-question.cost)));
 session.sync();assert.equal(session.step,'forge');
 assert.equal(session.start(),false);
 assert.ok(session.openForge());assert.equal(session.step,'fusion');
 const ids=session.model.bricks.map(brick=>brick.id);
 assert.equal(session.model.fuse(ids,'-'),false);
 assert.equal(session.model.fuse([ids[0],ids[2],ids[1]],'+'),false);
 assert.ok(session.model.fuse(ids,'+'));session.sync();assert.equal(session.step,'wall');
 assert.equal(session.model.placeWall(TUTORIAL_TOWER_CELL),false);
 assert.ok(session.model.placeWall(TUTORIAL_WALL_CELL));session.sync();assert.equal(session.step,'start');
 assert.equal(session.model.walls[0].durability,WALL_DURABILITY);
 assert.ok(session.start());assert.equal(session.step,'battle');
});

test('cancelled purchase and closed forge remain recoverable',()=>{
 const session=new TutorialSession();session.begin();session.selectTower('basic');
 session.model.requestPurchase(TUTORIAL_TOWER_CELL,'basic');session.sync();
 session.model.cancelPurchase();session.sync();assert.equal(session.step,'place-tower');
 purchase(session);assert.equal(session.step,'forge');
 session.openForge();session.closeForge();assert.equal(session.step,'forge');
 assert.ok(session.openForge());
 assert.ok(session.model.fuse(session.model.bricks.map(brick=>brick.id)));
 session.closeForge();assert.equal(session.step,'wall');
 assert.ok(session.model.placeWall(TUTORIAL_WALL_CELL));session.sync();
 assert.ok(session.model.recoverWall(TUTORIAL_WALL_CELL));session.sync();assert.equal(session.step,'wall');
 assert.ok(session.model.placeWall(TUTORIAL_WALL_CELL));session.sync();assert.equal(session.step,'start');
});

test('actual automatic combat breaks the wall on three impacts and kills within 25 seconds',()=>{
 const session=new TutorialSession();
 assert.equal(session.model.goals.length,3);
 assert.ok(session.model.goals.every(goal=>!goal.done));
 prepare(session);
 assert.deepEqual(session.model.goals.map(goal=>goal.done),[true,true,false]);
 assert.ok(session.start());
 let impacts=0,breaks=0,shots=0;
 for(let time=0;time<25&&!session.completed;time+=1/60){
  session.model.step(1/60);
  for(const event of session.model.events.splice(0)){
   if(event.type==='wall-impact')impacts++;
   if(event.type==='wall-break')breaks++;
   if(event.type==='shot')shots++;
  }
  session.sync();
 }
 assert.equal(session.step,'complete');
 assert.equal(impacts,3);assert.equal(breaks,1);assert.ok(shots>=6);
 assert.equal(session.model.kills,1);assert.equal(session.model.walls.length,0);
 assert.equal(session.model.leaks,0);assert.equal(session.model.castle,5);
 assert.equal(session.model.bricks.length,0,'stage one does not draw persistent wall recipes after a kill');
 assert.ok(session.model.goals.every(goal=>goal.done),'tutorial objectives all finish after one training enemy');
});

test('sessions own disposable inventories and never change shared adventure definitions',()=>{
 const original=JSON.stringify(LEVELS);
 const first=new TutorialSession();prepare(first);first.start();first.dispose();
 const elapsed=first.model.elapsed;first.model.step(1);assert.equal(first.model.elapsed,elapsed);
 assert.equal(first.model.requestPurchase(TUTORIAL_TOWER_CELL,'basic'),false);
 assert.equal(first.start(),false);
 const second=new TutorialSession();
 assert.equal(second.model.money,900);assert.deepEqual(second.model.bricks.map(brick=>brick.value),[200,300,500]);
 assert.equal(second.model.fusions,0);assert.equal(second.model.purchases,0);assert.equal(second.step,'welcome');
 assert.equal(JSON.stringify(LEVELS),original);
});

test('a whole tutorial with wrong and correct answers never writes persistent progress or recipe history',()=>{
 const descriptor=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
 const writes:{operation:string;key:string;value?:string}[]=[];
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{
  getItem:()=>null,
  setItem:(key:string,value:string)=>writes.push({operation:'set',key,value}),
  removeItem:(key:string)=>writes.push({operation:'remove',key}),
 }});
 let session:TutorialSession|undefined;
 try{
  session=new TutorialSession();
  assert.ok(session.begin());assert.ok(session.selectTower('basic'));
  assert.ok(session.model.requestPurchase(TUTORIAL_TOWER_CELL,'basic'));session.sync();
  const question=session.model.pendingPurchase!;
  assert.equal(session.model.answerPurchase('0'),false);
  assert.equal(session.model.money,question.wallet,'an incorrect answer preserves the wallet');
  assert.ok(session.model.answerPurchase(numberText(question.before-question.cost)));session.sync();
  assert.ok(session.openForge());
  assert.ok(session.model.fuse(session.model.bricks.map(brick=>brick.id)));session.sync();
  assert.ok(session.model.placeWall(TUTORIAL_WALL_CELL));session.sync();
  assert.ok(session.start());
  for(let frame=0;frame<1500&&!session.completed;frame++){
   session.model.step(1/60);session.model.events.splice(0);session.sync();
  }
  assert.ok(session.completed,'the real battle reaches the final tutorial step');
  assert.equal(session.model.tutorialWallImpacts,3);assert.equal(session.model.tutorialWallBreaks,1);
  assert.equal(session.model.kills,1);
  assert.deepEqual(writes,[],'no progress, inventory, learning, or wall recipe store is written');
 }finally{
  session?.dispose();
  if(descriptor)Object.defineProperty(globalThis,'localStorage',descriptor);
  else Reflect.deleteProperty(globalThis,'localStorage');
 }
});
