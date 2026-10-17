import {test} from 'node:test';
import assert from 'node:assert/strict';
import {loadSave,newAdventure,writeSave,type Save} from '../src/save';
import {campaignTotal,type StageScore} from '../src/campaign-score';
import {FINAL_STAGE,LEVELS} from '../src/levels';
import {secretSiegeUnlocked,restoreSecretSiegeProgress,recordSecretSiegeVictory,type SecretSiegeProgress} from '../src/secret-siege-progress';
import {SIEGE_DURATION} from '../src/secret-siege-types';
import {pageRequest,openAuthorizedPage,requiresAccount} from '../src/page-access';

const progress:SecretSiegeProgress={version:1,cleared:true,bestStars:2,bestSeconds:120,victories:3};
function withStorage(run:(data:Map<string,string>)=>void){
 const previous=Object.getOwnPropertyDescriptor(globalThis,'localStorage'),data=new Map<string,string>();
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>data.set(key,value),removeItem:(key:string)=>data.delete(key)}});
 try{run(data);}finally{if(previous)Object.defineProperty(globalThis,'localStorage',previous);else Reflect.deleteProperty(globalThis,'localStorage');}
}
function completed():Save{const save=loadSave();save.level=save.resumeStage=FINAL_STAGE;save.campaignCompleted=true;save.stars[FINAL_STAGE-1]=2;return save;}
function finalScore():StageScore{
 const kills=LEVELS[FINAL_STAGE-1].hp.length+1;
 return {stage:FINAL_STAGE,difficulty:'standard',combatScore:kills*200,questionScore:0,score:kills*200,kills,successfulHits:kills,answeredQuestions:0,purchases:0,fusions:0,castle:5,bossDefeated:true,killHits:Array(kills).fill(1),purchaseWrongAttempts:[],fusionWrongAttempts:[]};
}

test('the secret expedition requires final campaign victory, not reaching or merely defeating the wizard',()=>withStorage(()=>{
 const save=loadSave();assert.equal(secretSiegeUnlocked(save),false);
 save.level=save.resumeStage=FINAL_STAGE;assert.equal(secretSiegeUnlocked(save),false);
 save.stars[FINAL_STAGE-1]=3;assert.equal(secretSiegeUnlocked(save),false);
 save.campaignCompleted=true;save.stars[FINAL_STAGE-1]=0;assert.equal(secretSiegeUnlocked(save),false);
 save.stars[FINAL_STAGE-1]=1;assert.equal(secretSiegeUnlocked(save),true);
 save.campaignCompleted=false;assert.equal(secretSiegeUnlocked(save),false);
}));

test('validated final-stage evidence supports completed saves, while invalid claims cannot unlock',()=>withStorage(()=>{
 const save=loadSave();save.campaignCompleted=true;
 save.scoreProgress!.stages=[finalScore()];assert.equal(secretSiegeUnlocked(save),true);
 save.scoreProgress!.stages[0].bossDefeated=false;assert.equal(secretSiegeUnlocked(save),false);
 save.scoreProgress!.stages=[{...finalScore(),score:999999}];assert.equal(secretSiegeUnlocked(save),false);
}));

test('legacy eleven-stage wins unlock without score evidence; old ten-stage completion stays locked',()=>withStorage(data=>{
 data.set('decimal-castle-v1',JSON.stringify({version:1,level:11,resumeStage:11,stars:[...Array(10).fill(2),1],campaignCompleted:true,started:true}));
 const oldWinner=loadSave();assert.equal(secretSiegeUnlocked(oldWinner),true);assert.equal(campaignTotal(oldWinner),0);
 data.set('decimal-castle-v1',JSON.stringify({version:1,level:10,resumeStage:10,stars:Array(10).fill(3),campaignCompleted:true,secretSiege:progress}));
 const tenStage=loadSave();assert.equal(tenStage.level,11);assert.equal(tenStage.campaignCompleted,false);assert.equal(secretSiegeUnlocked(tenStage),false);assert.equal(tenStage.secretSiege,undefined);
}));

