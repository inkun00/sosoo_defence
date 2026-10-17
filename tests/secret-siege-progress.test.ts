import {test} from 'node:test';
import assert from 'node:assert/strict';
import {loadSave,newAdventure,writeSave,type Save} from '../src/save';
import {campaignTotal,type StageScore} from '../src/campaign-score';
import {FINAL_STAGE,LEVELS} from '../src/levels';
import {secretSiegeUnlocked,restoreSecretSiegeProgress,recordSecretSiegeVictory,secretSiegeResumeStage,secretSiegeStageUnlocked,secretSiegeStageRecord,selectSecretSiegeStage,markSecretSiegeEndingSeen,type SecretSiegeProgress,type SecretSiegeStageProgress} from '../src/secret-siege-progress';
import {SIEGE_DURATION} from '../src/secret-siege-types';
import {SIEGE_STAGE_COUNT} from '../src/secret-siege-stages';
import {pageRequest,openAuthorizedPage,requiresAccount} from '../src/page-access';

const legacy={version:1,cleared:true,bestStars:2,bestSeconds:120,victories:3};
const stageRecord=(stage:number):SecretSiegeStageProgress=>({stage,stars:2,bestSeconds:120,victories:3});
function progress(count=0):SecretSiegeProgress{return {version:2,resumeStage:Math.min(count+1,SIEGE_STAGE_COUNT),stages:Array.from({length:count},(_,i)=>stageRecord(i+1)),cleared:count===SIEGE_STAGE_COUNT,endingSeen:false};}
const won=(stageId:number,stars=2,elapsed=120)=>({phase:'won',stageId,stars,elapsed});
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

test('legacy eleven-stage wins unlock without score evidence; old main ten-stage completion stays locked',()=>withStorage(data=>{
 data.set('decimal-castle-v1',JSON.stringify({version:1,level:11,resumeStage:11,stars:[...Array(10).fill(2),1],campaignCompleted:true,started:true}));
 const oldWinner=loadSave();assert.equal(secretSiegeUnlocked(oldWinner),true);assert.equal(campaignTotal(oldWinner),0);
 data.set('decimal-castle-v1',JSON.stringify({version:1,level:10,resumeStage:10,stars:Array(10).fill(3),campaignCompleted:true,secretSiege:progress(10)}));
 const tenStage=loadSave();assert.equal(tenStage.level,11);assert.equal(tenStage.campaignCompleted,false);assert.equal(secretSiegeUnlocked(tenStage),false);assert.equal(tenStage.secretSiege,undefined);
}));

test('an existing single siege victory migrates to stage one without skipping the new expedition',()=>withStorage(data=>{
 const save=completed(),restored=restoreSecretSiegeProgress(legacy,save)!;
 assert.deepEqual(restored,{version:2,resumeStage:2,stages:[stageRecord(1)],cleared:false,endingSeen:false});
 restored.stages[0].victories++;assert.equal(legacy.victories,3);
 data.set('decimal-castle-v1',JSON.stringify({...save,secretSiege:legacy}));
 const loaded=loadSave();assert.deepEqual(loaded.secretSiege,progress(1));assert.equal(secretSiegeStageUnlocked(loaded,2),true);assert.equal(secretSiegeStageUnlocked(loaded,3),false);
 assert.ok(writeSave(loaded));assert.equal(JSON.parse(data.get('decimal-castle-v1')!).secretSiege.version,2);
}));

test('malformed old siege records never unlock additional stages',()=>withStorage(()=>{
 const save=completed();
 for(const invalid of [null,[],{}, {...legacy,version:3},{...legacy,cleared:false},{...legacy,bestStars:0},{...legacy,bestStars:4},{...legacy,bestStars:1.5},{...legacy,bestSeconds:0},{...legacy,bestSeconds:-1},{...legacy,bestSeconds:Infinity},{...legacy,bestSeconds:SIEGE_DURATION+1},{...legacy,victories:0},{...legacy,victories:1000001},{...legacy,victories:'3'}]){
  assert.equal(restoreSecretSiegeProgress(invalid,save),undefined);
  const candidate={...save,secretSiege:invalid as SecretSiegeProgress};assert.equal(secretSiegeStageUnlocked(candidate,2),false);
 }
}));

test('siege records round-trip only with their unlocked campaign and are copied from storage',()=>withStorage(data=>{
 const save=completed();save.secretSiege=progress(3);assert.ok(writeSave(save));assert.deepEqual(loadSave(),save);
 const restored=restoreSecretSiegeProgress(save.secretSiege,save)!;restored.stages[0].victories++;assert.equal(save.secretSiege.stages[0].victories,3);
 const raw=JSON.parse(data.get('decimal-castle-v1')!);raw.campaignCompleted=false;data.set('decimal-castle-v1',JSON.stringify(raw));assert.equal(loadSave().secretSiege,undefined);
}));

