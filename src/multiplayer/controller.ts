import {artURL} from '../art';
import Phaser from 'phaser';
import {createUserWithEmailAndPassword,signInWithEmailAndPassword,signOut,updateProfile,sendPasswordResetEmail,onAuthStateChanged,User} from 'firebase/auth';
import {auth,firebaseConfigured,firebaseEmulator} from './firebase';
import {DuelScene,DuelView} from './scene';
import {DuelState,DuelAction,Side,validDuelCell} from './duel';
import {HostPeer} from './peer';
import {learningDescription} from './decimal-boards';
import {ListedRoom} from './rooms';
import {listRooms,roomRequest} from './room-store';
import {Progress,WrongQuestion,emptyProgress,finishedRecord,matchExperience} from './records';
import {loadProgress,loadHistory,loadLearningHistory,queueResult,flushResults,pendingCount} from './record-store';
import {HEROES,heroesAtLevel} from './heroes';
import {numberText,precision} from '../math';
import {towerType} from '../towers';
import {Sound} from '../audio';
import {mountAudioControls} from '../audio-controls';
import {loadSave,writeSave} from '../save';
import {hitEquationsEnabled,setHitEquationsEnabled} from '../combat-preferences';
import {recordLearning,importLearningRecords,LearningSample} from '../learning';
import {ownedHeroIds,selectedWorksheetHero,selectWorksheetHero} from '../worksheet-store';
import {collectionHTML} from '../collection-ui';
import '../collection.css';
import '../game.css';
import './multiplayer.css';
import './duel-theme.css';
const app=document.getElementById('app')!;
app.innerHTML='<div class="duel-world" aria-hidden="true"><div class="duel-world-art"></div><div class="duel-world-shade"></div><div class="duel-world-glow"></div><div class="duel-world-embers"></div></div><header class="duel-hall-header"><a href="/?mode=title" aria-label="소수의 성 시작 화면으로">소수의 성 <span>마지막 불꽃</span></a><span class="duel-hall-tag">수호자의 결투장 · 1:1 온라인 대전</span></header><main id="game-shell"><div id="field"></div></main><div id="duel-controls" class="sr-only"></div><p id="duel-state" class="sr-only"></p><p id="duel-notice" class="sr-only" role="status" aria-live="polite"></p><div id="duel-dialog" class="modal hidden" role="dialog" aria-modal="true"><div class="duel-card"><div id="duel-content"></div></div></div>';
const dialog=document.getElementById('duel-dialog')!,content=document.getElementById('duel-content')!,notice=document.getElementById('duel-notice')!;
let user:User|null=null,state:DuelState|null=null,side:Side=0,room='',selectedType='',shopPage=0,slots:number[]=[],operation:'+'|'-'='+',selectedTower=0,message='',busy=false,connected=true,dialogKind='',quoteNonce='',lastRound=-1;
let peer:HostPeer|null=null,offerCode='',answerCode='',progress:Progress=emptyProgress(),recorded='',saveMessage='',internetMode=false,progressLoading=false;
let listingId='',listingClaim='',listingExpires=0,listingClosing=false,listingRetryAt=0,roomPoll:ReturnType<typeof setTimeout>|undefined;
let roomRows:ListedRoom[]=[],roomRowsSignature='',serverOffset=0,roomListLoaded=false,loadingRoomList=false;
let audioStatus='',audioFlame=9000;
const sound=new Sound();sound.sfx=loadSave().sfx;sound.setMusic(loadSave().music);
function persistAudio(key:'music'|'sfx',enabled:boolean){const save=loadSave();save[key]=enabled;writeSave(save);}
const audioControls=mountAudioControls(sound,persistAudio);
document.addEventListener('click',e=>{if((e.target as HTMLElement).closest('button'))sound.play('ui');});
const view=():DuelView=>({state,side,room,selectedType,shopPage,slots,operation,selectedTower,message,busy,connected});
const scene=new DuelScene(view);
scene.onSound=type=>sound.play(type);
const game=new Phaser.Game({type:Phaser.AUTO,parent:'field',width:1280,height:800,scene:[scene],backgroundColor:'#111216',scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},render:{antialias:true},audio:{noAudio:true}});
game.events.once('ready',()=>{game.canvas.setAttribute('aria-label','소수의 성 1:1: 양쪽 불꽃, 타워, 소수 블럭과 영웅 알');game.canvas.tabIndex=0;});
let messageTimer:ReturnType<typeof setTimeout>|undefined;
function status(text:string){message=text;notice.textContent=text;const e=content.querySelector<HTMLElement>('[data-feedback]');if(e)e.textContent=text;clearTimeout(messageTimer);messageTimer=setTimeout(()=>{message='';refresh();},5000);refresh();}
function refresh(){const status=state?room+state.status:'';if(status!==audioStatus){audioStatus=status;if(state?.status==='playing')sound.play('start');else if(state?.status==='finished')sound.play(state.winner===side?'victory':'defeat');}const flame=state?.players[side]?.flame??9000;if(flame<audioFlame)sound.play('leak');audioFlame=flame;sound.setTrack(state?.status==='playing'?(state.elapsed>=240?'boss':'battle'):state?.status==='finished'?(state.winner===side?'victory':'defeat'):'title');scene.redraw();}
function show(kind:string,html:string){dialogKind=kind;dialog.dataset.screen=kind;content.innerHTML=html;const heading=content.querySelector('h2');if(heading){heading.id||='duel-dialog-title';dialog.setAttribute('aria-labelledby',heading.id);}app.dataset.duelView=!state||['auth','lobby','create-room','room-password','connection','profile','history'].includes(kind)?'hall':'battle';dialog.classList.remove('hidden');if(scene.input)scene.input.enabled=false;refresh();}
function close(){dialogKind='';app.dataset.duelView='battle';dialog.classList.add('hidden');if(scene.input)scene.input.enabled=true;refresh();}
function errorText(e:unknown){const code=(e as {code?:string})?.code||'';const labels:Record<string,string>={'auth/email-already-in-use':'이미 가입한 이메일이에요. 로그인해 주세요.','auth/invalid-credential':'이메일 또는 비밀번호를 확인해 주세요.','auth/weak-password':'비밀번호는 6글자 이상 적어 주세요.','auth/invalid-email':'이메일 주소를 확인해 주세요.','auth/too-many-requests':'잠시 기다렸다가 다시 로그인해 주세요.','auth/network-request-failed':'인터넷 연결을 확인해 주세요.','functions/unauthenticated':'다시 로그인해 주세요.','functions/resource-exhausted':'잠시 뒤 다시 눌러 주세요.'};return labels[code]||(e as Error)?.message||'연결을 확인하고 다시 시도해 주세요.';}
async function send(action:DuelAction){
 if(busy||!peer)return;const local=peer,p=state?.players[side],q=p?.quote;let sample:LearningSample|undefined,evidence='';
 if(action.type==='answer'&&q&&q.nonce===action.nonce){sample={a:q.before,b:q.cost,operation:'-',digits:q.digits,context:'money'};evidence=q.nonce;}
 if(action.type==='fuse'&&p&&action.round===p.round&&action.slots.length===3&&new Set(action.slots).size===3){const [a,b]=action.slots.map(i=>p.board[i]);sample={a,b,operation:action.operation,context:'wall'};evidence=`fusion-${p.round}-${action.operation}-${a}-${b}`;}
 busy=true;refresh();try{const r=await local.send(action);if(r.ok&&sample)recordLearning(sample,'correct',local.id+':'+local.identity.uid+':'+evidence);const s=local.state,owner=s?.players[local.side];if(s&&owner)importLearningRecords([{matchId:local.id,hostUid:s.players[0].uid,guestUid:s.players[1]?.uid??'',side:local.side,wrongQuestions:owner.wrongQuestions}]);if(r.message)status(r.message);if(r.ok&&action.type==='fuse'){slots=[];sound.play('wall');}if(r.ok&&action.type==='answer')sound.play('money');return r;}catch(e){connected=false;status(errorText(e));}finally{busy=false;refresh();}
}
function back(){const url=new URL(location.href);url.searchParams.set('mode','adventure');url.searchParams.delete('emulator');location.assign(url.href);}
function bind(id:string,fn:()=>unknown){document.getElementById(id)?.addEventListener('click',fn);}
function settings(fromLobby=false){
 show('settings',`<p class="eyebrow">게임 설정</p><h2>내가 편한 화면과 소리로</h2><label class="setting"><span>몬스터 피격 뺄셈식 <small id="setting-equations-state">${hitEquationsEnabled()?'ON':'OFF'}</small></span><input id="setting-hit-equations" type="checkbox" role="switch" ${hitEquationsEnabled()?'checked':''}></label><label class="setting"><span>효과음</span><input id="setting-sfx" type="checkbox" ${sound.sfx?'checked':''}></label><p>설정은 같은 브라우저에 저장돼요. 대전은 설정을 열어도 계속 진행돼요.</p><button class="duel-primary" id="settings-back">${fromLobby?'대기실로':'대전으로'}</button>`);
 document.getElementById('setting-hit-equations')!.onchange=()=>{const enabled=(document.getElementById('setting-hit-equations') as HTMLInputElement).checked;setHitEquationsEnabled(enabled);document.getElementById('setting-equations-state')!.textContent=enabled?'ON':'OFF';};
 document.getElementById('setting-sfx')!.onchange=()=>{sound.sfx=(document.getElementById('setting-sfx') as HTMLInputElement).checked;persistAudio('sfx',sound.sfx);audioControls.refresh();};
 const musicLabel=document.createElement('label');musicLabel.className='setting';musicLabel.innerHTML=`<span>배경음</span><input id="setting-music" type="checkbox" role="switch" ${sound.music?'checked':''}>`;document.getElementById('setting-sfx')!.closest('label')!.after(musicLabel);
 document.getElementById('setting-music')!.onchange=()=>{const enabled=(document.getElementById('setting-music') as HTMLInputElement).checked;sound.resume();sound.setMusic(enabled);persistAudio('music',enabled);audioControls.refresh();};
 bind('settings-back',()=>fromLobby?lobby():close());
}
function authScreen(mode:'login'|'register'='login'){
 const enabled=firebaseConfigured;show('auth',`<section class="duel-auth-form"><p class="eyebrow">수호자의 결투장${firebaseEmulator?' · 로컬 테스트':''}</p><h2>${mode==='register'?'나만의 수호자 계정':'수호자 로그인'}</h2><p class="duel-intro">${mode==='register'?'이름을 정하고 새로운 여정을 시작하세요.':'계정으로 접속해 친구의 결투장에 입장하세요.'}</p>${enabled?'':'<p class="duel-warning">온라인 대전은 준비 중이에요.<br>지금은 혼자 모험을 즐길 수 있어요.</p>'}<form id="auth-form">${mode==='register'?'<label>수호자 이름<input name="nickname" minlength="2" maxlength="16" required autocomplete="nickname" placeholder="게임에서 사용할 이름"></label>':''}<label>이메일<input type="email" name="email" required autocomplete="email" placeholder="이메일 주소"></label><label>비밀번호<input type="password" name="password" minlength="6" required autocomplete="${mode==='register'?'new-password':'current-password'}" placeholder="6글자 이상"></label><p data-feedback role="status"></p><button class="duel-primary" ${enabled?'':'disabled'}>${mode==='register'?'회원가입':'결투장 입장'}</button></form><div class="duel-auth-links"><button id="switch-auth">${mode==='register'?'이미 계정이 있어요':'회원가입'}</button><button id="reset-password" ${enabled?'':'disabled'}>비밀번호 찾기</button></div><button class="duel-adventure" id="single">혼자 모험하기</button></section>`);
 bind('switch-auth',()=>authScreen(mode==='login'?'register':'login'));bind('single',back);
 content.querySelector<HTMLFormElement>('#auth-form')!.onsubmit=async e=>{e.preventDefault();if(!auth)return;const form=new FormData(e.target as HTMLFormElement),button=content.querySelector<HTMLButtonElement>('form button')!;button.disabled=true;try{
  const credential=mode==='register'?await createUserWithEmailAndPassword(auth,String(form.get('email')),String(form.get('password'))):await signInWithEmailAndPassword(auth,String(form.get('email')),String(form.get('password')));
  if(mode==='register'){await updateProfile(credential.user,{displayName:String(form.get('nickname')).trim()});await credential.user.getIdToken(true);}user=credential.user;lobby();
 }catch(e){status(errorText(e));button.disabled=false;}};
 bind('reset-password',async()=>{const email=content.querySelector<HTMLInputElement>('[name=email]')!.value;if(!email||!auth){status('이메일을 먼저 적어 주세요.');return;}try{await sendPasswordResetEmail(auth,email);status('비밀번호 재설정 안내를 요청했어요. 이메일을 확인해 주세요.');}catch(e){status(errorText(e));}});
}
function disposeRoom(){clearTimeout(roomPoll);roomPoll=undefined;const id=listingId,claim=listingClaim,hosting=peer?.side===0;if(id)void roomRequest({action:hosting?'close':'release',id,claim}).catch(()=>{});listingId='';listingClaim='';listingExpires=0;listingClosing=false;listingRetryAt=0;peer?.dispose();peer=null;state=null;room='';offerCode='';answerCode='';quoteNonce='';recorded='';lastRound=-1;}
function profileText(){return `${user?.displayName||'수호자'} · 계정 Lv.${progress.level} · ${progress.wins}승 ${progress.losses}패 · 경험치 ${progress.experience}${firebaseEmulator?' · 테스트 계정':''}`;}
function lobby(){
 if(!user){authScreen();return;}
 show('lobby',`<p class="eyebrow">소수로 겨루는 1:1 · 방 목록</p><h2>수호자의 대기실</h2><p id="profile-name"></p><p>두 사람 중 낮은 계정 레벨로 같은 문제를 풀어요. 방 목록에서 친구를 찾아 참가해요!</p><div class="duel-row"><button class="duel-primary" id="create-room">방 만들기</button><button id="return-room">현재 방 돌아가기</button><button id="close-current-room">현재 방 닫기</button></div><section class="room-directory"><div class="duel-row"><h3>입장할 수 있는 방</h3><button id="refresh-rooms">목록 새로고침</button></div><div id="room-list" role="region" aria-label="생성된 방 목록">방 목록을 불러오는 중이에요.</div><p class="room-note">새 방은 목록 새로고침을 눌러 확인해요. 만든 뒤 5분이 지난 방은 화면에서도 사라져요.</p></section><p data-feedback role="status"></p><p>방 목록과 비밀번호 확인은 중앙 서버가 맡고, 전투는 방을 만든 친구의 컴퓨터에서 진행돼요. 호스트는 창을 열어 두세요.</p><div class="duel-row"><button id="duel-settings">게임 설정</button><button id="record-history">전적 · 오답 복습</button><button id="heroes-book">영웅 30종 도감</button><button id="worksheet-heroes">학습지 몬스터 선택</button><button id="sound-toggle"></button><button id="profile-edit">이름 바꾸기</button><button id="logout">로그아웃</button><button id="single">혼자 모험하기</button></div><p id="pending-records"></p>`);
 document.getElementById('profile-name')!.textContent=progressLoading?'계정 레벨을 불러오는 중이에요…':profileText();
 (document.getElementById('create-room') as HTMLButtonElement).disabled=progressLoading;
 document.getElementById('pending-records')!.textContent=pendingCount(user.uid)?`저장 대기 경기 ${pendingCount(user.uid)}개 · 연결되면 자동 저장해요.`:'';
 document.getElementById('sound-toggle')!.textContent=`효과음 ${sound.sfx?'끄기':'켜기'}`;
 bind('worksheet-heroes',()=>rewardCollection(true));bind('duel-settings',()=>settings(true));bind('record-history',history);bind('refresh-rooms',()=>loadRooms());
 bind('sound-toggle',()=>{sound.sfx=!sound.sfx;persistAudio('sfx',sound.sfx);audioControls.refresh();lobby();});
 bind('create-room',()=>{if(canEnterRoom())createRoomScreen();});
 bind('return-room',()=>peer?(state?.players[1]?close():connectionScreen()):status('먼저 방을 만들거나 참가해 주세요.'));
 bind('close-current-room',()=>{if(state?.status==='playing'){status('진행 중인 대전은 나가기 버튼으로 끝내 주세요.');return;}void cancelRoom();});
 bind('heroes-book',()=>heroBook(true));bind('single',()=>exitGame());
 bind('logout',async()=>{if(state?.status==='playing')await send({type:'surrender'});await saveFinished();disposeRoom();if(auth)await signOut(auth);authScreen();});
 bind('profile-edit',()=>{show('profile','<h2>수호자 이름 변경</h2><form id="profile-form"><label>새 이름<input name="nickname" minlength="2" maxlength="16" required></label><button class="duel-primary">계정에 저장</button></form><p data-feedback></p><button id="profile-back">대기실</button>');bind('profile-back',lobby);content.querySelector<HTMLFormElement>('form')!.onsubmit=async e=>{e.preventDefault();if(!user)return;try{await updateProfile(user,{displayName:String(new FormData(e.target as HTMLFormElement).get('nickname')).trim()});await user.getIdToken(true);lobby();}catch(e){status(errorText(e));}};});
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
function createRoomScreen(){
 show('create-room',`<p class="eyebrow">친구와 함께 지키는 불꽃</p><h2>방 만들기</h2><form id="create-room-form"><label>방 이름<input name="title" minlength="2" maxlength="24" required autocomplete="off"></label><label>입장 방식<select id="room-access" name="access"><option value="public">공개방 · 누구나 입장</option><option value="password">비밀번호 방 · 아는 친구만 입장</option></select></label><label id="room-password-label" hidden>방 비밀번호<input name="password" type="password" minlength="4" maxlength="32" autocomplete="new-password" placeholder="4~32글자"></label><label class="setting"><span>서로 다른 인터넷 · 주소 찾기 보조(STUN)<small>같은 Wi-Fi/LAN에서 기본으로 직접 연결해요.</small></span><input id="internet-mode" type="checkbox" ${internetMode?'checked':''}></label><p>게임 시작 또는 생성 후 5분이 지나면 목록에서 사라져요.</p><p data-feedback role="status"></p><div class="duel-row"><button type="button" id="create-back">대기실로</button><button class="duel-primary" id="publish-room">방 생성</button></div></form>`);
 (content.querySelector('[name=title]') as HTMLInputElement).value=(user?.displayName||'수호자')+'의 방';
 const password=content.querySelector<HTMLInputElement>('[name=password]')!;document.getElementById('room-access')!.onchange=()=>{const locked=(document.getElementById('room-access') as HTMLSelectElement).value==='password';document.getElementById('room-password-label')!.hidden=!locked;password.required=locked;if(!locked)password.value='';};bind('create-back',()=>{if(!busy)lobby();});
 content.querySelector<HTMLFormElement>('#create-room-form')!.onsubmit=async e=>{e.preventDefault();if(!canEnterRoom())return;const data=new FormData(e.target as HTMLFormElement);busy=true;(document.getElementById('publish-room') as HTMLButtonElement).disabled=true;
 try{internetMode=(document.getElementById('internet-mode') as HTMLInputElement).checked;startPeer();const local=peer!;offerCode=await local.create();const result=await roomRequest<{room:ListedRoom;now:number}>({action:'create',id:local.id,offer:offerCode,title:String(data.get('title')),access:String(data.get('access')),password:String(data.get('password')||''),internet:internetMode});if(peer!==local)return;serverOffset=result.now-Date.now();listingId=local.id;listingExpires=result.room.expiresAt;connectionScreen();watchRoom(local);}
 catch(e){disposeRoom();status(errorText(e));}finally{busy=false;const button=document.getElementById('publish-room') as HTMLButtonElement|null;if(button)button.disabled=false;refresh();}};
}
function passwordRoomScreen(row:ListedRoom){
 show('room-password','<p class="eyebrow">비밀번호 방</p><h2 id="password-room-name"></h2><form id="room-password-form"><label>방 비밀번호<input name="room-password" type="password" required maxlength="32" autocomplete="off"></label><p data-feedback role="status"></p><div class="duel-row"><button type="button" id="password-back">방 목록으로</button><button class="duel-primary">입장하기</button></div></form>');document.getElementById('password-room-name')!.textContent=row.title;bind('password-back',()=>{if(!busy)lobby();});content.querySelector<HTMLFormElement>('form')!.onsubmit=e=>{e.preventDefault();void joinListedRoom(row,String(new FormData(e.target as HTMLFormElement).get('room-password')));};
}
async function joinListedRoom(row:ListedRoom,password:string){
 if(!canEnterRoom())return;busy=true;try{const joined=await roomRequest<{offer:string;claim:string;internet:boolean;expiresAt:number}>({action:'join',id:row.id,password});internetMode=joined.internet;startPeer();const local=peer!;listingId=row.id;listingClaim=joined.claim;listingExpires=joined.expiresAt;answerCode=await local.join(joined.offer);side=1;room=local.id.slice(0,8).toUpperCase();await roomRequest({action:'answer',id:row.id,claim:listingClaim,answer:answerCode});if(peer!==local)return;connectionScreen();watchRoom(local);}
 catch(e){if(listingId)disposeRoom();status(errorText(e));}finally{busy=false;refresh();}
}
function connectionScreen(){
 const hosting=peer?.side===0;show('connection',`<p class="eyebrow">${hosting?'내 컴퓨터가 호스트':'친구의 컴퓨터에 직접 접속'}</p><h2>${hosting?'친구의 입장을 기다리고 있어요':'호스트에 연결하고 있어요'}</h2><p>${hosting?'방이 중앙 목록에 등록되었어요. 친구가 공개방 또는 비밀번호로 입장하면 자동으로 연결돼요.':'비밀번호 확인과 접속 정보 교환을 마쳤어요. 연결되면 대전 화면으로 이동해요.'}</p><p data-feedback role="status"></p><div class="duel-row"><button id="connection-back">대기실 · 방 목록</button><button id="connection-cancel">연결 취소 · 방 닫기</button></div>`);bind('connection-back',lobby);bind('connection-cancel',()=>cancelRoom());
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
  if(local.state?.status==='playing'||local.state?.status==='finished'){if(local.side===0)await closeListing();if(!listingId||local.side===1){watching=false;clearTimeout(roomPoll);roomPoll=undefined;}return;}
  if(connected){if(local.side===0&&!connectedAck&&listingId){await roomRequest({action:'connected',id:listingId});connectedAck=true;}watching=false;clearTimeout(roomPoll);roomPoll=undefined;return;}
  if(Date.now()+serverOffset>=listingExpires)throw Error('방을 만든 뒤 5분이 지나 목록에서 사라졌어요. 새 방을 만들어 주세요.');
  if(local.side===0&&!accepted){const result=await roomRequest<{answer:string;guestUid:string}>({action:'poll',id:listingId});if(result.answer){local.allowedGuestUid=result.guestUid;accepted=true;acceptedAt=Date.now();await local.accept(result.answer);}}
  if(local.side===1&&Date.now()-enteredAt>25000||accepted&&Date.now()-acceptedAt>20000)throw Error('호스트에 직접 연결하지 못했어요. 같은 Wi-Fi인지 확인하고 새 방을 만들어 주세요.');
 }catch(e){if(peer===local){if(local.connected&&local.state?.players[1]){watching=false;clearTimeout(roomPoll);roomPoll=undefined;return;}watching=false;disposeRoom();lobby();status(errorText(e));}}finally{polling=false;if(watching&&peer===local)roomPoll=setTimeout(()=>void poll(),Date.now()-enteredAt<60000?5000:10000);}};
 void poll();
}
function startPeer(){
 disposeRoom();peer=new HostPeer({uid:user!.uid,name:(user!.displayName||'수호자').slice(0,16),accountLevel:progress.level,rewardHeroes:ownedHeroIds(),rewardHero:selectedWorksheetHero()},internetMode);slots=[];selectedType='';selectedTower=0;
 peer.onStatus=status;peer.onState=(s,c)=>{state=s;side=peer!.side;room=peer!.id.slice(0,8).toUpperCase();connected=c;const p=s.players[side]!;if(p.round!==lastRound){slots=[];lastRound=p.round;}refresh();
  if(s.status==='playing'||s.status==='finished'){if(peer!.side===0&&listingId)void closeListing();}
  if(s.status==='finished'){if(recorded!==peer!.id){void saveFinished();result();}return;}
  if(c&&s.players[1]&&['connection','room-password','create-room'].includes(dialogKind))close();
  if(p.quote){if(quoteNonce!==p.quote.nonce){quoteNonce=p.quote.nonce;purchase();}}else if(dialogKind==='purchase'){quoteNonce='';close();}
 };
}
async function saveFinished(){
 if(!state||!peer||!user)return;const record=finishedRecord(state,side,peer.id);if(!record)return;
 importLearningRecords([record]);
 if(recorded!==peer.id){recorded=peer.id;saveMessage=queueResult(record)?'경기 기록을 이 브라우저에 보관하고 Firebase 저장을 요청해요.':'브라우저 저장 공간이 부족해요. 이 창을 닫기 전에 기록 저장을 다시 시도해 주세요.';}
 const uid=user.uid,saved=await flushResults(uid);if(user?.uid!==uid)return;saveMessage=saved.message;if(saved.progress)progress=saved.progress;const e=document.getElementById('result-save');if(e)e.textContent=saveMessage;const profile=document.getElementById('profile-name');if(profile)profile.textContent=profileText();
}
function wrongText(q:WrongQuestion){if(![q.a,q.b,q.correct].every(n=>n>=0&&n<10000))return '이전 학습 범위의 문항 · 새 문항은 자연수 부분이 한 자리예요.';const digits=Math.max(precision(q.a),precision(q.b),precision(q.correct));return `${q.kind==='tower'?'타워 구매':'돌 알 합성'}: ${numberText(q.a,digits)} ${q.operation==='-'?'−':'+'} ${numberText(q.b,digits)} = ${numberText(q.correct,digits)} · 내 답 ${q.submitted||'(비어 있음)'} · ${q.attempts}회 틀림`;}
async function history(){
 show('history','<h2>전적 · 오답 복습 · 최근 20경기</h2><p id="history-summary"></p><div id="history-list">경기 기록을 불러오고 있어요.</div><p data-feedback></p><button id="history-back">대기실</button>');bind('history-back',lobby);
 document.getElementById('history-summary')!.textContent=profileText();
 try{const rows=await loadHistory(user!.uid);importLearningRecords(rows);const root=document.getElementById('history-list');if(!root)return;root.replaceChildren();if(!rows.length)root.textContent='아직 저장한 경기가 없어요.';
 for(const r of rows){const details=document.createElement('details'),title=document.createElement('summary');title.textContent=`${new Date(r.endedAt).toLocaleString('ko-KR')} · ${r.outcome==='win'?'승리':r.outcome==='loss'?'패배':'무승부'} · 경험치 +${r.experienceGain} · 오답 ${r.wrongQuestions.length}문항`;details.append(title);for(const q of r.wrongQuestions){const p=document.createElement('p');p.textContent=wrongText(q);details.append(p);}root.append(details);}
 }catch(e){status(errorText(e));}
}
async function exitGame(){if(state?.status==='playing'){await send({type:'surrender'});await saveFinished();}disposeRoom();back();}
function purchase(){const q=state?.players[side]?.quote;if(!q)return;show('purchase',`<p class="eyebrow">${towerType(q.typeId)!.name} · 코인 뺄셈으로 설치</p><h2 class="duel-equation">${numberText(q.before,q.digits??3)} − ${numberText(q.cost,q.digits??3)} = ?</h2><p>${q.wallet!==q.before?'전체 보유금 중 위 코인만 사용해 계산해요. 나머지 코인은 그대로 보관돼요. ':''}대전은 계속돼요. 계산 중 얻은 보상은 문제를 닫은 뒤 더해져요.</p><form id="purchase-form"><label>남는 코인<input name="answer" inputmode="decimal" autocomplete="off" maxlength="12" placeholder="정답을 입력해요" required></label><div class="duel-keypad">${['7','8','9','4','5','6','1','2','3','0','.','⌫'].map(k=>`<button type="button" data-key="${k}">${k}</button>`).join('')}</div><p data-feedback role="status"></p><div class="duel-row"><button type="button" id="cancel-purchase">취소 · 돈 유지</button><button class="duel-primary">정답 확인 · 설치</button></div></form>`);
 const input=content.querySelector<HTMLInputElement>('[name=answer]')!;input.focus();content.querySelectorAll<HTMLButtonElement>('[data-key]').forEach(b=>b.onclick=()=>{const k=b.dataset.key!;if(k==='⌫')input.value=input.value.slice(0,-1);else if(k==='.'&&!input.value.includes('.'))input.value=(input.value||'0')+'.';else if(/^\d$/.test(k)&&input.value.length<12)input.value+=k;});
 bind('cancel-purchase',()=>send({type:'cancel'}));content.querySelector<HTMLFormElement>('form')!.onsubmit=async e=>{e.preventDefault();await send({type:'answer',nonce:q.nonce,answer:input.value});};
}
function heroBook(fromLobby=false){const egg=state?.players[side]?.egg??0;show('heroes',`<p class="eyebrow">돌의 영웅 · 레벨마다 3종</p><h2>${fromLobby?'영웅 몬스터 30종':'부화할 영웅 선택 · 돌 알 Lv.'+egg}</h2><p>가속형은 주변 아군을 빠르게, 군집형은 돌 병사와 함께, 수호형은 감속에 강해요. 정답을 더 맞히면 더 높은 레벨의 영웅 한 마리가 나와요.</p><div class="hero-grid">${(fromLobby?HEROES:heroesAtLevel(egg)).map(h=>`<button class="hero-card" data-hero="${h.id}" ${fromLobby?'disabled':''}><span class="hero-crop" style="background-image:url('${artURL(h.sheet)}');background-position:0% ${h.row*50}%"></span><strong>Lv.${h.level} · ${h.name}</strong><span>체력 ${numberText(h.hp)}</span><small>${h.description}</small>${fromLobby?'':'<span class="duel-gold">이 영웅 부화 ▶</span>'}</button>`).join('')}</div><p data-feedback role="status"></p><button id="hero-back">${fromLobby?'대기실로':'더 성장시키기 · 닫기'}</button>`);
 bind('hero-back',()=>fromLobby?lobby():close());content.querySelectorAll<HTMLButtonElement>('[data-hero]').forEach(b=>b.onclick=async()=>{const r=await send({type:'hatch',heroId:b.dataset.hero!});if(r?.ok){sound.play('kill');close();}});
}
function rewardCollection(fromLobby=true){
 const p=state?.players[side],frozen=!!state&&(state.status!=='waiting'||!!p?.ready),selected=p?.rewardHero??selectedWorksheetHero();
 show('collection',`<p class="eyebrow">학습지 보상 · 대전당 한 번</p><h2>함께 출발할 몬스터 선택</h2>${frozen?'<p>준비를 마쳤어요. 선택은 다음 대전 전에 바꿀 수 있어요.</p>':''}${collectionHTML(selected,frozen)}<p data-feedback role="status"></p><div class="duel-row"><button id="collection-back">${fromLobby?'대기실로':'대전으로'}</button><a href="/?mode=worksheet" target="_blank" rel="noopener">학습지 · 암호 입력 ↗</a></div>`);
 bind('collection-back',()=>fromLobby?lobby():close());content.querySelectorAll<HTMLButtonElement>('[data-collection-hero]').forEach(b=>b.onclick=async()=>{if(frozen||busy)return;try{const id=b.dataset.collectionHero!;if(peer&&state){const reply=await send({type:'select-reward',heroId:id});if(!reply?.ok)return;}await selectWorksheetHero(id);rewardCollection(fromLobby);}catch(e){status(errorText(e));}});
}
function result(){const won=state?.winner===side,draw=state?.winner===null,record=state&&peer?finishedRecord(state,side,peer.id):null;show('result',`<p class="eyebrow">호스트 직접 연결 · 대전 종료</p><h2>${draw?'함께 지킨 불꽃 · 무승부':won?'상대 불꽃을 이겼어요!':'다음에는 다른 전략으로!'}</h2><p id="result-reason"></p><p>합성 정답 ${state?.players[side]?.solved??0}회 · 남은 불꽃 ${numberText(state?.players[side]?.flame??0)} · 경험치 +${record?matchExperience(record):0}</p><p id="result-save"></p><div id="result-wrong"></div><div class="duel-row"><button id="retry-save">기록 저장 다시 시도</button><button class="duel-primary" id="result-lobby">새 대전 준비</button></div>`);document.getElementById('result-reason')!.textContent=state?.reason||'';document.getElementById('result-save')!.textContent=record?saveMessage:'대전 시작 전 종료된 방은 승패·경험치에 포함하지 않아요.';
 const root=document.getElementById('result-wrong')!;for(const q of record?.wrongQuestions??[]){const p=document.createElement('p');p.textContent=wrongText(q);root.append(p);}bind('retry-save',saveFinished);bind('result-lobby',()=>{disposeRoom();lobby();});}
