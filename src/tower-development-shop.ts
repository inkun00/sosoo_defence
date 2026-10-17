import {artURL} from './art';
import {numberText} from './math';
import {TOWERS,type TowerType} from './towers';
import {TOWER_RESEARCH_PRICES,type TowerResearchProgress} from './tower-research';
import {mountPreparationSkin} from './multiplayer/preparation-skin';
import './tower-development-shop.css';

type DevelopmentReply=boolean|{ok:boolean;message?:string};
export interface TowerDevelopmentShopOptions{
 getProgress:()=>TowerResearchProgress;
 onDevelop:(id:string)=>DevelopmentReply|Promise<DevelopmentReply>;
 onContinue:()=>void;
 onClose:()=>void;
 stage:number;
 outcome:'won'|'review'|'lost'|'ready';
 earned:number;
 nextStage?:number;
}

const EFFECTS={basic:'일반 공격',slow:'감속 40% · 3초',stun:'기절 25% · 1.5초',range:'장거리 · 사거리 4칸'};

function towerArt(type:TowerType){
 const x=type.frame%3*256,y=Math.floor(type.frame/3)*256;
 // The exact same clipped base/head atlas cells and placement as the game map.
 return `<svg data-tower-art data-tower-id="${type.id}" viewBox="-60 -60 120 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><svg x="-50" y="-50" width="100" height="100" viewBox="0 0 256 256" overflow="hidden"><image href="${artURL('turret-parts-v1')}" width="768" height="512"/></svg><svg x="-42" y="-59.76" width="84" height="84" viewBox="${x} ${y} 256 256" overflow="hidden"><image href="${artURL('tower-heads-'+type.sheet+'-v1')}" width="768" height="512"/></svg></svg>`;
}

