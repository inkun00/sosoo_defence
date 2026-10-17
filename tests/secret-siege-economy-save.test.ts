import {test} from 'node:test';
import assert from 'node:assert/strict';
import {loadSave,writeSave,newAdventure,type Save} from '../src/save';
import {ARMY,type ArmyId} from '../src/secret-siege-types';
import {INITIAL_COINS,STARTER_BUDGET,SIEGE_COIN_LIMIT} from '../src/secret-siege-research';
import {siegeStage} from '../src/secret-siege-stages';
import {secretSiegeEconomy,persistSecretSiegeEconomy,purchaseSecretSiegeResearch,recordSecretSiegeVictory,selectSecretSiegeStage,restoreSecretSiegeProgress,type SecretSiegeProgress} from '../src/secret-siege-progress';

function storage(run:(data:Map<string,string>)=>void){
 const previous=Object.getOwnPropertyDescriptor(globalThis,'localStorage'),data=new Map<string,string>();
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>data.set(key,value),removeItem:(key:string)=>data.delete(key)}});
 try{run(data);}finally{if(previous)Object.defineProperty(globalThis,'localStorage',previous);else Reflect.deleteProperty(globalThis,'localStorage');}
}
function completed():Save{const save=loadSave();save.level=save.resumeStage=11;save.stars[10]=3;save.campaignCompleted=true;return save;}
function progress(coins=INITIAL_COINS):SecretSiegeProgress{return {version:3,resumeStage:1,stages:[],cleared:false,endingSeen:false,coins,researched:[],revision:0};}
const won=(money:number,economyRevision:number,stageId=1)=>({phase:'won',stars:2,elapsed:120,stageId,money,economyRevision,earnedCoins:siegeStage(stageId).towerRewards.reduce((sum,coins)=>sum+coins,0)});
function persist(save:Save,coins:number,researched=secretSiegeEconomy(save).researched){
 assert.equal(persistSecretSiegeEconomy(save,{coins,researched,revision:secretSiegeEconomy(save).revision}),true);
 return secretSiegeEconomy(save);
}

test('legacy expedition victories migrate without fabricated coins or free elite research',()=>storage(data=>{
 const save=completed(),rows=Array.from({length:10},(_,index)=>({stage:index+1,stars:3,bestSeconds:100+index,victories:index+1}));
 const legacy={version:2,resumeStage:7,stages:rows,cleared:true,endingSeen:true,coins:999990,researched:['champion']};
 const migrated=restoreSecretSiegeProgress(legacy,save)!;
 assert.deepEqual(migrated,{...progress(),resumeStage:7,stages:rows,cleared:true,endingSeen:true});
 data.set('decimal-castle-v1',JSON.stringify({...save,secretSiege:legacy}));
 const loaded=loadSave();assert.deepEqual(loaded.secretSiege,migrated);assert.ok(writeSave(loaded));assert.equal(JSON.parse(data.get('decimal-castle-v1')!).secretSiege.version,3);
}));
test('training debits and a partial tower reward survive defeat, retry and reload exactly',()=>storage(()=>{
 const save=completed();assert.deepEqual(secretSiegeEconomy(save),{coins:9900,researched:[],revision:0});assert.equal(save.secretSiege,undefined);
 assert.deepEqual(persist(save,8700),{coins:8700,researched:[],revision:1});
 const bounty=siegeStage(1).towerRewards[0],afterReward=persist(save,8700+bounty);assert.equal(afterReward.revision,2);
 assert.ok(writeSave(save));const reloaded=loadSave();assert.deepEqual(secretSiegeEconomy(reloaded),afterReward);
 for(const phase of ['ready','playing','paused','lost']){
  const before=JSON.stringify(reloaded);assert.equal(recordSecretSiegeVictory(reloaded,{...won(8700+bounty,2),phase}),false);assert.equal(JSON.stringify(reloaded),before);
 }
 assert.equal(selectSecretSiegeStage(reloaded,1),true);assert.deepEqual(secretSiegeEconomy(reloaded),afterReward);
 assert.ok(writeSave(reloaded));assert.deepEqual(secretSiegeEconomy(loadSave()),afterReward);
}));

