import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Defense,type Tower} from '../src/model';
import {LEVELS} from '../src/levels';
import {numberText} from '../src/math';
import {loadSave,newAdventure,writeSave} from '../src/save';
import {campaignCompletion,campaignKillScore,campaignQuestionScore,campaignTotal,campaignVisibleTotal,recordStageScore,restoreCampaignScore,validateCampaignCompletion,validateStageScore,type StageScore} from '../src/campaign-score';
import {playAutomaticStage} from './adventure-helpers';

function purchase(m:Defense){
 const cell=Array.from({length:9*16},(_,i)=>({x:i%16,y:Math.floor(i/16)})).find(c=>m.candidate(c));
 assert.ok(cell);assert.ok(m.requestPurchase(cell,'basic'));return m.pendingPurchase!;
}
function solve(m:Defense){const q=m.pendingPurchase??purchase(m);assert.ok(m.answerPurchase(numberText(q.before-q.cost)));}
function cleared(stage:number=1,hits=2){
 const m=new Defense(LEVELS[stage-1]);
 for(let i=0;i<m.enemyCount;i++){
  if(i===m.level.hp.length)m.spawnBoss();else m.spawn();const enemy=m.enemies.at(-1)!;enemy.hp=enemy.max=100*hits;
  for(let h=0;h<hits;h++)m.damage(enemy,{unit:100,effect:'basic'} as Tower);
 }
 m.bossDefeated=stage>=10;m.phase='won';return m;
}
function memoryStorage(){
 const previous=Object.getOwnPropertyDescriptor(globalThis,'localStorage'),data=new Map<string,string>();
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>data.set(key,value),removeItem:(key:string)=>data.delete(key)}});
 return {data,restore:()=>{if(previous)Object.defineProperty(globalThis,'localStorage',previous);else Reflect.deleteProperty(globalThis,'localStorage');}};
}

test('campaign scores match duel kill efficiency and wrong-answer rewards',()=>{
 assert.equal(campaignKillScore(1),200);assert.equal(campaignKillScore(2),150);assert.equal(campaignKillScore(6),116);
 assert.equal(campaignQuestionScore(0),25);assert.equal(campaignQuestionScore(1),12);assert.equal(campaignQuestionScore(2),8);
 assert.equal(campaignQuestionScore(NaN),25);assert.equal(campaignKillScore(Infinity),200);
});

test('only real kills award combat points and stale targets cannot score twice',()=>{
 const m=new Defense(LEVELS[0]);m.spawn();const e=m.enemies[0];
 m.damage(e,{unit:300,effect:'basic'} as Tower);assert.equal(m.score,0);assert.equal(e.hits,0);
 m.damage(e,{unit:100,effect:'basic'} as Tower);assert.equal(m.score,0);
 m.damage(e,{unit:100,effect:'basic'} as Tower);assert.equal(m.combatScore,150);assert.deepEqual(m.killHits,[2]);
 m.damage(e,{unit:100,effect:'basic'} as Tower);assert.equal(m.kills,1);assert.equal(m.combatScore,150);
 m.spawn();const leak=m.enemies.at(-1)!;leak.next=leak.path.length;m.damage(leak,{unit:100,effect:'basic'} as Tower);assert.equal(m.kills,1);
});

test('purchase scoring counts arithmetic mistakes, resets after correct answers and keeps cancellation penalties',()=>{
 const m=new Defense(LEVELS[0]);const q=purchase(m);
 assert.equal(m.answerPurchase('hello'),false);assert.equal(m.answerPurchase(numberText(q.before-q.cost+100)),false);
 assert.equal(m.answerPurchase(numberText(q.before-q.cost+200)),false);solve(m);
 assert.equal(m.questionScore,8);assert.deepEqual(m.purchaseWrongAttempts,[2]);
 const next=purchase(m);assert.equal(m.answerPurchase(numberText(next.before-next.cost+100)),false);m.cancelPurchase();purchase(m);solve(m);
 assert.deepEqual(m.purchaseWrongAttempts,[2,1]);assert.equal(m.questionScore,20);assert.equal(m.answeredQuestions,2);
 // Refund one tower so another legal question can be prepared.
 m.sellTower(m.towers[0].id);purchase(m);solve(m);assert.deepEqual(m.purchaseWrongAttempts,[2,1,0]);assert.equal(m.questionScore,45);
});

