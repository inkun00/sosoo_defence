import {campaignCompletion} from './campaign-score';
import {FINAL_STAGE} from './levels';
import {ARMY,SIEGE_DURATION,type ArmyId} from './secret-siege-types';
import {SIEGE_STAGE_COUNT,siegeStage} from './secret-siege-stages';
import {INITIAL_COINS,STARTER_BUDGET,validSiegeCoins,siegeResearched,type SiegeEconomy} from './secret-siege-research';
import type {Save} from './save';

export interface SecretSiegeStageProgress{stage:number;stars:number;bestSeconds:number;victories:number;}
export interface SecretSiegeProgress{version:3;resumeStage:number;stages:SecretSiegeStageProgress[];cleared:boolean;endingSeen:boolean;coins:number;researched:ArmyId[];revision:number;}
type Eligibility=Pick<Save,'campaignCompleted'|'stars'|'scoreProgress'>;
type ProgressSave=Eligibility&Pick<Save,'secretSiege'>;
const whole=(value:unknown,min:number,max:number):value is number=>typeof value==='number'&&Number.isSafeInteger(value)&&value>=min&&value<=max;
const seconds=(value:unknown):value is number=>typeof value==='number'&&Number.isFinite(value)&&value>0&&value<=SIEGE_DURATION;
const empty=():SecretSiegeProgress=>({version:3,resumeStage:1,stages:[],cleared:false,endingSeen:false,coins:INITIAL_COINS,researched:[],revision:0});
const nextStage=(progress:SecretSiegeProgress):number=>Math.min(progress.stages.length+1,SIEGE_STAGE_COUNT);
const revision=(value:unknown):value is number=>whole(value,0,Number.MAX_SAFE_INTEGER-1);
const validResearch=(value:unknown):value is readonly ArmyId[]=>Array.isArray(value)&&value.every(id=>ARMY.some(spec=>spec.id===id&&spec.researchCost>0));
const sameResearch=(a:readonly ArmyId[],b:readonly ArmyId[])=>a.length===b.length&&a.every((id,index)=>id===b[index]);

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
  return {...empty(),resumeStage:2,stages:[{stage:1,stars:value.bestStars,bestSeconds:value.bestSeconds,victories:value.victories}]};
 }
 if((value.version!==2&&value.version!==3)||!Array.isArray(value.stages))return;
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
 // Previous versions never saved a wallet or permanent elite research. Keep
 // their victories, but do not invent historical rewards or free unlocks.
 // A damaged persisted economy gets a fresh fallback. A valid zero or small
 // balance remains exactly as saved; defeat and reload never refund training.
 if(value.version===3&&validSiegeCoins(value.coins)&&revision(value.revision)){
  progress.coins=value.coins;progress.researched=siegeResearched(value.researched);progress.revision=value.revision;
 }
 return progress;
}

/** A detached snapshot of the actual, persistently shared expedition wallet. */
export function secretSiegeEconomy(save:ProgressSave):SiegeEconomy&{revision:number}{
 const progress=restoreSecretSiegeProgress(save.secretSiege,save)??empty();
 return {coins:progress.coins,researched:[...progress.researched],revision:progress.revision};
}

/** Compare and swap each real debit or credit, without resetting spent coins. */
export function persistSecretSiegeEconomy(save:Save,economy:SiegeEconomy&{revision:number}):boolean{
 if(!secretSiegeUnlocked(save)||!validSiegeCoins(economy.coins)||!revision(economy.revision)||!validResearch(economy.researched))return false;
 const progress=restoreSecretSiegeProgress(save.secretSiege,save)??empty(),ids=siegeResearched(economy.researched);
 if(economy.revision!==progress.revision||progress.researched.some(id=>!ids.includes(id)))return false;
 if(progress.coins===economy.coins&&sameResearch(progress.researched,ids))return true;
 if(progress.revision>=Number.MAX_SAFE_INTEGER-1)return false;
 progress.coins=economy.coins;progress.researched=ids;progress.revision++;
 save.secretSiege=progress;return true;
}

/** Research is permanent, paid once, and must leave a viable basic formation budget. */
export function purchaseSecretSiegeResearch(save:Save,id:ArmyId,reserve=STARTER_BUDGET):boolean{
 if(!secretSiegeUnlocked(save))return false;
 const spec=ARMY.find(army=>army.id===id),progress=restoreSecretSiegeProgress(save.secretSiege,save)??empty();
 if(!spec||!validSiegeCoins(reserve)||!validSiegeCoins(spec.researchCost)||spec.researchCost<=0||progress.researched.includes(id)||progress.coins-spec.researchCost<reserve||progress.revision>=Number.MAX_SAFE_INTEGER-1)return false;
 progress.coins-=spec.researchCost;progress.researched=siegeResearched([...progress.researched,id]);progress.revision++;
 save.secretSiege=progress;return true;
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
export function recordSecretSiegeVictory(save:Save,result:{phase:string;stars:number;elapsed:number;stageId:number;money?:number;economyRevision?:number;earnedCoins?:number;researched?:readonly ArmyId[]}):boolean{
 if(result.phase!=='won'||!whole(result.stars,1,3)||!seconds(result.elapsed)||!secretSiegeStageUnlocked(save,result.stageId))return false;
 const progress=restoreSecretSiegeProgress(save.secretSiege,save)??empty(),previous=progress.stages[result.stageId-1];
 // Revision comparison makes a duplicate callback or an older browser tab a
 // no-op, including its record update. No reward is inferred from stage stars.
 const settlesEconomy=result.money!==undefined||result.economyRevision!==undefined||result.earnedCoins!==undefined||result.researched!==undefined;
 if(settlesEconomy){
  const reward=siegeStage(result.stageId).towerRewards.reduce((sum,coins)=>sum+coins,0);
  if(!validSiegeCoins(result.money)||result.money!==progress.coins||!revision(result.economyRevision)||result.economyRevision!==progress.revision||result.earnedCoins!==reward||progress.revision>=Number.MAX_SAFE_INTEGER-1)return false;
  if(result.researched!==undefined&&(!validResearch(result.researched)||!sameResearch(siegeResearched(result.researched),progress.researched)))return false;
  // Training and tower rewards have already been persisted when they happened.
  // Victory records the result once; it never adds or replaces currency again.
  progress.revision++;
 }
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
