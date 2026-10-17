import {test} from 'node:test';
import assert from 'node:assert/strict';
import {loadSave,writeSave,newAdventure,type Save} from '../src/save';
import {ARMY,type ArmyId} from '../src/secret-siege-types';
import {INITIAL_COINS,STARTER_BUDGET,SIEGE_COIN_LIMIT} from '../src/secret-siege-research';
import {siegeStage} from '../src/secret-siege-stages';
import {secretSiegeEconomy,purchaseSecretSiegeResearch,recordSecretSiegeVictory,selectSecretSiegeStage,restoreSecretSiegeProgress,type SecretSiegeProgress} from '../src/secret-siege-progress';

function storage(run:(data:Map<string,string>)=>void){
 const previous=Object.getOwnPropertyDescriptor(globalThis,'localStorage'),data=new Map<string,string>();
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>data.set(key,value),removeItem:(key:string)=>data.delete(key)}});
 try{run(data);}finally{if(previous)Object.defineProperty(globalThis,'localStorage',previous);else Reflect.deleteProperty(globalThis,'localStorage');}
}
function completed():Save{const save=loadSave();save.level=save.resumeStage=11;save.stars[10]=3;save.campaignCompleted=true;return save;}
function progress(coins=INITIAL_COINS):SecretSiegeProgress{return {version:3,resumeStage:1,stages:[],cleared:false,endingSeen:false,coins,researched:[],revision:0};}
const won=(money:number,economyRevision:number,stageId=1)=>({phase:'won',stars:2,elapsed:120,stageId,money,economyRevision,earnedCoins:siegeStage(stageId).towerRewards.reduce((sum,coins)=>sum+coins,0)});

test('legacy expedition victories migrate without fabricated coins or free elite research',()=>storage(data=>{
 const save=completed(),rows=Array.from({length:10},(_,index)=>({stage:index+1,stars:3,bestSeconds:100+index,victories:index+1}));
 const legacy={version:2,resumeStage:7,stages:rows,cleared:true,endingSeen:true,coins:999990,researched:['champion']};
 const migrated=restoreSecretSiegeProgress(legacy,save)!;
 assert.deepEqual(migrated,{...progress(),resumeStage:7,stages:rows,cleared:true,endingSeen:true});
 data.set('decimal-castle-v1',JSON.stringify({...save,secretSiege:legacy}));
 const loaded=loadSave();assert.deepEqual(loaded.secretSiege,migrated);assert.ok(writeSave(loaded));assert.equal(JSON.parse(data.get('decimal-castle-v1')!).secretSiege.version,3);
}));

test('actual unspent coins carry to the next expedition, stage selection and reload',()=>storage(()=>{
 const save=completed();assert.deepEqual(secretSiegeEconomy(save),{coins:9900,researched:[],revision:0});assert.equal(save.secretSiege,undefined);
 assert.equal(recordSecretSiegeVictory(save,won(11420,0)),true);
 assert.deepEqual(secretSiegeEconomy(save),{coins:11420,researched:[],revision:1});
 assert.equal(selectSecretSiegeStage(save,2),true);assert.equal(secretSiegeEconomy(save).coins,11420);
 assert.ok(writeSave(save));const next=loadSave();assert.deepEqual(next.secretSiege,save.secretSiege);
 assert.equal(recordSecretSiegeVictory(next,won(12940,1,2)),true);
 assert.deepEqual(secretSiegeEconomy(next),{coins:12940,researched:[],revision:2});
 assert.equal(selectSecretSiegeStage(next,1),true);assert.equal(secretSiegeEconomy(next).coins,12940);
}));

test('a tower reward and victory are settled only once and an older tab cannot overwrite a newer wallet',()=>storage(()=>{
 const save=completed(),first=won(11420,0);
 assert.equal(recordSecretSiegeVictory(save,first),true);const settled=JSON.stringify(save);
 assert.equal(recordSecretSiegeVictory(save,first),false);assert.equal(JSON.stringify(save),settled);
 assert.equal(recordSecretSiegeVictory(save,won(18900,0)),false);assert.equal(JSON.stringify(save),settled);
 assert.equal(recordSecretSiegeVictory(save,won(12940,1)),true);assert.equal(save.secretSiege!.stages[0].victories,2);
 assert.equal(secretSiegeEconomy(save).coins,12940);
}));

test('failed or unfinished attempts never bank tower rewards or consume the research checkpoint',()=>storage(()=>{
 const save=completed();save.secretSiege=progress(20000);assert.equal(purchaseSecretSiegeResearch(save,'knight'),true);
 const checkpoint=JSON.stringify(save),economy=secretSiegeEconomy(save);
 assert.deepEqual(economy,{coins:12000,researched:['knight'],revision:1});
 for(const phase of ['ready','playing','paused','lost']){assert.equal(recordSecretSiegeVictory(save,{...won(1000,1),phase}),false);assert.equal(JSON.stringify(save),checkpoint);}
 assert.ok(writeSave(save));assert.deepEqual(secretSiegeEconomy(loadSave()),economy);
}));

