import {numberText} from '../math';
import {artURL} from '../art';
import {TOWERS,towerType,type TowerType} from '../towers';
import {duelBuildCost,duelHeroLearningLevel,type DuelAction,type DuelState,type Side} from './duel';
import {duelCountdown,formatDuelClock} from './duel-clock';
import {mountPreparationSkin} from './preparation-skin';
import {HERO_ADDITION_STAGES} from './decimal-boards';
import './preparation-panel.css';

interface PreparationPanelOptions{onVisibilityChange?:()=>void;onViewChange?:(view:HTMLElement)=>void;}
interface ActionReply{ok:boolean;message?:string;}

const TOWER_EFFECTS={
 slow:{label:'감속 40% · 3초',description:'3초 동안 적의 이동 속도 40% 감소'},
 stun:{label:'기절 25% · 1.5초',description:'25% 확률로 적이 1.5초 동안 기절'},
 range:{label:'장거리 · 사거리 4칸',description:'사거리 4칸으로 장거리 공격'}
};
function towerArtHTML(type:TowerType){
 const x=type.frame%3*256,y=Math.floor(type.frame/3)*256;
 // Use the same base, head, and placement as the battlefield's towerIcon.
 // Each nested SVG clips one atlas cell so neighboring towers cannot appear.
 return `<svg data-tower-art data-tower-id="${type.id}" data-tower-sheet="${type.sheet}" data-tower-frame="${type.frame}" viewBox="-60 -60 120 120" xmlns="http://www.w3.org/2000/svg"><svg data-tower-art-base x="-50" y="-50" width="100" height="100" viewBox="0 0 256 256" overflow="hidden"><image href="${artURL('turret-parts-v1')}" width="768" height="512"/></svg><svg data-tower-art-head x="-42" y="-59.76" width="84" height="84" viewBox="${x} ${y} 256 256" overflow="hidden"><image href="${artURL('tower-heads-'+type.sheet+'-v1')}" width="768" height="512"/></svg></svg>`;
}

