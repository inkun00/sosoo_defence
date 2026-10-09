import {artURL} from './art';
import {loadWorkbook,worksheetHeroLevelChances,Workbook} from './worksheet-store';
import {heroSpec,HeroSpec} from './multiplayer/heroes';
import {heroSummonStyle} from './hero-summon-style';

export function heroArt(h:HeroSpec){return '<span class="collection-art" aria-hidden="true" style="--hero-row:'+h.row*50+'%;background-image:url('+artURL(h.sheet)+');background-position:0% '+h.row*50+'%"></span>';}
function rankStyle(h:HeroSpec){const s=heroSummonStyle(h.level);return '--hero-color:'+s.cssColor+';--hero-accent:'+s.cssAccent+';--hero-rank:'+s.rank;}

export interface CollectionOptions{mode?:'collection'|'deployment';}

export function collectionHTML(selected=loadWorkbook().selectedHero,disabled=false,book:Workbook=loadWorkbook(),options:CollectionOptions={}){
 const deployment=options.mode==='deployment';
 const cards=book.collection.slice().sort((a,b)=>heroSpec(b.heroId)!.level-heroSpec(a.heroId)!.level).map(c=>{
  const h=heroSpec(c.heroId)!,rank=heroSummonStyle(h.level),active=h.id===selected;
  return '<button type="button" class="collection-card '+(active?'selected':'')+'" data-rank="'+rank.rank+'" style="'+rankStyle(h)+'" data-collection-hero="'+h.id+'" aria-pressed="'+active+'" '+(disabled?'disabled':'')+'><span class="collection-rank">'+rank.label+' · Lv.'+h.level+'</span><span class="collection-portrait">'+heroArt(h)+'</span><strong>'+h.name+'</strong><small>'+h.description+'</small><span class="collection-equip">'+(deployment?'이 영웅으로 출전':active?'◆ 대전 동료로 선택됨':'이 영웅 선택')+' · '+c.copies+'회 획득</span></button>';
 }).join('');
 const levelChances=worksheetHeroLevelChances(book.collection.map(c=>c.heroId)),complete=levelChances.every(n=>n===0);
 const introduction=deployment?'이번 대전에 함께 출전할 영웅을 골라요. 카드를 누르면 준비를 마치고, 두 수호자가 모두 준비됐을 때 영웅이 바로 등장해요.':(complete?'영웅 30종을 모두 모았어요. 새로운 영웅 보상은 없지만 학습지는 계속 풀 수 있어요.':'새 학습지의 암호를 풀 때마다 아직 없는 영웅 한 명을 얻어요. 서로 다른 학습지 세 장을 풀면 서로 다른 영웅 세 명을 얻어요.')+' 대전을 시작할 때 동료 하나를 선택하면 바로 출전해요.';
 const chances=deployment?'':'<details class="collection-chances"><summary>레벨별 영웅 등장 확률</summary><div>'+levelChances.map((n,i)=>'<span>Lv.'+(i+1)+' · '+Number(n.toFixed(2))+'%'+(n===0?' · 수집 완료':'')+'</span>').join('')+'</div><p>'+(complete?'모든 영웅을 수집해 등장 확률이 0%예요.':'이미 수집한 영웅은 다시 나오지 않아요. 남아 있는 같은 레벨의 영웅은 같은 확률로 나와요. 한 레벨을 모두 모으면 그 레벨의 확률을 남은 레벨에 나누어 적용해요.')+'</p></details>';
 return '<section class="hero-collection" data-mode="'+(deployment?'deployment':'collection')+'"><div class="collection-intro"><p>'+introduction+'</p><div class="collection-meta"><span>수집 '+book.collection.length+' / 30</span></div></div><div class="collection-grid">'+(cards||'<div class="collection-empty"><span class="collection-empty-rune" aria-hidden="true">✦</span><strong>새로운 동료를 기다리는 중</strong><p>학습지 20문항의 암호를 풀어 첫 영웅을 깨워 보세요.</p></div>')+'</div>'+chances+'</section>';
}

/** Acquisition reveal shares the exact rank palette and strength with battle. */
export function heroRevealHTML(h:HeroSpec,copies:number){
 const rank=heroSummonStyle(h.level),sparks=Array.from({length:rank.particles},(_,i)=>{
  const angle=i/rank.particles*Math.PI*2,radius=48+(i%3)*16;
  return '<i style="--spark-x:'+Math.round(Math.cos(angle)*radius)+'px;--spark-y:'+Math.round(Math.sin(angle)*radius)+'px;--spark-delay:'+(i%7)*35+'ms"></i>';
 }).join('');
 return '<div class="hero-reveal" data-rank="'+rank.rank+'" style="'+rankStyle(h)+'"><span class="hero-reveal-rank">'+rank.label+' 영웅 · Lv.'+h.level+'</span><div class="hero-reveal-stage" aria-hidden="true"><span class="hero-reveal-column"></span><span class="hero-reveal-ring"></span>'+(rank.rank>2?'<span class="hero-reveal-ring hero-reveal-ring-outer"></span>':'')+'<span class="hero-reveal-sparks">'+sparks+'</span><span class="hero-reveal-figure">'+heroArt(h)+'</span></div><h2>'+h.name+'</h2><p>'+h.description+'</p><p class="collection-note">'+(copies===1?'새로운 영웅 획득':copies+'회 획득')+' · 영구 보관</p><button id="ws-equip">이 영웅을 대전 동료로 선택</button></div>';
}