test('elite research is an expensive one-time permanent purchase independent of training',()=>storage(()=>{
 const save=completed();save.secretSiege=progress(100000);
 assert.deepEqual(ARMY.filter(spec=>spec.researchCost>0).map(spec=>[spec.id,spec.researchCost]),[['knight',8000],['ranger',12000],['champion',24000],['priest',16000]]);
 let expected=100000;
 for(const id of ['knight','ranger','champion','priest'] as const){
  const spec=ARMY.find(army=>army.id===id)!;assert.equal(purchaseSecretSiegeResearch(save,id),true);expected-=spec.researchCost;
  assert.equal(secretSiegeEconomy(save).coins,expected);const paid=JSON.stringify(save);assert.equal(purchaseSecretSiegeResearch(save,id),false);assert.equal(JSON.stringify(save),paid);
 }
 assert.deepEqual(secretSiegeEconomy(save),{coins:40000,researched:['knight','ranger','champion','priest'],revision:4});
 assert.ok(writeSave(save));const loaded=loadSave();assert.deepEqual(secretSiegeEconomy(loaded),secretSiegeEconomy(save));
 assert.equal(recordSecretSiegeVictory(loaded,won(41520,4)),true);assert.deepEqual(secretSiegeEconomy(loaded).researched,['knight','ranger','champion','priest']);
 assert.equal(secretSiegeEconomy(loaded).coins,41520);
}));

test('research cannot spend the mandatory formation budget or buy starter and unknown units',()=>storage(()=>{
 for(const spec of ARMY.filter(army=>army.researchCost>0)){
  const save=completed();save.secretSiege=progress(spec.researchCost+STARTER_BUDGET-10);const before=JSON.stringify(save);
  assert.equal(purchaseSecretSiegeResearch(save,spec.id),false);assert.equal(JSON.stringify(save),before);
  save.secretSiege=progress(spec.researchCost+STARTER_BUDGET);assert.equal(purchaseSecretSiegeResearch(save,spec.id),true);assert.equal(secretSiegeEconomy(save).coins,STARTER_BUDGET);
 }
 const save=completed();save.secretSiege=progress(100000);const before=JSON.stringify(save);
 for(const id of ['guard','striker','scout','missing'] as ArmyId[]){assert.equal(purchaseSecretSiegeResearch(save,id),false);assert.equal(JSON.stringify(save),before);}
 save.campaignCompleted=false;assert.equal(purchaseSecretSiegeResearch(save,'knight'),false);
}));

test('research receipts invalidate older battle settlements and do not alter the original campaign',()=>storage(()=>{
 const save=completed();save.secretSiege=progress(20000);const campaign=JSON.stringify({...save,secretSiege:undefined});
 assert.equal(purchaseSecretSiegeResearch(save,'knight'),true);const paid=JSON.stringify(save);
 assert.equal(recordSecretSiegeVictory(save,won(21520,0)),false);assert.equal(JSON.stringify(save),paid);
 assert.equal(recordSecretSiegeVictory(save,won(13520,1)),true);assert.equal(JSON.stringify({...save,secretSiege:undefined}),campaign);
 const fresh=newAdventure(save);assert.equal(fresh.secretSiege,undefined);assert.equal(save.secretSiege!.coins,13520);
}));

test('corrupt currency, research and revisions cannot produce rewards or extra unlocks',()=>storage(()=>{
 const save=completed(),base=progress(20000);
 for(const coins of [-10,0,0.01,STARTER_BUDGET-10,9901,NaN,Infinity,'20000',Number.MAX_SAFE_INTEGER,SIEGE_COIN_LIMIT+10]){
  const restored=restoreSecretSiegeProgress({...base,coins,researched:['champion']},save)!;
  assert.equal(restored.coins,INITIAL_COINS);assert.deepEqual(restored.researched,[]);assert.equal(restored.revision,0);
 }
 for(const revision of [-1,1.5,NaN,Infinity,'1',Number.MAX_SAFE_INTEGER])assert.deepEqual(restoreSecretSiegeProgress({...base,revision,researched:['knight']},save),progress());
 const stages=Array.from({length:10},(_,index)=>({stage:index+1,stars:2,bestSeconds:120,victories:2}));
 assert.deepEqual(restoreSecretSiegeProgress({...base,coins:'damaged',researched:['knight'],resumeStage:10,stages,cleared:true,endingSeen:true},save),{...progress(),resumeStage:10,stages,cleared:true,endingSeen:true});
 const restored=restoreSecretSiegeProgress({...base,researched:['guard','knight','knight',null,'missing','ranger']},save)!;
 assert.deepEqual(restored.researched,['knight','ranger']);save.secretSiege=restored;
 const detached=secretSiegeEconomy(save);(detached.researched as ArmyId[]).push('priest');detached.coins=0;assert.deepEqual(secretSiegeEconomy(save),{coins:20000,researched:['knight','ranger'],revision:0});
 const before=JSON.stringify(save);
 const reward=siegeStage(1).towerRewards.reduce((sum,coins)=>sum+coins,0);
 for(const override of [{money:-10},{money:1},{money:123.5},{money:STARTER_BUDGET-10},{money:Infinity},{money:20000+reward+10},{money:'21000'},{earnedCoins:90000},{earnedCoins:1500},{economyRevision:-1},{economyRevision:1.5},{economyRevision:1},{money:undefined},{economyRevision:undefined}]){
  assert.equal(recordSecretSiegeVictory(save,{...won(21520,0),...override} as Parameters<typeof recordSecretSiegeVictory>[1]),false);assert.equal(JSON.stringify(save),before);
 }
}));