test('sell and rebuy can change placement but cannot farm beyond the tower credit limit',()=>{
 const m=new Defense(LEVELS[0]);
 for(let i=0;i<m.balance.towerLimit+5;i++){purchase(m);solve(m);m.sellTower(m.towers[0].id);}
 assert.equal(m.purchases,m.balance.towerLimit+5);assert.equal(m.answeredQuestions,m.balance.towerLimit);assert.equal(m.questionScore,25*m.balance.towerLimit);
});

test('fusion validates arithmetic, resets mistakes and caps question credit without blocking gameplay',()=>{
 const m=new Defense(LEVELS[1]);let id=100;
 const refill=()=>{m.bricks=[{id:id++,value:100},{id:id++,value:200},{id:id++,value:300}];return m.bricks.map(b=>b.id);};
 const ids=refill();assert.equal(m.fuse([ids[0],ids[0],ids[2]]),false);assert.equal(m.fuse(ids,'-'),false);
 assert.equal(m.fuse([ids[2],ids[1],ids[0]]),false);assert.ok(m.fuse(ids));assert.equal(m.questionScore,12);
 for(let i=0;i<m.balance.wallLimit+2;i++)assert.ok(m.fuse(refill()));
 assert.deepEqual(m.fusionWrongAttempts,[1,...Array(m.balance.wallLimit-1).fill(0)]);assert.equal(m.questionScore,12+25*(m.balance.wallLimit-1));
 assert.equal(m.wallStock,m.balance.wallLimit+3);assert.equal(m.answeredQuestions,m.balance.wallLimit);
});

test('clear scores accumulate once per stage; best replay replaces a score and live totals avoid double counting',()=>{
 const storage=memoryStorage();try{
  const save=loadSave(),first=cleared();assert.ok(recordStageScore(save,first));assert.equal(campaignTotal(save),1800);
  assert.equal(recordStageScore(save,first),false);assert.equal(campaignVisibleTotal(save,first),1800);
  const poorer=cleared(1,4);assert.equal(recordStageScore(save,poorer),false);assert.equal(campaignVisibleTotal(save,poorer),1800);
  const better=cleared(1,1);assert.equal(campaignVisibleTotal(save,better),2400);assert.ok(recordStageScore(save,better));assert.equal(campaignTotal(save),2400);
  const next=cleared(2,2);assert.equal(campaignVisibleTotal(save,next),4200);assert.ok(recordStageScore(save,next));assert.equal(campaignTotal(save),4200);
  first.phase='lost';assert.equal(recordStageScore(save,first),false);assert.equal(save.scoreProgress?.stages.length,2);
 }finally{storage.restore();}
});

test('score proof snapshots survive save/reload and remain independent of mutable model arrays',()=>{
 const storage=memoryStorage();try{
  const save=loadSave(),model=cleared(11);assert.ok(recordStageScore(save,model));save.scoreProgress!.nickname='수호자';save.scoreProgress!.registeredScore=1950;
  assert.ok(writeSave(save));assert.deepEqual(loadSave(),save);model.killHits[0]=100;assert.equal(save.scoreProgress!.stages[0].killHits[0],2);
  const snapshot=campaignCompletion(save)!;snapshot.stages[0].killHits[0]=100;assert.equal(save.scoreProgress!.stages[0].killHits[0],2);
 }finally{storage.restore();}
});

