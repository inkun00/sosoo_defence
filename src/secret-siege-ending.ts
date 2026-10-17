import {artURL} from './art';
import {siegeArmySpriteHTML} from './secret-siege-sprites';
import {mountPreparationSkin} from './multiplayer/preparation-skin';
import {SECRET_SIEGE_ENDING_CHAPTERS} from './secret-siege-ending-state';
import './secret-siege-ending.css';

interface EndingOptions{signal?:AbortSignal;}
let finishActive:(()=>void)|undefined;

/** A user-controlled epilogue. It owns no game state, progress or result record. */
export function playSecretSiegeEnding(options:EndingOptions={}):Promise<void>{
 finishActive?.();
 if(options.signal?.aborted||typeof document==='undefined')return Promise.resolve();
 const dialog=document.createElement('dialog'),previous=document.activeElement;
 dialog.className='siege-ending duel-preparation-panel';dialog.dataset.chapter='0';dialog.setAttribute('aria-labelledby','siege-ending-title');dialog.setAttribute('aria-describedby','siege-ending-caption');
 dialog.style.setProperty('--siege-ending-dawn',`url("${artURL('story-dawn-v1')}")`);
 dialog.innerHTML=`<div class="siege-ending-landscape" aria-hidden="true"></div><div class="siege-ending-darkness" aria-hidden="true"></div><div class="siege-ending-sunlight" aria-hidden="true"></div><div class="siege-ending-stars" aria-hidden="true">${Array.from({length:22},(_,index)=>`<i style="--spark:${index}"></i>`).join('')}</div>
  <header class="siege-ending-header"><p>비밀 원정 <span>10 / 10</span></p><button type="button" class="siege-ending-skip">원정 기록으로</button></header>
  <div class="siege-ending-content"><section class="siege-ending-story" aria-live="polite" aria-atomic="true"><p class="siege-ending-label"></p><h1 id="siege-ending-title"></h1><div class="siege-ending-rule" aria-hidden="true"><i></i></div><p id="siege-ending-caption"></p><p class="siege-ending-pledge">우리의 모험은, 이제부터입니다.</p></section>
  <div class="siege-ending-party" aria-label="세상을 구한 인간 병사 세 명"><div class="siege-ending-worlds" aria-hidden="true"><i></i><i></i><i></i></div><div class="siege-ending-gateway" aria-hidden="true"><i></i><i></i><i></i></div><div class="siege-ending-humans" aria-hidden="true">${siegeArmySpriteHTML(2,'siege-ending-soldier siege-ending-soldier--scout')}${siegeArmySpriteHTML(0,'siege-ending-soldier siege-ending-soldier--guard')}${siegeArmySpriteHTML(1,'siege-ending-soldier siege-ending-soldier--striker')}</div><p>세계를 구하는 원정대</p></div></div>
  <footer class="siege-ending-footer"><nav class="siege-ending-chapters" aria-label="엔딩 장면">${SECRET_SIEGE_ENDING_CHAPTERS.map((chapter,index)=>`<button type="button" data-ending-chapter="${index}" aria-label="${index+1}번째 장면: ${chapter.title}"><span>${String(index+1).padStart(2,'0')}</span></button>`).join('')}</nav><details class="siege-ending-transcript"><summary>전체 이야기</summary><div>${SECRET_SIEGE_ENDING_CHAPTERS.map(chapter=>`<section><h2>${chapter.title}</h2><p>${chapter.caption}</p></section>`).join('')}</div></details><button type="button" class="siege-ending-next" data-preparation-surface="active">다음 장면</button></footer>`;
 const listeners=new AbortController(),signal=listeners.signal,reduced=matchMedia('(prefers-reduced-motion: reduce)'),skin=mountPreparationSkin(dialog);
 let chapter=0,elapsed=0,frame=0,last=performance.now(),done=false;
 const next=dialog.querySelector<HTMLButtonElement>('.siege-ending-next')!,transcript=dialog.querySelector<HTMLDetailsElement>('details')!;
 const select=(index:number)=>{
  chapter=Math.max(0,Math.min(SECRET_SIEGE_ENDING_CHAPTERS.length-1,index));elapsed=0;last=performance.now();dialog.dataset.chapter=String(chapter);
  const story=SECRET_SIEGE_ENDING_CHAPTERS[chapter];dialog.querySelector('.siege-ending-label')!.textContent=story.label;dialog.querySelector('h1')!.textContent=story.title;dialog.querySelector('#siege-ending-caption')!.textContent=story.caption;
  dialog.querySelectorAll<HTMLButtonElement>('[data-ending-chapter]').forEach((button,index)=>button.setAttribute('aria-current',index===chapter?'step':'false'));
  next.childNodes.forEach(node=>{if(node.nodeType===Node.TEXT_NODE)node.remove();});next.append(document.createTextNode(chapter===2?'원정 기록으로':'다음 장면'));skin.sync();
 };
 const setMotion=()=>dialog.classList.toggle('siege-ending--reduced',reduced.matches);setMotion();
 select(0);document.body.append(dialog);
 return new Promise(resolve=>{
  const finish=()=>{
   if(done)return;done=true;cancelAnimationFrame(frame);listeners.abort();options.signal?.removeEventListener('abort',finish);reduced.removeEventListener('change',setMotion);skin.dispose();dialog.close();dialog.remove();if(finishActive===finish)finishActive=undefined;
   if(previous instanceof HTMLElement&&previous.isConnected)previous.focus({preventScroll:true});resolve();
  };
  finishActive=finish;dialog.querySelector('.siege-ending-skip')!.addEventListener('click',finish,{signal});next.addEventListener('click',()=>chapter===2?finish():select(chapter+1),{signal});
  dialog.querySelectorAll<HTMLButtonElement>('[data-ending-chapter]').forEach(button=>button.addEventListener('click',()=>select(Number(button.dataset.endingChapter)),{signal}));
  dialog.addEventListener('cancel',event=>{event.preventDefault();finish();},{signal});dialog.addEventListener('close',finish,{signal});window.addEventListener('pagehide',finish,{once:true,signal});options.signal?.addEventListener('abort',finish,{once:true});reduced.addEventListener('change',setMotion);
  const tick=(now:number)=>{
   if(done)return;const delta=Math.max(0,Math.min(.15,(now-last)/1000));last=now;
   if(!document.hidden&&!transcript.open&&!reduced.matches){elapsed+=delta;if(elapsed>=SECRET_SIEGE_ENDING_CHAPTERS[chapter].duration)select(chapter+1);}
   frame=requestAnimationFrame(tick);
  };
  dialog.showModal();next.focus({preventScroll:true});frame=requestAnimationFrame(tick);
 });
}
