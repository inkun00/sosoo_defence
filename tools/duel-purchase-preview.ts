import Phaser from 'phaser';
import {artURL} from '../src/art';
import {DuelScene,DuelView} from '../src/multiplayer/scene';
import {DuelAction,validDuelCell,advanceDuel,DUEL_PREPARATION_SECONDS} from '../src/multiplayer/duel';
import {ComputerPeer} from '../src/multiplayer/computer-peer';
import {DUEL_MAPS,DEFAULT_DUEL_MAP_ID,isDuelMapId} from '../src/multiplayer/duel-maps';
import {mountPurchasePanel} from '../src/multiplayer/purchase-panel';
import {numberText} from '../src/math';
import {observeGameScreen,duelScreenLayout} from '../src/responsive-game';
import {mountGameAudioControls} from '../src/game-audio-controls';
import {Sound} from '../src/audio';
import {heroesAtLevel} from '../src/multiplayer/heroes';
import '../src/game.css';
import '../src/multiplayer/multiplayer.css';
const requested=new URL(location.href).searchParams.get('map'),mapId=isDuelMapId(requested)?requested:DEFAULT_DUEL_MAP_ID;
const mapChoice=document.getElementById('preview-map') as HTMLSelectElement;
for(const map of DUEL_MAPS){const option=document.createElement('option');option.value=map.id;option.textContent=map.name;mapChoice.append(option);}mapChoice.value=mapId;
mapChoice.onchange=()=>{const url=new URL(location.href);url.searchParams.set('map',mapChoice.value);location.assign(url.href);};
const peer=new ComputerPeer({uid:'preparation-ui',name:'준비 검증'},4,{seed:71,mapId});
let selectedType='',selectedTower=0,shopPage=0,busy=false,message='',slots:number[]=[];
const view=():DuelView=>({state:peer.state,side:0,room:'준비 검증',selectedType,selectedTower,shopPage,slots,message,busy,connected:true,computer:peer.opponent});
const scene=new DuelScene(view);
const sound=new Sound(),audioControls=mountGameAudioControls(document.getElementById('game-shell')!,{
 getState:()=>({sfx:sound.sfx,music:sound.music}),
 change:(kind,enabled)=>{sound.resume();if(kind==='sfx')sound.sfx=enabled;else sound.setMusic(enabled);}
});
scene.onSound=(type,towerTypeId)=>sound.play(type,towerTypeId);
const initialField=document.getElementById('field')!.getBoundingClientRect(),initialLayout=duelScreenLayout(initialField.width,initialField.height);scene.setScreenLayout(initialLayout);
const game=new Phaser.Game({type:Phaser.AUTO,parent:'field',width:1280,height:initialLayout.height,scene:[scene],backgroundColor:'#111216',scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},audio:{noAudio:true}});
const panel=mountPurchasePanel(document.getElementById('field')!,send);
const heroDialog=document.createElement('div');heroDialog.className='modal hidden';heroDialog.setAttribute('role','dialog');heroDialog.setAttribute('aria-modal','true');heroDialog.setAttribute('aria-label','부화할 영웅 선택');document.getElementById('app')!.append(heroDialog);
function closeHeroes(){heroDialog.classList.add('hidden');scene.input.enabled=true;refresh();}
function chooseHero(){const p=peer.state.players[0];if(!p.egg)return;const preparing=peer.state.status==='preparing';heroDialog.dataset.phase=peer.state.status;heroDialog.innerHTML=`<div class="duel-card"><h2>영웅 알 Lv.${p.egg} · ${preparing?'영웅 비축':'영웅 소환'}</h2><div class="hero-grid">${heroesAtLevel(p.egg).map(hero=>`<button class="hero-card" data-hero="${hero.id}"><span class="hero-crop" style="background-image:url('${artURL(hero.sheet)}');background-position:0% ${hero.row*50}%"></span><strong>${hero.name}</strong><small>${hero.description}</small><span class="duel-gold">${preparing?'비축':'소환'} ▶</span></button>`).join('')}</div><button data-close-heroes>닫기</button></div>`;heroDialog.classList.remove('hidden');scene.input.enabled=false;heroDialog.querySelector<HTMLButtonElement>('[data-close-heroes]')!.onclick=closeHeroes;heroDialog.querySelectorAll<HTMLButtonElement>('[data-hero]').forEach(button=>button.onclick=async()=>{const reply=await send({type:'hatch',heroId:button.dataset.hero!});if(reply.ok)closeHeroes();});}
observeGameScreen(game,document.getElementById('field')!,layout=>{scene.setScreenLayout(layout);shopPage=Math.min(shopPage,scene.shopPageCount-1);panel.setScreenLayout(layout,scene.getPurchaseArea());scene.redraw();},duelScreenLayout);
function refresh(){const s=peer.state,p=s.players[0],opponent=s.players[1]!;if(s.status==='playing'&&heroDialog.dataset.phase==='preparing'&&!heroDialog.classList.contains('hidden')){closeHeroes();return;}panel.sync(s.status==='preparing'?p.quote:null,busy,heroDialog.classList.contains('hidden'));scene.redraw();document.getElementById('proof')!.textContent=`${s.status} · 준비 ${Math.ceil(Math.max(0,DUEL_PREPARATION_SECONDS-s.preparationElapsed))}초 · 전투 ${s.elapsed.toFixed(1)}초 · 코인 ${numberText(p.money)} · 비축 타워 ${Object.values(p.stock).reduce((a,b)=>a+b,0)} · 비축 영웅 ${Object.values(p.heroStock??{}).reduce((a,b)=>a+b,0)} · 설치 ${p.towers.length} · 상대 비축 ${Object.values(opponent.stock).reduce((a,b)=>a+b,0)} · 상대 설치 ${opponent.towers.length} · 몬스터 ${s.enemies.length}`;}
async function send(action:DuelAction){busy=true;refresh();try{const reply=await peer.send(action);message=reply.message;if(reply.ok&&action.type==='fuse')slots=[];panel.feedback(message);return reply;}finally{busy=false;refresh();}}
scene.onAction=async key=>{
 if(key.startsWith('type:')){if(peer.state.players[0].quote){message='비축 문제를 풀거나 취소해 주세요.';refresh();return;}selectedType=key.slice(5);selectedTower=0;if(peer.state.status==='preparing')void send({type:'prepare-quote',typeId:selectedType});else refresh();return;}
 if(key.startsWith('block:')){const i=Number(key.slice(6));if(!slots.includes(i)&&slots.length<3)slots.push(i);refresh();return;}
 if(key.startsWith('slot:')){slots.splice(Number(key.slice(5)),1);refresh();return;}
 if(key==='page:next'||key==='page:prev'){shopPage=Math.max(0,Math.min(scene.shopPageCount-1,shopPage+(key==='page:next'?1:-1)));refresh();return;}
 if(key==='blocks:page'){scene.cycleBlockPage();refresh();return;}
 if(key==='heroes:prev'||key==='heroes:next'){scene.changeHeroPage(key==='heroes:next'?1:-1);return;}
 if(key==='prepare:heroes'){if(peer.state.players[0].quote)await send({type:'cancel'});selectedType='';refresh();return;}
 if(key.startsWith('summon:')){await send({type:'summon',heroId:key.slice(7)});return;}
 if(key==='summon-reward'){await send({type:'summon-reward'});return;}
 if(key==='hatch'){chooseHero();return;}
 if(key==='ready')void send({type:'ready'});
 if(key==='fuse')void send({type:'fuse',round:peer.state.players[0].round,slots:[...slots],operation:'+'});
 if(key==='sell')void send({type:'sell',towerId:selectedTower});
};
scene.onCell=(x,y)=>{const s=peer.state,p=s.players[0];if(s.status!=='playing')return;const tower=p.towers.find(t=>t.x===x&&t.y===y);if(tower){selectedTower=tower.id;selectedType='';refresh();return;}if(selectedType&&validDuelCell(s,0,x,y))void send({type:'build',typeId:selectedType,x,y});};
let signature='';scene.onControls=()=>{const visible=heroDialog.classList.contains('hidden')&&!(peer.state.status==='preparing'&&peer.state.players[0].quote);if(scene.input)scene.input.enabled=visible;const next=JSON.stringify([visible,[...scene.controls].map(([key,c])=>[key,c.label,c.enabled])]);if(next===signature)return;signature=next;const controls=document.getElementById('preview-controls')!;controls.replaceChildren();if(!visible)return;for(const [key,c]of scene.controls){const button=document.createElement('button');button.textContent=c.label;button.dataset.duelAction=key;button.disabled=!c.enabled;button.onclick=c.run;controls.append(button);}};
peer.onState=refresh;
Object.assign(window,{__duelPhaseTest:{peer,scene,view,send,advanceToBattle(){const s=peer.state;if(s.status!=='preparing')throw Error('Start preparation first');const now=Math.max(Date.now(),s.updatedAt);s.preparationStartedAt=now-DUEL_PREPARATION_SECONDS*1000;for(const p of s.players)if(p)p.lastSeen=now;advanceDuel(s,now);refresh();return s;}}});
game.events.once('ready',()=>game.scale.refresh());
const geometry=document.createElement('output');geometry.id='landscape-proof';geometry.className='sr-only';document.getElementById('app')!.append(geometry);
const geometryTimer=setInterval(()=>{if(!scene.ready)return;const p=peer.state.players[0],field=document.getElementById('field')!.getBoundingClientRect(),canvas=document.querySelector('canvas')!,box=canvas.getBoundingClientRect(),expected=duelScreenLayout(field.width,field.height);const screenReady=canvas.height===expected.height&&Math.abs(box.width-1280*expected.scale)<2&&Math.abs(box.height-expected.height*expected.scale)<2;geometry.textContent=JSON.stringify({viewport:[innerWidth,innerHeight],screenReady,phase:peer.state.status,money:p.money,stock:p.stock,heroStock:p.heroStock,towers:p.towers.length,egg:p.egg,board:p.board,slots,quote:p.quote,purchaseArea:scene.getPurchaseArea(),controls:[...scene.controls].map(([id,c])=>({id,...c,run:undefined}))});},150);
window.addEventListener('pagehide',()=>{clearInterval(geometryTimer);peer.dispose();panel.dispose();audioControls.dispose();sound.dispose();game.destroy(true);});