test('victory preserves the already persisted wallet and carries it through stage selection',()=>storage(()=>{
 const save=completed(),battle=persist(save,20420);
 assert.equal(recordSecretSiegeVictory(save,won(20420,battle.revision)),true);
 assert.deepEqual(secretSiegeEconomy(save),{coins:20420,researched:[],revision:2});
 assert.equal(selectSecretSiegeStage(save,2),true);assert.equal(secretSiegeEconomy(save).coins,20420);
 assert.ok(writeSave(save));const next=loadSave();assert.deepEqual(next.secretSiege,save.secretSiege);
 const second=persist(next,30940);assert.equal(recordSecretSiegeVictory(next,won(30940,second.revision,2)),true);
 assert.equal(secretSiegeEconomy(next).coins,30940);assert.equal(selectSecretSiegeStage(next,1),true);assert.equal(secretSiegeEconomy(next).coins,30940);
}));

test('duplicate and stale snapshots cannot overwrite a newer wallet or double-credit a victory',()=>storage(()=>{
 const save=completed(),stale={coins:20420,researched:[],revision:0};persist(save,8700);
 const trained=JSON.stringify(save);assert.equal(persistSecretSiegeEconomy(save,stale),false);assert.equal(JSON.stringify(save),trained);
 const battle=persist(save,20420),result=won(20420,battle.revision);
 assert.equal(recordSecretSiegeVictory(save,result),true);const settled=JSON.stringify(save);
 assert.equal(recordSecretSiegeVictory(save,result),false);assert.equal(persistSecretSiegeEconomy(save,{...stale,revision:battle.revision}),false);assert.equal(JSON.stringify(save),settled);
 const same=secretSiegeEconomy(save);assert.equal(persistSecretSiegeEconomy(save,same),true);assert.deepEqual(secretSiegeEconomy(save),same);
 assert.ok(writeSave(save));assert.equal(recordSecretSiegeVictory(loadSave(),result),false);
}));

test('zero and small legitimate balances remain unchanged rather than receiving a reset or refund',()=>storage(()=>{
 const save=completed();
 for(const coins of [7480,1000,10,0]){
  const state=persist(save,coins);assert.ok(writeSave(save));assert.deepEqual(secretSiegeEconomy(loadSave()),state);
  assert.equal(selectSecretSiegeStage(save,1),true);assert.equal(secretSiegeEconomy(save).coins,coins);
 }
 const state=secretSiegeEconomy(save);assert.equal(recordSecretSiegeVictory(save,won(0,state.revision)),true);
 assert.equal(secretSiegeEconomy(save).coins,0);assert.ok(writeSave(save));assert.equal(secretSiegeEconomy(loadSave()).coins,0);
}));

test('research is a separate permanent debit and cannot disappear in a subsequent training snapshot',()=>storage(()=>{
 const save=completed();save.secretSiege=progress(20000);
 assert.deepEqual(persist(save,18800),{coins:18800,researched:[],revision:1});
 const research=persist(save,10800,['knight']);assert.deepEqual(research,{coins:10800,researched:['knight'],revision:2});
 assert.ok(writeSave(save));assert.deepEqual(secretSiegeEconomy(loadSave()),research);
 const trained=persist(save,8990);assert.deepEqual(trained,{coins:8990,researched:['knight'],revision:3});
 const before=JSON.stringify(save);assert.equal(persistSecretSiegeEconomy(save,{coins:8990,researched:[],revision:3}),false);assert.equal(JSON.stringify(save),before);
 assert.equal(recordSecretSiegeVictory(save,{...won(8990,3),researched:[]}),false);assert.equal(JSON.stringify(save),before);
 assert.equal(recordSecretSiegeVictory(save,{...won(8990,3),researched:['knight']}),true);assert.equal(secretSiegeEconomy(save).coins,8990);
}));

test('legacy research purchase retains its explicit preparation reserve and expensive single-use prices',()=>storage(()=>{
 assert.deepEqual(ARMY.filter(spec=>spec.researchCost>0).map(spec=>[spec.id,spec.researchCost]),[['knight',8000],['ranger',12000],['champion',24000],['priest',16000]]);
 for(const spec of ARMY.filter(army=>army.researchCost>0)){
  const save=completed();save.secretSiege=progress(spec.researchCost+STARTER_BUDGET-10);const before=JSON.stringify(save);
  assert.equal(purchaseSecretSiegeResearch(save,spec.id),false);assert.equal(JSON.stringify(save),before);
  save.secretSiege=progress(spec.researchCost+STARTER_BUDGET);assert.equal(purchaseSecretSiegeResearch(save,spec.id),true);assert.equal(secretSiegeEconomy(save).coins,STARTER_BUDGET);
  const paid=JSON.stringify(save);assert.equal(purchaseSecretSiegeResearch(save,spec.id),false);assert.equal(JSON.stringify(save),paid);
 }
 const save=completed();save.secretSiege=progress(8000);assert.equal(purchaseSecretSiegeResearch(save,'knight',0),true);assert.equal(secretSiegeEconomy(save).coins,0);
 for(const id of ['guard','striker','scout','missing'] as ArmyId[])assert.equal(purchaseSecretSiegeResearch(save,id,0),false);
}));

