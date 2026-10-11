import {artURL} from './art';
import './account-level-badge.css';

export function badgeLevel(value:number){return Math.min(10,Math.max(1,Math.floor(Number.isFinite(value)?value:1)));}
export function accountBadgeURL(value:number){try{return artURL('account-badge-level-'+badgeLevel(value)+'-v1');}catch{return '';}}
export function accountBadgeHTML(value:number,size:'small'|'medium'|'large'='small'){
 const level=badgeLevel(value),url=accountBadgeURL(level);
 return `<span class="account-level-badge account-level-badge-${size}" data-account-level="${level}" title="계정 레벨 ${level}">${url?`<img src="${url}" alt="계정 레벨 ${level} 휘장" width="96" height="96" decoding="async">`:`<span class="account-level-badge-fallback" aria-label="계정 레벨 ${level}">${level}</span>`}</span>`;
}
