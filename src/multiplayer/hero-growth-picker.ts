import {heroSpriteHTML} from '../hero-sprite';
import {numberText} from '../math';
import {heroesAtLevel} from './heroes';

export function heroGrowthPickerHTML(growth:number,requestedLevel=1,readOnly=false){
 const available=Math.max(0,Math.floor(growth)),maximum=readOnly?10:Math.max(1,Math.min(10,available)),level=Math.max(1,Math.min(maximum,Math.floor(requestedLevel)||1));
 const canSummon=!readOnly&&available>=level;
 const summary=readOnly?'준비 중 덧셈 정답마다 소환석을 1개씩 모아요. 전투에서 영웅 레벨만큼 소모해 원하는 때 소환해요.':`소환석 ${available}개`;
 const example=readOnly?'낮은 레벨 여러 명 또는 높은 레벨 한 명을 선택할 수 있어요.':available?`나눠 소환하기: Lv.1 최대 ${available}명 / Lv.${Math.min(10,available)} 최대 ${Math.floor(available/Math.min(10,available))}명. 선택하면 소환석 ${available-level}개가 남아요.`:'소환석을 모두 사용했어요. 소환한 영웅과 타워의 배치로 전투를 이어가요.';
 return `<section class="hero-growth-picker" data-growth="${available}" data-level="${level}" data-readonly="${readOnly}"><p class="hero-growth-summary" role="status">${summary}</p><nav class="hero-level-nav" aria-label="영웅 레벨 선택"><button type="button" data-hero-level="${level-1}" aria-label="이전 영웅 레벨" ${level===1?'disabled':''}>◀</button><label>영웅 레벨<select data-hero-level-select ${!readOnly&&!available?'disabled':''}>${Array.from({length:maximum},(_,i)=>`<option value="${i+1}" ${i+1===level?'selected':''}>Lv.${i+1}${readOnly?'':` · 소환석 ${i+1}개`}</option>`).join('')}</select></label><button type="button" data-hero-level="${level+1}" aria-label="다음 영웅 레벨" ${level===maximum?'disabled':''}>▶</button></nav><p class="hero-growth-example">${example}</p><div class="hero-grid">${heroesAtLevel(level).map(hero=>`<button type="button" class="hero-card" data-hero="${hero.id}" ${canSummon?'':'disabled'}>${heroSpriteHTML(hero.sheet,hero.row,'hero-crop')}<strong>Lv.${level} · ${hero.name}</strong><span>체력 ${numberText(hero.hp)}</span><small>${hero.description}</small>${readOnly?'':`<span class="duel-gold">소환석 ${level}개 소모 · 소환 ▶</span>`}</button>`).join('')}</div></section>`;
}

export function bindHeroGrowthPicker(root:HTMLElement,onLevel:(level:number)=>void,onSummon:(heroId:string)=>void){
 const bindClick=(button:HTMLButtonElement,action:()=>void)=>{
  let touchStarted=false;
  button.addEventListener('pointerdown',event=>{if(event.pointerType==='touch')touchStarted=true;});
  button.addEventListener('touchstart',()=>{touchStarted=true;},{passive:true});
  button.addEventListener('pointercancel',()=>{touchStarted=false;});
  button.addEventListener('touchcancel',()=>{touchStarted=false;});
  button.onclick=event=>{
   const source=event as MouseEvent&{pointerType?:string;sourceCapabilities?:{firesTouchEvents:boolean}|null};
   // A canvas touch can open this dialog before its compatibility click lands.
   // Require the touch to begin on the button, while retaining keyboard clicks.
   if(event.detail>0&&(source.pointerType==='touch'||source.sourceCapabilities?.firesTouchEvents)&&!touchStarted){event.preventDefault();return;}
   touchStarted=false;action();
  };
 };
 root.querySelectorAll<HTMLButtonElement>('[data-hero-level]').forEach(button=>bindClick(button,()=>onLevel(Number(button.dataset.heroLevel))));
 const select=root.querySelector<HTMLSelectElement>('[data-hero-level-select]');if(select)select.onchange=()=>onLevel(Number(select.value));
 root.querySelectorAll<HTMLButtonElement>('[data-hero]').forEach(button=>bindClick(button,()=>onSummon(button.dataset.hero!)));
}