test('a failed browser write does not replace the previous persisted financial snapshot',()=>storage(()=>{
 const save=completed();save.secretSiege=progress(20000);assert.ok(writeSave(save));const candidate=loadSave();
 assert.equal(persistSecretSiegeEconomy(candidate,{coins:10800,researched:['knight'],revision:0}),true);
 const original=localStorage.setItem;localStorage.setItem=()=>{throw Error('quota');};
 try{assert.equal(writeSave(candidate),false);assert.deepEqual(secretSiegeEconomy(loadSave()),{coins:20000,researched:[],revision:0});}
 finally{localStorage.setItem=original;}
}));

test('financial updates stay separate from the original campaign and new adventure resets only explicitly',()=>storage(()=>{
 const save=completed();save.secretSiege=progress(20000);const campaign=JSON.stringify({...save,secretSiege:undefined});
 persist(save,10800,['knight']);assert.equal(recordSecretSiegeVictory(save,{...won(10800,1),researched:['knight']}),true);
 assert.equal(JSON.stringify({...save,secretSiege:undefined}),campaign);
 const fresh=newAdventure(save);assert.equal(fresh.secretSiege,undefined);assert.equal(save.secretSiege!.coins,10800);
 save.campaignCompleted=false;const before=JSON.stringify(save);assert.equal(persistSecretSiegeEconomy(save,{coins:0,researched:[],revision:0}),false);assert.equal(JSON.stringify(save),before);
}));

test('corrupt currency, research and revisions are rejected without losing valid expedition records',()=>storage(()=>{
 const save=completed(),base=progress(20000);
 for(const coins of [-10,0.01,9901,NaN,Infinity,'20000',Number.MAX_SAFE_INTEGER,SIEGE_COIN_LIMIT+10]){
  const restored=restoreSecretSiegeProgress({...base,coins,researched:['champion']},save)!;
  assert.equal(restored.coins,INITIAL_COINS);assert.deepEqual(restored.researched,[]);assert.equal(restored.revision,0);
  const before=JSON.stringify(save);assert.equal(persistSecretSiegeEconomy(save,{coins:coins as number,researched:[],revision:0}),false);assert.equal(JSON.stringify(save),before);
 }
 for(const revision of [-1,1.5,NaN,Infinity,'1',Number.MAX_SAFE_INTEGER])assert.deepEqual(restoreSecretSiegeProgress({...base,revision,researched:['knight']},save),progress());
 const stages=Array.from({length:10},(_,index)=>({stage:index+1,stars:2,bestSeconds:120,victories:2}));
 assert.deepEqual(restoreSecretSiegeProgress({...base,coins:'damaged',researched:['knight'],resumeStage:10,stages,cleared:true,endingSeen:true},save),{...progress(),resumeStage:10,stages,cleared:true,endingSeen:true});
 save.secretSiege={...base,researched:['knight']};const before=JSON.stringify(save);
 for(const researched of [['guard'],['missing'],[null],null])assert.equal(persistSecretSiegeEconomy(save,{coins:20000,researched,revision:0} as Parameters<typeof persistSecretSiegeEconomy>[1]),false);
 for(const override of [{money:-10},{money:1},{money:123.5},{money:Infinity},{money:21520},{money:'20000'},{earnedCoins:90000},{earnedCoins:1500},{economyRevision:-1},{economyRevision:1.5},{economyRevision:1},{money:undefined},{economyRevision:undefined},{researched:['missing']}]){
  assert.equal(recordSecretSiegeVictory(save,{...won(20000,0),...override} as Parameters<typeof recordSecretSiegeVictory>[1]),false);assert.equal(JSON.stringify(save),before);
 }
 const detached=secretSiegeEconomy(save);(detached.researched as ArmyId[]).push('priest');detached.coins=0;assert.deepEqual(secretSiegeEconomy(save),{coins:20000,researched:['knight'],revision:0});
}));
