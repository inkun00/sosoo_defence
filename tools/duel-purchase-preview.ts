import Phaser from 'phaser';
import {DuelScene,DuelView} from '../src/multiplayer/scene';
import {DuelAction,validDuelCell,DUEL_PREPARATION_SECONDS} from '../src/multiplayer/duel';
import {ComputerPeer} from '../src/multiplayer/computer-peer';
import {DUEL_MAPS,DEFAULT_DUEL_MAP_ID,isDuelMapId} from '../src/multiplayer/duel-maps';
import {mountPurchasePanel} from '../src/multiplayer/purchase-panel';
import {numberText} from '../src/math';
import '../src/game.css';
const requested=new URL(location.href).searchParams.get('map'),mapId=isDuelMapId(requested)?requested:DEFAULT_DUEL_MAP_ID;
const mapChoice=document.getElementById('preview-map') as HTMLSelectElement;
for(const map of DUEL_MAPS){const option=document.createElement('option');option.value=map.id;option.textContent=map.name;mapChoice.append(option);}mapChoice.value=mapId;
mapChoice.onchange=()=>{const url=new URL(location.href);url.searchParams.set('map',mapChoice.value);location.assign(url.href);};
const peer=new ComputerPeer({uid:'preparation-ui',name:'준비 검증'},4,{seed:71,mapId});
let selectedType='',selectedTower=0,shopPage=0,busy=false,message='',slots:number[]=[];
const view=():DuelView=>({state:peer.state,side:0,room:'준비 검증',selectedType,selectedTower,shopPage,slots,message,busy,connected:true,computer:peer.opponent});
const scene=new DuelScene(view);
const game=new Phaser.Game({type:Phaser.AUTO,parent:'field',width:1280,height:800,scene:[scene],backgroundColor:'#111216',scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},audio:{noAudio:true}});
const panel=mountPurchasePanel(document.getElementById('field')!,send);
function refresh(){const s=peer.state,p=s.players[0],opponent=s.players[1]!;panel.sync(s.status==='preparing'?p.quote:null,busy);scene.redraw();document.getElementById('proof')!.textContent=`${s.status} · 준비 ${Math.ceil(Math.max(0,DUEL_PREPARATION_SECONDS-s.preparationElapsed))}초 · 전투 ${s.elapsed.toFixed(1)}초 · 코인 ${numberText(p.money)} · 비축 ${Object.values(p.stock).reduce((a,b)=>a+b,0)} · 설치 ${p.towers.length} · 상대 비축 ${Object.values(opponent.stock).reduce((a,b)=>a+b,0)} · 상대 설치 ${opponent.towers.length} · 몬스터 ${s.enemies.length}`;}
async function send(action:DuelAction){busy=true;refresh();try{const reply=await peer.send(action);message=reply.message;if(reply.ok&&action.type==='fuse')slots=[];panel.feedback(message);return reply;}finally{busy=false;refresh();}}
scene.onAction=key=>{
 if(key.startsWith('type:')){if(peer.state.players[0].quote){message='비축 문제를 풀거나 취소해 주세요.';refresh();return;}selectedType=key.slice(5);selectedTower=0;if(peer.state.status==='preparing')void send({type:'prepare-quote',typeId:selectedType});else refresh();return;}
 if(key.startsWith('block:')){const i=Number(key.slice(6));if(!slots.includes(i)&&slots.length<3)slots.push(i);refresh();return;}
 if(key.startsWith('slot:')){slots.splice(Number(key.slice(5)),1);refresh();return;}
 if(key==='page:next'||key==='page:prev'){shopPage=key==='page:next'?1:0;refresh();return;}
 if(key==='ready')void send({type:'ready'});
 if(key==='fuse')void send({type:'fuse',round:peer.state.players[0].round,slots:[...slots],operation:'+'});
 if(key==='sell')void send({type:'sell',towerId:selectedTower});
};
scene.onCell=(x,y)=>{const s=peer.state,p=s.players[0];if(s.status!=='playing')return;const tower=p.towers.find(t=>t.x===x&&t.y===y);if(tower){selectedTower=tower.id;selectedType='';refresh();return;}if(selectedType&&validDuelCell(s,0,x,y))void send({type:'build',typeId:selectedType,x,y});};
let signature='';scene.onControls=()=>{const next=JSON.stringify([...scene.controls].map(([key,c])=>[key,c.label,c.enabled]));if(next===signature)return;signature=next;const controls=document.getElementById('preview-controls')!;controls.replaceChildren();for(const [key,c]of scene.controls){const button=document.createElement('button');button.textContent=c.label;button.dataset.duelAction=key;button.disabled=!c.enabled;button.onclick=c.run;controls.append(button);}};
peer.onState=refresh;
game.events.once('ready',()=>game.scale.refresh());
window.addEventListener('pagehide',()=>{peer.dispose();panel.dispose();game.destroy(true);});
