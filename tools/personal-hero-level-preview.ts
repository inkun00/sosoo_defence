import Phaser from 'phaser';
import {DuelScene,type DuelView} from '../src/multiplayer/scene';
import {applyDuel,createDuel,duelHeroLearningLevel,joinDuel,type DuelState,type Side} from '../src/multiplayer/duel';
import {additionSlots} from '../src/multiplayer/computer-peer';
import {learningDescription} from '../src/multiplayer/decimal-boards';
import {numberText} from '../src/math';
import {observeGameScreen,duelScreenLayout} from '../src/responsive-game';
import '../src/game.css';

const $=(id:string)=>document.getElementById(id)!;
let fixtureClock=Date.now(),nonce=0,side:Side=0,reversed=false,loaded=false,slots:number[]=[];
let state:DuelState;
let operation='계정 레벨과 관계없이 두 사람 모두 문제 1단계에서 시작해요.';
let equation='이번 대전의 내 덧셈 정답 5개마다 다음 문제 단계로 올라가요.';

function startFixture(){
 fixtureClock+=1000;
 state=createDuel('preview-host','호스트 수호자',7128,fixtureClock,reversed?8:1,{},'ember-bend');
 joinDuel(state,'preview-guest','참가자 수호자',fixtureClock,reversed?1:8);
 for(const owner of [0,1] as Side[]){
  const reply=applyDuel(state,owner,{type:'ready'},fixtureClock,'preview-ready-'+(++nonce));
  if(!reply.ok)throw Error(reply.message);
 }
 if(state.status!=='preparing')throw Error('3분 문제풀이 준비 단계가 시작되지 않았어요.');
 side=0;slots=[];
}
startFixture();
const view=():DuelView=>({state,side,room:'개인 문제 단계 확인',selectedType:'',shopPage:0,slots,selectedTower:0,message:operation,busy:false,connected:true});
const scene=new DuelScene(view);
const field=$('field'),initialBox=field.getBoundingClientRect(),initialLayout=duelScreenLayout(initialBox.width,initialBox.height);scene.setScreenLayout(initialLayout);
const game=new Phaser.Game({type:Phaser.CANVAS,parent:'field',width:1280,height:initialLayout.height,scene:[scene],backgroundColor:'#111216',scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},audio:{noAudio:true}});
observeGameScreen(game,field,layout=>{scene.setScreenLayout(layout);scene.redraw();},duelScreenLayout);

