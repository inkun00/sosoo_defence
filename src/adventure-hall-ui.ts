import type {CampaignCompletion} from './campaign-score';
import type {AdventureHallData,AdventureHallEntry,AdventureHallRegistration} from './adventure-hall-data';
import {adventureNickname} from './adventure-hall-data';
import './adventure-hall-ui.css';

export interface AdventureHallOptions {
 completion?:CampaignCompletion;
 nickname?:string;
 onRegistered?:(result:AdventureHallRegistration,nickname:string)=>void;
 onClose?:()=>void;
}
export interface AdventureHallHandle {close:()=>void;done:Promise<void>;}
export type AdventureHallPresentation=AdventureHallHandle;

const number=new Intl.NumberFormat('ko-KR');
let current:AdventureHallHandle|null=null;
let serial=0;
let returningHistory=false;
let delayedHistoryPush:(()=>void)|null=null;
const internalBackEvents=new WeakSet<PopStateEvent>();
function element<K extends keyof HTMLElementTagNameMap>(tag:K,className:string,text?:string){
 const node=document.createElement(tag);node.className=className;if(text!==undefined)node.textContent=text;return node;
}
function button(className:string,text:string){const node=element('button',className,text);node.type='button';return node;}
function rankBadge(entry:AdventureHallEntry){
 const node=element('span','adventure-hall-rank'+(entry.rank<=3?' adventure-hall-medal adventure-hall-medal-'+entry.rank:''));
 if(entry.rank<=3){const medal=element('span','adventure-hall-crown','♛');medal.setAttribute('aria-hidden','true');node.append(medal);}
 node.append(document.createTextNode(number.format(entry.rank)+'위'));return node;
}
function errorMessage(error:unknown){return error instanceof Error?error.message.slice(0,240):'연결 상태를 확인하고 다시 시도해 주세요.';}

