import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Defense,type Tower} from '../src/model';
import {FINAL_STAGE,LEVELS} from '../src/levels';
import {TOWERS} from '../src/towers';
import {numberText} from '../src/math';
import {loadSave,newAdventure,writeSave} from '../src/save';
import {TOWER_RESEARCH_PRICES,TOWER_RESEARCH_COIN_LIMIT,TOWER_RESEARCH_RECEIPT_LIMIT,freshTowerResearchProgress,restoreTowerResearchProgress,researchProgress,recordTowerResearchReward,developTower,dismissTowerResearchShop,type TowerResearchProgress} from '../src/tower-research';

function withStorage(run:(data:Map<string,string>)=>void){
 const previous=Object.getOwnPropertyDescriptor(globalThis,'localStorage'),data=new Map<string,string>();
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>data.set(key,value),removeItem:(key:string)=>data.delete(key)}});
 try{run(data);}finally{if(previous)Object.defineProperty(globalThis,'localStorage',previous);else Reflect.deleteProperty(globalThis,'localStorage');}
}
function defeat(model:Defense){model.spawn();const enemy=model.enemies.at(-1)!;model.damage(enemy,{unit:enemy.hp,effect:'basic'} as Tower);return enemy;}
function completed(stage=1,phase:'won'|'review'|'lost'='won'){
 const model=new Defense(LEVELS[stage-1]);for(let i=0;i<4;i++)defeat(model);model.phase=phase;return model;
}
const fresh=(coins=0):TowerResearchProgress=>({...freshTowerResearchProgress(),coins});
const pending=(id='battle-1')=>({battleId:id,stage:1,outcome:'won' as const,earned:900,nextStage:2});

test('new adventures start with three necessary designs, no money and no stage-driven research',()=>withStorage(()=>{
 const save=loadSave();assert.deepEqual(save.towerResearch,fresh());
 save.level=FINAL_STAGE;save.resumeStage=FINAL_STAGE;
 assert.deepEqual(researchProgress(save).developed,['basic','double','needle']);assert.ok(writeSave(save));
 const reloaded=loadSave();assert.deepEqual(reloaded.towerResearch,fresh());
 const model=new Defense(LEVELS.at(-1)!,undefined,'standard',researchProgress(reloaded).developed);
 assert.equal(model.isTowerDeveloped('rune'),false);assert.equal(model.isTowerDeveloped('pebble'),false);
 assert.equal(model.requestPurchase({x:1,y:3},'rune'),false);
}));

test('legacy saves migrate their old stage designs once while explicit research never auto-develops',()=>withStorage(data=>{
 for(const stage of [1,2,5,FINAL_STAGE]){
  data.set('decimal-castle-v1',JSON.stringify({version:1,level:stage,stars:[]}));
  const save=loadSave(),expected=TOWERS.filter(type=>type.unlock<=stage||type.id==='needle').map(type=>type.id);
  assert.deepEqual(save.towerResearch!.developed,expected);assert.equal(save.towerResearch!.coins,0);
  save.level=FINAL_STAGE;assert.ok(writeSave(save));assert.deepEqual(loadSave().towerResearch!.developed,expected);
 }
 data.set('decimal-castle-v1',JSON.stringify({version:1,level:FINAL_STAGE,towerResearch:{version:1,coins:0,developed:[],receipts:[]}}));
 assert.deepEqual(loadSave().towerResearch,fresh());
}));

test('research restoration rejects corrupt currencies and versions without granting legacy towers',()=>{
 for(const raw of [null,[],{},'bad',{version:2,coins:99999,developed:['rune']}])assert.deepEqual(restoreTowerResearchProgress(raw,FINAL_STAGE),fresh());
 for(const coins of [-1,.5,NaN,Infinity,'100',TOWER_RESEARCH_COIN_LIMIT+1,Number.MAX_SAFE_INTEGER+1])assert.equal(restoreTowerResearchProgress({...fresh(),coins},FINAL_STAGE).coins,0);
 const restored=restoreTowerResearchProgress({...fresh(1230),developed:['rune','rune','basic','unknown',5]});
 assert.deepEqual(restored.developed,['basic','double','needle','rune']);assert.equal(restored.coins,1230);
 for(const invalid of [0,-1,1.2,NaN,Infinity,FINAL_STAGE+1])assert.deepEqual(restoreTowerResearchProgress(undefined,invalid),fresh());
});

