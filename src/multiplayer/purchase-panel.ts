import {numberText} from '../math';
import {towerType} from '../towers';
import type {Quote,DuelAction} from './duel';
import type {GameScreenLayout} from '../responsive-game';
import type {DuelPurchaseArea} from './scene';
import './purchase-panel.css';

/** Uses the lower crafting area while the battlefield stays visible. */
export function mountPurchasePanel(field:HTMLElement,send:(action:DuelAction)=>unknown){
 const root=document.createElement('section');root.className='duel-purchase-panel';root.hidden=true;
 root.setAttribute('aria-label','타워 비축 계산');field.append(root);
 let nonce='';
 let area:DuelPurchaseArea={x:8,y:445,width:982,height:332,compact:false,minimumTouch:56};
 let compactControls=false;
 const position=()=>{const canvas=field.querySelector('canvas');if(!canvas)return;const box=canvas.getBoundingClientRect(),parent=field.getBoundingClientRect(),scale=box.width/1280;root.style.left=`${box.left-parent.left+area.x*scale}px`;root.style.top=`${box.top-parent.top+area.y*scale}px`;root.style.width=`${area.width}px`;root.style.height=`${area.height}px`;root.style.transform=`scale(${scale})`;};
 const updateLabels=()=>{const cancel=root.querySelector<HTMLButtonElement>('[data-cancel]'),confirm=root.querySelector<HTMLButtonElement>('.duel-purchase-confirm'),input=root.querySelector<HTMLInputElement>('input');if(cancel){cancel.textContent=compactControls?'영웅':'영웅 문제 · 취소';cancel.setAttribute('aria-label','구입 취소 · 돈 유지 · 영웅 부화 문제로');}if(confirm){confirm.textContent=compactControls?'정답 · 비축 ▶':'정답 확인 · 타워 비축 ▶';confirm.setAttribute('aria-label','정답 확인 · 타워 비축');}if(input)input.placeholder=compactControls?'남는 코인':'숫자 버튼 또는 키보드로 입력';};
 const setScreenLayout=(layout:GameScreenLayout,next?:DuelPurchaseArea)=>{area=next??{...area,compact:layout.compact,minimumTouch:Math.max(68,Math.ceil(44/layout.scale))};compactControls=area.compact||(layout.pixelWidth>layout.pixelHeight&&layout.scale<.95);const minimumTouch=Math.max(area.minimumTouch,Math.ceil(44/layout.scale));root.classList.toggle('duel-purchase-compact',compactControls);root.classList.toggle('duel-purchase-tablet',compactControls&&!area.compact);root.style.setProperty('--purchase-touch',`${minimumTouch}px`);root.style.setProperty('--purchase-keypad-width',`${Math.max(520,minimumTouch*6+20)}px`);updateLabels();position();};
 const observer=new ResizeObserver(position);observer.observe(field);
 const sync=(quote:Quote|null|undefined,busy=false,visible=true)=>{
  root.hidden=!quote||!visible;if(!quote){nonce='';root.replaceChildren();return;}
  if(nonce!==quote.nonce){nonce=quote.nonce;root.classList.remove('has-feedback');
   root.innerHTML=`<form class="duel-purchase-form"><div class="duel-purchase-copy"><p class="duel-purchase-heading"></p><h2 class="duel-purchase-equation"></h2><p class="duel-purchase-note">정답마다 이 타워 1개를 비축해요. 준비 2분 뒤 전투 3분 동안 원하는 칸에 설치해요. 영웅 문제로 언제든 바꿀 수 있어요.</p><p class="duel-purchase-wallet"></p><p data-feedback role="status" aria-live="polite"></p><div class="duel-purchase-actions"><button type="button" data-cancel>영웅 문제 · 취소</button><button type="submit" class="duel-purchase-confirm">정답 확인 · 타워 비축 ▶</button></div></div><div class="duel-purchase-answer"><label>남는 코인<input name="answer" inputmode="none" autocomplete="off" maxlength="12" placeholder="숫자 버튼 또는 키보드로 입력" required></label><div class="duel-purchase-keypad">${['7','8','9','4','5','6','1','2','3','0','.','⌫'].map(k=>`<button type="button" data-key="${k}">${k}</button>`).join('')}</div></div></form>`;
   root.querySelector('.duel-purchase-heading')!.textContent=towerType(quote.typeId)!.name+' · 비축 문제';
   root.querySelector('h2')!.textContent=`${numberText(quote.before,quote.digits??2)} − ${numberText(quote.cost,quote.digits??2)} = ?`;
   root.querySelector('.duel-purchase-wallet')!.textContent=quote.wallet!==quote.before?'위 코인만 계산해요. 나머지 준비 예산은 그대로 보관돼요.':'준비 예산으로 비축해요. 전투 중에는 모은 타워만 설치할 수 있어요.';
   const input=root.querySelector<HTMLInputElement>('input')!;
   root.querySelectorAll<HTMLButtonElement>('[data-key]').forEach(b=>b.onclick=()=>{const k=b.dataset.key!;if(k==='⌫')input.value=input.value.slice(0,-1);else if(k==='.'&&!input.value.includes('.'))input.value=(input.value||'0')+'.';else if(/^\d$/.test(k)&&input.value.length<12&&(!input.value.includes('.')||input.value.split('.')[1].length<2))input.value+=k;});
   root.querySelector<HTMLButtonElement>('[data-cancel]')!.onclick=()=>send({type:'cancel'});
   root.querySelector('form')!.onsubmit=e=>{e.preventDefault();send({type:'answer',nonce:quote.nonce,answer:input.value});};
   if(visible)input.focus({preventScroll:true});
  }
  root.querySelectorAll<HTMLInputElement|HTMLButtonElement>('input,button').forEach(e=>e.disabled=busy);updateLabels();position();
 };
 return {root,sync,setScreenLayout,feedback(text:string){const e=root.querySelector('[data-feedback]');if(e)e.textContent=text;root.classList.toggle('has-feedback',!!text);},dispose(){observer.disconnect();root.remove();}};
}
