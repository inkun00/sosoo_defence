import {campaignCompletion} from './campaign-score';
import {FINAL_STAGE} from './levels';
import {SIEGE_DURATION} from './secret-siege-types';
import type {Save} from './save';

export interface SecretSiegeProgress{version:1;cleared:boolean;bestStars:number;bestSeconds:number;victories:number;}
type Eligibility=Pick<Save,'campaignCompleted'|'stars'|'scoreProgress'>;
const whole=(value:unknown,min:number,max:number):value is number=>typeof value==='number'&&Number.isSafeInteger(value)&&value>=min&&value<=max;
const seconds=(value:unknown):value is number=>typeof value==='number'&&Number.isFinite(value)&&value>0&&value<=SIEGE_DURATION;

/** Reaching stage 11, or defeating its wizard before the wave is won, is insufficient. */
export function secretSiegeUnlocked(save:Eligibility):boolean{
 return save.campaignCompleted===true&&(whole(save.stars[FINAL_STAGE-1],1,3)||campaignCompletion(save)!==null);
}

/** Preserve completed campaigns that predate scores, but never import siege progress into a locked campaign. */
export function restoreSecretSiegeProgress(raw:unknown,save:Eligibility):SecretSiegeProgress|undefined{
 if(!secretSiegeUnlocked(save)||!raw||typeof raw!=='object'||Array.isArray(raw))return;
 const value=raw as Partial<SecretSiegeProgress>;
 if(value.version!==1||value.cleared!==true||!whole(value.bestStars,1,3)||!seconds(value.bestSeconds)||!whole(value.victories,1,1000000))return;
 return {version:1,cleared:true,bestStars:value.bestStars,bestSeconds:value.bestSeconds,victories:value.victories};
}

/** Bonus records stay separate from the eleven-stage campaign score and account XP. */
export function recordSecretSiegeVictory(save:Save,result:{phase:string;stars:number;elapsed:number}):boolean{
 if(!secretSiegeUnlocked(save)||result.phase!=='won'||!whole(result.stars,1,3)||!seconds(result.elapsed))return false;
 const previous=restoreSecretSiegeProgress(save.secretSiege,save);
 save.secretSiege={version:1,cleared:true,bestStars:Math.max(previous?.bestStars??0,result.stars),bestSeconds:Math.min(previous?.bestSeconds??Infinity,result.elapsed),victories:Math.min(1000000,(previous?.victories??0)+1)};
 return true;
}
