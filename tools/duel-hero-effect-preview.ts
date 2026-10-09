import Phaser from 'phaser';
import {DuelScene,type DuelView} from '../src/multiplayer/scene';
import {activeDuelHeroEffects,activeDuelTowerHeroEffects,advanceDuel,applyDuel,createDuel,joinDuel,type DuelEnemy,type DuelTower,type Side} from '../src/multiplayer/duel';
import {duelPathDistance,duelPathPosition} from '../src/multiplayer/duel-maps';
import {HEROES,heroEffectStats,heroSpec,type HeroEffect} from '../src/multiplayer/heroes';
import {HERO_EFFECT_BADGE_SPECS} from '../src/multiplayer/hero-effect-badges';
import {numberText} from '../src/math';
import '../src/game.css';

const $=(id:string)=>document.getElementById(id)!;
const baseTime=Date.now(),state=createDuel('left','푸른 수호자',71,baseTime,3,{},'ember-bend');
joinDuel(state,'right','황금 수호자',baseTime,3);
applyDuel(state,0,{type:'ready'},baseTime,'left-ready');applyDuel(state,1,{type:'ready'},baseTime,'right-ready');
state.players.forEach(p=>p!.lastSeen=baseTime+60000);advanceDuel(state,baseTime+60000);
let side:Side=0,upper=false,high=false,ready=false,effect:HeroEffect='haste',operation='이동 가속';
const unitLabels=new Map([[101,'출전 영웅'],[102,'가까운 아군'],[103,'먼 아군'],[104,'상대 몬스터']]);

