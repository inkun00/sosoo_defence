import Phaser from 'phaser';
import {DuelScene,type DuelView} from '../src/multiplayer/scene';
import {activeDuelHeroEffects,createDuel,joinDuel,type DuelEnemy,type Side} from '../src/multiplayer/duel';
import {duelPathDistance,duelPathPosition} from '../src/multiplayer/duel-maps';
import {heroSpec,type HeroEffect} from '../src/multiplayer/heroes';
import '../src/game.css';

const $=(id:string)=>document.getElementById(id)!;
const baseTime=Date.now(),heroIds={haste:'hero-3-0',brood:'hero-3-1',steadfast:'hero-3-2'};
const state=createDuel('left','왼쪽 효과 검증',71,baseTime,3,{},'ember-bend');
joinDuel(state,'right','오른쪽 효과 검증',baseTime,3);
// This is a static local snapshot. Waiting status disables DuelScene movement
// prediction, and no host ticks or heartbeats run in this preview.
let side:Side=0,upper=false,ready=false,operation='효과 적용';
const labels=new Map<number,string>([
 [101,'가속 영웅'],[102,'근처 아군'],[103,'영웅 소환 병사'],
 [104,'근처 상대 병사'],[105,'먼 아군'],[106,'소환 영웅'],[107,'방어 영웅'],
]);
const effectLabels:Record<HeroEffect,string>={haste:'가속',brood:'소환 병사',steadfast:'감속 저항'};

function at(enemy:DuelEnemy,x:number,y:number):DuelEnemy{
 const pathDistance=duelPathDistance(state.mapId,x,y),position=duelPathPosition(state.mapId,pathDistance);
 return {...enemy,x:position.x,y:position.y,pathDistance};
}
function enemy(id:number,owner:Side,x:number,y:number,hero:string|null=null,sourceHeroId?:string):DuelEnemy{
 const max=hero?heroSpec(hero)!.hp:600;
 return at({id,owner,target:(1-owner) as Side,hero,level:3,hp:max,max,x,y,slow:0,stun:0,hits:0,...(sourceHeroId?{sourceHeroId}:{})},x,y);
}
function baseline():void{
 state.mapId=upper?'eclipse-labyrinth':'ember-bend';
 state.enemies=[
  enemy(101,0,3.4,upper?0:3,heroIds.haste),
  enemy(102,0,5,upper?0:3),
  enemy(103,0,1.8,upper?0:3,null,heroIds.brood),
  enemy(104,1,6.2,upper?0:3),
  enemy(105,0,8.4,upper?0:1),
  enemy(106,0,upper?15.2:13.5,upper?2:3,heroIds.brood),
  enemy(107,0,upper?19.3:18.8,upper?0:3,heroIds.steadfast),
 ];
 state.nextId=108;
}
baseline();
const scene=new DuelScene(():DuelView=>({state,side,room:'영웅 효과 정적 검증',selectedType:'',shopPage:0,slots:[],selectedTower:0,message:'',busy:false,connected:true}));

function updateProof():void{
 $('proof').replaceChildren(...[...labels].map(([id,label])=>{
  const row=document.createElement('span'),e=state.enemies.find(e=>e.id===id);
  row.dataset.enemyId=String(id);
  if(!e){row.textContent=`${label}: 퇴장`;row.dataset.effects='';return row;}
  const effects=activeDuelHeroEffects(state,e);
  row.dataset.effects=effects.join(',');row.classList.toggle('affected',effects.length>0);
  row.textContent=`${label} · ${e.owner===0?'아군':'상대'} (${e.x.toFixed(1)}, ${e.y!.toFixed(1)})\n${effects.length?effects.map(effect=>effectLabels[effect]).join(' + '):'효과 없음'}`;
  row.style.whiteSpace='pre-line';return row;
 }));
 $('status').textContent=`${ready?'준비 완료':'이미지 로딩 중'} · ${operation} · ${side===0?'호스트':'참가자'} 시점 · ${upper?'일식 미로 상단':'불꽃 굽잇길'} · 이동과 시간은 고정되어 있습니다.`;
 if(scene.ready)game.scale.refresh();
}
function refresh(label:string):void{operation=label;state.revision++;scene.redraw();updateProof();}
$('effects-on').onclick=()=>{baseline();refresh('효과 적용');};
$('out-of-range').onclick=()=>{
 const near=state.enemies.find(e=>e.id===102);
 if(near)Object.assign(near,at(near,upper?8.5:10.5,upper?2:3));
 refresh('근처 아군이 가속 범위를 벗어남');
};
$('hero-exit').onclick=()=>{state.enemies=state.enemies.filter(e=>e.id!==101);refresh('가속 영웅 퇴장');};
$('restore-effects').onclick=()=>{baseline();refresh('영웅 효과 복구');};
$('swap-side').onclick=()=>{
 side=side===0?1:0;($('swap-side') as HTMLButtonElement).textContent=side===0?'참가자 시점':'호스트 시점';refresh('시점 전환');
};
$('top-bend').onclick=()=>{
 upper=!upper;($('top-bend') as HTMLButtonElement).textContent=upper?'기본 굽이':'상단 굽이';baseline();refresh('상단 좌표 배치 확인');
};
scene.onAction=key=>{$('status').textContent=`장면 버튼 ${key} · 이 도구의 공개 버튼으로 정적 상태를 변경합니다.`;};
window.addEventListener('error',event=>{$('errors').textContent+=`${event.message}\n`;});
window.addEventListener('unhandledrejection',event=>{$('errors').textContent+=`${String(event.reason)}\n`;});
const game=new Phaser.Game({type:Phaser.CANVAS,parent:'field',width:1280,height:800,scene:[scene],backgroundColor:'#111216',scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},audio:{noAudio:true}});
const poll=window.setInterval(()=>{
 const textures=['heroes-3','hero-effect-haste','hero-effect-brood','hero-effect-steadfast'];
 if(ready||!scene.ready||!textures.every(key=>scene.textures.exists(key)))return;
 ready=true;document.querySelectorAll<HTMLButtonElement>('.preview-controls button').forEach(button=>button.disabled=false);updateProof();
},100);
window.addEventListener('pagehide',()=>window.clearInterval(poll),{once:true});
updateProof();
