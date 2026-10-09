import {mountPurchasePanel} from './purchase-panel';
import {duelScreenLayout,observeGameScreen} from '../responsive-game';
import {artURL} from '../art';
import Phaser from 'phaser';
import {onAuthStateChanged,User} from 'firebase/auth';
import {auth,firebaseEmulator} from './firebase';
import {mountAccountForm} from '../account-form';
import {DuelScene,DuelView} from './scene';
import {DuelState,DuelAction,Side,validDuelCell,canPurchaseDuelTower,DUEL_SECONDS,DUEL_TOTAL_SECONDS,DUEL_PREPARATION_SECONDS,duelScore,duelHeroLearningLevel,DUEL_KILL_BASE_SCORE,DUEL_KILL_EFFICIENCY_SCORE,DUEL_QUESTION_BASE_SCORE} from './duel';
import {HostPeer} from './peer';
import {loadPeerConfiguration} from './relay-store';
import {mountGameAudioControls} from '../game-audio-controls';
import {ComputerPeer} from './computer-peer';
import {DEFAULT_DUEL_MAP_ID,duelMap,isDuelMapId} from './duel-maps';
import {duelMapSummaryHTML,duelMapPickerHTML} from './map-picker';
import {COMPUTER_OPPONENTS,loadComputerProgress,recordComputerResult} from './computer-opponents';
import {learningDescription} from './decimal-boards';
import {ListedRoom} from './rooms';
import {listRooms,roomRequest} from './room-store';
import {Progress,WrongQuestion,emptyProgress,finishedRecord,matchExperience} from './records';
import {loadProgress,loadHistory,loadLearningHistory,queueResult,flushResults,pendingCount} from './record-store';
import {loadDuelLeaderboard} from './leaderboard-store';
import {leaderboardHTML} from './leaderboard-ui';
import {HEROES,heroesAtLevel} from './heroes';
import {numberText,precision} from '../math';
import {towerType} from '../towers';
import {Sound} from '../audio';
import {loadSave,writeSave} from '../save';
import {hitEquationsEnabled,setHitEquationsEnabled} from '../combat-preferences';
import {recordLearning,importLearningRecords,LearningSample} from '../learning';
import {loadWorkbook,ownedHeroIds,selectedWorksheetHero,selectWorksheetHero} from '../worksheet-store';
import {collectionHTML} from '../collection-ui';
import '../collection-styles';
import '../game.css';
import './multiplayer.css';
import './duel-theme.css';
import './computer-opponents.css';
import './map-picker.css';
const app=document.getElementById('app')!;
app.innerHTML=`<div class="duel-world" aria-hidden="true"><div class="duel-world-art"></div><div class="duel-world-shade"></div><div class="duel-world-glow"></div><div class="duel-world-embers"></div></div><header class="duel-hall-header"><a href="/?mode=title" aria-label="소수 디펜스 시작 화면으로"><img class="duel-hall-logo" src="${artURL('title-wordmark-v1')}" alt="" width="1200" height="297" decoding="async"></a></header><main id="game-shell"><div id="field"></div></main><div id="duel-controls" class="sr-only"></div><p id="duel-state" class="sr-only"></p><p id="duel-notice" class="sr-only" role="status" aria-live="polite"></p><div id="duel-dialog" class="modal hidden" role="dialog" aria-modal="true"><div class="duel-card"><div id="duel-content"></div></div></div>`;
const dialog=document.getElementById('duel-dialog')!,content=document.getElementById('duel-content')!,notice=document.getElementById('duel-notice')!;
let user:User|null=null,state:DuelState|null=null,side:Side=0,room='',selectedType='',shopPage=0,slots:number[]=[],selectedTower=0,message='',busy=false,connected=true,dialogKind='',lastRound=-1;
let peer:HostPeer|ComputerPeer|null=null,offerCode='',answerCode='',progress:Progress=emptyProgress(),recorded='',saveMessage='',progressLoading=false;
let listingId='',listingClaim='',listingExpires=0,listingClosing=false,listingRetryAt=0,roomPoll:ReturnType<typeof setTimeout>|undefined;
let roomRows:ListedRoom[]=[],roomRowsSignature='',serverOffset=0,roomListLoaded=false,loadingRoomList=false;
let audioStatus='',audioFlame=9000;
function loadDuelMap(){try{const id=localStorage.getItem('sosoo-duel-map');return isDuelMapId(id)?id:DEFAULT_DUEL_MAP_ID;}catch{return DEFAULT_DUEL_MAP_ID;}}
let selectedMapId=loadDuelMap();
const sound=new Sound();sound.sfx=loadSave().sfx;sound.setMusic(loadSave().music);
const gameAudioControls=mountGameAudioControls(document.getElementById('game-shell')!,{
 getState:()=>({sfx:sound.sfx,music:sound.music}),
 change:(kind,enabled)=>{
  sound.resume();if(kind==='sfx')sound.sfx=enabled;else sound.setMusic(enabled);
  const preferences=loadSave();preferences[kind]=enabled;
  if(!writeSave(preferences))status('이 브라우저에서는 소리 설정을 저장할 수 없어요.');
  sound.play('ui');
 },
});
document.addEventListener('click',e=>{if((e.target as HTMLElement).closest('button'))sound.play('ui');});
const view=():DuelView=>({state,side,room,selectedType,shopPage,slots,selectedTower,message,busy,connected,computer:peer instanceof ComputerPeer?peer.opponent:undefined});
const scene=new DuelScene(view);
scene.onSound=(type,towerTypeId)=>sound.play(type,towerTypeId);
const field=document.getElementById('field')!,fieldBox=field.getBoundingClientRect(),initialLayout=duelScreenLayout(fieldBox.width,fieldBox.height);scene.setScreenLayout(initialLayout);
const game=new Phaser.Game({type:Phaser.AUTO,parent:'field',width:1280,height:initialLayout.height,scene:[scene],backgroundColor:'#111216',scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},render:{antialias:true},audio:{noAudio:true}});
game.events.once('ready',()=>{game.canvas.setAttribute('aria-label','소수 디펜스 1:1: 전체 남은 시간, 양쪽 점수와 불꽃, 타워, 소수 블럭과 영웅 알');game.canvas.tabIndex=0;});
const purchasePanel=mountPurchasePanel(field,action=>send(action));purchasePanel.setScreenLayout(initialLayout,scene.getPurchaseArea());
observeGameScreen(game,field,layout=>{scene.setScreenLayout(layout);shopPage=Math.min(shopPage,scene.shopPageCount-1);purchasePanel.setScreenLayout(layout,scene.getPurchaseArea());},duelScreenLayout);
let messageTimer:ReturnType<typeof setTimeout>|undefined;
function status(text:string){message=text;notice.textContent=text;purchasePanel.feedback(text);const e=content.querySelector<HTMLElement>('[data-feedback]');if(e)e.textContent=text;clearTimeout(messageTimer);messageTimer=setTimeout(()=>{message='';refresh();},5000);refresh();}
function refresh(){purchasePanel.sync(state?.status==='preparing'?state.players[side]?.quote:null,busy,dialog.classList.contains('hidden'));const status=state?room+state.status:'';if(status!==audioStatus){audioStatus=status;if(state?.status==='playing')sound.play('start');else if(state?.status==='finished')sound.play(state.winner===side?'victory':'defeat');}const flame=state?.players[side]?.flame??9000;if(flame<audioFlame)sound.play('leak');audioFlame=flame;sound.setTrack(state?.status==='playing'?(state.elapsed>=DUEL_SECONDS-60?'boss':'battle'):state?.status==='finished'?(state.winner===side?'victory':'defeat'):'title');if(state&&sound.sfx)void sound.preloadTowerShots([...new Set(state.players.flatMap(player=>player?.towers.map(t=>t.typeId)??[]))]);scene.redraw();}
function show(kind:string,html:string){dialogKind=kind;dialog.dataset.screen=kind;content.innerHTML=html;const heading=content.querySelector('h2');if(heading){heading.id||='duel-dialog-title';dialog.setAttribute('aria-labelledby',heading.id);}app.dataset.duelView=!state||['auth','lobby','computer-levels','map-select','create-room','room-password','connection','profile','history','leaderboard'].includes(kind)?'hall':'battle';dialog.classList.remove('hidden');if(scene.input)scene.input.enabled=false;refresh();}
function close(){dialogKind='';app.dataset.duelView='battle';dialog.classList.add('hidden');if(scene.input)scene.input.enabled=true;refresh();}
function errorText(e:unknown){const code=(e as {code?:string})?.code||'';const labels:Record<string,string>={'auth/email-already-in-use':'이미 가입한 이메일이에요. 로그인해 주세요.','auth/invalid-credential':'이메일 또는 비밀번호를 확인해 주세요.','auth/weak-password':'비밀번호는 6글자 이상 적어 주세요.','auth/invalid-email':'이메일 주소를 확인해 주세요.','auth/too-many-requests':'잠시 기다렸다가 다시 로그인해 주세요.','auth/network-request-failed':'인터넷 연결을 확인해 주세요.','functions/unauthenticated':'다시 로그인해 주세요.','functions/resource-exhausted':'잠시 뒤 다시 눌러 주세요.'};return labels[code]||(e as Error)?.message||'연결을 확인하고 다시 시도해 주세요.';}
async function send(action:DuelAction){
 if(!user||auth?.currentUser?.uid!==user.uid||busy||!peer)return;const local=peer,p=state?.players[side],q=p?.quote;let sample:LearningSample|undefined,evidence='';
 if(action.type==='answer'&&q&&q.nonce===action.nonce){sample={a:q.before,b:q.cost,operation:'-',digits:q.digits,context:'money'};evidence=q.nonce;}
 if(action.type==='fuse'&&p&&action.round===p.round&&action.slots.length===3&&new Set(action.slots).size===3){const [a,b]=action.slots.map(i=>p.board[i]);sample={a,b,operation:action.operation,context:'wall'};evidence=`fusion-${p.round}-${action.operation}-${a}-${b}`;}
 busy=true;refresh();try{const r=await local.send(action);if(peer!==local||auth?.currentUser?.uid!==local.identity.uid)return;if(r.ok&&sample)recordLearning(sample,'correct',local.id+':'+local.identity.uid+':'+evidence);const s=local.state,owner=s?.players[local.side];if(s&&owner)importLearningRecords([{matchId:local.id,hostUid:s.players[0].uid,guestUid:s.players[1]?.uid??'',side:local.side,wrongQuestions:owner.wrongQuestions}]);if(r.message)status(r.message);if(r.ok&&action.type==='fuse'){slots=[];sound.play('wall');}if(r.ok&&action.type==='answer')sound.play('money');return r;}catch(e){connected=false;status(errorText(e));}finally{busy=false;refresh();}
}
function back(){const url=new URL(location.href);url.searchParams.set('mode','adventure');url.searchParams.delete('emulator');location.assign(url.href);}
function bind(id:string,fn:()=>unknown){document.getElementById(id)?.addEventListener('click',fn);}
function settings(fromLobby=false,fromComputer=false){
 show('settings',`<h2>게임 설정</h2><label class="setting"><span>몬스터 피격 뺄셈식 <small id="setting-equations-state">${hitEquationsEnabled()?'ON':'OFF'}</small></span><input id="setting-hit-equations" type="checkbox" role="switch" ${hitEquationsEnabled()?'checked':''}></label><p>설정은 같은 브라우저에 저장돼요. 대전은 설정을 열어도 계속 진행돼요.</p><p class="duel-warning">총 5분: 문제풀이 1분 + 전투 4분. 시간 종료 시 총점이 높은 쪽이 승리하고, 동점이면 무승부예요. 몬스터 처치마다 기본 ${DUEL_KILL_BASE_SCORE}점에 ${DUEL_KILL_EFFICIENCY_SCORE} ÷ 타격 수의 소수점 이하를 버린 보너스를 더해요. 문제 정답마다 ${DUEL_QUESTION_BASE_SCORE} ÷ (오답 횟수 + 1)의 소수점 이하를 버린 점수를 얻어요. 적은 타격과 적은 오답일수록 점수가 높아요.</p><button class="duel-primary" id="settings-back">${fromLobby?'대기실로':'대전으로'}</button>`);
 document.getElementById('setting-hit-equations')!.onchange=()=>{const enabled=(document.getElementById('setting-hit-equations') as HTMLInputElement).checked;setHitEquationsEnabled(enabled);document.getElementById('setting-equations-state')!.textContent=enabled?'ON':'OFF';};
 bind('settings-back',()=>fromComputer?computerScreen():fromLobby?lobby():close());
}
function authScreen(mode:'login'|'register'='login'){
 show('auth','');mountAccountForm(content,'duel',value=>void accountChanged(value),mode);dialog.setAttribute('aria-labelledby','account-heading');
}
function disposeRoom(){clearTimeout(roomPoll);roomPoll=undefined;const id=listingId,claim=listingClaim,hosting=peer?.side===0;if(id)void roomRequest({action:hosting?'close':'release',id,claim}).catch(()=>{});listingId='';listingClaim='';listingExpires=0;listingClosing=false;listingRetryAt=0;peer?.dispose();peer=null;state=null;room='';offerCode='';answerCode='';recorded='';lastRound=-1;}
function profileText(){return `${user?.displayName||'수호자'} · 계정 Lv.${progress.level} · ${progress.wins}승 ${progress.losses}패 · 경험치 ${progress.experience}${firebaseEmulator?' · 테스트 계정':''}`;}
function mapScreen(backTo:()=>void){
 show('map-select',duelMapPickerHTML(selectedMapId));
 content.querySelectorAll<HTMLButtonElement>('[data-duel-map]').forEach(button=>button.onclick=()=>{
  const id=button.dataset.duelMap;if(!isDuelMapId(id))return;selectedMapId=id;try{localStorage.setItem('sosoo-duel-map',id);}catch{}
  content.querySelectorAll<HTMLButtonElement>('[data-duel-map]').forEach(card=>{const selected=card.dataset.duelMap===id;card.classList.toggle('selected',selected);card.setAttribute('aria-pressed',String(selected));card.querySelector('em')!.textContent=selected?'선택됨':'선택하기';});
 });
 bind('map-selection-done',backTo);
}
function computerScreen(){
 if(!user||auth?.currentUser?.uid!==user.uid){disposeRoom();authScreen();return;}
 if(peer instanceof HostPeer&&state&&(state.status==='preparing'||state.status==='playing')){status('온라인 대전을 마친 뒤 컴퓨터와 대결할 수 있어요.');return;}
 const saved=loadComputerProgress(),current=peer instanceof ComputerPeer&&state?.status!=='finished';
 show('computer-levels',`<p class="eyebrow">컴퓨터와 대결 · 수호자 연습</p><h2>겨룰 상대를 선택하세요</h2><p class="duel-intro">상대 레벨이 높을수록 계산과 전략이 어려워져요. 두 사람에게 같은 코인과 규칙이 적용돼요.</p>${duelMapSummaryHTML(selectedMapId)}<div class="computer-opponent-grid">${COMPUTER_OPPONENTS.map(o=>`<button class="computer-opponent-card" data-computer-level="${o.level}"><span class="computer-opponent-portrait" style="background-image:url('${artURL('cpu-opponent-'+o.level+'-v1')}')" aria-hidden="true"></span><span class="computer-opponent-level">Lv.${o.level} · ${saved.wins[o.level-1]?'승리 '+saved.wins[o.level-1]+'회':'도전하기'}</span><strong>${o.name}</strong><span class="computer-opponent-title">${o.title}</span><small>${o.description}</small></button>`).join('')}</div><p class="computer-progress-note">컴퓨터 대전 결과는 이 브라우저에만 저장돼요. 온라인 계정의 승패와 경험치에는 포함되지 않아요.${current?' 새 상대를 고르면 현재 연습 대전은 끝나요.':''}</p><p data-feedback role="status"></p><div class="duel-row">${current?'<button class="duel-primary" id="computer-continue">현재 대전 계속하기</button>':''}<button id="computer-back">온라인 대기실</button><button id="computer-settings">게임 설정</button></div>`);
 bind('choose-duel-map',()=>mapScreen(computerScreen));
 content.querySelectorAll<HTMLButtonElement>('[data-computer-level]').forEach(button=>button.onclick=()=>startComputer(Number(button.dataset.computerLevel)));
 bind('computer-continue',close);bind('computer-back',async()=>{if(current&&state&&(state.status==='preparing'||state.status==='playing')){await send({type:'surrender'});await saveFinished();}disposeRoom();lobby();});bind('computer-settings',()=>settings(true,true));
}
function startComputer(level:number,mapId=selectedMapId){
 if(!user||auth?.currentUser?.uid!==user.uid){disposeRoom();authScreen();return;}
 if(progressLoading){status('계정 레벨을 불러오는 중이에요. 잠시 뒤 다시 눌러 주세요.');return;}
 if(peer instanceof HostPeer&&state&&(state.status==='preparing'||state.status==='playing'))return;
 disposeRoom();sound.resume();const local=new ComputerPeer({uid:user.uid,name:(user.displayName||'나의 수호자').slice(0,16),accountLevel:progress.level,rewardHeroes:ownedHeroIds(),rewardHero:selectedWorksheetHero()},level,{mapId});
 peer=local;state=local.state;side=0;room='컴퓨터 Lv.'+local.definition.level;connected=true;slots=[];selectedType='';selectedTower=0;shopPage=0;message='게임 시작을 누르면 1분 동안 문제를 풀어 타워를 비축해요. 전투가 시작되면 바로 설치할 수 있어요.';lastRound=0;
 local.onState=(s,c)=>{if(peer!==local)return;state=s;connected=c;const p=s.players[0];if(p.round!==lastRound){slots=[];lastRound=p.round;}refresh();if(s.status==='finished'&&recorded!==local.id){void saveFinished();result();}};
 close();
}
function lobby(){
 if(!user||auth?.currentUser?.uid!==user.uid){authScreen();return;}
 show('lobby',`<h2>대기실</h2><p id="profile-name"></p><div class="duel-row"><button class="duel-primary" id="create-room">방 만들기</button><button class="duel-primary" id="computer-mode">컴퓨터와 대결</button><button id="return-room">현재 방 돌아가기</button><button id="close-current-room">현재 방 닫기</button></div><section class="room-directory"><div class="duel-row"><h3>입장할 수 있는 방</h3><button id="refresh-rooms">목록 새로고침</button></div><div id="room-list" role="region" aria-label="생성된 방 목록">방 목록을 불러오는 중이에요.</div><p class="room-note">새 방은 목록 새로고침을 눌러 확인해요. 만든 뒤 5분이 지난 방은 화면에서도 사라져요.</p></section><p data-feedback role="status"></p><p>방 목록과 비밀번호 확인은 중앙 서버가 맡고, 전투는 방을 만든 친구의 컴퓨터에서 진행돼요. 호스트는 창을 열어 두세요.</p><div class="duel-row"><button id="duel-settings">게임 설정</button><button id="heroes-book">영웅 30종 도감</button><button id="worksheet-heroes">영웅 선택</button></div><p id="pending-records"></p>`);
 document.getElementById('profile-name')!.textContent=progressLoading?'계정 레벨을 불러오는 중이에요…':profileText();
 (document.getElementById('create-room') as HTMLButtonElement).disabled=progressLoading;
 document.getElementById('pending-records')!.textContent=pendingCount(user.uid)?`저장 대기 경기 ${pendingCount(user.uid)}개 · 연결되면 자동 저장해요.`:'';
 const hallButton=document.createElement('button');hallButton.id='hall-of-fame';hallButton.textContent='명예의 전당';
 document.getElementById('worksheet-heroes')!.insertAdjacentElement('afterend',hallButton);hallButton.parentElement!.classList.add('duel-lobby-tools');
 bind('hall-of-fame',()=>void leaderboardScreen());
 bind('computer-mode',computerScreen);bind('worksheet-heroes',()=>rewardCollection(true));bind('duel-settings',()=>settings(true));bind('refresh-rooms',()=>loadRooms());
 bind('create-room',()=>{if(canEnterRoom())createRoomScreen();});
 bind('return-room',()=>peer?(state?.players[1]?close():connectionScreen()):status('먼저 방을 만들거나 참가해 주세요.'));
 bind('close-current-room',()=>{if(state&&(state.status==='preparing'||state.status==='playing')){status('진행 중인 대전은 나가기 버튼으로 끝내 주세요.');return;}void cancelRoom();});
 bind('heroes-book',()=>heroBook(true));
 roomRowsSignature='';renderRooms();
}
function canEnterRoom(){if(busy)return false;if(progressLoading){status('계정 레벨을 불러오고 있어요. 잠시 뒤 다시 눌러 주세요.');return false;}if(peer&&state?.status!=='finished'){status('현재 방으로 돌아가거나 현재 방을 닫고 새 방에 입장해요.');return false;}return true;}
async function loadRooms(){
 if(loadingRoomList||!user||dialogKind!=='lobby')return;loadingRoomList=true;const uid=user.uid;
 const button=document.getElementById('refresh-rooms') as HTMLButtonElement|null;if(button){button.disabled=true;button.textContent='불러오는 중…';}
 try{const data=await listRooms();if(user?.uid!==uid||dialogKind!=='lobby')return;serverOffset=data.now-Date.now();roomRows=data.rooms;roomListLoaded=true;renderRooms();}
 catch(e){if(dialogKind==='lobby'){const root=document.getElementById('room-list');if(root)root.textContent=errorText(e);roomRowsSignature='';}}
 finally{loadingRoomList=false;const current=document.getElementById('refresh-rooms') as HTMLButtonElement|null;if(current){current.disabled=false;current.textContent='목록 새로고침';}}
}
function renderRooms(){
 const root=document.getElementById('room-list');if(!root)return;const now=Date.now()+serverOffset,visible=roomRows.filter(r=>r.expiresAt>now),signature=JSON.stringify([visible,user?.uid,progressLoading,roomListLoaded]);
 if(signature!==roomRowsSignature){roomRowsSignature=signature;root.replaceChildren();if(!visible.length)root.textContent=roomListLoaded?'표시할 방이 없어요. 목록 새로고침으로 새 방을 확인해요.':'목록 새로고침을 눌러 친구의 방을 찾아요.';
 for(const row of visible){const item=document.createElement('article');item.className='room-item';item.dataset.roomId=row.id;const info=document.createElement('div'),title=document.createElement('strong'),description=document.createElement('p'),time=document.createElement('small');title.textContent=(row.protected?'🔒 ':'')+row.title;description.textContent=`${row.hostName} · 계정 Lv.${row.level} · ${row.players}/2명 · ${row.protected?'비밀번호 방':'공개방'}`;time.dataset.expires=String(row.expiresAt);info.append(title,description,time);const button=document.createElement('button');button.className='duel-primary';button.dataset.joinRoom=row.id;button.textContent=row.hostUid===user?.uid?'내 방':row.players===2?'준비 중':row.protected?'비밀번호 입장':'참가하기';button.disabled=progressLoading||row.players===2||row.hostUid===user?.uid;button.onclick=()=>{if(canEnterRoom()){if(row.protected)passwordRoomScreen(row);else void joinListedRoom(row,'');}};item.append(info,button);root.append(item);}}
 root.querySelectorAll<HTMLElement>('[data-expires]').forEach(e=>{const seconds=Math.max(0,Math.ceil((Number(e.dataset.expires)-now)/1000));e.textContent=`목록 표시 ${Math.floor(seconds/60)}분 ${String(seconds%60).padStart(2,'0')}초 남음`;});
}
setInterval(()=>{if(dialogKind==='lobby'&&user)renderRooms();},1000);
interface CreateRoomDraft{title:string;access:string;password:string;}
function createRoomScreen(draft?:CreateRoomDraft){
 show('create-room',`<p class="eyebrow">친구와 함께 지키는 불꽃</p><h2>방 만들기</h2><form id="create-room-form">${duelMapSummaryHTML(selectedMapId)}<label>방 이름<input name="title" minlength="2" maxlength="24" required autocomplete="off"></label><label>입장 방식<select id="room-access" name="access"><option value="public">공개방 · 누구나 입장</option><option value="password">비밀번호 방 · 아는 친구만 입장</option></select></label><label id="room-password-label" hidden>방 비밀번호<input name="password" type="password" minlength="4" maxlength="32" autocomplete="new-password" placeholder="4~32글자"></label><p>게임 시작 또는 생성 후 5분이 지나면 목록에서 사라져요.</p><p data-feedback role="status"></p><div class="duel-row"><button type="button" id="create-back">대기실로</button><button class="duel-primary" id="publish-room">방 생성</button></div></form>`);
 (content.querySelector('[name=title]') as HTMLInputElement).value=draft?.title??(user?.displayName||'수호자')+'의 방';
 const access=document.getElementById('room-access') as HTMLSelectElement,password=content.querySelector<HTMLInputElement>('[name=password]')!;access.value=draft?.access??'public';password.value=draft?.password??'';
 const updateAccess=()=>{const locked=access.value==='password';document.getElementById('room-password-label')!.hidden=!locked;password.required=locked;if(!locked)password.value='';};access.onchange=updateAccess;updateAccess();bind('create-back',()=>{if(!busy)lobby();});
 bind('choose-duel-map',()=>{if(busy)return;const data=new FormData(content.querySelector<HTMLFormElement>('form')!);const saved={title:String(data.get('title')),access:String(data.get('access')),password:String(data.get('password')||'')};mapScreen(()=>createRoomScreen(saved));});
 content.querySelector<HTMLFormElement>('#create-room-form')!.onsubmit=async e=>{e.preventDefault();if(!canEnterRoom())return;const data=new FormData(e.target as HTMLFormElement);busy=true;(document.getElementById('publish-room') as HTMLButtonElement).disabled=true;
 try{const local=await startPeer();offerCode=await local.create(selectedMapId);const result=await roomRequest<{room:ListedRoom;now:number}>({action:'create',id:local.id,offer:offerCode,title:String(data.get('title')),access:String(data.get('access')),password:String(data.get('password')||''),internet:true});if(peer!==local)return;serverOffset=result.now-Date.now();listingId=local.id;listingExpires=result.room.expiresAt;connectionScreen();watchRoom(local);}
 catch(e){disposeRoom();status(errorText(e));}finally{busy=false;const button=document.getElementById('publish-room') as HTMLButtonElement|null;if(button)button.disabled=false;refresh();}};
}
function passwordRoomScreen(row:ListedRoom){
 show('room-password','<p class="eyebrow">비밀번호 방</p><h2 id="password-room-name"></h2><form id="room-password-form"><label>방 비밀번호<input name="room-password" type="password" required maxlength="32" autocomplete="off"></label><p data-feedback role="status"></p><div class="duel-row"><button type="button" id="password-back">방 목록으로</button><button class="duel-primary">입장하기</button></div></form>');document.getElementById('password-room-name')!.textContent=row.title;bind('password-back',()=>{if(!busy)lobby();});content.querySelector<HTMLFormElement>('form')!.onsubmit=e=>{e.preventDefault();void joinListedRoom(row,String(new FormData(e.target as HTMLFormElement).get('room-password')));};
}
async function joinListedRoom(row:ListedRoom,password:string){
 if(!canEnterRoom())return;busy=true;
 try{
  // Resolve credentials before reserving a slot so a slow service or account
  // change cannot leave an unnecessary guest lease in the directory.
  const local=await startPeer();
  const joined=await roomRequest<{offer:string;claim:string;internet:boolean;expiresAt:number}>({action:'join',id:row.id,password});
  if(peer!==local){void roomRequest({action:'release',id:row.id,claim:joined.claim}).catch(()=>{});return;}
  listingId=row.id;listingClaim=joined.claim;listingExpires=joined.expiresAt;answerCode=await local.join(joined.offer);side=1;room=local.id.slice(0,8).toUpperCase();await roomRequest({action:'answer',id:row.id,claim:listingClaim,answer:answerCode});if(peer!==local)return;connectionScreen();watchRoom(local);
 }catch(e){disposeRoom();status(errorText(e));}finally{busy=false;refresh();}
}
function connectionScreen(){
 const hosting=peer?.side===0;show('connection',`<p class="eyebrow">${hosting?'내 컴퓨터가 호스트':'친구의 컴퓨터에 직접 접속'}</p><h2>${hosting?'친구의 입장을 기다리고 있어요':'호스트에 연결하고 있어요'}</h2><p>대전 맵 · ${duelMap(peer instanceof HostPeer?peer.mapId:state?.mapId).name}</p><p>${hosting?'방이 중앙 목록에 등록되었어요. 친구가 공개방 또는 비밀번호로 입장하면 자동으로 연결돼요.':'비밀번호 확인과 접속 정보 교환을 마쳤어요. 연결되면 대전 화면으로 이동해요.'}</p><p data-feedback role="status"></p><div class="duel-row"><button id="connection-back">대기실 · 방 목록</button><button id="connection-cancel">연결 취소 · 방 닫기</button></div>`);bind('connection-back',lobby);bind('connection-cancel',()=>cancelRoom());
}
async function cancelRoom(){
 if(busy)return;busy=true;clearTimeout(roomPoll);roomPoll=undefined;
 try{if(listingId){await roomRequest({action:peer?.side===0?'close':'release',id:listingId,claim:listingClaim});listingId='';}disposeRoom();lobby();}
 catch(e){disposeRoom();lobby();status(errorText(e));}finally{busy=false;refresh();}
}
async function closeListing(){
 if(!listingId||peer?.side!==0||listingClosing||Date.now()<listingRetryAt)return;const id=listingId;listingClosing=true;listingRetryAt=Date.now()+5000;try{await roomRequest({action:'close',id});if(listingId===id)listingId='';}catch{}finally{listingClosing=false;}
}
function watchRoom(local:HostPeer){
 clearTimeout(roomPoll);let polling=false,accepted=false,acceptedAt=0,connectedAck=false;const enteredAt=Date.now();
 let watching=true;const poll=async()=>{if(!watching||polling||peer!==local)return;polling=true;try{
  const connected=local.connected&&!!local.state?.players[1];
  if(local.state&&local.state.status!=='waiting'){if(local.side===0)await closeListing();if(!listingId||local.side===1){watching=false;clearTimeout(roomPoll);roomPoll=undefined;}return;}
  if(connected){if(local.side===0&&!connectedAck&&listingId){await roomRequest({action:'connected',id:listingId});connectedAck=true;}watching=false;clearTimeout(roomPoll);roomPoll=undefined;return;}
  if(Date.now()+serverOffset>=listingExpires)throw Error('방을 만든 뒤 5분이 지나 목록에서 사라졌어요. 새 방을 만들어 주세요.');
  if(local.side===0&&!accepted){const result=await roomRequest<{answer:string;guestUid:string}>({action:'poll',id:listingId});if(result.answer){local.allowedGuestUid=result.guestUid;accepted=true;acceptedAt=Date.now();await local.accept(result.answer);}}
  if(local.side===1&&Date.now()-enteredAt>25000||accepted&&Date.now()-acceptedAt>20000)throw Error('호스트에 연결하지 못했어요. 두 사람의 인터넷 연결을 확인하고 새 방으로 다시 시도해 주세요.');
 }catch(e){if(peer===local){if(local.connected&&local.state?.players[1]){watching=false;clearTimeout(roomPoll);roomPoll=undefined;return;}watching=false;disposeRoom();lobby();status(errorText(e));}}finally{polling=false;if(watching&&peer===local)roomPoll=setTimeout(()=>void poll(),Date.now()-enteredAt<60000?5000:10000);}};
 void poll();
}
async function startPeer(){
 const uid=user!.uid,configuration=await loadPeerConfiguration();
 if(user?.uid!==uid||auth?.currentUser?.uid!==uid)throw Error('계정이 바뀌었어요. 다시 로그인해 주세요.');
 disposeRoom();const local=new HostPeer({uid,name:(user!.displayName||'수호자').slice(0,16),accountLevel:progress.level,rewardHeroes:ownedHeroIds(),rewardHero:selectedWorksheetHero()},configuration);peer=local;slots=[];selectedType='';selectedTower=0;
 local.onStatus=status;local.onState=(s,c)=>{if(peer!==local)return;state=s;side=local.side;room=local.id.slice(0,8).toUpperCase();connected=c;const p=s.players[side]!;if(p.round!==lastRound){slots=[];lastRound=p.round;}refresh();
  if(s.status!=='waiting'){if(local.side===0&&listingId)void closeListing();}
  if(s.status==='finished'){if(recorded!==local.id){void saveFinished();result();}return;}
  if(c&&s.players[1]&&['connection','room-password','create-room'].includes(dialogKind))close();
 };
 return local;
}
async function saveFinished(){
 if(!user||auth?.currentUser?.uid!==user.uid)return;
 if(state?.status==='finished'&&peer instanceof ComputerPeer){
  const local=peer;if(recorded!==local.id){recorded=local.id;recordComputerResult(local.definition.level,state.winner===side);importLearningRecords([{matchId:local.id,hostUid:state.players[0].uid,guestUid:state.players[1]!.uid,side,wrongQuestions:state.players[side]!.wrongQuestions}]);}
  saveMessage='컴퓨터 대전 결과를 이 브라우저에 보관했어요. 온라인 전적은 바뀌지 않아요.';return;
 }
 if(!state||!peer||!user)return;const record=finishedRecord(state,side,peer.id);if(!record)return;
 importLearningRecords([record]);
 if(recorded!==peer.id){recorded=peer.id;saveMessage=queueResult(record)?'경기 기록을 이 브라우저에 보관하고 Firebase 저장을 요청해요.':'브라우저 저장 공간이 부족해요. 이 창을 닫기 전에 기록 저장을 다시 시도해 주세요.';}
 const uid=user.uid,saved=await flushResults(uid);if(user?.uid!==uid)return;saveMessage=saved.message;if(saved.progress)progress=saved.progress;const e=document.getElementById('result-save');if(e)e.textContent=saveMessage;const profile=document.getElementById('profile-name');if(profile)profile.textContent=profileText();
}
function wrongText(q:WrongQuestion){if(![q.a,q.b,q.correct].every(n=>Number.isSafeInteger(n)&&n>=0&&n<10000&&n%10===0))return '이전 학습 범위의 오답 기록 · 새 연습 문항은 소수점 두 자리까지, 자연수 부분은 한 자리로 나와요.';const digits=Math.max(precision(q.a),precision(q.b),precision(q.correct));return `${q.kind==='tower'?'타워 구매':'돌 알 합성'}: ${numberText(q.a,digits)} ${q.operation==='-'?'−':'+'} ${numberText(q.b,digits)} = ${numberText(q.correct,digits)} · 내 답 ${q.submitted||'(비어 있음)'} · ${q.attempts}회 틀림`;}
let leaderboardRequest=0;
async function leaderboardScreen(){
 const uid=user?.uid;if(!uid||auth?.currentUser?.uid!==uid){authScreen();return;}
 const request=++leaderboardRequest;
 const render=(html:string)=>{show('leaderboard',html);const heading=content.querySelector('h2');if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true});}bind('leaderboard-back',()=>{lobby();document.getElementById('hall-of-fame')?.focus();});bind('leaderboard-refresh',()=>void leaderboardScreen());};
 render(leaderboardHTML(undefined,'loading'));
 try{
  const data=await loadDuelLeaderboard(uid);
  if(request!==leaderboardRequest||dialogKind!=='leaderboard'||user?.uid!==uid||auth?.currentUser?.uid!==uid)return;
  render(leaderboardHTML(data,'ready'));
 }catch(e){
  if(request!==leaderboardRequest||dialogKind!=='leaderboard'||user?.uid!==uid)return;
  const message=(e as {code?:string})?.code?.startsWith('functions/')?'순위 서버에 연결하지 못했어요. 잠시 뒤 다시 불러와 주세요.':errorText(e);
  render(leaderboardHTML(undefined,'error',message));
 }
}
async function history(){
 show('history','<h2>전적 · 오답 복습 · 최근 20경기</h2><p id="history-summary"></p><div id="history-list">경기 기록을 불러오고 있어요.</div><p data-feedback></p><button id="history-back">대기실</button>');bind('history-back',lobby);
 document.getElementById('history-summary')!.textContent=profileText();
 try{const rows=await loadHistory(user!.uid);importLearningRecords(rows);const root=document.getElementById('history-list');if(!root)return;root.replaceChildren();if(!rows.length)root.textContent='아직 저장한 경기가 없어요.';
 for(const r of rows){const details=document.createElement('details'),title=document.createElement('summary');title.textContent=`${new Date(r.endedAt).toLocaleString('ko-KR')} · ${r.outcome==='win'?'승리':r.outcome==='loss'?'패배':'무승부'} · 경험치 +${r.experienceGain} · 오답 ${r.wrongQuestions.length}문항`;details.append(title);for(const q of r.wrongQuestions){const p=document.createElement('p');p.textContent=wrongText(q);details.append(p);}root.append(details);}
 }catch(e){status(errorText(e));}
}
async function exitGame(){if(state&&(state.status==='preparing'||state.status==='playing')){await send({type:'surrender'});await saveFinished();}disposeRoom();back();}
function heroBook(fromLobby=false){const egg=state?.players[side]?.egg??0;show('heroes',`<p class="eyebrow">돌의 영웅 · 레벨마다 3종</p><h2>${fromLobby?'영웅 30종':'부화할 영웅 선택 · 영웅 알 Lv.'+egg}</h2><p>영웅마다 이동 가속, 체력 강화, 쉴드, 상대 포탑 감속, 내 포탑 가속 중 하나의 효과를 지녀요. 반경 안에서 가장 강한 효과만 적용돼요. 덧셈 정답을 더 맞히면 더 높은 레벨의 영웅 한 명이 나와요.</p><div class="hero-grid">${(fromLobby?HEROES:heroesAtLevel(egg)).map(h=>`<button class="hero-card" data-hero="${h.id}" ${fromLobby?'disabled':''}><span class="hero-crop" style="background-image:url('${artURL(h.sheet)}');background-position:0% ${h.row*50}%"></span><strong>Lv.${h.level} · ${h.name}</strong><span>체력 ${numberText(h.hp)}</span><small>${h.description}</small>${fromLobby?'':'<span class="duel-gold">이 영웅 부화 ▶</span>'}</button>`).join('')}</div><p data-feedback role="status"></p><button id="hero-back">${fromLobby?'대기실로':'더 성장시키기 · 닫기'}</button>`);
 bind('hero-back',()=>fromLobby?lobby():close());content.querySelectorAll<HTMLButtonElement>('[data-hero]').forEach(b=>b.onclick=async()=>{const r=await send({type:'hatch',heroId:b.dataset.hero!});if(r?.ok){sound.play('kill');close();}});
}
function rewardCollection(fromLobby=true){
 const p=state?.players[side],frozen=!!state&&(state.status!=='waiting'||!!p?.ready),selected=p?.rewardHero??selectedWorksheetHero();
 show('collection',`<p class="eyebrow">학습지 보상 · 대전당 한 번</p><h2>함께 출발할 영웅 선택</h2>${frozen?'<p>준비를 마쳤어요. 선택은 다음 대전 전에 바꿀 수 있어요.</p>':''}${collectionHTML(selected,frozen)}<p data-feedback role="status"></p><div class="duel-row"><button id="collection-back">${fromLobby?'대기실로':'대전으로'}</button><a href="/?mode=worksheet" target="_blank" rel="noopener">학습지 · 암호 입력 ↗</a></div>`);
 bind('collection-back',()=>fromLobby?lobby():close());content.querySelectorAll<HTMLButtonElement>('[data-collection-hero]').forEach(b=>b.onclick=async()=>{if(frozen||busy)return;try{const id=b.dataset.collectionHero!;if(peer&&state){const reply=await send({type:'select-reward',heroId:id});if(!reply?.ok)return;}await selectWorksheetHero(id);rewardCollection(fromLobby);}catch(e){status(errorText(e));}});
}
async function startWithCollectedHero(){
 const p=state?.players[side];if(!state||state.status!=='waiting'||!p||p.ready||busy)return;
 if(!p.rewardRoster.length){await send({type:'ready'});return;}
 const book=loadWorkbook(),roster=new Set(p.rewardRoster);
 book.collection=book.collection.filter(hero=>roster.has(hero.heroId));
 show('collection',`<p class="eyebrow">수집 영웅 · 함께 출전</p><h2>함께 출전할 영웅을 선택하세요</h2>${collectionHTML(p.rewardHero,false,book,{mode:'deployment'})}<p data-feedback role="status"></p><button id="deployment-back">돌아가기</button>`);
 const entryPeer=peer,entryHeading=content.querySelector('h2');
 bind('deployment-back',close);
 content.querySelectorAll<HTMLButtonElement>('[data-collection-hero]').forEach(button=>button.onclick=async()=>{
  if(busy)return;const id=button.dataset.collectionHero!,reply=await send({type:'ready',heroId:id});
  if(!reply?.ok||peer!==entryPeer)return;
  if(state?.status!=='finished'&&dialogKind==='collection'&&entryHeading?.isConnected)close();
  void selectWorksheetHero(id).catch(error=>status(errorText(error)));
 });
}
function showResultScores(){
 const root=document.getElementById('duel-result-scores');if(!root||!state)return;
 const players=[state.players[side],state.players[side===0?1:0]],table=document.createElement('table');table.style.width='100%';table.style.borderCollapse='collapse';
 const caption=table.createCaption();caption.textContent='최종 점수';caption.style.fontWeight='700';caption.style.color='#ffe0a0';caption.style.paddingBottom='8px';
 const head=table.createTHead().insertRow();['항목',...(players.map((p,i)=>(p?.name||'상대')+(i===0?' · 나':'')))].forEach(label=>{const cell=document.createElement('th');cell.scope='col';cell.textContent=label;head.append(cell);});
 const rows=[['총점',...players.map(p=>duelScore(p).toLocaleString('ko-KR')+'점')],['전투 점수',...players.map(p=>(p?.combatScore??0).toLocaleString('ko-KR')+'점 · '+(p?.kills??0)+'마리 처치')],['문제 점수',...players.map(p=>(p?.questionScore??0).toLocaleString('ko-KR')+'점 · '+(p?.answeredQuestions??0)+'문항 정답')]];
 const body=table.createTBody();for(const [label,...values]of rows){const row=body.insertRow(),heading=document.createElement('th');heading.scope='row';heading.textContent=label;row.append(heading);for(const value of values)row.insertCell().textContent=value;}
 table.querySelectorAll<HTMLElement>('th,td').forEach(cell=>{cell.style.padding='7px 6px';cell.style.borderBottom='1px solid #aa895644';cell.style.textAlign='center';cell.style.overflowWrap='anywhere';});
 root.append(table);
}
function result(){
 if(peer instanceof ComputerPeer){const definition=peer.definition,won=state?.winner===side,draw=state?.winner===null;
  show('result',`<div class="computer-result-portrait" role="img" aria-label="${definition.name}의 ${draw?'대기':won?'패배':'승리'} 표정" style="background-image:url('${artURL('cpu-opponent-'+definition.level+'-v1')}');--pose-from:${won?'66.6667%':'0%'};--pose-to:${won?'100%':'33.3333%'};--pose-row:${draw?'0%':'100%'}"></div><p class="eyebrow">컴퓨터와 대결 · Lv.${definition.level} ${definition.name}</p><h2>${draw?'무승부':won?'대전 승리!':'대전 종료 · 패배'}</h2><p id="result-reason"></p><div id="duel-result-scores" class="duel-warning"></div><p>남은 불꽃 ${numberText(state?.players[0].flame??0)}</p><p id="result-save"></p><div id="result-wrong"></div><div class="duel-row"><button id="computer-retry">같은 상대와 다시 대결</button><button class="duel-primary" id="computer-other">다른 상대 선택</button></div>`);
  document.getElementById('result-reason')!.textContent=state?.reason||'';document.getElementById('result-save')!.textContent=saveMessage;showResultScores();
  const root=document.getElementById('result-wrong')!;for(const q of state?.players[0].wrongQuestions??[]){const p=document.createElement('p');p.textContent=wrongText(q);root.append(p);}
  bind('computer-retry',()=>startComputer(definition.level,state?.mapId??selectedMapId));bind('computer-other',()=>{disposeRoom();computerScreen();});return;
 }
 const won=state?.winner===side,draw=state?.winner===null,record=state&&peer?finishedRecord(state,side,peer.id):null;show('result',`<p class="eyebrow">호스트 직접 연결 · 대전 종료</p><h2>${draw?'무승부':won?'대전 승리!':'대전 종료 · 패배'}</h2><p id="result-reason"></p><div id="duel-result-scores" class="duel-warning"></div><p>남은 불꽃 ${numberText(state?.players[side]?.flame??0)} · 경험치 +${record?matchExperience(record):0}</p><p id="result-save"></p><div id="result-wrong"></div><div class="duel-row"><button id="retry-save">기록 저장 다시 시도</button><button class="duel-primary" id="result-lobby">새 대전 준비</button></div>`);document.getElementById('result-reason')!.textContent=state?.reason||'';document.getElementById('result-save')!.textContent=record?saveMessage:'대전 시작 전 종료된 방은 승패·경험치에 포함하지 않아요.';showResultScores();
 const root=document.getElementById('result-wrong')!;for(const q of record?.wrongQuestions??[]){const p=document.createElement('p');p.textContent=wrongText(q);root.append(p);}bind('retry-save',saveFinished);bind('result-lobby',()=>{disposeRoom();lobby();});}