test('only the consecutive validated prefix survives missing, duplicate, and malformed stage rows',()=>withStorage(()=>{
 const save=completed(),raw=progress(4);
 raw.stages=[stageRecord(3),stageRecord(1),stageRecord(2)];assert.deepEqual(restoreSecretSiegeProgress(raw,save),progress(3));
 raw.stages=[stageRecord(1),stageRecord(3),stageRecord(4)];const gap=restoreSecretSiegeProgress(raw,save)!;assert.deepEqual(gap.stages,[stageRecord(1)]);assert.equal(gap.resumeStage,2);
 raw.stages=[stageRecord(1),stageRecord(2),stageRecord(2),stageRecord(3)];assert.deepEqual(restoreSecretSiegeProgress(raw,save)!.stages,[stageRecord(1)]);
 for(const corrupt of [{stars:0},{stars:4},{stars:1.5},{bestSeconds:0},{bestSeconds:Infinity},{bestSeconds:181},{victories:0},{victories:1000001},{victories:'4'}]){
  const candidate={...raw,stages:[stageRecord(1),{...stageRecord(2),...corrupt},stageRecord(3)]};assert.deepEqual(restoreSecretSiegeProgress(candidate,save)!.stages,[stageRecord(1)]);
 }
 assert.deepEqual(restoreSecretSiegeProgress({...raw,stages:[null,[],stageRecord(1),{...stageRecord(2),stage:11}]},save)!.stages,[stageRecord(1)]);
}));

test('clear and ending flags are derived from all ten victories and selection is clamped to unlocked stages',()=>withStorage(()=>{
 const save=completed();
 for(const count of [0,1,9]){
  const restored=restoreSecretSiegeProgress({...progress(count),resumeStage:99,cleared:true,endingSeen:true},save)!;
  assert.equal(restored.cleared,false);assert.equal(restored.endingSeen,false);assert.equal(restored.resumeStage,count+1);
 }
 assert.equal(restoreSecretSiegeProgress({...progress(2),resumeStage:-2},save)!.resumeStage,1);
 assert.equal(restoreSecretSiegeProgress({...progress(2),resumeStage:'3'},save)!.resumeStage,1);
 assert.deepEqual(restoreSecretSiegeProgress({...progress(10),cleared:false,endingSeen:true},save),{...progress(10),endingSeen:true});
}));

test('unplayed unlocked expeditions start at one without allocating progress and cannot select locked stages',()=>withStorage(()=>{
 const save=completed();assert.equal(secretSiegeResumeStage(save),1);assert.equal(secretSiegeStageRecord(save,1),undefined);assert.equal(save.secretSiege,undefined);
 assert.equal(secretSiegeStageUnlocked(save,1),true);
 for(const invalid of [0,2,10,11,1.5,NaN,Infinity]){const before=JSON.stringify(save);assert.equal(selectSecretSiegeStage(save,invalid),false);assert.equal(JSON.stringify(save),before);}
 assert.equal(selectSecretSiegeStage(save,1),true);assert.deepEqual(save.secretSiege,progress());
 save.secretSiege=progress(3);assert.equal(selectSecretSiegeStage(save,2),true);assert.equal(secretSiegeResumeStage(save),2);assert.equal(secretSiegeStageUnlocked(save,4),true);assert.equal(secretSiegeStageUnlocked(save,5),false);
 const record=secretSiegeStageRecord(save,1)!;record.stars=1;assert.equal(save.secretSiege.stages[0].stars,2);
}));

test('only valid wins in an already unlocked stage can extend the expedition',()=>withStorage(()=>{
 const save=completed();
 for(const result of [{...won(1),phase:'lost'},{...won(1),phase:'playing'},won(1,0),won(1,4),won(1,3,0),won(1,3,NaN),won(1,3,SIEGE_DURATION+1),won(0),won(2),won(10),won(1.5),won(NaN)])assert.equal(recordSecretSiegeVictory(save,result),false);
 assert.equal(save.secretSiege,undefined);
 assert.equal(recordSecretSiegeVictory(save,won(1)),true);assert.deepEqual(save.secretSiege,{...progress(1),stages:[{...stageRecord(1),victories:1}]});
 assert.equal(recordSecretSiegeVictory(save,won(3)),false);assert.equal(secretSiegeStageUnlocked(save,3),false);
 assert.equal(recordSecretSiegeVictory(save,won(2,3,100)),true);assert.equal(save.secretSiege!.stages.length,2);assert.equal(secretSiegeResumeStage(save),3);
}));

