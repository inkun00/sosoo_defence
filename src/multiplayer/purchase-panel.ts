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
 let area:DuelPurchaseArea={x:8,y:749,width:982,height:332,compact:false,minimumTouch:56};
 let compactControls=false;
 const position=()=>{const canvas=field.querySelector('canvas');if(!canvas)return;const box=canvas.getBoundingClientRect(),parent=field.getBoundingClientRect(),scale=box.width/1280;root.style.left=`${box.left-parent.left+area.x*scale}px`;root.style.top=`${box.top-parent.top+area.y*scale}px`;root.style.width=`${area.width}px`;root.style.height=`${area.height}px`;root.style.transform=`scale(${scale})`;};
 const updateLabels=()=>{const cancel=root.querySelector<HTMLButtonElement>('[data-cancel]'),confirm=root.querySelector<HTMLButtonElement>('.duel-purchase-confirm'),input=root.querySelector<HTMLInputElement>('input');if(cancel){cancel.textContent=compactControls?'소환석':'소환석 문제 · 취소';cancel.setAttribute('aria-label','구입 취소 · 돈 유지 · 영웅 소환석 문제로');}if(confirm){confirm.textContent=compactControls?'정답 · 비축 ▶':'정답 확인 · 비축 ▶';confirm.setAttribute('aria-label','정답 확인 · 타워 비축');}if(input)input.placeholder='남는 코인';};
 const setScreenLayout=(layout:GameScreenLayout,next?:DuelPurchaseArea)=>{
  area=next??{...area,compact:layout.compact,minimumTouch:Math.max(68,Math.ceil(44/layout.scale))};compactControls=area.compact||(layout.pixelWidth>layout.pixelHeight&&layout.scale<.95);
  const minimumTouch=Math.max(area.minimumTouch,Math.ceil(44/layout.scale)),sixColumnWidth=Math.max(520,minimumTouch*6+20);
  const fourColumns=compactControls&&area.width-34-sixColumnWidth<minimumTouch*2+24,keypadWidth=fourColumns?minimumTouch*4+6:sixColumnWidth;
  root.classList.toggle('duel-purchase-compact',compactControls);root.classList.toggle('duel-purchase-tablet',compactControls&&!area.compact);root.classList.toggle('duel-purchase-four-columns',fourColumns);
  root.classList.toggle('duel-purchase-dense',compactControls&&area.width-34-keypadWidth<minimumTouch*3+36);
  root.style.setProperty('--purchase-touch',`${minimumTouch}px`);root.style.setProperty('--purchase-keypad-width',`${keypadWidth}px`);updateLabels();position();
 };
 const observer=new ResizeObserver(position);observer.observe(field);
 const sync=(quote:Quote|null|undefined,busy=false,visible=true)=>{
  root.hidden=!quote||!visible;if(!quote){nonce='';root.replaceChildren();return;}
  if(nonce!==quote.nonce){nonce=quote.nonce;root.classList.remove('has-feedback');
   root.innerHTML=`<form class="duel-purchase-form"><div class="duel-purchase-copy"><p class="duel-purchase-heading"></p><h2 class="duel-purchase-equation"></h2><div class="duel-purchase-answer"><label>남는 코인<input name="answer" inputmode="none" autocomplete="off" maxlength="12" placeholder="숫자 버튼 또는 키보드로 입력" required></label></div><p data-feedback role="status" aria-live="polite"></p><div class="duel-purchase-actions"><button type="submit" class="duel-purchase-confirm">정답 확인 · 타워 비축 ▶</button><button type="button" data-cancel>소환석 문제 · 취소</button></div></div><div class="duel-purchase-keypad">${['7','8','9','4','5','6','1','2','3','0','.','⌫'].map(k=>`<button type="button" data-key="${k}">${k}</button>`).join('')}</div></form>`;
   root.querySelector('.duel-purchase-heading')!.textContent=towerType(quote.typeId)!.name+' · 비축 문제';
   root.querySelector('h2')!.textContent=`${numberText(quote.before,quote.digits??2)} − ${numberText(quote.cost,quote.digits??2)} = ?`;
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
