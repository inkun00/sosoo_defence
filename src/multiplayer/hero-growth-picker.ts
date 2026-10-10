import {artURL} from '../art';
import {numberText} from '../math';
import {heroesAtLevel} from './heroes';

export function heroGrowthPickerHTML(growth:number,requestedLevel=1,readOnly=false){
 const available=Math.max(0,Math.floor(growth)),maximum=readOnly?10:Math.max(1,Math.min(10,available)),level=Math.max(1,Math.min(maximum,Math.floor(requestedLevel)||1));
 const canSummon=!readOnly&&available>=level;
 const summary=readOnly?'준비 중 덧셈 정답마다 성장량 +1을 모아요. 전투에서 영웅 레벨만큼 소모해 원하는 때 소환해요.':`성장량 ${available} · Lv.${level} 영웅 1명 비용 ${level} · 같은 레벨 최대 ${Math.floor(available/level)}명`;
 const example=readOnly?'낮은 레벨 여러 명 또는 높은 레벨 한 명을 선택할 수 있어요.':available?`나눠 소환하기: Lv.1 최대 ${available}명 / Lv.${Math.min(10,available)} 최대 ${Math.floor(available/Math.min(10,available))}명. 선택하면 성장량 ${available-level}이 남아요.`:'성장량을 모두 사용했어요. 소환한 영웅과 타워의 배치로 전투를 이어가요.';
 return `<section class="hero-growth-picker" data-growth="${available}" data-level="${level}" data-readonly="${readOnly}"><p class="hero-growth-summary" role="status">${summary}</p><nav class="hero-level-nav" aria-label="영웅 레벨 선택"><button type="button" data-hero-level="${level-1}" aria-label="이전 영웅 레벨" ${level===1?'disabled':''}>◀</button><label>영웅 레벨<select data-hero-level-select ${!readOnly&&!available?'disabled':''}>${Array.from({length:maximum},(_,i)=>`<option value="${i+1}" ${i+1===level?'selected':''}>Lv.${i+1}${readOnly?'':` · 성장 ${i+1}`}</option>`).join('')}</select></label><button type="button" data-hero-level="${level+1}" aria-label="다음 영웅 레벨" ${level===maximum?'disabled':''}>▶</button></nav><p class="hero-growth-example">${example}</p><div class="hero-grid">${heroesAtLevel(level).map(hero=>`<button type="button" class="hero-card" data-hero="${hero.id}" ${canSummon?'':'disabled'}><span class="hero-crop" aria-hidden="true" style="background-image:url('${artURL(hero.sheet)}');background-position:0% ${hero.row*50}%"></span><strong>Lv.${level} · ${hero.name}</strong><span>체력 ${numberText(hero.hp)}</span><small>${hero.description}</small>${readOnly?'':`<span class="duel-gold">성장 ${level} 소모 · 소환 ▶</span>`}</button>`).join('')}</div></section>`;
}

export function bindHeroGrowthPicker(root:HTMLElement,onLevel:(level:number)=>void,onSummon:(heroId:string)=>void){
 root.querySelectorAll<HTMLButtonElement>('[data-hero-level]').forEach(button=>button.onclick=()=>onLevel(Number(button.dataset.heroLevel)));
 const select=root.querySelector<HTMLSelectElement>('[data-hero-level-select]');if(select)select.onchange=()=>onLevel(Number(select.value));
 root.querySelectorAll<HTMLButtonElement>('[data-hero]').forEach(button=>button.onclick=()=>onSummon(button.dataset.hero!));
}