test('replaying a stage improves independent records without resetting later victories or the ending',()=>withStorage(()=>{
 const save=completed();save.secretSiege={...progress(10),endingSeen:true};
 assert.equal(recordSecretSiegeVictory(save,won(2,3,150)),true);assert.equal(recordSecretSiegeVictory(save,won(2,1,99.75)),true);
 assert.deepEqual(secretSiegeStageRecord(save,2),{stage:2,stars:3,bestSeconds:99.75,victories:5});
 assert.deepEqual(secretSiegeStageRecord(save,10),stageRecord(10));assert.equal(save.secretSiege!.cleared,true);assert.equal(save.secretSiege!.endingSeen,true);assert.equal(secretSiegeResumeStage(save),3);
 save.secretSiege!.stages[1].victories=1000000;assert.equal(recordSecretSiegeVictory(save,won(2)),true);assert.equal(secretSiegeStageRecord(save,2)!.victories,1000000);
}));

test('stage ten completes the other world and only then can its ending be marked seen',()=>withStorage(()=>{
 const save=completed();assert.equal(markSecretSiegeEndingSeen(save),false);assert.equal(save.secretSiege,undefined);
 for(let stage=1;stage<=SIEGE_STAGE_COUNT;stage++){
  assert.equal(recordSecretSiegeVictory(save,won(stage)),true);assert.equal(save.secretSiege!.cleared,stage===10);assert.equal(save.secretSiege!.endingSeen,false);
  if(stage<10){const before=JSON.stringify(save);assert.equal(markSecretSiegeEndingSeen(save),false);assert.equal(JSON.stringify(save),before);}
 }
 assert.equal(secretSiegeResumeStage(save),10);assert.equal(markSecretSiegeEndingSeen(save),true);assert.equal(save.secretSiege!.endingSeen,true);
 assert.equal(markSecretSiegeEndingSeen(save),true);assert.ok(writeSave(save));assert.deepEqual(loadSave(),save);
}));

test('siege wins never change the original campaign score, currency, inventory, or settings',()=>withStorage(()=>{
 const save=completed();save.scoreProgress!.stages=[finalScore()];const campaign=JSON.stringify({...save,secretSiege:undefined});
 for(let stage=1;stage<=SIEGE_STAGE_COUNT;stage++)assert.equal(recordSecretSiegeVictory(save,won(stage)),true);
 assert.equal(markSecretSiegeEndingSeen(save),true);assert.equal(selectSecretSiegeStage(save,5),true);assert.equal(JSON.stringify({...save,secretSiege:undefined}),campaign);
 save.campaignCompleted=false;const before=JSON.stringify(save);assert.equal(recordSecretSiegeVictory(save,won(1)),false);assert.equal(selectSecretSiegeStage(save,1),false);assert.equal(markSecretSiegeEndingSeen(save),false);assert.equal(secretSiegeStageRecord(save,1),undefined);assert.equal(JSON.stringify(save),before);
}));

test('a new adventure removes all expedition progress and requires a new original final victory',()=>withStorage(()=>{
 const save=completed();save.secretSiege={...progress(10),endingSeen:true};const original=JSON.stringify(save.secretSiege),fresh=newAdventure(save);
 assert.equal(secretSiegeUnlocked(fresh),false);assert.equal(fresh.secretSiege,undefined);assert.equal('secretSiege' in fresh,false);assert.equal(JSON.stringify(save.secretSiege),original);
 fresh.level=FINAL_STAGE;assert.equal(secretSiegeUnlocked(fresh),false);
 fresh.campaignCompleted=true;fresh.stars[FINAL_STAGE-1]=1;assert.equal(secretSiegeUnlocked(fresh),true);
 assert.equal(recordSecretSiegeVictory(fresh,won(1,1,100)),true);assert.equal(secretSiegeStageRecord(fresh,1)!.victories,1);assert.equal(secretSiegeStageUnlocked(fresh,3),false);
 assert.ok(writeSave(fresh));assert.deepEqual(loadSave(),fresh);
}));

test('siege is a public local route and never initializes Firebase just to enter',async()=>{
 const request=pageRequest('?mode=siege');assert.equal(request.mode,'siege');assert.equal(requiresAccount(request.mode),false);
 let loaded=0;assert.equal(await openAuthorizedPage(request,{session:async()=>{throw Error('no account required');},login:async()=>{throw Error('no login required');},load:async value=>{assert.equal(value,request);loaded++;}}),true);assert.equal(loaded,1);
});