scene.onCell=async(x,y)=>{if(!dialog.classList.contains('hidden')||!state)return;const p=state.players[side]!;
 const tower=p.towers.find(t=>t.x===x&&t.y===y);if(tower){selectedTower=tower.id;selectedType='';refresh();return;}
 if(selectedType){if(!validDuelCell(state,side,x,y)){status('내 쪽 빈 바닥에 설치해요. 길에는 지을 수 없어요.');scene.preview(x,y);return;}await send({type:'quote',x,y,typeId:selectedType});}
};
scene.onAction=async key=>{sound.resume();sound.play('ui');
 if(key.startsWith('type:')){selectedType=key.slice(5);selectedTower=0;status('내 쪽 빈 바닥을 골라요. 계산 중에도 전투는 계속돼요.');scene.preview(-1,-1);return;}
 if(key.startsWith('block:')){const i=Number(key.slice(6));if(!slots.includes(i)&&slots.length<3)slots.push(i);refresh();return;}
 if(key.startsWith('slot:')){slots.splice(Number(key.slice(5)),1);refresh();return;}
 if(key==='op:+'||key==='op:-'){operation=key==='op:-'?'-':'+';refresh();return;}
 switch(key){
  case 'page:prev':shopPage=0;refresh();break;case 'page:next':shopPage=1;refresh();break;
  case 'ready':await send({type:'ready'});break;
  case 'fuse':await send({type:'fuse',round:state!.players[side]!.round,slots:[...slots],operation});break;
  case 'toggle':await send({type:'toggle',towerId:selectedTower});break;
  case 'sell':await send({type:'sell',towerId:selectedTower});selectedTower=0;refresh();break;
  case 'hatch':heroBook();break;case 'heroes':heroBook(true);break;
  case 'reserve':if(state?.status==='waiting')rewardCollection(false);else {const reply=await send({type:'summon-reward'});if(reply?.ok)sound.play('kill');}break;
  case 'lobby':lobby();break;
  case 'settings':settings();break;
  case 'leave':if(state&&state.status!=='finished'){show('leave','<h2>대전을 나갈까요?</h2><p>진행 중인 대전은 상대의 승리로 끝나요.</p><div class="duel-row"><button id="stay">계속하기</button><button id="surrender" class="duel-primary">나가기</button></div>');bind('stay',close);bind('surrender',exitGame);}else exitGame();break;
 }
};
let controlsSignature='';
scene.onControls=()=>{if(scene.input)scene.input.enabled=dialog.classList.contains('hidden');const p=state?.players[side];document.getElementById('duel-state')!.textContent=state&&p?`방 ${room} · ${state.status} · 내 불꽃 ${numberText(p.flame)} · 코인 ${numberText(p.money)} · 학습 Lv.${state.learningLevel??1} ${learningDescription(state.learningLevel??1)} · 돌 알 Lv.${p.egg} · 영웅 ${state.enemies.filter(e=>e.hero).length}마리 · ${state.log.at(-1)||''}`:'대전 대기실';const container=document.getElementById('duel-controls')!;const signature=JSON.stringify([dialog.classList.contains('hidden'),[...scene.controls].map(([key,c])=>[key,c.label,c.enabled])]);if(signature===controlsSignature)return;controlsSignature=signature;container.replaceChildren();if(!dialog.classList.contains('hidden'))return;for(const [key,c]of scene.controls){const b=document.createElement('button');b.type='button';b.dataset.duelAction=key;b.textContent=c.label;b.disabled=!c.enabled;b.onclick=c.run;container.append(b);}};
if(auth)onAuthStateChanged(auth,async value=>{user=value;progressLoading=!!value;if(!value){disposeRoom();progress=emptyProgress();authScreen();return;}lobby();try{const loaded=await loadProgress(value.uid);if(user?.uid!==value.uid)return;progress=loaded;const saved=await flushResults(value.uid);if(user?.uid!==value.uid)return;if(saved.progress)progress=saved.progress;const oldMatches=await loadLearningHistory(value.uid);if(user?.uid===value.uid)importLearningRecords(oldMatches);}catch(e){status(errorText(e));}finally{if(user?.uid===value.uid){progressLoading=false;if(dialogKind==='lobby')lobby();}}});else authScreen();
window.addEventListener('online',()=>{if(!user)return;const uid=user.uid;void flushResults(uid).then(saved=>{if(user?.uid!==uid)return;if(saved.progress)progress=saved.progress;if(dialogKind==='result'){saveMessage=saved.message;document.getElementById('result-save')!.textContent=saveMessage;}else if(dialogKind==='lobby')lobby();});});
window.addEventListener('beforeunload',e=>{if(state?.status==='playing'){e.preventDefault();e.returnValue='';}});
window.addEventListener('pagehide',()=>sound.dispose());
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&dialogKind==='purchase')send({type:'cancel'});else if(e.key==='Escape'&&['heroes','leave'].includes(dialogKind))close();});
if((import.meta as ImportMeta&{env:{DEV:boolean}}).env.DEV)Object.assign(window,{__duelTest:{get state(){return state;},get side(){return side;},get room(){return room;},scene,send,view,get peer(){return peer;},get progress(){return progress;},pendingCount,get user(){return user;}}});