test('siege records round-trip only with their unlocked campaign and are copied from storage',()=>withStorage(data=>{
 const save=completed();save.secretSiege={...progress};assert.ok(writeSave(save));assert.deepEqual(loadSave(),save);
 const restored=restoreSecretSiegeProgress(progress,save)!;assert.deepEqual(restored,progress);restored.victories++;assert.equal(progress.victories,3);
 const raw=JSON.parse(data.get('decimal-castle-v1')!);raw.campaignCompleted=false;data.set('decimal-castle-v1',JSON.stringify(raw));
 assert.equal(loadSave().secretSiege,undefined);
}));

test('malformed siege statistics never grant clear records or carry invalid best values',()=>withStorage(()=>{
 const save=completed();
 for(const invalid of [null,[],{}, {...progress,version:2},{...progress,cleared:false},{...progress,bestStars:0},{...progress,bestStars:4},{...progress,bestStars:1.5},{...progress,bestSeconds:0},{...progress,bestSeconds:-1},{...progress,bestSeconds:Infinity},{...progress,bestSeconds:SIEGE_DURATION+1},{...progress,victories:0},{...progress,victories:1000001},{...progress,victories:'3'}])assert.equal(restoreSecretSiegeProgress(invalid,save),undefined);
}));

test('only valid siege wins update best metrics and never change campaign score or inventory',()=>withStorage(()=>{
 const save=completed();save.scoreProgress!.stages=[finalScore()];const campaign=JSON.stringify({...save,secretSiege:undefined});
 for(const result of [{phase:'lost',stars:3,elapsed:30},{phase:'playing',stars:3,elapsed:30},{phase:'won',stars:0,elapsed:30},{phase:'won',stars:4,elapsed:30},{phase:'won',stars:3,elapsed:0},{phase:'won',stars:3,elapsed:NaN},{phase:'won',stars:3,elapsed:SIEGE_DURATION+1}])assert.equal(recordSecretSiegeVictory(save,result),false);
 assert.equal(save.secretSiege,undefined);
 assert.equal(recordSecretSiegeVictory(save,{phase:'won',stars:2,elapsed:120}),true);
 assert.deepEqual(save.secretSiege,{version:1,cleared:true,bestStars:2,bestSeconds:120,victories:1});
 assert.equal(recordSecretSiegeVictory(save,{phase:'won',stars:3,elapsed:150}),true);
 assert.equal(recordSecretSiegeVictory(save,{phase:'won',stars:1,elapsed:99.75}),true);
 assert.deepEqual(save.secretSiege,{version:1,cleared:true,bestStars:3,bestSeconds:99.75,victories:3});
 assert.equal(JSON.stringify({...save,secretSiege:undefined}),campaign);
 save.campaignCompleted=false;const before=JSON.stringify(save);assert.equal(recordSecretSiegeVictory(save,{phase:'won',stars:3,elapsed:50}),false);assert.equal(JSON.stringify(save),before);
}));

test('a new adventure removes the secret record and only a new final victory unlocks again',()=>withStorage(()=>{
 const save=completed();save.secretSiege={...progress};const fresh=newAdventure(save);
 assert.equal(secretSiegeUnlocked(fresh),false);assert.equal(fresh.secretSiege,undefined);assert.equal('secretSiege' in fresh,false);assert.deepEqual(save.secretSiege,progress);
 fresh.level=FINAL_STAGE;assert.equal(secretSiegeUnlocked(fresh),false);
 fresh.campaignCompleted=true;fresh.stars[FINAL_STAGE-1]=1;assert.equal(secretSiegeUnlocked(fresh),true);
 assert.equal(recordSecretSiegeVictory(fresh,{phase:'won',stars:1,elapsed:100}),true);assert.equal(fresh.secretSiege!.victories,1);
 assert.ok(writeSave(fresh));assert.deepEqual(loadSave(),fresh);
}));

test('siege is a public local route and never initializes Firebase just to enter',async()=>{
 const request=pageRequest('?mode=siege');assert.equal(request.mode,'siege');assert.equal(requiresAccount(request.mode),false);
 let loaded=0;assert.equal(await openAuthorizedPage(request,{session:async()=>{throw Error('no account required');},login:async()=>{throw Error('no login required');},load:async value=>{assert.equal(value,request);loaded++;}}),true);assert.equal(loaded,1);
});
