import {artURL} from './art';
import {loadWorkbook,HERO_LEVEL_CHANCES,Workbook} from './worksheet-store';
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
 const introduction=deployment?'이번 대전에 함께 출전할 영웅을 골라요. 카드를 누르면 준비를 마치고, 두 수호자가 모두 준비됐을 때 영웅이 바로 등장해요.':'학습지의 암호를 풀어 만난 영웅들이에요. 대전을 시작할 때 동료 하나를 선택하면 바로 출전해요.';
 const chances=deployment?'':'<details class="collection-chances"><summary>레벨별 영웅 등장 확률</summary><div>'+HERO_LEVEL_CHANCES.map((n,i)=>'<span>Lv.'+(i+1)+' · '+n+'%</span>').join('')+'</div><p>같은 레벨의 영웅 3종은 같은 확률이에요. 이미 가진 영웅을 얻으면 획득 횟수가 쌓여요.</p></details>';
 return '<section class="hero-collection" data-mode="'+(deployment?'deployment':'collection')+'"><div class="collection-intro"><p>'+introduction+'</p><div class="collection-meta"><span>수집 '+book.collection.length+' / 30</span></div></div><div class="collection-grid">'+(cards||'<div class="collection-empty"><span class="collection-empty-rune" aria-hidden="true">✦</span><strong>새로운 동료를 기다리는 중</strong><p>학습지 20문항의 암호를 풀어 첫 영웅을 깨워 보세요.</p></div>')+'</div>'+chances+'</section>';
}

/** Acquisition reveal shares the exact rank palette and strength with battle. */
export function heroRevealHTML(h:HeroSpec,copies:number){
 const rank=heroSummonStyle(h.level),sparks=Array.from({length:rank.particles},(_,i)=>{
  const angle=i/rank.particles*Math.PI*2,radius=48+(i%3)*16;
  return '<i style="--spark-x:'+Math.round(Math.cos(angle)*radius)+'px;--spark-y:'+Math.round(Math.sin(angle)*radius)+'px;--spark-delay:'+(i%7)*35+'ms"></i>';
 }).join('');
 return '<div class="hero-reveal" data-rank="'+rank.rank+'" style="'+rankStyle(h)+'"><span class="hero-reveal-rank">'+rank.label+' 영웅 · Lv.'+h.level+'</span><div class="hero-reveal-stage" aria-hidden="true"><span class="hero-reveal-column"></span><span class="hero-reveal-ring"></span>'+(rank.rank>2?'<span class="hero-reveal-ring hero-reveal-ring-outer"></span>':'')+'<span class="hero-reveal-sparks">'+sparks+'</span><span class="hero-reveal-figure">'+heroArt(h)+'</span></div><h2>'+h.name+'</h2><p>'+h.description+'</p><p class="collection-note">'+copies+'번째 획득 · 영구 보관</p><button id="ws-equip">이 영웅을 대전 동료로 선택</button></div>';
}
