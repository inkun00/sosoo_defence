import assert from 'node:assert/strict';
import {writeFileSync,mkdirSync} from 'node:fs';
import {initializeApp,deleteApp} from 'firebase/app';
import {getAuth,connectAuthEmulator,createUserWithEmailAndPassword} from 'firebase/auth';
import {getFirestore,connectFirestoreEmulator,doc,getDoc,setDoc,getDocs,collection} from 'firebase/firestore';
import {getFunctions,connectFunctionsEmulator,httpsCallable} from 'firebase/functions';
const projectId='demo-decimal-defense',stamp=Date.now(),apps=[],checks=[];
async function client(i,signed=true){const app=initializeApp({apiKey:'demo-decimal-defense',projectId,authDomain:projectId+'.firebaseapp.com'},'record-check-'+stamp+'-'+i);apps.push(app);const auth=getAuth(app);connectAuthEmulator(auth,'http://127.0.0.1:9099',{disableWarnings:true});const db=getFirestore(app);connectFirestoreEmulator(db,'127.0.0.1',8080);const functions=getFunctions(app,'asia-northeast3');connectFunctionsEmulator(functions,'127.0.0.1',5001);if(signed)await createUserWithEmailAndPassword(auth,`record-${i}-${stamp}@duel.invalid`,'Emulator-only-123!');return {auth,db,call:async(data)=>(await httpsCallable(functions,'duelSaveResult')(data)).data};}
const check=label=>{checks.push(label);console.log('PASS',label)};
const fails=async(fn,code,label)=>{await assert.rejects(fn,e=>e.code===code);check(label)};
try{
 const a=await client(0),b=await client(1),outsider=await client(2),guest=await client(3,false);
 const r={version:1,matchId:crypto.randomUUID(),hostUid:a.auth.currentUser.uid,guestUid:b.auth.currentUser.uid,side:0,outcome:'win',endedAt:Date.now(),duration:120,solved:4,purchases:3,wrongQuestions:[{id:'q1',kind:'tower',a:8800,b:100,operation:'-',submitted:'8.6',correct:8700,level:1,elapsed:3,attempts:2}]};
 await fails(()=>guest.call(r),'functions/unauthenticated','인증 없는 경기 기록 저장 거부');
 await fails(()=>outsider.call(r),'functions/invalid-argument','다른 계정의 승패·경험치 저장 거부');
 await fails(()=>a.call({...r,duration:999}),'functions/invalid-argument','끝난 경기 기록의 시간·자료 형식 검사');
 await fails(()=>a.call({...r,wrongQuestions:[{...r.wrongQuestions[0],correct:999999}]}),'functions/invalid-argument','잘못된 오답 정답 값 거부');
 await fails(()=>a.call({...r,wrongQuestions:[{...r.wrongQuestions[0],submitted:'8.7'}]}),'functions/invalid-argument','맞은 답을 오답 문항으로 저장하지 않음');
 const saved=await a.call({...r,experience:999999,level:99,enemies:[{hp:500}]});assert.equal(saved.progress.wins,1);assert.equal(saved.progress.experience,135);assert.equal(saved.progress.level,2);check('승리·정답 수로 경험치·레벨을 서버에서 계산');
 const twice=await a.call(r);assert.equal(twice.duplicate,true);assert.equal(twice.progress.experience,135);check('경기 ID로 중복 저장·중복 경험치 방지');
 await fails(()=>b.call({...r,side:1,outcome:'win'}),'functions/failed-precondition','같은 경기의 모순된 양쪽 승리 거부');
 const loss=await b.call({...r,side:1,outcome:'loss',solved:0,purchases:0,wrongQuestions:[]});assert.equal(loss.progress.losses,1);assert.equal(loss.progress.experience,40);check('상대 계정의 패배·경험치 별도 저장');
 const own=await getDoc(doc(a.db,'decimalUsers',r.hostUid,'matches',r.matchId));assert.equal(own.data().wrongQuestions[0].submitted,'8.6');assert.ok(!('enemies'in own.data())&&!('level'in own.data()));check('오답 문항 보존 · 전투 상태와 임의 레벨 저장 제외');
 await fails(()=>getDoc(doc(b.db,'decimalUsers',r.hostUid,'matches',r.matchId)),'permission-denied','상대방의 오답 기록 읽기 거부');
 await fails(()=>setDoc(doc(a.db,'decimalUsers',r.hostUid),{progress:{wins:999}}),'permission-denied','직접 전적·레벨 수정 거부');
 await fails(()=>setDoc(doc(a.db,'decimalRooms','TESTROOM'),{money:999}),'permission-denied','중앙 실시간 방 상태 쓰기 거부');
 const rows=await getDocs(collection(a.db,'decimalUsers',r.hostUid,'matches'));assert.equal(rows.size,1);check('내 경기 기록 목록 읽기');
 const draw=await a.call({...r,matchId:crypto.randomUUID(),outcome:'draw',solved:0,purchases:0,duration:5,wrongQuestions:[]});assert.equal(draw.progress.draws,1);assert.equal(draw.progress.experience,135);check('무승부 보존 · 10초 미만 경험치 반복 획득 방지');
 assert.equal((await a.call(r)).progress.draws,1);check('예전 경기 저장 재시도에서 최신 누적 전적 유지');
 mkdirSync('test-results/host-p2p',{recursive:true});writeFileSync('test-results/host-p2p/records-server-results.json',JSON.stringify({checks,matchId:r.matchId},null,2));
}finally{await Promise.all(apps.map(deleteApp));}