function selectedHero(){
 const choices=HEROES.filter(h=>h.effect===effect).sort((a,b)=>a.level-b.level||a.variant-b.variant);
 return high?choices[choices.length-1]:choices[0];
}
function at(e:DuelEnemy,x:number,y:number):DuelEnemy{
 const pathDistance=duelPathDistance(state.mapId,x,y),point=duelPathPosition(state.mapId,pathDistance);
 return {...e,x:point.x,y:point.y,pathDistance};
}
function enemy(id:number,owner:Side,x:number,y:number,hero:string|null=null):DuelEnemy{
 const spec=hero?heroSpec(hero):null,max=spec?.hp??600;
 // Stun holds these local units still while the host's real aura and damage rules run.
 return at({id,owner,target:(1-owner) as Side,hero,level:spec?.level??1,hp:max,max,x,y,slow:0,stun:3600,hits:0},x,y);
}
function tower(id:number,x:number,y:number):DuelTower{return {id,typeId:'basic',x,y,unit:100,cost:100,enabled:true,cooldown:10000};}
function tick(){state.players.forEach(p=>p!.lastSeen=state.updatedAt+100);advanceDuel(state,state.updatedAt+100);}
function baseline(){
 state.createdAt++;
 state.mapId=upper?'eclipse-labyrinth':'ember-bend';state.shots=[];state.elapsed=0;state.startedAt=baseTime+60000;state.updatedAt=state.startedAt;
 const right=effect==='enemy-slow',x=right?18:5,y=upper?0:3,direction=right?-1:1;
 state.enemies=[enemy(101,0,x,y,selectedHero().id),enemy(102,0,x+direction*1.4,y),enemy(103,0,x+direction*3.6,y),enemy(104,1,x+direction*3.1,y)];
 state.players[0].towers=[tower(201,5,upper?1:2),tower(202,8,upper?1:4)];
 state.players[1]!.towers=[tower(203,18,upper?1:2),tower(204,15,upper?1:4)];
 state.nextId=Math.max(300,state.nextId);tick();
}
baseline();
const scene=new DuelScene(():DuelView=>({state,side,room:'영웅의 마법',selectedType:'',shopPage:0,slots:[],selectedTower:0,message:'영웅의 마법은 범위 안에서 적용돼요',busy:false,connected:true}));
const labels=(effects:HeroEffect[])=>effects.length?effects.map(e=>HERO_EFFECT_BADGE_SPECS[e].label).join(' + '):'효과 없음';
function updateProof(){
 const hero=selectedHero(),stats=heroEffectStats(hero.level);
 $('hero-description').textContent=`${hero.name} · Lv.${hero.level} · ${hero.description}`;
 $('hero-description').dataset.heroId=hero.id;$('hero-description').dataset.radius=String(stats.radius);$('hero-description').dataset.amount=String(stats.amount);
 $('proof').replaceChildren(...[...unitLabels].map(([id,label])=>{
  const row=document.createElement('span'),e=state.enemies.find(e=>e.id===id);row.dataset.enemyId=String(id);
  const effects=e?activeDuelHeroEffects(state,e):[];row.dataset.effects=effects.join(',');row.classList.toggle('affected',effects.length>0);
  row.textContent=e?`${label} · ${labels(effects)} · 체력 ${numberText(e.hp)}/${numberText(e.max)}`:`${label} · 퇴장`;return row;
 }),...[0,1].flatMap(rawSide=>{const owner=rawSide as Side;return state.players[owner]!.towers.map((t,index)=>{
  const row=document.createElement('span'),effects=activeDuelTowerHeroEffects(state,owner,t);row.dataset.towerId=String(t.id);row.dataset.effects=effects.join(',');row.classList.toggle('affected',effects.length>0);
  row.textContent=`${owner===0?'내':'상대'} 포탑 ${index+1} · ${labels(effects)}`;return row;
 });}));
 const shields=state.shots.filter(shot=>shot.shielded).length;
 $('status').textContent=`${ready?'영웅 효과를 확인하세요':'영웅 이미지를 불러오는 중'} · ${operation} · ${side===0?'나':'상대'} 시점 · 보호막 방어 ${shields}회`;
 $('shield-hit').toggleAttribute('disabled',!ready||effect!=='shield');
 document.querySelectorAll<HTMLButtonElement>('[data-effect]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.effect===effect)));
 if(scene.ready)game.scale.refresh();
}
function refresh(label:string){operation=label;state.revision++;scene.redraw();updateProof();}
document.querySelectorAll<HTMLButtonElement>('[data-effect]').forEach(button=>{button.onclick=()=>{effect=button.dataset.effect as HeroEffect;baseline();refresh(HERO_EFFECT_BADGE_SPECS[effect].label);};});
$('level-low').onclick=()=>{high=false;baseline();refresh('낮은 레벨 영웅');};
$('level-high').onclick=()=>{high=true;baseline();refresh('높은 레벨 영웅');};
$('out-of-range').onclick=()=>{
 const e=state.enemies.find(e=>e.id===102);if(e)Object.assign(e,at(e,effect==='enemy-slow'?3:19,upper?0:3));
 for(const owner of [0,1] as Side[])for(const tower of state.players[owner]!.towers){tower.x=owner===0?10:13;tower.y=upper?5:6;}
 tick();refresh('아군과 포탑이 범위를 벗어남');
};
$('hero-exit').onclick=()=>{state.enemies=state.enemies.filter(e=>e.id!==101);tick();refresh('영웅 퇴장');};
$('restore-effects').onclick=()=>{baseline();refresh('영웅 효과 복구');};
$('swap-side').onclick=()=>{side=side===0?1:0;($('swap-side') as HTMLButtonElement).textContent=side===0?'상대 시점':'내 시점';refresh('시점 전환');};
$('top-bend').onclick=()=>{upper=!upper;($('top-bend') as HTMLButtonElement).textContent=upper?'기본 굽이':'상단 굽이';baseline();refresh('상단 구간');};
$('shield-hit').onclick=()=>{
 // Only this regular host tick fires the tower; no fabricated damage events are added.
 const target=state.enemies.find(e=>e.id===102);if(!target)return;
 state.players[1]!.towers=[tower(203,target.x-1,target.y!+1)];state.players[1]!.towers[0].cooldown=0;
 tick();state.players[1]!.towers[0].cooldown=10000;refresh('보호막에 포탑 공격');
};
scene.onAction=()=>{};
window.addEventListener('error',event=>{$('errors').textContent+=`${event.message}\n`;});
window.addEventListener('unhandledrejection',event=>{$('errors').textContent+=`${String(event.reason)}\n`;});
const game=new Phaser.Game({type:Phaser.CANVAS,parent:'field',width:1280,height:800,scene:[scene],backgroundColor:'#111216',scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},audio:{noAudio:true}});
const poll=window.setInterval(()=>{
 const loaded=scene.ready&&scene.textures.exists('heroes-'+selectedHero().level)&&['haste','vitality','shield','enemy-slow','tower-haste'].every(e=>scene.textures.exists('hero-effect-'+e));
 if(!loaded)return;
 if(!ready){ready=true;document.querySelectorAll<HTMLButtonElement>('.preview-controls button').forEach(button=>button.disabled=false);}
 updateProof();
},250);
window.addEventListener('pagehide',()=>window.clearInterval(poll),{once:true});
updateProof();
