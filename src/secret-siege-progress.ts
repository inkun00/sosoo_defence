import {campaignCompletion} from './campaign-score';
import {FINAL_STAGE} from './levels';
import {SIEGE_DURATION} from './secret-siege-types';
import {SIEGE_STAGE_COUNT} from './secret-siege-stages';
import type {Save} from './save';

export interface SecretSiegeStageProgress{stage:number;stars:number;bestSeconds:number;victories:number;}
export interface SecretSiegeProgress{version:2;resumeStage:number;stages:SecretSiegeStageProgress[];cleared:boolean;endingSeen:boolean;}
type Eligibility=Pick<Save,'campaignCompleted'|'stars'|'scoreProgress'>;
type ProgressSave=Eligibility&Pick<Save,'secretSiege'>;
const whole=(value:unknown,min:number,max:number):value is number=>typeof value==='number'&&Number.isSafeInteger(value)&&value>=min&&value<=max;
const seconds=(value:unknown):value is number=>typeof value==='number'&&Number.isFinite(value)&&value>0&&value<=SIEGE_DURATION;
const empty=():SecretSiegeProgress=>({version:2,resumeStage:1,stages:[],cleared:false,endingSeen:false});
const nextStage=(progress:SecretSiegeProgress):number=>Math.min(progress.stages.length+1,SIEGE_STAGE_COUNT);

/** Reaching stage 11, or defeating its wizard before the wave is won, is insufficient. */
export function secretSiegeUnlocked(save:Eligibility):boolean{
 return save.campaignCompleted===true&&(whole(save.stars[FINAL_STAGE-1],1,3)||campaignCompletion(save)!==null);
}

/** Only a consecutive prefix of valid victories can unlock another expedition. */
export function restoreSecretSiegeProgress(raw:unknown,save:Eligibility):SecretSiegeProgress|undefined{
 if(!secretSiegeUnlocked(save)||!raw||typeof raw!=='object'||Array.isArray(raw))return;
 const value=raw as Record<string,unknown>;
 if(value.version===1){
  if(value.cleared!==true||!whole(value.bestStars,1,3)||!seconds(value.bestSeconds)||!whole(value.victories,1,1000000))return;
  return {version:2,resumeStage:2,stages:[{stage:1,stars:value.bestStars,bestSeconds:value.bestSeconds,victories:value.victories}],cleared:false,endingSeen:false};
 }
 if(value.version!==2||!Array.isArray(value.stages))return;
 const rows=new Map<number,SecretSiegeStageProgress>(),duplicates=new Set<number>();
 for(const rawRow of value.stages){
  if(!rawRow||typeof rawRow!=='object'||Array.isArray(rawRow))continue;
  const row=rawRow as Record<string,unknown>;
  if(!whole(row.stage,1,SIEGE_STAGE_COUNT))continue;
  if(rows.has(row.stage)||duplicates.has(row.stage)){rows.delete(row.stage);duplicates.add(row.stage);continue;}
  if(!whole(row.stars,1,3)||!seconds(row.bestSeconds)||!whole(row.victories,1,1000000))continue;
  rows.set(row.stage,{stage:row.stage,stars:row.stars,bestSeconds:row.bestSeconds,victories:row.victories});
 }
 const progress=empty();
 for(let stage=1;stage<=SIEGE_STAGE_COUNT;stage++){const row=rows.get(stage);if(!row)break;progress.stages.push(row);}
 const selected=whole(value.resumeStage,1,Number.MAX_SAFE_INTEGER)?value.resumeStage:1;
 progress.resumeStage=Math.min(selected,nextStage(progress));
 progress.cleared=progress.stages.length===SIEGE_STAGE_COUNT;
 progress.endingSeen=progress.cleared&&value.endingSeen===true;
 return progress;
}

export function secretSiegeResumeStage(save:ProgressSave):number{return restoreSecretSiegeProgress(save.secretSiege,save)?.resumeStage??1;}
export function secretSiegeStageUnlocked(save:ProgressSave,stage:number):boolean{
 if(!secretSiegeUnlocked(save)||!whole(stage,1,SIEGE_STAGE_COUNT))return false;
 return stage<=nextStage(restoreSecretSiegeProgress(save.secretSiege,save)??empty());
}
export function secretSiegeStageRecord(save:ProgressSave,stage:number):SecretSiegeStageProgress|undefined{
 if(!whole(stage,1,SIEGE_STAGE_COUNT))return;
 return restoreSecretSiegeProgress(save.secretSiege,save)?.stages.find(row=>row.stage===stage);
}
export function selectSecretSiegeStage(save:Save,stage:number):boolean{
 if(!secretSiegeStageUnlocked(save,stage))return false;
 const progress=restoreSecretSiegeProgress(save.secretSiege,save)??empty();
 progress.resumeStage=stage;save.secretSiege=progress;return true;
}

/** Bonus records stay separate from the eleven-stage campaign score and account XP. */
export function recordSecretSiegeVictory(save:Save,result:{phase:string;stars:number;elapsed:number;stageId:number}):boolean{
 if(result.phase!=='won'||!whole(result.stars,1,3)||!seconds(result.elapsed)||!secretSiegeStageUnlocked(save,result.stageId))return false;
 const progress=restoreSecretSiegeProgress(save.secretSiege,save)??empty(),previous=progress.stages[result.stageId-1];
 const record:SecretSiegeStageProgress={stage:result.stageId,stars:Math.max(previous?.stars??0,result.stars),bestSeconds:Math.min(previous?.bestSeconds??Infinity,result.elapsed),victories:Math.min(1000000,(previous?.victories??0)+1)};
 if(previous)progress.stages[result.stageId-1]=record;else progress.stages.push(record);
 progress.cleared=progress.stages.length===SIEGE_STAGE_COUNT;
 progress.resumeStage=Math.min(result.stageId+1,nextStage(progress));
 save.secretSiege=progress;return true;
}

export function markSecretSiegeEndingSeen(save:Save):boolean{
 const progress=restoreSecretSiegeProgress(save.secretSiege,save);
 if(!progress?.cleared)return false;
 progress.endingSeen=true;save.secretSiege=progress;
 return true;
}