test('legacy adventure clears keep progress but do not invent score and a fresh game resets ranking identity',()=>{
 const storage=memoryStorage();try{
  storage.data.set('decimal-castle-v1',JSON.stringify({version:1,level:11,resumeStage:11,stars:Array(11).fill(3),campaignCompleted:true,started:true}));
  const save=loadSave();assert.equal(save.level,11);assert.ok(save.campaignCompleted);assert.equal(campaignTotal(save),0);assert.equal(campaignCompletion(save),null);assert.deepEqual(save.scoreProgress!.stages,[]);
  assert.ok(recordStageScore(save,cleared(11)));assert.ok(campaignCompletion(save));const fresh=newAdventure(save);
  assert.notEqual(fresh.scoreProgress!.runId,save.scoreProgress!.runId);assert.equal(campaignTotal(fresh),0);assert.equal(campaignCompletion(fresh),null);assert.equal(campaignTotal(save),1950);
 }finally{storage.restore();}
});

test('all three difficulties accumulate recomputable stage evidence through a real automatic campaign',()=>{
 const storage=memoryStorage();try{
  for(const difficulty of ['practice','standard','challenge'] as const){
   const save=loadSave();let inventory={bricks:[] as number[],walls:0},sum=0;
   for(let stage=1;stage<=11;stage++){
    const model=playAutomaticStage(stage,difficulty,inventory);assert.ok(recordStageScore(save,model),`${difficulty} stage ${stage}`);
    sum+=model.score;assert.equal(campaignTotal(save),sum);assert.equal(campaignVisibleTotal(save,model),sum);inventory=model.inventory;
   }
   const completion=campaignCompletion(save)!;assert.equal(completion.stages.length,11);assert.deepEqual(validateCampaignCompletion(completion),completion);
  }
 }finally{storage.restore();}
});

test('completion requires an actual saved finale clear and strictly recomputes evidence on submission',()=>{
 const storage=memoryStorage();try{
  const save=loadSave(),boss=cleared(11);boss.bossDefeated=false;assert.equal(recordStageScore(save,boss),false);
  assert.ok(recordStageScore(save,cleared(10)));assert.equal(campaignCompletion(save),null);assert.ok(recordStageScore(save,cleared(11)));
  const completion=campaignCompletion(save)!;assert.deepEqual(validateCampaignCompletion(completion),completion);
  assert.equal(validateCampaignCompletion({...completion,score:completion.score+1}),null);
  assert.equal(validateCampaignCompletion({...completion,stages:[...completion.stages,completion.stages[0]]}),null);
  assert.equal(validateCampaignCompletion({...completion,stages:[...completion.stages].reverse()}),null);
  assert.equal(validateCampaignCompletion({...completion,stages:completion.stages.map(s=>({...s,killHits:[1]}))}),null);
  assert.equal(validateCampaignCompletion({...completion,stages:completion.stages.map(s=>({...s,bossDefeated:false}))}),null);
 }finally{storage.restore();}
});

test('malformed saved stage evidence is discarded and bounded question evidence cannot inflate a total',()=>{
 const storage=memoryStorage();try{
  const save=loadSave();assert.ok(recordStageScore(save,cleared()));const valid=save.scoreProgress!.stages[0];
  assert.equal(validateStageScore({...valid,score:99999}),null);assert.equal(validateStageScore({...valid,kills:13}),null);
  assert.equal(validateStageScore({...valid,successfulHits:0}),null);assert.equal(validateStageScore({...valid,castle:0}),null);
  assert.equal(validateStageScore({...valid,killHits:Array(13).fill(2)}),null);
  const bad:StageScore={...valid,purchaseWrongAttempts:Array(99).fill(0)};assert.equal(validateStageScore(bad),null);
  const restored=restoreCampaignScore({...save.scoreProgress,stages:[valid,{...valid,stage:2,score:99999}]});assert.equal(restored!.stages.length,1);
  assert.equal(restoreCampaignScore({version:1,runId:'bad',stages:[]}),null);
 }finally{storage.restore();}
});