test('the explicit model research list is copied, enforced at every stage, and retains digit eligibility',()=>{
 const ids=['basic','needle'],model=new Defense(LEVELS[9],undefined,'standard',ids);ids.push('rune');
 assert.equal(model.isTowerDeveloped('rune'),false);assert.equal(model.canUseTower('needle'),true);
 assert.equal(model.requestPurchase({x:1,y:3},'frost'),false);assert.equal(model.money,LEVELS[9].budget);
 const first=new Defense(LEVELS[0],undefined,'standard',['basic','double','needle','pebble','frost','ice','lightning','crystal','rune']);
 for(const id of ['needle','pebble','frost','ice','lightning','crystal','rune']){
  assert.equal(first.isTowerDeveloped(id),true);assert.equal(first.canUseTower(id),false);assert.equal(first.requestPurchase({x:1,y:3},id),false);
 }
 assert.equal(first.canUseTower('double'),true);assert.equal(first.isTowerDeveloped('unknown'),false);assert.equal(first.canUseTower('unknown'),false);
 const empty=new Defense(LEVELS[9],undefined,'standard',[]);assert.equal(empty.isTowerDeveloped('basic'),false);
});

test('an early researched advanced tower is usable without its old stage gate; omitted lists keep simulation and tutorial rules',()=>{
 const second=new Defense(LEVELS[1],undefined,'standard',['basic','double','needle','rune']);second.money=10000;
 assert.equal(second.isTowerDeveloped('rune'),true);assert.equal(second.canUseTower('rune'),true);
 assert.ok(second.requestPurchase({x:1,y:3},'rune'));const question=second.pendingPurchase!;
 assert.ok(second.answerPurchase(numberText(question.before-question.cost)));assert.equal(second.towers[0].typeId,'rune');
 const legacy=new Defense(LEVELS[1]);assert.equal(legacy.canUseTower('rune'),false);assert.equal(legacy.canUseTower('frost'),true);
 assert.equal(new Defense(LEVELS[0]).isTowerDeveloped('needle'),false);
 assert.ok(new Defense(LEVELS.at(-1)!).isTowerDeveloped('rune'));
});

test('only actual coin drops accumulate research income, never starting budgets, purchases, refunds, or brick drops',()=>{
 const model=new Defense(LEVELS[0]);assert.equal(model.earnedCoins,0);
 assert.ok(model.requestPurchase({x:1,y:3},'basic'));let question=model.pendingPurchase!;
 assert.equal(model.answerPurchase('99'),false);model.cancelPurchase();assert.equal(model.earnedCoins,0);
 assert.ok(model.requestPurchase({x:1,y:3},'basic'));question=model.pendingPurchase!;
 assert.ok(model.answerPurchase(numberText(question.before-question.cost)));model.sellTower(model.towers[0].id);
 assert.equal(model.money,model.level.budget);assert.equal(model.earnedCoins,0);
 model.money+=100000;assert.equal(model.earnedCoins,0);
 const before=model.money,enemy=defeat(model),earned=model.money-before;
 assert.ok(earned>0);assert.equal(model.earnedCoins,earned);model.damage(enemy,{unit:100,effect:'basic'} as Tower);assert.equal(model.earnedCoins,earned);
 const second=new Defense(LEVELS[1]);for(let i=0;i<3;i++)defeat(second);
 assert.equal(second.earnedCoins,0);assert.equal(second.bricks.length,3);assert.equal(second.money,second.level.budget);
 const start=second.money;defeat(second);assert.equal(second.earnedCoins,second.money-start);assert.ok(second.earnedCoins>0);
 for(let i=0;i<5;i++)defeat(second);
 assert.equal(second.earnedCoins,second.money-second.level.budget);assert.equal(second.bricks.length,6);
});