function progress(owner:Side){
 const p=state.players[owner]!,stage=duelHeroLearningLevel(p);
 return `문제 ${stage}단계 · ${learningDescription(stage)} · 내 덧셈 정답 ${p.solved}개 · ${stage<4?`다음 단계까지 정답 ${5-p.solved%5}개`:'최고 단계 유지'}`;
}
function updateProof(){
 const p=state.players[side]!;
 $('status').textContent=`${loaded?'실제 DuelScene 표시 완료':'실제 대전 이미지 로딩 중'} · ${side===0?'호스트':'참가자'} 계정 Lv.${p.accountLevel} · ${progress(side)} · 영웅 성장량 ${p.egg}`;
 $('equation').textContent=equation;
 $('proof').replaceChildren(...([0,1] as Side[]).map(owner=>{
  const player=state.players[owner]!,stage=duelHeroLearningLevel(player),row=document.createElement('span');
  row.dataset.side=String(owner);row.dataset.accountLevel=String(player.accountLevel);row.dataset.stage=String(stage);row.dataset.solved=String(player.solved);row.dataset.round=String(player.round);row.dataset.egg=String(player.egg);row.dataset.wrong=String(player.wrongQuestions.length);
  row.textContent=`${owner===0?'호스트':'참가자'} · 계정 Lv.${player.accountLevel} / ${progress(owner)} · 성장량 ${player.egg} · 오답 기록 ${player.wrongQuestions.length}개\n블럭: ${player.board.map(n=>numberText(n)).join(' · ')}`;
  return row;
 }));
 for(const owner of [0,1] as Side[]){const button=$(`${owner===0?'host':'guest'}-view`) as HTMLButtonElement;button.textContent=`${owner===0?'호스트':'참가자'} 계정 Lv.${state.players[owner]!.accountLevel} 시점`;button.setAttribute('aria-pressed',String(side===owner));}
 ($('reverse-levels') as HTMLButtonElement).textContent=reversed?'호스트 Lv.1 · 참가자 Lv.8로 새 대전':'호스트 Lv.8 · 참가자 Lv.1로 새 대전';
 for(const id of ['correct-fuse','wrong-fuse','next-stage'])($(`${id}`) as HTMLButtonElement).disabled=!loaded||state.status!=='preparing'||id==='next-stage'&&duelHeroLearningLevel(p)===4;
 $('next-stage').textContent=duelHeroLearningLevel(p)<4?`정답을 풀어 ${duelHeroLearningLevel(p)+1}단계까지`:'최고 단계 도달';
 if(scene.ready)game.scale.refresh();
}
function refresh(){scene.redraw();updateProof();}
function fuse(selected:number[]){
 const p=state.players[side]!,other=state.players[(1-side) as Side]!;
 const beforeOther=JSON.stringify({board:other.board,round:other.round,egg:other.egg,solved:other.solved});
 const [a,b,c]=selected.map(index=>p.board[index]);
 slots=[...selected];fixtureClock+=500;
 for(const player of state.players)if(player)player.lastSeen=fixtureClock;
 const reply=applyDuel(state,side,{type:'fuse',round:p.round,slots:selected,operation:'+'},fixtureClock,'preview-fuse-'+(++nonce));
 if(beforeOther!==JSON.stringify({board:other.board,round:other.round,egg:other.egg,solved:other.solved}))throw Error('한 플레이어의 정답이 상대의 문제나 개인 진도를 변경했어요.');
 operation=reply.message;
 equation=`${side===0?'호스트':'참가자'}: ${numberText(a)} + ${numberText(b)} = ${numberText(c)} · ${reply.ok?'정답 처리 / 내 진도로 새 블럭 생성':'오답 / 현재 단계·정답 수·블럭 유지'} · 상대 문제와 진도 유지 확인`;
 if(reply.ok)slots=[];
 refresh();return reply;
}
function solveCorrect(){
 const solution=additionSlots(state.players[side]!.board);
 if(!solution)throw Error('현재 문제 단계 블럭에 덧셈 정답이 없어요.');
 const reply=fuse(solution);if(!reply.ok)throw Error(reply.message);return reply;
}
function solveWrong(){
 const board=state.players[side]!.board;
 for(let a=0;a<16;a++)for(let b=0;b<16;b++)for(let c=0;c<16;c++)if(a!==b&&a!==c&&b!==c&&board[a]+board[b]!==board[c])return fuse([a,b,c]);
 throw Error('오답 확인에 사용할 세 블럭을 찾지 못했어요.');
}
function nextStage(){
 const p=state.players[side]!,stage=duelHeroLearningLevel(p);if(stage===4)return;
 const target=stage*5;while(p.solved<target)solveCorrect();
}
function reset(reverse=false){
 if(reverse)reversed=!reversed;startFixture();operation='새 대전: 두 사람의 덧셈 정답 수와 영웅 성장량을 0으로 초기화했어요.';equation='계정 레벨이 달라도 두 사람은 같은 문제 1단계에서 다시 시작해요.';refresh();
}
for(const owner of [0,1] as Side[])$(`${owner===0?'host':'guest'}-view`).onclick=()=>{side=owner;slots=[];operation='이번 대전에서 내가 맞힌 정답 수에 맞춘 문제예요.';refresh();};
$('correct-fuse').onclick=solveCorrect;$('wrong-fuse').onclick=solveWrong;$('next-stage').onclick=nextStage;
$('new-match').onclick=()=>reset();$('reverse-levels').onclick=()=>reset(true);
scene.onAction=key=>{
 if(key.startsWith('block:')){const index=Number(key.slice(6));if(!slots.includes(index)&&slots.length<3)slots.push(index);refresh();}
 else if(key.startsWith('slot:')){slots.splice(Number(key.slice(5)),1);refresh();}
 else if(key==='blocks:page'){scene.cycleBlockPage();refresh();}
 else if(key==='fuse'&&slots.length===3)fuse([...slots]);
};
for(const type of ['mousedown','touchstart','pointerdown'])document.querySelector('.preview-controls')!.addEventListener(type,event=>event.stopPropagation());
window.addEventListener('error',event=>{$('errors').textContent+=`${event.message}\n`;});
window.addEventListener('unhandledrejection',event=>{$('errors').textContent+=`${String(event.reason)}\n`;});
Object.assign(window,{__personalHeroLevelTest:{scene,view,duelHeroLearningLevel,get state(){return state;},get loaded(){return loaded;},select(owner:Side){side=owner;slots=[];refresh();},solveCorrect,solveWrong,nextStage,reset,refresh}});
const poll=window.setInterval(()=>{
 if(!scene.ready)return;
 if(!loaded){loaded=true;document.querySelectorAll<HTMLButtonElement>('.preview-controls button').forEach(button=>button.disabled=false);}
 updateProof();
},250);
window.addEventListener('pagehide',()=>{window.clearInterval(poll);game.destroy(true);},{once:true});
updateProof();