scene.onCell=async(x,y)=>{if(!dialog.classList.contains('hidden')||!state)return;const p=state.players[side]!;if(state.status!=='playing'){status('준비 시간에는 타워를 비축해요. 1분이 끝나면 배치할 수 있어요.');return;}
 const tower=p.towers.find(t=>t.x===x&&t.y===y);if(tower){selectedTower=tower.id;selectedType='';refresh();return;}
 if(selectedType){if(!canPurchaseDuelTower(state)){status('게임을 시작한 뒤 타워를 설치할 수 있어요.');return;}if(!validDuelCell(state,side,x,y)){status('내 쪽 빈 바닥에 설치해요. 길에는 지을 수 없어요.');scene.preview(x,y);return;}await send({type:'build',x,y,typeId:selectedType});}
};
scene.onAction=async key=>{sound.resume();sound.play('ui');
 if(key.startsWith('type:')&&(!state||!canPurchaseDuelTower(state))){status('게임을 시작한 뒤 타워를 설치할 수 있어요.');return;}
 if(key.startsWith('type:')&&state?.players[side]?.quote){status('하단의 비축 문제를 풀거나 취소해 주세요.');return;}
 if(key.startsWith('type:')){selectedType=key.slice(5);selectedTower=0;scene.preview(-1,-1);if(state?.status==='preparing'){await send({type:'prepare-quote',typeId:selectedType});}else{status('내 쪽 빈 바닥을 선택하면 비축 타워부터 설치해요. 비축이 없으면 코인으로 바로 구매해요.');}return;}
 if(key.startsWith('block:')){const i=Number(key.slice(6));if(!slots.includes(i)&&slots.length<3)slots.push(i);refresh();return;}
 if(key.startsWith('slot:')){slots.splice(Number(key.slice(5)),1);refresh();return;}
 switch(key){
  case 'page:prev':shopPage=Math.max(0,shopPage-1);refresh();break;case 'page:next':shopPage=Math.min(scene.shopPageCount-1,shopPage+1);refresh();break;
  case 'blocks:page':scene.cycleBlockPage();break;
  case 'ready':await startWithCollectedHero();break;
  case 'fuse':await send({type:'fuse',round:state!.players[side]!.round,slots:[...slots],operation:'+'});break;
  case 'sell':await send({type:'sell',towerId:selectedTower});selectedTower=0;refresh();break;
  case 'hatch':heroBook();break;case 'heroes':heroBook(true);break;
  case 'lobby':peer instanceof ComputerPeer?computerScreen():lobby();break;
  case 'settings':settings();break;
  case 'leave':if(state&&state.status!=='finished'){show('leave','<h2>대전을 나갈까요?</h2><p>진행 중인 대전은 상대의 승리로 끝나요.</p><div class="duel-row"><button id="stay">계속하기</button><button id="surrender" class="duel-primary">나가기</button></div>');bind('stay',close);bind('surrender',exitGame);}else exitGame();break;
 }
};
let controlsSignature='';
scene.onControls=()=>{
 if(scene.input)scene.input.enabled=dialog.classList.contains('hidden');const p=state?.players[side],preparing=state?.status==='preparing';
 const phaseSeconds=Math.max(0,Math.ceil((preparing?DUEL_PREPARATION_SECONDS-(state?.preparationElapsed??0):DUEL_SECONDS-(state?.elapsed??0))-1e-7)),totalSeconds=preparing?phaseSeconds+DUEL_SECONDS:state?.status==='waiting'||!state?DUEL_TOTAL_SECONDS:phaseSeconds;
 document.getElementById('duel-state')!.textContent=state&&p?`방 ${room} · ${state.status} · 전체 남은 시간 ${Math.floor(totalSeconds/60)}분 ${totalSeconds%60}초 · ${preparing?'문제풀이':'전투'} 남은 시간 ${phaseSeconds}초 · ${state.players.map((player,index)=>(player?.name||'상대 기다리는 중')+(index===side?' 나':'')+' 점수 '+duelScore(player).toLocaleString('ko-KR')+'점 (전투 '+(player?.combatScore??0)+', 문제 '+(player?.questionScore??0)+')').join(' · ')} · 내 불꽃 ${numberText(p.flame)} · ${preparing?'준비 예산':'코인'} ${numberText(p.money)} · 비축 타워 ${Object.values(p.stock).reduce((a,b)=>a+b,0)}개 · 내 학습 Lv.${duelHeroLearningLevel(p)} ${learningDescription(duelHeroLearningLevel(p))} · 영웅 알 Lv.${p.egg} · 영웅 ${state.enemies.filter(e=>e.hero).length}마리 · ${state.log.at(-1)||''}`:'대전 대기실';
 const container=document.getElementById('duel-controls')!,signature=JSON.stringify([dialog.classList.contains('hidden'),[...scene.controls].map(([key,c])=>[key,c.label,c.enabled])]);if(signature===controlsSignature)return;controlsSignature=signature;container.replaceChildren();if(!dialog.classList.contains('hidden'))return;for(const [key,c]of scene.controls){const b=document.createElement('button');b.type='button';b.dataset.duelAction=key;b.textContent=c.label;b.disabled=!c.enabled;b.onclick=c.run;container.append(b);}
};
async function accountChanged(value:User|null){const previousUid=user?.uid;user=value;progressLoading=!!value;if(!value){progress=emptyProgress();disposeRoom();authScreen();return;}if(previousUid&&previousUid!==value.uid)disposeRoom();if(!(peer instanceof ComputerPeer))lobby();try{const loaded=await loadProgress(value.uid);if(user?.uid!==value.uid)return;progress=loaded;const saved=await flushResults(value.uid);if(user?.uid!==value.uid)return;if(saved.progress)progress=saved.progress;const oldMatches=await loadLearningHistory(value.uid);if(user?.uid===value.uid)importLearningRecords(oldMatches);}catch(e){status(errorText(e));}finally{if(user?.uid===value.uid){progressLoading=false;if(dialogKind==='lobby')lobby();}}}
if(auth)onAuthStateChanged(auth,value=>{if(value&&content.dataset.accountSubmitting==='true')return;void accountChanged(value);});else authScreen();
window.addEventListener('online',()=>{if(!user||peer instanceof ComputerPeer)return;const uid=user.uid;void flushResults(uid).then(saved=>{if(user?.uid!==uid)return;if(saved.progress)progress=saved.progress;if(dialogKind==='result'){saveMessage=saved.message;document.getElementById('result-save')!.textContent=saveMessage;}else if(dialogKind==='lobby')lobby();});});
window.addEventListener('beforeunload',e=>{if(state&&(state.status==='preparing'||state.status==='playing')){e.preventDefault();e.returnValue='';}});
window.addEventListener('pagehide',()=>{peer?.dispose();gameAudioControls.dispose();sound.dispose();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&dialog.classList.contains('hidden')&&state?.players[side]?.quote)send({type:'cancel'});else if(e.key==='Escape'&&dialogKind==='leaderboard')lobby();else if(e.key==='Escape'&&['heroes','leave','collection'].includes(dialogKind))close();});
if((import.meta as ImportMeta&{env:{DEV:boolean}}).env.DEV)Object.assign(window,{__duelTest:{get state(){return state;},get side(){return side;},get room(){return room;},scene,send,view,get peer(){return peer;},get progress(){return progress;},pendingCount,get user(){return user;}}});
