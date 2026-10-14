import {artURL} from './art';
import {ACCOUNT_LEVEL_MAX} from './multiplayer/records';
import './account-level-badge.css';

export const ACCOUNT_BADGE_TIER_COUNT=10;
export const ACCOUNT_BADGE_LEVELS_PER_TIER=5;
export function badgeLevel(value:number){return Math.min(ACCOUNT_LEVEL_MAX,Math.max(1,Math.floor(Number.isFinite(value)?value:1)));}
export function badgeTier(value:number){return Math.min(ACCOUNT_BADGE_TIER_COUNT,Math.ceil(badgeLevel(value)/ACCOUNT_BADGE_LEVELS_PER_TIER));}
export function accountBadgeURL(value:number){try{return artURL('account-badge-level-'+badgeTier(value)+'-v1');}catch{return '';}}
export function accountBadgeAssets(){return Array.from({length:ACCOUNT_BADGE_TIER_COUNT},(_,index)=>({tier:index+1,url:accountBadgeURL(index*ACCOUNT_BADGE_LEVELS_PER_TIER+1)}));}
export function accountBadgeHTML(value:number,size:'small'|'medium'|'large'='small'){
 const level=badgeLevel(value),tier=badgeTier(level),url=accountBadgeURL(level);
 return `<span class="account-level-badge account-level-badge-${size}${level===ACCOUNT_LEVEL_MAX?' account-level-badge-max':''}" data-account-level="${level}" data-account-badge-tier="${tier}" title="계정 레벨 ${level}">${url?`<img src="${url}" alt="계정 레벨 ${level} 휘장" width="96" height="96" decoding="async"><span class="account-level-badge-number" aria-hidden="true">${level}</span>`:`<span class="account-level-badge-fallback" aria-label="계정 레벨 ${level}">${level}</span>`}</span>`;
}
