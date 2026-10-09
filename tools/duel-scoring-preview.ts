import Phaser from 'phaser';
import {DuelScene,type DuelView} from '../src/multiplayer/scene';
import {advanceDuel,applyDuel,createDuel,joinDuel,duelScore,DUEL_PREPARATION_SECONDS,DUEL_SECONDS,DUEL_TOTAL_SECONDS,type DuelState,type DuelAction,type DuelEnemy,type Side} from '../src/multiplayer/duel';
import {duelPathDistance,duelPathPosition} from '../src/multiplayer/duel-maps';
import {numberText,recipe,learningValue} from '../src/math';
import '../src/game.css';

const $=(id:string)=>document.getElementById(id)!;
const baseTime=Date.now();
type Scenario='preparation'|'combat'|'timeout';
let side:Side=0,scenario:Scenario='preparation',ready=false,request=0;
function check(ok:boolean,description:string){if(!ok)throw Error(description);}
function act(s:DuelState,owner:Side,action:DuelAction,now=s.updatedAt){return applyDuel(s,owner,action,now,'scoring-preview-'+(++request));}
function connectedAdvance(s:DuelState,now:number){for(const p of s.players)if(p)p.lastSeen=now;advanceDuel(s,now);}
function towerQuestion(s:DuelState,owner:Side,typeId:string,mistakes:number){
 check(act(s,owner,{type:'prepare-quote',typeId}).ok,'타워 준비 문제가 열려야 합니다.');
 const q=s.players[owner]!.quote!;
 for(let i=0;i<mistakes;i++)check(!act(s,owner,{type:'answer',nonce:q.nonce,answer:'0'}).ok,'검증용 오답이 오답으로 처리되어야 합니다.');
 check(act(s,owner,{type:'answer',nonce:q.nonce,answer:numberText(q.before-q.cost)}).ok,'타워 준비 정답이 채점되어야 합니다.');
}
function fusionSlots(s:DuelState,owner:Side,correct:boolean){
 const board=s.players[owner]!.board;
 for(let a=0;a<16;a++)for(let b=0;b<16;b++)for(let c=0;c<16;c++)if(a!==b&&a!==c&&b!==c&&learningValue(board[a]+board[b])&&recipe(board[a],board[b],board[c],'+')===correct)return [a,b,c];
 throw Error('검증에 필요한 덧셈 조합이 없습니다.');
}
function heroQuestion(s:DuelState,owner:Side,mistakes:number){
 const p=s.players[owner]!;
 for(let i=0;i<mistakes;i++)check(!act(s,owner,{type:'fuse',round:p.round,slots:fusionSlots(s,owner,false),operation:'+'}).ok,'영웅 덧셈 오답이 오답으로 처리되어야 합니다.');
 check(act(s,owner,{type:'fuse',round:p.round,slots:fusionSlots(s,owner,true),operation:'+'}).ok,'영웅 덧셈 정답이 채점되어야 합니다.');
}
function enemy(s:DuelState,owner:Side,x:number,hp:number,stationary=false):DuelEnemy{
 const pathDistance=duelPathDistance(s.mapId,x,3),position=duelPathPosition(s.mapId,pathDistance);
 return {id:s.nextId++,owner,target:(1-owner) as Side,hero:null,level:1,hp,max:hp,x:position.x,y:position.y,pathDistance,slow:0,stun:stationary?3600:0,hits:0};
}
function buildScenario(kind:Scenario){
 const s=createDuel('score-preview-left','푸른 수호자',71,baseTime,1,{},'ember-bend');
 joinDuel(s,'score-preview-right','황금 수호자',baseTime,1);
 check(act(s,0,{type:'ready'}).ok&&act(s,1,{type:'ready'}).ok,'양쪽 준비가 시작되어야 합니다.');
 towerQuestion(s,0,'basic',1);towerQuestion(s,0,'basic',0);
 towerQuestion(s,1,'basic',0);towerQuestion(s,1,'double',2);
 check(duelScore(s.players[0])===150&&duelScore(s.players[1])===133,'준비 정답 점수는 150 : 133이어야 합니다.');
 if(kind==='preparation')return s;
 connectedAdvance(s,baseTime+DUEL_PREPARATION_SECONDS*1000);
 check(act(s,0,{type:'build',typeId:'basic',x:3,y:2}).ok,'왼쪽 비축 타워가 설치되어야 합니다.');
 check(act(s,1,{type:'build',typeId:'double',x:20,y:2}).ok,'오른쪽 비축 타워가 설치되어야 합니다.');
 heroQuestion(s,0,0);heroQuestion(s,1,1);
 // Isolate controlled enemies so the displayed points come only from the
 // host engine's real one-hit / two-hit defeats and legal question answers.
 s.wave=10000;s.enemies=[enemy(s,1,3,100),enemy(s,1,4,200),enemy(s,0,20,400)];
 connectedAdvance(s,s.startedAt+120000);
 check(s.status==='playing','검증용 중반 장면이 전투 중이어야 합니다.');
 check(s.players[0].combatScore===150&&s.players[1]!.combatScore===50,'실제 처치 점수는 150 : 50이어야 합니다.');
 check(duelScore(s.players[0])===400&&duelScore(s.players[1])===233,'총점은 400 : 233이어야 합니다.');
 s.enemies=[enemy(s,1,10,800,true),enemy(s,0,13,800,true)];
 if(kind==='timeout'){
  // Focus the final 50 ms boundary instead of replaying unchanged middle
  // frames. Scores, hits, answers and winner are never assigned by this fixture.
  s.elapsed=DUEL_SECONDS-.05;s.updatedAt=s.startedAt+(DUEL_SECONDS-.05)*1000;
  connectedAdvance(s,baseTime+DUEL_TOTAL_SECONDS*1000);
  check(s.status==='finished'&&s.winner===0&&s.elapsed===DUEL_SECONDS,'정확히 5분에 높은 점수의 왼쪽 플레이어가 승리해야 합니다.');
 }
 return s;
}
let state=buildScenario(scenario);
const scene=new DuelScene(():DuelView=>({state,side,room:'5분 점수 대전',selectedType:'',shopPage:0,slots:[],selectedTower:0,message:scenario==='timeout'?state.reason:'타격과 오답이 적을수록 더 높은 점수',busy:false,connected:true}));
function updateProof(){
 $('status').textContent=`${ready?'실제 대전 엔진으로 계산한 화면':'게임 이미지 로딩 중'} · ${side===0?'호스트':'참가자'} 시점 · ${scenario==='preparation'?'준비 1분 + 전투 4분 = 총 5분':scenario==='combat'?'검증용 몬스터를 실제 전투 엔진으로 처치하고 전투 2분 진행':'종료 경계 검증용 시계를 마지막 50ms로 건너뛴 뒤 실제 엔진으로 5분 종료'}`;
 $('proof').textContent=state.players.map(p=>`${p?.name} 총점 ${duelScore(p)} · 전투 ${p?.combatScore??0} (${p?.kills??0}마리 처치) · 문제 ${p?.questionScore??0} (${p?.answeredQuestions??0}문항 정답)`).join(' / ')+(state.reason?' · '+state.reason:'');
 $('proof').dataset.status=state.status;$('proof').dataset.winner=String(state.winner);
 document.querySelectorAll<HTMLButtonElement>('[data-scenario]').forEach(button=>{button.disabled=!ready;button.setAttribute('aria-pressed',String(button.dataset.scenario===scenario));});
 ($('swap-side') as HTMLButtonElement).disabled=!ready;$('swap-side').textContent=side===0?'참가자 시점':'호스트 시점';
}
scene.onControls=()=>{if(scene.ready&&!ready){ready=true;updateProof();}};
const game=new Phaser.Game({type:Phaser.AUTO,parent:'field',width:1280,height:800,scene:[scene],backgroundColor:'#111216',scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},render:{antialias:true},audio:{noAudio:true}});
function refresh(){state.revision++;scene.redraw();updateProof();game.scale.refresh();}
document.querySelectorAll<HTMLButtonElement>('[data-scenario]').forEach(button=>button.onclick=()=>{try{scenario=button.dataset.scenario as Scenario;state=buildScenario(scenario);refresh();}catch(e){$('errors').textContent=(e as Error).message;throw e;}});
$('swap-side').onclick=()=>{side=side===0?1:0;refresh();};
window.addEventListener('pagehide',()=>game.destroy(true));
updateProof();