/** Opens the adventure ranking separately from the duel's account leaderboard. */
export function openAdventureHall(options:AdventureHallOptions={}):AdventureHallHandle {
 if(current){document.querySelector<HTMLButtonElement>('.adventure-hall-close')?.focus();return current;}
 const previous=document.activeElement instanceof HTMLElement?document.activeElement:null;
 const app=document.querySelector<HTMLElement>('#app'),wasInert=app?.inert??false;
 if(app)app.inert=true;
 const overlay=element('div','adventure-hall-overlay');overlay.id='adventure-hall';
 overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-labelledby','adventure-hall-title');
 const card=element('section','adventure-hall-card'),closeButton=button('adventure-hall-close','×');
 closeButton.setAttribute('aria-label','명예의 전당 닫기');
 const header=element('header','adventure-hall-heading'),mark=element('span','adventure-hall-mark','♛');mark.setAttribute('aria-hidden','true');
 const heading=element('div','adventure-hall-heading-copy'),eyebrow=element('p','adventure-hall-eyebrow','모험의 수호자'),title=element('h2','','명예의 전당');title.id='adventure-hall-title';
 heading.append(eyebrow,title,element('p','adventure-hall-subtitle','1~11스테이지 누적 점수로 순위를 겨뤄요.'));header.append(mark,heading);
 const content=element('div','adventure-hall-content'),info=element('div','adventure-hall-info'),mine=element('div','adventure-hall-mine-host'),board=element('section','adventure-hall-board');
 board.setAttribute('aria-label','누적 점수 상위 50명');board.setAttribute('aria-live','polite');
 const footer=element('footer','adventure-hall-footer'),note=element('p','adventure-hall-note','각 스테이지의 최고 클리어 점수를 합산해요. 같은 점수는 공동 순위예요.'),actions=element('div','adventure-hall-actions');
 const refresh=button('adventure-hall-button','순위 새로고침'),back=button('adventure-hall-button adventure-hall-primary','돌아가기');
 actions.append(refresh,back);footer.append(note,actions);
 let closed=false,loading=false,submitting=false,registered=false,revision=0,nicknameTouched=false,registration:AdventureHallRegistration|undefined,registeredNickname='';
 let settle!:()=>void;const done=new Promise<void>(resolve=>settle=resolve);
 const historyMarker='adventure-hall-'+Date.now()+'-'+(++serial);let hasHistory=false;
 const handle:AdventureHallHandle={close:()=>dismiss(false),done};current=handle;
 const store=import('./adventure-hall-store');

 let nickname:HTMLInputElement|undefined,submit:HTMLButtonElement|undefined,formStatus:HTMLParagraphElement|undefined;
 if(options.completion){
  content.classList.add('adventure-hall-with-registration');
  const form=element('form','adventure-hall-registration');form.setAttribute('aria-label','최종 보스 클리어 순위 등록');
  const intro=element('div','adventure-hall-clear-heading');intro.append(element('p','adventure-hall-clear-eyebrow','11스테이지 클리어'),element('h3','','수호자의 이름을 남겨 주세요'));
  const score=element('p','adventure-hall-score');score.append(element('span','','이번 모험 누적 점수'),element('strong','',number.format(options.completion.score)),element('span','adventure-hall-score-unit','점'));
  const fields=element('div','adventure-hall-register-fields'),label=element('label','adventure-hall-nickname-label','닉네임');label.htmlFor='adventure-hall-nickname';
  nickname=element('input','adventure-hall-nickname');nickname.id='adventure-hall-nickname';nickname.name='nickname';nickname.type='text';nickname.required=true;nickname.setAttribute('autocomplete','nickname');nickname.placeholder='닉네임 2~16자';nickname.value=options.nickname??'';nickname.setAttribute('aria-describedby','adventure-hall-nickname-help');
  // Unicode length is checked by the shared validator, including emoji names.
  nickname.maxLength=32;nickname.addEventListener('input',()=>{nicknameTouched=true;nickname!.setCustomValidity('');});
  const hint=element('p','adventure-hall-nickname-help','2~16자로 입력해 주세요.');hint.id='adventure-hall-nickname-help';
  submit=button('adventure-hall-button adventure-hall-primary','순위 등록');submit.type='submit';
  const field=element('div','adventure-hall-register-input');field.append(label,nickname,hint);fields.append(field,submit);
  formStatus=element('p','adventure-hall-form-status');formStatus.setAttribute('role','status');formStatus.setAttribute('aria-live','polite');
  form.append(intro,score,fields,formStatus);info.append(form);
  form.addEventListener('submit',event=>{event.preventDefault();void register();});
 }
 info.append(mine);content.append(info,board);card.append(closeButton,header,content,footer);overlay.append(card);document.body.append(overlay);
 const pushHistory=()=>{if(closed)return;try{history.pushState({adventureHall:historyMarker,previous:history.state},'',location.href);hasHistory=true;}catch{/* The modal also works in restricted browser previews. */}};
 if(returningHistory)delayedHistoryPush=pushHistory;else pushHistory();
 window.addEventListener('popstate',onBack);
 for(const type of ['pointerdown','mousedown','touchstart','click'])overlay.addEventListener(type,event=>event.stopPropagation());
 document.addEventListener('keydown',keyboard,true);
 function keyboard(event:KeyboardEvent){
  if(closed)return;
  event.stopPropagation();
  if(event.key==='Escape'){event.preventDefault();dismiss(false);return;}
  if(event.key!=='Tab')return;
  const controls=Array.from(overlay.querySelectorAll<HTMLElement>('button,input')).filter(node=>!node.closest('[hidden]')&&!('disabled'in node&&node.disabled));
  const first=controls[0],last=controls.at(-1);if(!first||!last)return;
  if(event.shiftKey&&(document.activeElement===first||!overlay.contains(document.activeElement))){event.preventDefault();last.focus();}
  else if(!event.shiftKey&&(document.activeElement===last||!overlay.contains(document.activeElement))){event.preventDefault();first.focus();}
 }
 closeButton.onclick=()=>dismiss(false);back.onclick=()=>dismiss(false);refresh.onclick=()=>void load(true);
 (nickname??closeButton).focus();void load(false);
 return handle;

 function onBack(event:PopStateEvent){if(!internalBackEvents.has(event))dismiss(true);}
 function dismiss(fromBack:boolean){
  if(closed)return;closed=true;revision++;overlay.remove();window.removeEventListener('popstate',onBack);document.removeEventListener('keydown',keyboard,true);
  if(app)app.inert=wasInert;if(current===handle)current=null;
  if(previous?.isConnected)previous.focus();
  if(delayedHistoryPush===pushHistory)delayedHistoryPush=null;
  if(!fromBack&&hasHistory&&history.state?.adventureHall===historyMarker){
   returningHistory=true;
   window.addEventListener('popstate',event=>{
    internalBackEvents.add(event);returningHistory=false;
    const next=delayedHistoryPush;delayedHistoryPush=null;queueMicrotask(()=>next?.());
   },{once:true});
   history.back();
  }
  settle();options.onClose?.();
 }
 function updateButtons(){refresh.disabled=loading||submitting;if(submit){submit.disabled=submitting||registered;submit.textContent=submitting?'등록하는 중…':registered?'등록 완료':'순위 등록';}if(nickname)nickname.disabled=submitting||registered;}
 function displayMine(entry:AdventureHallEntry|null){
  mine.replaceChildren();if(!entry)return;
  const panel=element('section','adventure-hall-mine');panel.setAttribute('aria-label','내 최고 기록과 순위');
  const position=element('div','adventure-hall-my-position');position.append(element('small','','내 순위'),rankBadge(entry));
  const profile=element('div','adventure-hall-my-profile');profile.append(element('strong','',entry.nickname),element('span','',number.format(entry.score)+'점 · 최고 기록'));
  panel.append(position,profile);mine.append(panel);
 }
 function displayBoard(data:AdventureHallData){
  board.replaceChildren();
  displayMine(data.me??(registration?{rank:registration.rank,nickname:registeredNickname,score:registration.bestScore,isMe:true}:null));
  if(!data.entries.length){const empty=element('div','adventure-hall-status adventure-hall-empty'),icon=element('span','adventure-hall-empty-icon','♜');icon.setAttribute('aria-hidden','true');empty.append(icon,element('strong','','첫 수호자를 기다리고 있어요'),element('p','','최종 보스를 물리치고 명예의 전당에 이름을 올려 보세요.'));board.append(empty);return;}
  const wrap=element('div','adventure-hall-table-wrap'),table=element('table','adventure-hall-table'),caption=element('caption','sr-only','모험 누적 점수 상위 50명'),thead=element('thead',''),titles=element('tr','');
  for(const text of ['순위','수호자','누적 점수']){const cell=element('th','',text);cell.scope='col';titles.append(cell);}thead.append(titles);
  const tbody=element('tbody','');
  for(const entry of data.entries){
   const row=element('tr',entry.isMe?'adventure-hall-my-row':''),rank=element('td','');rank.append(rankBadge(entry));
   const name=element('th','');name.scope='row';name.append(element('span','adventure-hall-name',entry.nickname));
   if(entry.isMe)name.append(element('span','adventure-hall-me-tag','나'));
   const points=element('td','adventure-hall-points',number.format(entry.score));points.append(element('span','adventure-hall-point-unit',' 점'));row.append(rank,name,points);tbody.append(row);
  }
  table.append(caption,thead,tbody);wrap.append(table);board.append(wrap);
 }
 async function load(fresh:boolean){
  const own=++revision;loading=true;updateButtons();board.setAttribute('aria-busy','true');
  const status=element('div','adventure-hall-status'),spinner=element('span','adventure-hall-spinner');spinner.setAttribute('aria-hidden','true');status.append(spinner,element('strong','','수호자들의 순위를 불러오는 중이에요…'));board.replaceChildren(status);
  try{
   const client=await store;if(closed||own!==revision)return;
   if(nickname&&!nicknameTouched&&!nickname.value){const pending=client.pendingAdventureHall(options.completion?.runId);if(pending)nickname.value=pending.nickname;}
   const data=await client.loadAdventureHall({fresh});if(closed||own!==revision)return;displayBoard(data);refresh.textContent='순위 새로고침';
  }catch(error){
   if(closed||own!==revision)return;const status=element('div','adventure-hall-status adventure-hall-error');status.setAttribute('role','alert');status.append(element('strong','','명예의 전당을 불러오지 못했어요'),element('p','',errorMessage(error)));board.replaceChildren(status);refresh.textContent='다시 불러오기';
  }finally{if(!closed&&own===revision){loading=false;board.removeAttribute('aria-busy');updateButtons();}}
 }
 async function register(){
  if(closed||submitting||registered||!options.completion||!nickname||!formStatus)return;
  let name:string;try{name=adventureNickname(nickname.value);}catch(error){nickname.setCustomValidity(errorMessage(error));nickname.reportValidity();nickname.focus();return;}
  nickname.value=name;submitting=true;updateButtons();formStatus.classList.remove('adventure-hall-form-error');formStatus.setAttribute('role','status');formStatus.textContent='기록을 보내는 중이에요…';
  try{
   const client=await store;const result=await client.registerAdventureHall(name,options.completion);if(closed)return;
   if(result.saved!==true)throw Error('순위 등록을 확인하지 못했어요. 다시 시도해 주세요.');
   registered=true;registration=result;registeredNickname=name;
   formStatus.textContent=(result.duplicate?'이미 등록한 기록이에요. ':'순위 등록을 완료했어요! ')+number.format(result.rank)+'위 · 최고 기록 '+number.format(result.bestScore)+'점';
   displayMine({rank:result.rank,nickname:name,score:result.bestScore,isMe:true});
   try{options.onRegistered?.(result,name);}catch{/* A local preference failure does not undo the confirmed Firebase registration. */}
   void load(true);
  }catch(error){if(closed)return;formStatus.classList.add('adventure-hall-form-error');formStatus.setAttribute('role','alert');formStatus.textContent=errorMessage(error);}
  finally{if(!closed){submitting=false;updateButtons();}}
 }
}