test('terminal battles credit their actual drop income once and preserve resumable shop results',()=>withStorage(data=>{
 for(const phase of ['won','review','lost'] as const){
  data.clear();
  const save=loadSave(),model=completed(2,phase),before=JSON.stringify({...save,towerResearch:undefined});
  assert.ok(recordTowerResearchReward(save,`battle-${phase}`,model));assert.equal(researchProgress(save).coins,model.earnedCoins);
  assert.deepEqual(save.towerResearch!.pendingShop,{battleId:`battle-${phase}`,stage:2,outcome:phase,earned:model.earnedCoins,nextStage:phase==='won'?3:2});
  const snapshot=JSON.stringify(save);assert.equal(recordTowerResearchReward(save,`battle-${phase}`,model),false);assert.equal(JSON.stringify(save),snapshot);
  assert.equal(JSON.stringify({...save,towerResearch:undefined}),before);assert.ok(writeSave(save));assert.deepEqual(loadSave(),save);
  assert.ok(dismissTowerResearchShop(save));assert.equal(save.towerResearch!.pendingShop,undefined);assert.equal(dismissTowerResearchShop(save),false);
  assert.equal(recordTowerResearchReward(save,`battle-${phase}`,model),false);
 }
}));

test('prepared armies receive newly developed designs without resetting their wallet or existing towers',()=>{
 const model=new Defense(LEVELS[2],undefined,'standard',['basic','double','needle']);
 assert.ok(model.requestPurchase({x:1,y:3},'basic'));const question=model.pendingPurchase!;
 assert.ok(model.answerPurchase(numberText(question.before-question.cost)));const wallet=model.money,tower=model.towers[0];
 const ids=['basic','double','needle','rune','unknown'];model.setDevelopedTowers(ids);ids.push('frost');
 assert.equal(model.canUseTower('rune'),true);assert.equal(model.isTowerDeveloped('unknown'),false);assert.equal(model.isTowerDeveloped('frost'),false);
 assert.equal(model.money,wallet);assert.equal(model.towers[0],tower);assert.equal(model.earnedCoins,0);
 for(const phase of ['playing','paused'] as const){model.phase=phase;model.setDevelopedTowers(['basic','frost']);assert.equal(model.isTowerDeveloped('frost'),false);assert.equal(model.isTowerDeveloped('rune'),true);}
 model.phase='won';model.setDevelopedTowers(['basic','frost']);assert.equal(model.isTowerDeveloped('frost'),true);
});

test('unplayed, running, paused and malformed battle rewards never modify research',()=>withStorage(()=>{
 const save=loadSave(),model=completed(),original=JSON.stringify(save);
 for(const phase of ['ready','playing','paused'] as const){model.phase=phase;assert.equal(recordTowerResearchReward(save,'battle-running',model),false);}
 model.phase='won';
 for(const value of [-1,.5,NaN,Infinity,TOWER_RESEARCH_COIN_LIMIT+1]){model.earnedCoins=value;assert.equal(recordTowerResearchReward(save,'battle-invalid',model),false);}
 model.earnedCoins=900;
 for(const id of ['', 'spaces are invalid', '../battle', 'x'.repeat(161)])assert.equal(recordTowerResearchReward(save,id,model),false);
 const invalidStage={...model,level:{...model.level,id:FINAL_STAGE+1}};assert.equal(recordTowerResearchReward(save,'bad-stage',invalidStage),false);
 assert.equal(JSON.stringify(save),original);
 const untouched=new Defense(LEVELS[0]);untouched.phase='lost';assert.ok(recordTowerResearchReward(save,'empty-loss',untouched));assert.equal(save.towerResearch!.coins,0);
}));

test('retries can earn new actual drops without reusing their completed battle receipt',()=>withStorage(()=>{
 const save=loadSave(),first=completed(),retry=completed();
 assert.ok(recordTowerResearchReward(save,'battle-original',first));assert.ok(recordTowerResearchReward(save,'battle-retry',retry));
 assert.equal(save.towerResearch!.coins,first.earnedCoins+retry.earnedCoins);
 const refundOnly=new Defense(LEVELS[0]);refundOnly.money=999999;refundOnly.phase='lost';
 assert.ok(recordTowerResearchReward(save,'battle-budget-only',refundOnly));assert.equal(save.towerResearch!.coins,first.earnedCoins+retry.earnedCoins);
 const last=completed(FINAL_STAGE);assert.ok(recordTowerResearchReward(save,'battle-final',last));assert.equal(save.towerResearch!.pendingShop!.nextStage,FINAL_STAGE);
}));

