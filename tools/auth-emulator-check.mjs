import assert from 'node:assert/strict';
import {randomUUID,randomBytes} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';

const project='demo-decimal-defense',origin='http://127.0.0.1:9099';
const checks=[],started=Date.now();let localRequests=0,blockedRequests=0,created=null,cleanedUp=false;
// Even accidental SDK defaults must never reach a production host.
const originalFetch=globalThis.fetch;
globalThis.fetch=async(input,options)=>{
 const url=new URL(typeof input==='string'||input instanceof URL?input:input.url);
 if(url.protocol!=='http:'||url.hostname!=='127.0.0.1'||url.port!=='9099'){blockedRequests++;throw Error('Non-emulator request blocked');}
 localRequests++;return originalFetch(input,options);
};
// Install the guard before Firebase captures fetch during module initialization.
const {initializeApp,deleteApp}=await import('firebase/app');
const {initializeAuth,inMemoryPersistence,connectAuthEmulator,createUserWithEmailAndPassword,updateProfile,reload,signOut,signInWithEmailAndPassword,sendPasswordResetEmail,verifyPasswordResetCode,confirmPasswordReset,deleteUser}=await import('firebase/auth');
const email=`${randomUUID()}@disposable.invalid`,password=randomBytes(18).toString('base64url'),newPassword=randomBytes(18).toString('base64url'),displayName='검증용 수호자';
const app=initializeApp({apiKey:'demo-decimal-key',authDomain:'127.0.0.1',projectId:project,appId:'demo-decimal-app'},`auth-check-${randomUUID()}`);
const auth=initializeAuth(app,{persistence:inMemoryPersistence});connectAuthEmulator(auth,origin,{disableWarnings:true});
const failureCode=error=>typeof error?.code==='string'&&/^auth\/[a-z-]+$/.test(error.code)?error.code:'check-failed';
async function check(name,run){try{await run();checks.push({name,passed:true});}catch(error){checks.push({name,passed:false,error:failureCode(error)});throw error;}}
async function rejected(run,codes){let error;try{await run();}catch(caught){error=caught;}assert.ok(error);assert.ok(codes.includes(error.code));}
try{
 await check('회원가입',async()=>{const credential=await createUserWithEmailAndPassword(auth,email,password);created=credential.user;assert.ok(auth.currentUser);assert.equal(created.email,email);});
 await check('이름 저장과 프로필 재조회',async()=>{await updateProfile(created,{displayName});await reload(created);assert.equal(created.displayName,displayName);});
 await check('로그아웃',async()=>{await signOut(auth);assert.equal(auth.currentUser,null);});
 await check('잘못된 비밀번호 거부',async()=>{await rejected(()=>signInWithEmailAndPassword(auth,email,password+'wrong'),['auth/wrong-password','auth/invalid-credential']);assert.equal(auth.currentUser,null);});
 await check('기존 계정 로그인과 프로필 유지',async()=>{const credential=await signInWithEmailAndPassword(auth,email,password);assert.equal(credential.user.uid,created.uid);assert.equal(credential.user.displayName,displayName);});
 await check('중복 이메일 회원가입 거부',async()=>{await signOut(auth);await rejected(()=>createUserWithEmailAndPassword(auth,email,password),['auth/email-already-in-use']);assert.equal(auth.currentUser,null);});
 await check('로컬 비밀번호 재설정 요청',async()=>{await sendPasswordResetEmail(auth,email);});
 let resetCode;
 await check('로컬 재설정 코드 확인',async()=>{
  const response=await fetch(`${origin}/emulator/v1/projects/${project}/oobCodes`);assert.equal(response.status,200);const payload=await response.json();
  resetCode=payload.oobCodes?.findLast(code=>code.email===email&&code.requestType==='PASSWORD_RESET')?.oobCode;assert.ok(resetCode);
  assert.equal(await verifyPasswordResetCode(auth,resetCode),email);
 });
 await check('새 비밀번호 적용',async()=>{await confirmPasswordReset(auth,resetCode,newPassword);});
 await check('사용한 재설정 코드 재사용 거부',async()=>{await rejected(()=>confirmPasswordReset(auth,resetCode,password),['auth/expired-action-code','auth/invalid-action-code']);});
 await check('이전 비밀번호 로그인 거부',async()=>{await rejected(()=>signInWithEmailAndPassword(auth,email,password),['auth/wrong-password','auth/invalid-credential']);assert.equal(auth.currentUser,null);});
 await check('새 비밀번호 로그인과 프로필 유지',async()=>{const credential=await signInWithEmailAndPassword(auth,email,newPassword);assert.equal(credential.user.uid,created.uid);assert.equal(credential.user.displayName,displayName);created=credential.user;});
}catch{/* Aggregate checks below omit personal data, tokens and reset codes. */}
finally{
 if(created){
  try{
   if(!auth.currentUser){try{created=(await signInWithEmailAndPassword(auth,email,newPassword)).user;}catch{created=(await signInWithEmailAndPassword(auth,email,password)).user;}}
   else created=auth.currentUser;
   await deleteUser(created);assert.equal(auth.currentUser,null);
   await rejected(()=>signInWithEmailAndPassword(auth,email,newPassword),['auth/user-not-found','auth/invalid-credential']);cleanedUp=true;checks.push({name:'검증 계정 삭제와 재로그인 거부',passed:true});
  }catch(error){checks.push({name:'검증 계정 삭제와 재로그인 거부',passed:false,error:failureCode(error)});}
 }
 await deleteApp(app);globalThis.fetch=originalFetch;
 const report={target:'로컬 Firebase Auth Emulator',project,origin,productionRequests:0,blockedNonEmulatorRequests:blockedRequests,externalEmailSent:false,localRequests,checks,total:checks.length,passed:checks.filter(check=>check.passed).length,failed:checks.filter(check=>!check.passed).length,cleanedUp,durationMs:Date.now()-started,limitations:['SDK와 로컬 Auth Emulator 통합 검증이며 실제 이메일 전달과 운영 계정 생성은 실행하지 않음','브라우저 폼 입력 UI는 이 스크립트의 검증 범위가 아님']};
 await mkdir('test-results',{recursive:true});await writeFile('test-results/priority-fixes-auth.json',JSON.stringify(report,null,2));
 console.log(JSON.stringify({total:report.total,passed:report.passed,failed:report.failed,cleanedUp,productionRequests:0,externalEmailSent:false}));
 if(report.failed||!cleanedUp||checks.length!==13||blockedRequests||localRequests<13)process.exitCode=1;
}
