import assert from 'node:assert/strict';import {mkdirSync,writeFileSync} from 'node:fs';import {createRequire} from 'node:module';
import {initializeApp,deleteApp} from 'firebase/app';import {getAuth,connectAuthEmulator,createUserWithEmailAndPassword} from 'firebase/auth';import {getFunctions,connectFunctionsEmulator,httpsCallable} from 'firebase/functions';import {getFirestore,connectFirestoreEmulator,doc,getDoc} from 'firebase/firestore';
const require=createRequire(new URL('../functions/package.json',import.meta.url)),admin=require('firebase-admin/app'),adminFirestore=require('firebase-admin/firestore');process.env.FIRESTORE_EMULATOR_HOST='127.0.0.1:8080';const adminApp=admin.initializeApp({projectId:'demo-decimal-defense'},'rooms-check'),db=adminFirestore.getFirestore(adminApp);
const apps=[],checks=[],stamp=Date.now();const check=(name,value=true)=>{assert.ok(value,name);checks.push(name);console.log('PASS',name);};
async function client(i,signed=true){const app=initializeApp({apiKey:'demo-key',projectId:'demo-decimal-defense'},'rooms-'+stamp+'-'+i);apps.push(app);const a=getAuth(app);connectAuthEmulator(a,'http://127.0.0.1:9099',{disableWarnings:true});if(signed)await createUserWithEmailAndPassword(a,`rooms-${i}-${stamp}@duel.invalid`,'Emulator-only-123!');const f=getFunctions(app,'asia-northeast3');connectFunctionsEmulator(f,'127.0.0.1',5001);const store=getFirestore(app);connectFirestoreEmulator(store,'127.0.0.1',8080);return {uid:a.currentUser?.uid,store,call:async data=>(await httpsCallable(f,'duelRoom')(data)).data};}
function code(kind,id,uid){return 'SDS1.'+Buffer.from(JSON.stringify({v:1,kind,id,host:{uid,name:'서버 검증'},sdp:{type:kind,sdp:'emulator SDP fixture'}})).toString('base64');}
async function rejected(fn,code,name){await assert.rejects(fn,e=>e.code===code);check(name);}
try{
 const [host,guest,other,limited,anonymous]=await Promise.all([client(0),client(1),client(2),client(3),client(4,false)]),id=crypto.randomUUID(),offer=code('offer',id,host.uid),password='Private-5678';
 await rejected(()=>anonymous.call({action:'list'}),'functions/unauthenticated','로그인 없는 방 목록 접근 거부');
 await rejected(()=>host.call({action:'create',id,offer,title:'비밀 방',access:'password',password:'',internet:false}),'functions/invalid-argument','비밀번호 방의 빈 비밀번호 거부');
 const created=await host.call({action:'create',id,offer,title:'서버 비밀번호 검증',access:'password',password,internet:false,expiresAt:9999999999999});check('방 수명은 클라이언트 값과 무관하게 서버 시각으로 5분',created.room.expiresAt-created.room.createdAt===300000);
 const rows=await guest.call({action:'list'}),row=rows.rooms.find(r=>r.id===id);check('중앙 목록에서 비밀번호 방 확인 · 비밀 정보 제외',row.protected&&row.players===1&&!JSON.stringify(row).match(/SDS1|passwordHash|claim|Private-5678/));
 const stored=await db.doc('decimalLobbyPrivate/'+id).get();check('평문 비밀번호 저장 없음 · 소금과 scrypt 해시 사용',stored.data().salt.length===32&&stored.data().passwordHash.length===64&&!JSON.stringify(stored.data()).includes(password));
 await rejected(()=>getDoc(doc(guest.store,'decimalLobbyPrivate',id)),'permission-denied','클라이언트에서 비밀번호 해시·접속 정보 직접 읽기 거부');
 await rejected(()=>guest.call({action:'join',id,password:'wrong'}),'functions/permission-denied','틀린 비밀번호로 입장 거부');
 check('오답 입력은 방 인원을 늘리지 않음',(await host.call({action:'list'})).rooms.find(r=>r.id===id).players===1);
 for(let i=0;i<5;i++)await rejected(()=>limited.call({action:'join',id,password:'wrong'}),'functions/permission-denied',`비밀번호 오류 ${i+1}회 집계`);
 await rejected(()=>limited.call({action:'join',id,password}),'functions/resource-exhausted','반복 비밀번호 오류 후 1분 잠금');
 const joined=await guest.call({action:'join',id,password});check('올바른 비밀번호로 접속 정보와 본인 입장 토큰 획득',joined.offer===offer&&joined.claim.length===48);
 await rejected(()=>other.call({action:'join',id,password}),'functions/already-exists','1:1 방의 세 번째 참가자 거부');
 await rejected(()=>other.call({action:'poll',id}),'functions/permission-denied','호스트 외 응답 정보 읽기 거부');
 await rejected(()=>other.call({action:'answer',id,claim:joined.claim,answer:code('answer',id,host.uid)}),'functions/permission-denied','입장 토큰을 훔쳐도 다른 계정의 응답 쓰기 거부');
 const answer=code('answer',id,host.uid);await guest.call({action:'answer',id,claim:joined.claim,answer});check('참가자 응답을 호스트만 받아 자동 연결',(await host.call({action:'poll',id})).answer===answer);
 await host.call({action:'connected',id});check('연결 후 준비 중인 방은 2/2로 표시',(await guest.call({action:'list'})).rooms.find(r=>r.id===id).players===2);
 await rejected(()=>guest.call({action:'close',id}),'functions/permission-denied','참가자의 호스트 방 삭제 거부');await host.call({action:'close',id});check('호스트 시작·취소 요청으로 목록과 비밀 접속 정보 모두 삭제',!(await db.doc('decimalLobby/'+id).get()).exists&&!(await db.doc('decimalLobbyPrivate/'+id).get()).exists);
 const id2=crypto.randomUUID();await host.call({action:'create',id:id2,offer:code('offer',id2,host.uid),title:'공개 만료 방',access:'public',internet:false});const j2=await guest.call({action:'join',id:id2,password:''});check('공개방은 비밀번호 없이 입장',!!j2.claim);await guest.call({action:'release',id:id2,claim:j2.claim});check('연결 취소 후 방의 입장 예약 해제',(await host.call({action:'list'})).rooms.find(r=>r.id===id2).players===1);
 const batch=db.batch();for(const c of ['decimalLobby','decimalLobbyPrivate'])batch.update(db.doc(c+'/'+id2),{expiresAt:Date.now()-1});await batch.commit();await rejected(()=>guest.call({action:'join',id:id2,password:''}),'functions/not-found','5분 만료 경계 이후 목록에 남은 자료로도 입장 거부');
 check('목록 조회에서 만료 방 숨김·서버 자료 정리',!(await host.call({action:'list'})).rooms.some(r=>r.id===id2)&&!(await db.doc('decimalLobby/'+id2).get()).exists&&!(await db.doc('decimalLobbyPrivate/'+id2).get()).exists);
 await host.call({action:'close',id:id2});const reopened=crypto.randomUUID();await host.call({action:'create',id:reopened,offer:code('offer',reopened,host.uid),title:'재생성 검증',access:'public',internet:false});check('만료 자료 정리 뒤 닫기와 새 방 생성 정상');await host.call({action:'close',id:reopened});
 mkdirSync('test-results/rooms',{recursive:true});writeFileSync('test-results/rooms/server-results.json',JSON.stringify({checks},null,2));
}finally{await Promise.all(apps.map(deleteApp));await admin.deleteApp(adminApp);}