test('research prices purchase permanent designs exactly once with exact independent wallet subtraction',()=>withStorage(()=>{
 const save=loadSave();save.towerResearch=fresh(60000);save.towerResearch.receipts=['battle-1'];save.towerResearch.pendingShop=pending();
 const originalLevel=save.level;
 for(const type of TOWERS){
  const price=TOWER_RESEARCH_PRICES[type.id],before=save.towerResearch!.coins;
  if(price===0){assert.equal(developTower(save,type.id),false);assert.equal(save.towerResearch!.coins,before);continue;}
  assert.ok(developTower(save,type.id),type.id);assert.equal(save.towerResearch!.coins,before-price);
  assert.equal(developTower(save,type.id),false);assert.equal(save.towerResearch!.coins,before-price);assert.equal(save.level,originalLevel);
  assert.ok(writeSave(save));assert.ok(researchProgress(loadSave()).developed.includes(type.id));
 }
 assert.deepEqual(save.towerResearch!.developed,TOWERS.map(type=>type.id));assert.deepEqual(save.towerResearch!.pendingShop,pending());
 assert.equal(Object.values(TOWER_RESEARCH_PRICES).reduce((sum,n)=>sum+n,0),39800);
}));

test('unaffordable and unknown research preserve both wallet and pending shop; exact balance reaches zero',()=>withStorage(()=>{
 const save=loadSave();save.towerResearch=fresh(799);const original=JSON.stringify(save);
 for(const id of ['pebble','rune','unknown','__proto__'])assert.equal(developTower(save,id),false);
 assert.equal(JSON.stringify(save),original);save.towerResearch.coins=800;
 assert.ok(developTower(save,'pebble'));assert.equal(save.towerResearch!.coins,0);
 const snapshot=researchProgress(save);snapshot.developed.push('rune');snapshot.coins=100000;
 assert.equal(save.towerResearch!.developed.includes('rune'),false);assert.equal(save.towerResearch!.coins,0);
}));

test('receipts remain bounded and pending shops require a matching valid receipt and transition',()=>{
 const ids=Array.from({length:200},(_,i)=>`battle-${i}`),valid=fresh(1000);
 valid.receipts=[...ids,'bad id','battle-199'];valid.pendingShop={...pending('battle-199'),stage:FINAL_STAGE,nextStage:FINAL_STAGE};
 const restored=restoreTowerResearchProgress(valid);assert.equal(restored.receipts.length,TOWER_RESEARCH_RECEIPT_LIMIT);assert.equal(restored.receipts.at(-1),'battle-199');assert.equal(restored.pendingShop!.stage,FINAL_STAGE);
 for(const changes of [{battleId:'missing'},{stage:0},{outcome:'playing'},{earned:-1},{earned:.1},{nextStage:1}])assert.equal(restoreTowerResearchProgress({...valid,pendingShop:{...valid.pendingShop,...changes}}).pendingShop,undefined);
 const save={level:1,towerResearch:fresh(TOWER_RESEARCH_COIN_LIMIT-10)},model=completed();
 assert.ok(recordTowerResearchReward(save,'last-credit',model));assert.equal(save.towerResearch.coins,TOWER_RESEARCH_COIN_LIMIT);
 assert.ok(developTower(save,'pebble'));assert.equal(save.towerResearch.coins,TOWER_RESEARCH_COIN_LIMIT-800);
});

test('candidate changes remain detached so a failed persistence attempt can leave the live save untouched',()=>withStorage(()=>{
 const live=loadSave();live.towerResearch=fresh(1500);const candidate=structuredClone(live),original=JSON.stringify(live);
 assert.ok(developTower(candidate,'frost'));assert.equal(candidate.towerResearch!.coins,0);assert.equal(JSON.stringify(live),original);
 const previous=localStorage.setItem;localStorage.setItem=()=>{throw new Error('storage full');};
 try{assert.equal(writeSave(candidate),false);assert.equal(JSON.stringify(live),original);}finally{localStorage.setItem=previous;}
}));

test('new adventure resets bank, developed extras, receipts and pending shop without changing the old save',()=>withStorage(()=>{
 const save=loadSave();save.level=7;save.resumeStage=5;save.inventory={bricks:[100,200,300],walls:2};save.towerResearch={...fresh(10000),developed:TOWERS.map(type=>type.id),receipts:['battle-1'],pendingShop:pending()};
 const before=JSON.stringify(save),reset=newAdventure(save);assert.equal(JSON.stringify(save),before);assert.deepEqual(reset.towerResearch,fresh());
 assert.ok(writeSave(reset));assert.deepEqual(loadSave().towerResearch,fresh());assert.equal(loadSave().level,1);
}));