/** Preparation is a screen-sized dialog, independent of the battlefield's canvas scale. */
export function mountPreparationPanel(host:HTMLElement,send:(action:DuelAction)=>unknown,options:PreparationPanelOptions={}){
 const root=document.createElement('div');root.className='duel-preparation-panel';root.hidden=true;
 root.innerHTML=`<section class="duel-preparation-card" role="dialog" aria-modal="true" aria-labelledby="duel-preparation-title" tabindex="-1">
  <header class="duel-preparation-header"><h2 id="duel-preparation-title">전투 준비</h2><div class="duel-preparation-timer"><span>준비 남은 시간</span><strong data-preparation-clock role="timer" aria-live="off">03:00</strong></div><button type="button" data-preparation-close>전장 보기</button></header>
  <div class="duel-preparation-resources" aria-label="준비 자원"><span data-preparation-money></span><span data-preparation-stock></span><span data-preparation-stones></span></div>
  <nav class="duel-preparation-tabs" role="tablist" aria-label="준비 문제 선택"><button type="button" id="duel-preparation-heroes-tab" role="tab" aria-controls="duel-preparation-heroes" data-preparation-tab="heroes">영웅 소환석</button><button type="button" id="duel-preparation-towers-tab" role="tab" aria-controls="duel-preparation-towers" data-preparation-tab="towers">타워 구입</button></nav>
  <section id="duel-preparation-heroes" class="duel-preparation-heroes" role="tabpanel" aria-labelledby="duel-preparation-heroes-tab">
   <div class="duel-preparation-question-copy"><p class="duel-preparation-progress" data-preparation-progress></p><h3 class="duel-preparation-equation" data-preparation-question></h3><p class="duel-preparation-hint">정답 블록 하나를 골라 확인해요.</p></div>
   <div class="duel-preparation-answers" role="group" aria-label="덧셈 정답 후보">${Array.from({length:16},(_,i)=>`<button type="button" data-answer-index="${i}" aria-pressed="false"></button>`).join('')}</div>
   <div class="duel-preparation-hero-actions"><span data-preparation-selected aria-live="polite">정답을 골라요</span><button type="button" class="duel-preparation-primary" data-preparation-confirm>정답 확인</button></div>
  </section>
  <section id="duel-preparation-towers" class="duel-preparation-towers" role="tabpanel" aria-labelledby="duel-preparation-towers-tab" hidden>
   <div class="duel-preparation-shop"><div class="duel-preparation-tower-grid">${TOWERS.map(()=>'<button type="button" class="duel-preparation-tower"><span class="duel-preparation-tower-art" aria-hidden="true"></span><span class="duel-preparation-tower-copy"><strong></strong><span data-tower-details></span><span data-tower-price></span><span data-tower-effect hidden></span></span></button>').join('')}</div></div>
   <form class="duel-preparation-purchase" novalidate hidden><div class="duel-preparation-purchase-copy"><p class="duel-preparation-purchase-name" data-preparation-tower-name></p><h3 class="duel-preparation-equation" data-preparation-equation></h3><label class="duel-preparation-input-label">남는 코인<input name="answer" inputmode="none" autocomplete="off" maxlength="12" aria-label="타워 구입 후 남는 코인" placeholder="남는 코인"></label></div><div class="duel-preparation-keypad" role="group" aria-label="남는 코인 숫자 입력">${['7','8','9','4','5','6','1','2','3','0','.','⌫'].map(key=>`<button type="button" data-preparation-key="${key}"${key==='⌫'?' aria-label="마지막 숫자 지우기"':''}>${key}</button>`).join('')}</div><div class="duel-preparation-purchase-actions"><button type="submit" class="duel-preparation-primary" data-preparation-buy>정답 제출</button><button type="button" data-preparation-cancel>취소</button></div></form>
  </section>
  <p class="duel-preparation-feedback" data-preparation-feedback role="status" aria-live="polite"></p>
 </section>`;
 host.append(root);
 const skin=mountPreparationSkin(root);
 const find=<T extends HTMLElement=HTMLElement>(selector:string)=>root.querySelector<T>(selector)!;
 const card=find<HTMLElement>('.duel-preparation-card'),heroesTab=find<HTMLButtonElement>('[data-preparation-tab="heroes"]'),towersTab=find<HTMLButtonElement>('[data-preparation-tab="towers"]');
 const heroes=find('#duel-preparation-heroes'),towers=find('#duel-preparation-towers'),shop=find('.duel-preparation-shop'),purchase=find<HTMLFormElement>('form'),input=find<HTMLInputElement>('input');
 const answerButtons=Array.from(root.querySelectorAll<HTMLButtonElement>('[data-answer-index]')),towerButtons=Array.from(root.querySelectorAll<HTMLButtonElement>('.duel-preparation-tower'));
 const feedbackElement=find('[data-preparation-feedback]'),confirm=find<HTMLButtonElement>('[data-preparation-confirm]');
 let state:DuelState|null=null,side:Side=0,identity='',preparationKey='',roundKey='',quoteNonce='',tab:'heroes'|'towers'='heroes',selected:number|null=null;
 let intent=false,suspended=false,busy=false,pending=false,disposed=false,visibilityQueued=false,changingTab=false,returnFocus:HTMLElement|null=null;
 const player=()=>state?.players[side];
 const active=()=>state?.status==='preparing'&&!!player();
 const blocked=()=>busy||pending||!active();
 const feedback=(text:string)=>{feedbackElement.textContent=text;};
 const notifyVisibility=()=>{if(!visibilityQueued){visibilityQueued=true;queueMicrotask(()=>{visibilityQueued=false;if(!disposed)options.onVisibilityChange?.();});}};
 const updateVisibility=()=>{
  const visible=!!active()&&intent&&!suspended;if(visible===!root.hidden)return;
  if(visible){returnFocus=document.activeElement instanceof HTMLElement?document.activeElement:null;root.hidden=false;queueMicrotask(()=>{if(!root.hidden&&!disposed)(player()?.quote?input:tab==='heroes'?heroesTab:towersTab).focus({preventScroll:true});});}
  else{const focused=root.contains(document.activeElement);root.hidden=true;if(focused&&!suspended)host.querySelector<HTMLElement>('canvas')?.focus({preventScroll:true});}
  notifyVisibility();
 };
 const render=()=>{
  const p=player();if(!p||!active()){updateVisibility();return;}
  const q=p.quote;if(q)tab='towers';
  heroes.hidden=tab!=='heroes';towers.hidden=tab!=='towers';shop.hidden=!!q;purchase.hidden=!q;
  const view=tab==='heroes'?'heroes':q?'purchase':'shop',viewChanged=card.dataset.preparationView!==view;
  card.dataset.preparationView=view;
  for(const button of [heroesTab,towersTab]){const chosen=button.dataset.preparationTab===tab;button.setAttribute('aria-selected',String(chosen));button.tabIndex=chosen?0:-1;button.disabled=blocked();}
  const clock=duelCountdown(state);find('[data-preparation-clock]').textContent=formatDuelClock(clock.seconds);find('[data-preparation-clock]').setAttribute('aria-label',`준비 남은 시간 ${clock.seconds}초`);
  find('[data-preparation-money]').textContent=`코인 ${numberText(p.money+p.escrow)}`;
  find('[data-preparation-stock]').textContent=`비축 타워 ${Object.values(p.stock??{}).reduce((a,b)=>a+b,0)}개`;
  find('[data-preparation-stones]').textContent=`소환석 ${p.egg}개`;
  const nextRound=`${identity}:${preparationKey}:${p.round}`;
  if(roundKey!==nextRound){roundKey=nextRound;selected=null;feedback('');}
  find('[data-preparation-progress]').textContent=`문제 ${duelHeroLearningLevel(p)}단계 · 정답 ${p.solved}개 · ${duelHeroLearningLevel(p)<HERO_ADDITION_STAGES?`다음 단계까지 ${5-p.solved%5}개`:'최고 단계'}`;
  find('[data-preparation-question]').textContent=`${numberText(p.heroQuestion.a)} + ${numberText(p.heroQuestion.b)} = ?`;
  for(const [index,button] of answerButtons.entries()){const value=p.board[index],label=numberText(value);if(button.textContent!==label)button.textContent=label;button.disabled=blocked();button.setAttribute('aria-pressed',String(selected===index));button.setAttribute('aria-label',`정답 후보 ${label}`);}
  confirm.disabled=blocked()||selected===null;
  find('[data-preparation-selected]').textContent=selected===null?'정답을 골라요':`선택한 정답 ${numberText(p.board[selected])}`;
  for(const [index,button] of towerButtons.entries()){
   const type=TOWERS[index];
   const cost=duelBuildCost(state!,side,type.id),stored=p.stock?.[type.id]??0;
   if(button.dataset.prepareType!==type.id){button.querySelector('.duel-preparation-tower-art')!.innerHTML=towerArtHTML(type);button.dataset.prepareType=type.id;}
   button.querySelector('strong')!.textContent=type.name;button.querySelector('[data-tower-details]')!.textContent=`공격 ${numberText(type.unit)} · 비축 ${stored}개`;button.querySelector('[data-tower-price]')!.textContent=cost<=p.money?`${numberText(cost)} 코인`:'코인 부족';
   const effect=type.effect==='basic'?null:TOWER_EFFECTS[type.effect],effectElement=button.querySelector<HTMLElement>('[data-tower-effect]')!;
   effectElement.hidden=!effect;effectElement.textContent=effect?.label??'';effectElement.dataset.towerEffect=type.effect;effectElement.title=effect?.description??'';
   button.setAttribute('aria-label',`${type.name} · 공격 ${numberText(type.unit)} · 비축 ${stored}개 · 구입 ${numberText(cost)} 코인${effect?' · '+effect.description:''}`);button.disabled=blocked()||!!q||cost>p.money;
  }
  if(q){if(quoteNonce!==q.nonce){quoteNonce=q.nonce;input.value='';feedback('');}find('[data-preparation-tower-name]').textContent=`${towerType(q.typeId)?.name??'타워'} · 남는 코인을 계산해요`;find('[data-preparation-equation]').textContent=`${numberText(q.before,q.digits??2)} − ${numberText(q.cost,q.digits??2)} = ?`;}
  else quoteNonce='';
  purchase.querySelectorAll<HTMLInputElement|HTMLButtonElement>('input,button').forEach(element=>element.disabled=blocked());root.setAttribute('aria-busy',String(busy||pending));skin.sync();if(viewChanged&&!root.hidden&&!changingTab)options.onViewChange?.(tab==='heroes'?heroes:q?purchase:shop);updateVisibility();
 };
 const perform=async(action:DuelAction):Promise<ActionReply|undefined>=>{
  if(blocked())return;pending=true;render();
  try{const result=await send(action);const reply=result&&typeof result==='object'&&'ok' in result?result as ActionReply:undefined;if(reply?.message)feedback(reply.message);return reply;}
  catch(error){feedback(error instanceof Error?error.message:'다시 시도해 주세요.');return undefined;}
  finally{pending=false;if(!disposed)render();}
 };
 // A touch on the canvas can open a dialog before its compatibility click arrives.
 const bindClick=(button:HTMLButtonElement,action:()=>unknown)=>{
  let touchStarted=false;
  button.addEventListener('pointerdown',event=>{if(event.pointerType==='touch')touchStarted=true;});button.addEventListener('touchstart',()=>{touchStarted=true;},{passive:true});
  for(const name of ['pointercancel','touchcancel'])button.addEventListener(name,()=>{touchStarted=false;});
  button.addEventListener('click',event=>{const source=event as MouseEvent&{pointerType?:string;sourceCapabilities?:{firesTouchEvents:boolean}|null};if(event.detail>0&&(source.pointerType==='touch'||source.sourceCapabilities?.firesTouchEvents)&&!touchStarted){event.preventDefault();return;}touchStarted=false;void action();});
 };
 const showHeroes=async()=>{
  if(blocked())return;if(player()?.quote){changingTab=true;let result:ActionReply|undefined;try{result=await perform({type:'cancel'});}finally{changingTab=false;}if(result?.ok===false||player()?.quote)return;}tab='heroes';feedback('');render();heroesTab.focus({preventScroll:true});
 };
 bindClick(heroesTab,showHeroes);bindClick(towersTab,()=>{if(blocked())return;tab='towers';feedback('');render();});
 bindClick(find<HTMLButtonElement>('[data-preparation-cancel]'),showHeroes);
 answerButtons.forEach((button,index)=>bindClick(button,()=>{if(blocked())return;selected=selected===index?null:index;feedback('');render();}));
 bindClick(confirm,async()=>{const p=player();if(!p||selected===null)return;const round=p.round,result=await perform({type:'fuse',round,slots:[selected],operation:'+'});if(result?.ok&&player()?.round!==round){selected=null;render();}});
 towerButtons.forEach(button=>bindClick(button,async()=>{const typeId=button.dataset.prepareType;if(!typeId||blocked())return;feedback('');await perform({type:'prepare-quote',typeId});if(player()?.quote&&!root.hidden)input.focus({preventScroll:true});}));
 root.querySelectorAll<HTMLButtonElement>('[data-preparation-key]').forEach(button=>bindClick(button,()=>{if(blocked())return;const key=button.dataset.preparationKey!;if(key==='⌫')input.value=input.value.slice(0,-1);else if(key==='.'&&!input.value.includes('.'))input.value=(input.value||'0')+'.';else if(/^\d$/.test(key)&&input.value.length<12&&(!input.value.includes('.')||input.value.split('.')[1].length<2))input.value+=key;feedback('');}));
 purchase.addEventListener('submit',event=>{event.preventDefault();const q=player()?.quote;if(!q||blocked())return;if(!input.value.trim()){feedback('남는 코인을 입력해요.');input.focus({preventScroll:true});return;}void perform({type:'answer',nonce:q.nonce,answer:input.value});});
 bindClick(find<HTMLButtonElement>('[data-preparation-buy]'),()=>undefined);
 const close=()=>{intent=false;updateVisibility();const rect=returnFocus?.getBoundingClientRect(),canReturn=returnFocus?.isConnected&&returnFocus.matches('button,input,select,textarea,a[href],[tabindex]')&&rect&&rect.width>1&&rect.height>1&&!returnFocus.closest('[hidden],.hidden,.sr-only');const target=canReturn?returnFocus:host.querySelector<HTMLElement>('canvas');target?.focus({preventScroll:true});};
 bindClick(find<HTMLButtonElement>('[data-preparation-close]'),close);
 const keyboard=(event:KeyboardEvent)=>{
  if(root.hidden)return;
  if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close();return;}
  if((event.target===heroesTab||event.target===towersTab)&&['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){event.preventDefault();if(blocked())return;if(event.key==='Home'||event.key==='ArrowLeft')void showHeroes();else{tab='towers';feedback('');render();towersTab.focus({preventScroll:true});}return;}
  if(event.key!=='Tab')return;const controls=Array.from(root.querySelectorAll<HTMLElement>('button,input,[tabindex="0"]')).filter(element=>!(element as HTMLButtonElement).disabled&&!element.closest('[hidden]')&&element.getClientRects().length>0);
  if(!controls.length){event.preventDefault();card.focus({preventScroll:true});return;}const first=controls[0],last=controls.at(-1)!;
  if(!root.contains(document.activeElement)||event.shiftKey&&document.activeElement===first||!event.shiftKey&&document.activeElement===last){event.preventDefault();(event.shiftKey?last:first).focus({preventScroll:true});}
 };
 document.addEventListener('keydown',keyboard,true);
 for(const event of ['pointerdown','mousedown','touchstart','click'])root.addEventListener(event,e=>e.stopPropagation());
 return {root,sync(nextIdentity:string,nextState:DuelState|null,nextSide:Side,nextBusy:boolean,nextSuspended=false){
  identity=nextIdentity;state=nextState;side=nextSide;busy=nextBusy;suspended=nextSuspended;
  if(active()){const key=`${identity}:${side}:${state!.preparationStartedAt}`;if(key!==preparationKey){preparationKey=key;intent=true;tab=player()?.quote?'towers':'heroes';roundKey='';quoteNonce='';selected=null;feedback('');}}
  else{intent=false;preparationKey='';roundKey='';quoteNonce='';selected=null;pending=false;}
  render();
 },open(){if(!active())return;intent=true;render();},close,feedback,get isOpen(){return intent&&!!active();},get visible(){return !root.hidden;},dispose(){disposed=true;document.removeEventListener('keydown',keyboard,true);skin.dispose();root.remove();}};
}
