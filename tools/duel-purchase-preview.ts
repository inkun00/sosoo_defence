import Phaser from 'phaser';
import {DuelScene,DuelView} from '../src/multiplayer/scene';
import {createDuel,joinDuel,applyDuel,advanceDuel,DuelAction,validDuelCell} from '../src/multiplayer/duel';
import {DUEL_MAPS,DEFAULT_DUEL_MAP_ID,isDuelMapId} from '../src/multiplayer/duel-maps';
import {mountPurchasePanel} from '../src/multiplayer/purchase-panel';
import '../src/game.css';
const requested=new URL(location.href).searchParams.get('map'),mapId=isDuelMapId(requested)?requested:DEFAULT_DUEL_MAP_ID;
const mapChoice=document.getElementById('preview-map') as HTMLSelectElement;
for(const map of DUEL_MAPS){const option=document.createElement('option');option.value=map.id;option.textContent=map.name;mapChoice.append(option);}mapChoice.value=mapId;
mapChoice.onchange=()=>{const url=new URL(location.href);url.searchParams.set('map',mapChoice.value);location.assign(url.href);};
const start=Date.now(),state=createDuel('left','왼쪽 검증',71,start,1,{},mapId);
joinDuel(state,'right','오른쪽 검증',start);
applyDuel(state,0,{type:'ready'},start,'r0');applyDuel(state,1,{type:'ready'},start,'r1');
let serial=0,busy=false;
const view=():DuelView=>({state,side:0,room:'UI TEST',selectedType:'basic',shopPage:0,slots:[],selectedTower:0,message:'구매 계산 중에도 전투와 시간이 계속 진행돼요.',busy,connected:true});
const scene=new DuelScene(view);
new Phaser.Game({type:Phaser.AUTO,parent:'field',width:1280,height:800,scene:[scene],backgroundColor:'#111216',scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},audio:{noAudio:true}});
const panel=mountPurchasePanel(document.getElementById('field')!,send);
function refresh(){panel.sync(state.status==='finished'?null:state.players[0].quote,busy);scene.redraw();document.getElementById('proof')!.textContent=`진행 ${state.elapsed.toFixed(1)}초 · 몬스터 ${state.enemies.length} · 설치 ${state.players[0].towers.length}`;}
function send(action:DuelAction){busy=true;refresh();const reply=applyDuel(state,0,action,Date.now(),'request-'+serial++);busy=false;refresh();panel.feedback(reply.message);}
function quote(){const cell=[2,4,1,5,0,6,3].flatMap(y=>[2,5,8,10,1,3,4,6,7,9].map(x=>({x,y}))).find(c=>validDuelCell(state,0,c.x,c.y));if(cell)send({type:'quote',typeId:'basic',...cell});}
document.getElementById('new-quote')!.onclick=quote;
setInterval(()=>{for(const p of state.players)if(p)p.lastSeen=Date.now();advanceDuel(state,Date.now());refresh();},100);
