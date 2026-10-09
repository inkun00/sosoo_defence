import {numberText} from '../math';
import {towerType} from '../towers';
import type {Quote,DuelAction} from './duel';
import './purchase-panel.css';

/** Uses only the lower crafting area; the battlefield stays visible and interactive. */
export function mountPurchasePanel(field:HTMLElement,send:(action:DuelAction)=>unknown){
 const root=document.createElement('section');root.className='duel-purchase-panel';root.hidden=true;
 root.setAttribute('aria-label','타워 비축 계산');field.append(root);
 let nonce='';
 const position=()=>{const canvas=field.querySelector('canvas');if(!canvas)return;const box=canvas.getBoundingClientRect(),parent=field.getBoundingClientRect(),scale=box.width/1280;root.style.left=`${box.left-parent.left+8*scale}px`;root.style.top=`${box.top-parent.top+445*scale}px`;root.style.transform=`scale(${scale})`;};
 const observer=new ResizeObserver(position);observer.observe(field);
 const sync=(quote:Quote|null|undefined,busy=false,visible=true)=>{
  root.hidden=!quote||!visible;if(!quote){nonce='';root.replaceChildren();return;}
  if(nonce!==quote.nonce){nonce=quote.nonce;
   root.innerHTML=`<form class="duel-purchase-form"><div class="duel-purchase-copy"><p class="duel-purchase-heading"></p><h2 class="duel-purchase-equation"></h2><p class="duel-purchase-note">정답마다 이 타워 1개를 비축해요. 준비가 끝나면 전투 중 원하는 칸에 바로 설치해요.</p><p class="duel-purchase-wallet"></p><p data-feedback role="status" aria-live="polite"></p><div class="duel-purchase-actions"><button type="button" data-cancel>취소 · 돈 유지</button><button type="submit" class="duel-purchase-confirm">정답 확인 · 타워 비축 ▶</button></div></div><div class="duel-purchase-answer"><label>남는 코인<input name="answer" inputmode="none" autocomplete="off" maxlength="12" placeholder="숫자 버튼 또는 키보드로 입력" required></label><div class="duel-purchase-keypad">${['7','8','9','4','5','6','1','2','3','0','.','⌫'].map(k=>`<button type="button" data-key="${k}">${k}</button>`).join('')}</div></div></form>`;
   root.querySelector('.duel-purchase-heading')!.textContent=towerType(quote.typeId)!.name+' · 비축 문제';
   root.querySelector('h2')!.textContent=`${numberText(quote.before,quote.digits??2)} − ${numberText(quote.cost,quote.digits??2)} = ?`;
   root.querySelector('.duel-purchase-wallet')!.textContent=quote.wallet!==quote.before?'위 코인만 계산해요. 나머지 준비 예산은 그대로 보관돼요.':'준비 예산으로 타워를 비축해요. 전투용 코인은 0부터 새로 모아요.';
   const input=root.querySelector<HTMLInputElement>('input')!;
   root.querySelectorAll<HTMLButtonElement>('[data-key]').forEach(b=>b.onclick=()=>{const k=b.dataset.key!;if(k==='⌫')input.value=input.value.slice(0,-1);else if(k==='.'&&!input.value.includes('.'))input.value=(input.value||'0')+'.';else if(/^\d$/.test(k)&&input.value.length<12&&(!input.value.includes('.')||input.value.split('.')[1].length<2))input.value+=k;});
   root.querySelector<HTMLButtonElement>('[data-cancel]')!.onclick=()=>send({type:'cancel'});
   root.querySelector('form')!.onsubmit=e=>{e.preventDefault();send({type:'answer',nonce:quote.nonce,answer:input.value});};
   if(visible)input.focus({preventScroll:true});
  }
  root.querySelectorAll<HTMLInputElement|HTMLButtonElement>('input,button').forEach(e=>e.disabled=busy);position();
 };
 return {root,sync,feedback(text:string){const e=root.querySelector('[data-feedback]');if(e)e.textContent=text;},dispose(){observer.disconnect();root.remove();}};
}
