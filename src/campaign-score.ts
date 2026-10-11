import {CASTLE_HEALTH} from './adventure-constants';
import {FINAL_STAGE,LEVELS} from './levels';
import {balanceFor,isDifficulty,type Difficulty} from './difficulty';

export interface StageScore{
 stage:number;difficulty:Difficulty;combatScore:number;questionScore:number;score:number;
 kills:number;successfulHits:number;answeredQuestions:number;purchases:number;fusions:number;
 castle:number;bossDefeated:boolean;killHits:number[];purchaseWrongAttempts:number[];fusionWrongAttempts:number[];
}
export interface CampaignScore{version:1;runId:string;stages:StageScore[];nickname?:string;registeredScore?:number;}
export interface CampaignCompletion{version:1;runId:string;score:number;stages:StageScore[];}
export interface CampaignScoreSave{scoreProgress?:CampaignScore;}
/** Structural input keeps server validation independent from browser code. */
export interface ScoredStage{
 level:{id:number};phase:string;difficulty:Difficulty;combatScore:number;questionScore:number;score:number;
 kills:number;successfulHits:number;answeredQuestions:number;purchases:number;fusions:number;castle:number;
 bossDefeated:boolean;killHits:number[];purchaseWrongAttempts:number[];fusionWrongAttempts:number[];
}

export function campaignKillScore(hits:number){return 100+Math.floor(100/Math.max(1,Math.floor(Number.isFinite(hits)?hits:1)));}
export function campaignQuestionScore(wrongAttempts:number){return Math.floor(25/(Math.max(0,Number.isFinite(wrongAttempts)?Math.floor(wrongAttempts):0)+1));}
const runIdValid=(value:unknown):value is string=>typeof value==='string'&&/^[A-Za-z0-9_-]{8,80}$/.test(value);
const whole=(value:unknown,min:number,max:number):value is number=>typeof value==='number'&&Number.isSafeInteger(value)&&value>=min&&value<=max;
const object=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value);
const numbers=(value:unknown,min:number,max:number,limit:number):value is number[]=>Array.isArray(value)&&value.length<=limit&&value.every(n=>whole(n,min,max));
function copyStage(stage:StageScore):StageScore{return {...stage,killHits:[...stage.killHits],purchaseWrongAttempts:[...stage.purchaseWrongAttempts],fusionWrongAttempts:[...stage.fusionWrongAttempts]};}

/** Scores are derived from bounded arithmetic evidence, never from a claimed total. */
export function validateStageScore(value:unknown):StageScore|null{
 if(!object(value)||!whole(value.stage,1,FINAL_STAGE)||!isDifficulty(value.difficulty))return null;
 const level=LEVELS[value.stage-1],balance=balanceFor(value.stage,value.difficulty),enemyCount=level.hp.length+(level.boss?1:0);
 const maxHits=Math.floor((level.hp.reduce((sum,hp)=>sum+hp,0)+(level.boss?.hp??0))/10);
 if(!numbers(value.killHits,1,maxHits,enemyCount)||value.killHits.length<6||!numbers(value.purchaseWrongAttempts,0,10000,balance.towerLimit)||!numbers(value.fusionWrongAttempts,0,10000,balance.wallLimit))return null;
 const combatScore=value.killHits.reduce((sum,hits)=>sum+campaignKillScore(hits),0),questionScore=[...value.purchaseWrongAttempts,...value.fusionWrongAttempts].reduce((sum,wrong)=>sum+campaignQuestionScore(wrong),0);
 const answeredQuestions=value.purchaseWrongAttempts.length+value.fusionWrongAttempts.length;
 if(value.combatScore!==combatScore||value.questionScore!==questionScore||value.score!==combatScore+questionScore||value.kills!==value.killHits.length||value.answeredQuestions!==answeredQuestions)return null;
 if(!whole(value.successfulHits,value.killHits.reduce((sum,hits)=>sum+hits,0),maxHits)||!whole(value.purchases,value.purchaseWrongAttempts.length,10000)||!whole(value.fusions,value.fusionWrongAttempts.length,10000)||!whole(value.castle,1,CASTLE_HEALTH)||typeof value.bossDefeated!=='boolean')return null;
 if(value.kills+CASTLE_HEALTH-value.castle!==enemyCount)return null;
 if((value.stage===10||level.boss)&&!value.bossDefeated)return null;
 return {stage:value.stage,difficulty:value.difficulty,combatScore,questionScore,score:combatScore+questionScore,kills:value.kills,successfulHits:value.successfulHits,answeredQuestions,purchases:value.purchases,fusions:value.fusions,castle:value.castle,bossDefeated:value.bossDefeated,killHits:[...value.killHits],purchaseWrongAttempts:[...value.purchaseWrongAttempts],fusionWrongAttempts:[...value.fusionWrongAttempts]};
}

