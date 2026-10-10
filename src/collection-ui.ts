import {artURL} from './art';
import {loadWorkbook,worksheetHeroLevelChances,Workbook} from './worksheet-store';
import {worksheetHeroSpec,HeroSpec,HeroEffect,heroEffectStats} from './multiplayer/heroes';
import {heroSummonStyle} from './hero-summon-style';

export function heroArt(h:HeroSpec){h=worksheetHeroSpec(h.id)??h;return '<span class="collection-art" aria-hidden="true" style="--hero-row:'+h.row*50+'%;background-image:url('+artURL(h.sheet)+');background-position:0% '+h.row*50+'%"></span>';}
function rankStyle(h:HeroSpec){const s=heroSummonStyle(h.level);return '--hero-color:'+s.cssColor+';--hero-accent:'+s.cssAccent+';--hero-rank:'+s.rank;}
function abilityHTML(h:HeroSpec){
 const {amount,radius,shieldHits}=heroEffectStats(h.level),percent=Math.round(amount*100);
 const labels:Record<HeroEffect,string>={haste:'아군 이동 속도 +'+percent+'%',vitality:'아군 최대 체력 +'+percent+'%',shield:'공격 '+shieldHits+'회 방어 · 재충전 없음','enemy-slow':'상대 포탑 공격 속도 −'+percent+'%','tower-haste':'내 포탑 공격 속도 +'+percent+'%'};
 return '<span class="collection-ability-area">반경 '+radius+'칸 · 3효과 동시</span>'+(h.effects??[h.effect]).map(effect=>'<span>'+labels[effect]+'</span>').join('');
}

export interface CollectionOptions{mode?:'collection'|'deployment';}

export function collectionHTML(selected=loadWorkbook().selectedHero,disabled=false,book:Workbook=loadWorkbook(),options:CollectionOptions={}){
 const deployment=options.mode==='deployment';
 const cards=book.collection.slice().sort((a,b)=>worksheetHeroSpec(b.heroId)!.level-worksheetHeroSpec(a.heroId)!.level).map(c=>{
  const h=worksheetHeroSpec(c.heroId)!,rank=heroSummonStyle(h.level),active=h.id===selected;
  return '<button type="button" class="collection-card worksheet-hero '+(active?'selected':'')+'" data-rank="'+rank.rank+'" data-hero-family="'+h.variant+'" data-effects="'+h.effects!.join(',')+'" style="'+rankStyle(h)+'" data-collection-hero="'+h.id+'" aria-label="'+h.name+' · Lv.'+h.level+' · 특별 영웅 · '+h.description+'" aria-pressed="'+active+'" '+(disabled?'disabled':'')+'><span class="collection-rank">✦ 특별 '+rank.label+' · Lv.'+h.level+'</span><span class="collection-portrait">'+heroArt(h)+'</span><strong>'+h.name+'</strong><small class="collection-abilities">'+abilityHTML(h)+'</small><span class="collection-equip">'+(deployment?'이 영웅으로 출전':active?'◆ 대전 동료로 선택됨':'이 영웅 선택')+' · '+c.copies+'회 획득</span></button>';
 }).join('');
 const levelChances=worksheetHeroLevelChances(book.collection.map(c=>c.heroId)),complete=levelChances.every(n=>n===0);
 const introduction=deployment?'이번 대전에 가져갈 특별 영웅을 골라요. 카드를 누르면 준비를 마쳐요. 2분 동안 문제를 푼 뒤, 3분 전투에서 원하는 때 직접 소환해 세 효과를 함께 발동해요.':(complete?'특별 영웅 30종을 모두 모았어요. 새로운 영웅 보상은 없지만 학습지는 계속 풀 수 있어요.':'새 학습지의 암호를 풀 때마다 아직 없는 특별 영웅 한 명을 얻어요. 서로 다른 학습지 세 장을 풀면 서로 다른 특별 영웅 세 명을 얻어요.')+' 대전 전에 동료 하나를 선택해요. 2분 준비 후 3분 전투에서 원하는 때 직접 소환해 세 효과를 함께 발동해요.';
 const chances=deployment?'':'<details class="collection-chances"><summary>레벨별 영웅 등장 확률</summary><div>'+levelChances.map((n,i)=>'<span>Lv.'+(i+1)+' · '+Number(n.toFixed(2))+'%'+(n===0?' · 수집 완료':'')+'</span>').join('')+'</div><p>'+(complete?'모든 영웅을 수집해 등장 확률이 0%예요.':'이미 수집한 영웅은 다시 나오지 않아요. 남아 있는 같은 레벨의 영웅은 같은 확률로 나와요. 한 레벨을 모두 모으면 그 레벨의 확률을 남은 레벨에 나누어 적용해요.')+'</p></details>';
 return '<section class="hero-collection" data-mode="'+(deployment?'deployment':'collection')+'"><div class="collection-intro"><p>'+introduction+'</p><div class="collection-meta"><span>수집 '+book.collection.length+' / 30</span></div></div><div class="collection-grid">'+(cards||'<div class="collection-empty"><span class="collection-empty-rune" aria-hidden="true">✦</span><strong>새로운 동료를 기다리는 중</strong><p>학습지 20문항의 암호를 풀어 첫 영웅을 깨워 보세요.</p></div>')+'</div>'+chances+'</section>';
}

/** Acquisition reveal shares the exact rank palette and strength with battle. */
export function heroRevealHTML(h:HeroSpec,copies:number){
 h=worksheetHeroSpec(h.id)??h;
 const rank=heroSummonStyle(h.level),sparks=Array.from({length:rank.particles},(_,i)=>{
  const angle=i/rank.particles*Math.PI*2,radius=48+(i%3)*16;
  return '<i style="--spark-x:'+Math.round(Math.cos(angle)*radius)+'px;--spark-y:'+Math.round(Math.sin(angle)*radius)+'px;--spark-delay:'+(i%7)*35+'ms"></i>';
 }).join('');
 return '<div class="hero-reveal worksheet-hero" data-rank="'+rank.rank+'" data-hero-family="'+h.variant+'" data-effects="'+(h.effects??[h.effect]).join(',')+'" style="'+rankStyle(h)+'"><span class="hero-reveal-rank">✦ 특별 '+rank.label+' 영웅 · Lv.'+h.level+'</span><div class="hero-reveal-stage" aria-hidden="true"><span class="hero-reveal-column"></span><span class="hero-reveal-ring"></span>'+(rank.rank>2?'<span class="hero-reveal-ring hero-reveal-ring-outer"></span>':'')+'<span class="hero-reveal-sparks">'+sparks+'</span><span class="hero-reveal-figure">'+heroArt(h)+'</span></div><h2>'+h.name+'</h2><p class="collection-abilities" aria-label="'+h.description+'">'+abilityHTML(h)+'</p><p class="collection-note">'+(copies===1?'새로운 영웅 획득':copies+'회 획득')+' · 영구 보관</p><button id="ws-equip">이 영웅을 대전 동료로 선택</button></div>';
}