/** A modal view only: the caller owns the wallet, atomic save and stage routing. */
export function openTowerDevelopmentShop(options:TowerDevelopmentShopOptions){
 const previous=document.activeElement,dialog=document.createElement('dialog'),returnLabel=options.outcome==='ready'?'전장으로':'결과로 돌아가기';
 dialog.className='tower-development-shop duel-preparation-panel';
 dialog.setAttribute('aria-labelledby','tower-development-title');
 dialog.setAttribute('aria-describedby','tower-development-guidance');
 dialog.innerHTML=`<section class="tower-development-panel" data-preparation-surface="panel">
  <header class="tower-development-header"><div><p class="tower-development-stage">스테이지 ${options.stage} · ${options.outcome==='won'?'방어 완료':options.outcome==='review'?'전투 기록':options.outcome==='ready'?'방어 준비':'다시 도전'}</p><h2 id="tower-development-title">타워 개발 상점</h2></div><button type="button" class="tower-development-close" aria-label="${returnLabel}" data-development-close>×</button></header>
  <div class="tower-development-resources"><p>이번 방어 획득 <strong>${numberText(options.earned,2)}</strong> 코인</p><p>보유 개발 코인 <strong data-development-wallet></strong> 코인</p></div>
  <p id="tower-development-guidance" class="tower-development-guidance">${options.outcome==='ready'?'개발한 타워를 지금부터 계속 사용할 수 있어요.':'개발한 타워는 다음 방어부터 계속 사용할 수 있어요.'}</p>
  <div class="tower-development-grid" aria-label="타워 개발 목록">${TOWERS.map(type=>`<article class="tower-development-card" data-development-tower="${type.id}" data-preparation-surface="panel"><div class="tower-development-art">${towerArt(type)}</div><div class="tower-development-copy"><h3>${type.name}</h3><p>공격 ${numberText(type.unit,2)}</p><p class="tower-development-effect" data-effect="${type.effect}">${EFFECTS[type.effect]}</p></div><div class="tower-development-card-footer"><span data-development-price></span><button type="button" data-develop="${type.id}" data-preparation-surface="active"><span data-development-action></span></button></div></article>`).join('')}</div>
  <p class="tower-development-feedback" role="status" aria-live="polite" aria-atomic="true"></p>
  <footer class="tower-development-actions"><button type="button" data-development-close>${returnLabel}</button><button type="button" data-development-continue data-preparation-surface="active">${options.outcome==='ready'?'전장으로':options.outcome==='lost'||options.outcome==='review'?'다시 준비':options.stage===11&&options.nextStage===11?'모험 완료':options.nextStage?`다음 단계 · ${options.nextStage}`:'다음 준비로'}</button></footer>
 </section>`;
 document.body.append(dialog);
 const listeners=new AbortController(),signal=listeners.signal,skin=mountPreparationSkin(dialog);
 const wallet=dialog.querySelector<HTMLElement>('[data-development-wallet]')!,feedback=dialog.querySelector<HTMLElement>('.tower-development-feedback')!;
 const closeButtons=Array.from(dialog.querySelectorAll<HTMLButtonElement>('[data-development-close]')),continueButton=dialog.querySelector<HTMLButtonElement>('[data-development-continue]')!;
 const cards=Array.from(dialog.querySelectorAll<HTMLElement>('[data-development-tower]'));
 let busy=false,disposed=false;
 const message=(text:string)=>{feedback.textContent=text;};
 const refresh=()=>{
  if(disposed)return;
  const progress=options.getProgress();wallet.textContent=numberText(progress.coins,2);
  for(const card of cards){
   const id=card.dataset.developmentTower!,type=TOWERS.find(tower=>tower.id===id)!,price=TOWER_RESEARCH_PRICES[id]??0;
   const developed=progress.developed.includes(id),affordable=progress.coins>=price,button=card.querySelector<HTMLButtonElement>('[data-develop]')!;
   card.dataset.developed=String(developed);card.dataset.affordable=String(affordable);
   card.querySelector('[data-development-price]')!.textContent=price===0?'기본 설계':`${numberText(price,2)} 코인`;
   card.querySelector('[data-development-action]')!.textContent=developed?'개발 완료':affordable?'개발하기':'코인 부족';
   button.disabled=busy||developed||!affordable;
   button.setAttribute('aria-label',`${type.name} · ${developed?'개발 완료':affordable?`${numberText(price,2)} 코인으로 개발`:`코인 부족 · 개발 비용 ${numberText(price,2)} 코인`}`);
  }
  closeButtons.forEach(button=>button.disabled=busy);continueButton.disabled=busy;
  dialog.setAttribute('aria-busy',String(busy));skin.sync();
 };
 const close=()=>{
  if(disposed)return;disposed=true;listeners.abort();skin.dispose();dialog.close();dialog.remove();
  if(previous instanceof HTMLElement&&previous.isConnected&&!previous.closest('[hidden],.hidden'))previous.focus({preventScroll:true});
 };
 const exit=(continueStage:boolean)=>{
  if(busy){message('개발을 저장하고 있어요. 잠시 기다려 주세요.');return;}
  close();if(continueStage)options.onContinue();else options.onClose();
 };
 for(const button of closeButtons)button.addEventListener('click',()=>exit(false),{signal});
 continueButton.addEventListener('click',()=>exit(true),{signal});
 for(const card of cards)card.querySelector<HTMLButtonElement>('[data-develop]')!.addEventListener('click',async()=>{
  if(busy||disposed)return;
  const id=card.dataset.developmentTower!,progress=options.getProgress();
  if(progress.developed.includes(id)||progress.coins<(TOWER_RESEARCH_PRICES[id]??0)){refresh();return;}
  busy=true;message('');refresh();
  try{
   const reply=await options.onDevelop(id);if(disposed)return;
   const ok=typeof reply==='boolean'?reply:reply.ok;
   message(typeof reply==='object'&&reply.message?reply.message:ok?`${TOWERS.find(type=>type.id===id)!.name} 개발을 완료했어요.`:'개발 내용을 저장하지 못했어요. 다시 시도해 주세요.');
  }catch(error){if(!disposed)message(error instanceof Error?error.message:'개발 내용을 저장하지 못했어요. 다시 시도해 주세요.');}
  finally{busy=false;if(!disposed){refresh();if((document.activeElement as HTMLButtonElement|null)?.disabled)continueButton.focus({preventScroll:true});}}
 },{signal});
 dialog.addEventListener('cancel',event=>{event.preventDefault();exit(false);},{signal});
 dialog.addEventListener('keydown',event=>{
  event.stopPropagation();
  if(event.key!=='Tab')return;
  const controls=Array.from(dialog.querySelectorAll<HTMLButtonElement>('button')).filter(button=>!button.disabled&&button.getClientRects().length>0);
  if(!controls.length){event.preventDefault();dialog.focus({preventScroll:true});return;}
  const first=controls[0],last=controls.at(-1)!;
  if(!dialog.contains(document.activeElement)||event.shiftKey&&document.activeElement===first||!event.shiftKey&&document.activeElement===last){event.preventDefault();(event.shiftKey?last:first).focus({preventScroll:true});}
 },{signal});
 dialog.addEventListener('close',()=>{if(!disposed)exit(false);},{signal});
 window.addEventListener('pagehide',close,{once:true,signal});
 refresh();dialog.showModal();
 // Put the first newly affordable design within keyboard reach, without scrolling
 // to the bottom when the list is longer than a small screen.
 (dialog.querySelector<HTMLButtonElement>('[data-develop]:not(:disabled)')??closeButtons[0]).focus({preventScroll:true});
 return {close,refresh};
}