export function newCampaignScore():CampaignScore{
 const runId=globalThis.crypto?.randomUUID?.()??`run_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,14)}`;
 return {version:1,runId,stages:[]};
}

/** Old saves have no evidence; preserve their adventure while starting score at zero. */
export function restoreCampaignScore(value:unknown):CampaignScore|null{
 if(!object(value)||value.version!==1||!runIdValid(value.runId)||!Array.isArray(value.stages)||value.stages.length>FINAL_STAGE)return null;
 const stages=new Map<number,StageScore>();
 for(const raw of value.stages){const stage=validateStageScore(raw);if(stage&&stage.score>(stages.get(stage.stage)?.score??-1))stages.set(stage.stage,stage);}
 const result:CampaignScore={version:1,runId:value.runId,stages:[...stages.values()].sort((a,b)=>a.stage-b.stage)};
 if(typeof value.nickname==='string'){const nickname=value.nickname.trim();if(nickname&&nickname.length<=24)result.nickname=nickname;}
 if(whole(value.registeredScore,0,1000000))result.registeredScore=value.registeredScore;
 return result;
}

export function recordStageScore(save:CampaignScoreSave,model:ScoredStage):boolean{
 if(model.phase!=='won')return false;
 const stage=validateStageScore({stage:model.level.id,difficulty:model.difficulty,combatScore:model.combatScore,questionScore:model.questionScore,score:model.score,kills:model.kills,successfulHits:model.successfulHits,answeredQuestions:model.answeredQuestions,purchases:model.purchases,fusions:model.fusions,castle:model.castle,bossDefeated:model.bossDefeated,killHits:model.killHits,purchaseWrongAttempts:model.purchaseWrongAttempts,fusionWrongAttempts:model.fusionWrongAttempts});
 if(!stage)return false;
 const progress=restoreCampaignScore(save.scoreProgress)??newCampaignScore(),previous=progress.stages.find(s=>s.stage===stage.stage);
 if(previous&&previous.score>=stage.score)return false;
 progress.stages=progress.stages.filter(s=>s.stage!==stage.stage).concat(stage).sort((a,b)=>a.stage-b.stage);save.scoreProgress=progress;return true;
}

export function campaignTotal(save:CampaignScoreSave):number{return (restoreCampaignScore(save.scoreProgress)?.stages??[]).reduce((sum,stage)=>sum+stage.score,0);}
/** A replay contributes only its improvement over the stage already counted. */
export function campaignVisibleTotal(save:CampaignScoreSave,model:Pick<ScoredStage,'level'|'score'>):number{
 const progress=restoreCampaignScore(save.scoreProgress),previous=progress?.stages.find(stage=>stage.stage===model.level.id)?.score??0;
 return (progress?.stages.reduce((sum,stage)=>sum+stage.score,0)??0)+Math.max(0,model.score-previous);
}
export function campaignCompletion(save:CampaignScoreSave):CampaignCompletion|null{
 const progress=restoreCampaignScore(save.scoreProgress);
 if(!progress?.stages.some(stage=>stage.stage===FINAL_STAGE&&stage.bossDefeated))return null;
 return {version:1,runId:progress.runId,score:progress.stages.reduce((sum,stage)=>sum+stage.score,0),stages:progress.stages.map(copyStage)};
}

/** Strict form used by the Firebase endpoint; malformed evidence is rejected. */
export function validateCampaignCompletion(value:unknown):CampaignCompletion|null{
 if(!object(value)||value.version!==1||!runIdValid(value.runId)||!Array.isArray(value.stages)||!value.stages.length||value.stages.length>FINAL_STAGE)return null;
 const stages:StageScore[]=[];
 for(const raw of value.stages){const stage=validateStageScore(raw);if(!stage||stage.stage<=(stages.at(-1)?.stage??0))return null;stages.push(stage);}
 const score=stages.reduce((sum,stage)=>sum+stage.score,0);
 if(value.score!==score||!stages.some(stage=>stage.stage===FINAL_STAGE&&stage.bossDefeated))return null;
 return {version:1,runId:value.runId,score,stages};
}
