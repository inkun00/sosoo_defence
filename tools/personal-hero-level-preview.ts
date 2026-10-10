import Phaser from 'phaser';
import {DuelScene,type DuelView} from '../src/multiplayer/scene';
import {applyDuel,createDuel,duelHeroLearningLevel,joinDuel,type DuelState,type Side} from '../src/multiplayer/duel';
import {additionSlots} from '../src/multiplayer/computer-peer';
import {learningDescription} from '../src/multiplayer/decimal-boards';
import {numberText} from '../src/math';
import '../src/game.css';

const $=(id:string)=>document.getElementById(id)!;
let fixtureClock=Date.now(),nonce=0,side:Side=0,reversed=false,loaded=false,slots:number[]=[];
let state:DuelState;
let operation='계정 레벨이 달라도 각자의 덧셈 문제가 표시돼요.';
let equation='각자의 계정 레벨에 맞춘 덧셈 블럭을 확인하세요.';

function startFixture(){
 fixtureClock+=1000;
 state=createDuel('preview-host','호스트 수호자',7128,fixtureClock,reversed?8:1,{},'ember-bend');
 joinDuel(state,'preview-guest','참가자 수호자',fixtureClock,reversed?1:8);
 for(const owner of [0,1] as Side[]){
  const reply=applyDuel(state,owner,{type:'ready'},fixtureClock,'preview-ready-'+(++nonce));
  if(!reply.ok)throw Error(reply.message);
 }
 // Addition belongs to the three-minute preparation; this fixture starts there.
 if(state.status!=='preparing')throw Error('문제풀이 준비 단계가 시작되지 않았어요.');
 side=0;slots=[];
}
startFixture();

const scene=new DuelScene(():DuelView=>({state,side,room:'개인 레벨 확인',selectedType:'',shopPage:0,slots,selectedTower:0,message:operation,busy:false,connected:true}));

function updateProof(){
 const p=state.players[side]!;
 $('status').textContent=`${loaded?'실제 DuelScene 표시 완료':'실제 대전 이미지 로딩 중'} · ${side===0?'호스트':'참가자'} 계정 Lv.${p.accountLevel} → 내 학습 Lv.${duelHeroLearningLevel(p)} · 합성 회차 ${p.round} · 영웅 성장량 ${p.egg}`;
 $('equation').textContent=equation;
 $('proof').replaceChildren(...([0,1] as Side[]).map(owner=>{
  const player=state.players[owner]!,level=duelHeroLearningLevel(player),row=document.createElement('span');
  row.dataset.side=String(owner);row.dataset.accountLevel=String(player.accountLevel);row.dataset.learningLevel=String(level);row.dataset.round=String(player.round);row.dataset.egg=String(player.egg);
  row.textContent=`${owner===0?'호스트':'참가자'} · 계정 Lv.${player.accountLevel} / 학습 Lv.${level} · ${learningDescription(level)} · 회차 ${player.round} · 성장량 ${player.egg}\n블럭: ${player.board.map(n=>numberText(n)).join(' · ')}`;
  return row;
 }));
 for(const owner of [0,1] as Side[]){const button=$(`${owner===0?'host':'guest'}-view`) as HTMLButtonElement;button.textContent=`${owner===0?'호스트':'참가자'} Lv.${state.players[owner]!.accountLevel} 시점`;button.setAttribute('aria-pressed',String(side===owner));}
 ($('reverse-levels') as HTMLButtonElement).textContent=reversed?'호스트 Lv.1 · 참가자 Lv.8로 새 대전':'호스트 Lv.8 · 참가자 Lv.1로 새 대전';
 ($('correct-fuse') as HTMLButtonElement).disabled=!loaded||state.status!=='preparing';
 if(scene.ready)game.scale.refresh();
}
function refresh(){scene.redraw();updateProof();}
function fuse(selected:number[]){
 const p=state.players[side]!,other=state.players[(1-side) as Side]!;
 const beforeBoard=JSON.stringify(other.board),beforeRound=other.round,beforeEgg=other.egg;
 const [a,b,c]=selected.map(index=>p.board[index]);
 fixtureClock+=500;
 for(const player of state.players)if(player)player.lastSeen=fixtureClock;
 const reply=applyDuel(state,side,{type:'fuse',round:p.round,slots:selected,operation:'+'},fixtureClock,'preview-fuse-'+(++nonce));
 const unchanged=beforeBoard===JSON.stringify(other.board)&&beforeRound===other.round&&beforeEgg===other.egg;
 if(!unchanged)throw Error('한 플레이어의 합성이 상대 블럭이나 알을 변경했어요.');
 operation=reply.message;
 equation=`${side===0?'호스트':'참가자'} 학습 Lv.${duelHeroLearningLevel(p)}: ${numberText(a)} + ${numberText(b)} = ${numberText(c)} · ${reply.ok?'정답 처리 / 새 개인 레벨 블럭 생성':'다시 고르기'} · 상대 블럭·회차·알 유지 확인`;
 if(reply.ok)slots=[];
 refresh();
}
for(const owner of [0,1] as Side[])$(`${owner===0?'host':'guest'}-view`).onclick=()=>{side=owner;slots=[];operation='내 계정 레벨에 맞는 덧셈 블럭이에요.';refresh();};
$('correct-fuse').onclick=()=>{
 const solution=additionSlots(state.players[side]!.board);
 if(!solution)throw Error('현재 개인 레벨 블럭에 덧셈 정답이 없어요.');
 fuse(solution);
};
$('reverse-levels').onclick=()=>{reversed=!reversed;startFixture();operation='호스트와 참가자의 계정 레벨을 반대로 바꿨어요.';equation='호스트와 참가자 순서를 바꿔도 내 계정 레벨에 맞춘 덧셈이 표시돼요.';refresh();};
scene.onAction=key=>{
 if(key.startsWith('block:')){const index=Number(key.slice(6));if(!slots.includes(index)&&slots.length<3)slots.push(index);refresh();}
 else if(key.startsWith('slot:')){slots.splice(Number(key.slice(5)),1);refresh();}
 else if(key==='fuse'&&slots.length===3)fuse([...slots]);
};
window.addEventListener('error',event=>{$('errors').textContent+=`${event.message}\n`;});
window.addEventListener('unhandledrejection',event=>{$('errors').textContent+=`${String(event.reason)}\n`;});
const game=new Phaser.Game({type:Phaser.CANVAS,parent:'field',width:1280,height:800,scene:[scene],backgroundColor:'#111216',scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},audio:{noAudio:true}});
const poll=window.setInterval(()=>{
 if(!scene.ready)return;
 if(!loaded){loaded=true;document.querySelectorAll<HTMLButtonElement>('.preview-controls button').forEach(button=>button.disabled=false);}
 updateProof();
},250);
window.addEventListener('pagehide',()=>window.clearInterval(poll),{once:true});
updateProof();
