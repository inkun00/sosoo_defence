import Phaser from 'phaser';
import {DuelScene,DuelView} from '../src/multiplayer/scene';
import {createDuel,joinDuel,applyDuel,advanceDuel,DuelAction} from '../src/multiplayer/duel';
import {mountPurchasePanel} from '../src/multiplayer/purchase-panel';
import '../src/game.css';
const start=Date.now(),state=createDuel('left','왼쪽 검증',71,start);
joinDuel(state,'right','오른쪽 검증',start);
applyDuel(state,0,{type:'ready'},start,'r0');applyDuel(state,1,{type:'ready'},start,'r1');
let serial=0,busy=false;
const view=():DuelView=>({state,side:0,room:'UI TEST',selectedType:'basic',shopPage:0,slots:[],operation:'+',selectedTower:0,message:'구매 계산 중에도 전투와 시간이 계속 진행돼요.',busy,connected:true});
const scene=new DuelScene(view);
new Phaser.Game({type:Phaser.AUTO,parent:'field',width:1280,height:800,scene:[scene],backgroundColor:'#111216',scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},audio:{noAudio:true}});
const panel=mountPurchasePanel(document.getElementById('field')!,send);
function refresh(){panel.sync(state.status==='finished'?null:state.players[0].quote,busy);scene.redraw();document.getElementById('proof')!.textContent=`진행 ${state.elapsed.toFixed(1)}초 · 몬스터 ${state.enemies.length} · 설치 ${state.players[0].towers.length}`;}
function send(action:DuelAction){busy=true;refresh();const reply=applyDuel(state,0,action,Date.now(),'request-'+serial++);busy=false;refresh();panel.feedback(reply.message);}
function quote(){send({type:'quote',typeId:'basic',x:2+state.players[0].towers.length,y:2});}
document.getElementById('new-quote')!.onclick=quote;
setInterval(()=>{for(const p of state.players)if(p)p.lastSeen=Date.now();advanceDuel(state,Date.now());refresh();},100);
