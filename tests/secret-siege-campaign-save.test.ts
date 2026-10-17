import assert from 'node:assert/strict';
import test from 'node:test';
import {loadSave,writeSave,type Save} from '../src/save';
import {ARMY} from '../src/secret-siege-types';
import {INITIAL_COINS,STARTER_BUDGET} from '../src/secret-siege-research';
import {secretSiegeEconomy,purchaseSecretSiegeResearch,persistSecretSiegeEconomy,recordSecretSiegeVictory,selectSecretSiegeStage} from '../src/secret-siege-progress';
import {simulateSecretSiegeCampaign} from '../tools/simulate-secret-siege';

for(const difficulty of ['practice','standard','challenge'] as const)test(`${difficulty}: a real ten-stage campaign settles through saved research and wallet checkpoints without new starting grants`,()=>{
 const descriptor=Object.getOwnPropertyDescriptor(globalThis,'localStorage'),data=new Map<string,string>();
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>data.set(key,value),removeItem:(key:string)=>data.delete(key)}});
 try{
  let save:Save=loadSave();save.level=save.resumeStage=11;save.stars[10]=3;save.campaignCompleted=true;save.difficulty=difficulty;
  assert.ok(writeSave(save));assert.equal(secretSiegeEconomy(loadSave()).coins,INITIAL_COINS);
  const campaign=simulateSecretSiegeCampaign(difficulty,1/60);assert.equal(campaign.results.length,10);
  let rewards=0,training=0,research=0;
  for(const run of campaign.results){
   save=loadSave();assert.ok(selectSecretSiegeStage(save,run.stageId));assert.equal(secretSiegeEconomy(save).coins,run.bankBeforeResearch);
   assert.ok(writeSave(save));save=loadSave();
   for(const id of run.researchPurchases){
    const before=secretSiegeEconomy(save).coins,cost=ARMY.find(army=>army.id===id)!.researchCost;
    assert.ok(purchaseSecretSiegeResearch(save,id));assert.equal(secretSiegeEconomy(save).coins,before-cost);research+=cost;
    assert.ok(writeSave(save));save=loadSave();const once=JSON.stringify(save);
    assert.equal(purchaseSecretSiegeResearch(save,id),false);assert.equal(JSON.stringify(save),once);
   }
   const bank=secretSiegeEconomy(save);assert.equal(bank.coins,run.startingCoins);assert.deepEqual(bank.researched,run.researched);
   assert.equal(run.phase,'won');assert.ok(run.remainingMoney>=STARTER_BUDGET);
   assert.ok(persistSecretSiegeEconomy(save,{coins:run.remainingMoney,researched:run.researched,revision:bank.revision}));assert.ok(writeSave(save));save=loadSave();
   const result={phase:run.phase,stars:run.stars,elapsed:run.elapsed,stageId:run.stageId,money:run.remainingMoney,economyRevision:secretSiegeEconomy(save).revision,earnedCoins:run.earnedCoins,researched:run.researched};
   assert.ok(recordSecretSiegeVictory(save,result));assert.ok(writeSave(save));save=loadSave();
   assert.equal(secretSiegeEconomy(save).coins,run.remainingMoney);assert.deepEqual(secretSiegeEconomy(save).researched,run.researched);
   const once=JSON.stringify(save);assert.equal(recordSecretSiegeVictory(save,result),false);assert.equal(JSON.stringify(save),once);
   rewards+=run.earnedCoins;training+=run.spent;
   assert.equal(secretSiegeEconomy(save).coins,INITIAL_COINS+rewards-training-research);
  }
  assert.equal(save.secretSiege!.stages.length,10);assert.equal(save.secretSiege!.researched.length,4);assert.equal(research,60000);
  assert.equal(secretSiegeEconomy(save).coins,campaign.economy.coins);
 }finally{if(descriptor)Object.defineProperty(globalThis,'localStorage',descriptor);else Reflect.deleteProperty(globalThis,'localStorage');}
});
