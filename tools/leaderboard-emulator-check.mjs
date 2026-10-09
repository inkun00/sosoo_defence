import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';

// Run only against the local demo project, after building Functions and starting
// its Auth, Firestore and Functions emulators. Never reset shared emulator data.
const projectId='demo-decimal-defense',authHost='127.0.0.1:9099',firestoreHost='127.0.0.1:8080',functionsHost='127.0.0.1:5001';
for(const key of ['GCLOUD_PROJECT','GOOGLE_CLOUD_PROJECT','GCP_PROJECT']){
 if(process.env[key]&&process.env[key]!==projectId)throw Error('Refusing a non-demo project environment');
}
for(const [key,host]of [['FIRESTORE_EMULATOR_HOST',firestoreHost],['FIREBASE_AUTH_EMULATOR_HOST',authHost]]){
 if(process.env[key]&&process.env[key]!==host)throw Error('Refusing a non-local emulator environment');
}
if(process.env.FIREBASE_CONFIG){
 let config;try{config=JSON.parse(process.env.FIREBASE_CONFIG);}catch{throw Error('Refusing an unknown Firebase configuration');}
 if(config.projectId!==projectId)throw Error('Refusing a non-demo Firebase configuration');
}
Object.assign(process.env,{GCLOUD_PROJECT:projectId,GOOGLE_CLOUD_PROJECT:projectId,FIREBASE_CONFIG:JSON.stringify({projectId}),FIRESTORE_EMULATOR_HOST:firestoreHost,FIREBASE_AUTH_EMULATOR_HOST:authHost});

let localRequests=0,blockedRequests=0;
const originalFetch=globalThis.fetch;
// Install before Firebase initializes: SDK requests cannot use a production URL.
globalThis.fetch=async(input,options)=>{
 const url=new URL(typeof input==='string'||input instanceof URL?input:input.url);
 if(url.protocol!=='http:'||url.hostname!=='127.0.0.1'||!['9099','8080','5001'].includes(url.port)){
  blockedRequests++;throw Error('Non-emulator request blocked');
 }
 localRequests++;return originalFetch(input,options);
};
const {initializeApp,deleteApp}=await import('firebase/app');
const {initializeAuth,inMemoryPersistence,connectAuthEmulator,signInWithEmailAndPassword,signOut}=await import('firebase/auth');
const {getFunctions,connectFunctionsEmulator,httpsCallable}=await import('firebase/functions');
const require=createRequire(new URL('../functions/package.json',import.meta.url));
const adminAppModule=require('firebase-admin/app'),adminAuthModule=require('firebase-admin/auth'),adminFirestoreModule=require('firebase-admin/firestore');
const adminApp=adminAppModule.initializeApp({projectId},'leaderboard-admin-'+randomUUID());
assert.equal(adminApp.options.projectId,projectId);
const db=adminFirestoreModule.getFirestore(adminApp),adminAuth=adminAuthModule.getAuth(adminApp);
const clientApp=initializeApp({apiKey:'demo-key',projectId,authDomain:'127.0.0.1'},'leaderboard-client-'+randomUUID());
const auth=initializeAuth(clientApp,{persistence:inMemoryPersistence});connectAuthEmulator(auth,'http://'+authHost,{disableWarnings:true});
const functions=getFunctions(clientApp,'asia-northeast3');connectFunctionsEmulator(functions,'127.0.0.1',5001);
const leaderboard=httpsCallable(functions,'duelLeaderboard'),saveResult=httpsCallable(functions,'duelSaveResult');
const profiles=db.collection('decimalUsers'),runId=randomUUID(),password=randomBytes(24).toString('base64url');
const accounts=[],refs=[],checks=[],started=Date.now();let result;
const check=(name,condition=true)=>{assert.ok(condition,name);checks.push({name,passed:true});console.log('PASS',name);};
const rejected=async(run,code,name)=>{await assert.rejects(run,error=>error?.code===code);check(name);};
const publicKeys=['experience','isMe','level','name','rank'];
function publicPayload(data){
 assert.deepEqual(Object.keys(data).sort(),['entries','limit','me']);assert.equal(data.limit,50);assert.equal(data.entries.length,50);
 for(const entry of [...data.entries,data.me]){
  assert.deepEqual(Object.keys(entry).sort(),publicKeys);
  assert.ok(Number.isSafeInteger(entry.experience)&&entry.experience>=0);
  assert.equal(entry.level,Math.floor((1+Math.sqrt(1+8*entry.experience/100))/2));
  assert.ok(entry.name.length>0&&entry.name.length<=16);assert.equal(typeof entry.isMe,'boolean');
 }
 const encoded=JSON.stringify(data);
 for(const account of accounts){assert.ok(!encoded.includes(account.uid));assert.ok(!encoded.includes(account.email));}
 assert.ok(!encoded.includes('private-leaderboard-sentinel'));
}
async function account(name){
 const email=`${randomUUID()}@leaderboard.invalid`;
 const value=await adminAuth.createUser({email,password,displayName:name});accounts.push({uid:value.uid,email});return {uid:value.uid,email,name};
}
async function profile(uid,xp){
 const ref=profiles.doc(uid);refs.push(ref);
 await ref.set({progress:{wins:3,losses:2,draws:1,experience:xp,level:999},email:'private-leaderboard-sentinel',wrongQuestions:['private-leaderboard-sentinel']});
}
try{
 // Existing local records remain untouched; test leaders are above their XP.
 const before=await profiles.get(),priorXp=before.docs.map(doc=>doc.data().progress?.experience).filter(xp=>Number.isSafeInteger(xp)&&xp>=0);
 const base=Math.max(20000,...priorXp)+5000;assert.ok(Number.isSafeInteger(base));
 const first=await account('검증 첫 수호자'),second=await account('검증 둘째 수호자'),third=await account('<img src=x>');
 await profile(first.uid,base);await profile(second.uid,base);await profile(third.uid,base-100);
 for(let index=0;index<51;index++){
  const row=await account(`검증 수호자 ${index+4}`);await profile(row.uid,base-200-index*20);
 }
 const removedUid='leaderboard-missing-'+runId;await profile(removedUid,base-150);
 const own=await account('검증 내 수호자'),unranked=await account('검증 새 수호자');await profile(own.uid,155);
 const privateMatch=profiles.doc(own.uid).collection('matches').doc('private-'+runId);refs.push(privateMatch);
 await privateMatch.set({wrongQuestions:['private-leaderboard-sentinel'],hostUid:own.uid});
 check('only test records were added without replacing existing local profiles',(await profiles.get()).size===before.size+56);

 await rejected(()=>leaderboard({}),'functions/unauthenticated','anonymous leaderboard requests are rejected');
 await signInWithEmailAndPassword(auth,own.email,password);
 await rejected(()=>leaderboard({uid:first.uid}),'functions/invalid-argument','a client cannot request another account as its own');
 await rejected(()=>leaderboard({limit:5000}),'functions/invalid-argument','a client cannot increase the leaderboard query limit');
 const data=(await leaderboard({})).data;publicPayload(data);
 check('response exposes exactly 50 public entries and a separate own row');
 check('equal XP leaders share rank 1 and the next score has rank 3',data.entries[0].rank===1&&data.entries[1].rank===1&&data.entries[2].rank===3&&data.entries[0].experience===base&&data.entries[1].experience===base&&data.entries[2].experience===base-100);
 check('an orphaned Auth record preserves its XP rank with a neutral public name',data.entries[3].rank===4&&data.entries[3].name==='이름 없는 수호자'&&data.entries[3].experience===base-150);
 const ownRank=56+priorXp.filter(xp=>xp>155).length;
 check('own rank below the top 50 counts every greater server XP',data.me.rank===ownRank&&data.me.rank>50&&data.me.isMe&&data.me.experience===155);
 check('level is derived from server XP instead of a stale stored level',data.me.level===2&&data.entries.every(entry=>entry.level!==999));
 check('own row outside the top 50 does not mark another entry as mine',data.entries.every(entry=>!entry.isMe));
 check('private account IDs, emails, match records and wrong answers are omitted');
 const hostile=data.entries.find(entry=>entry.experience===base-100);
 check('display names remain literal public text rather than executable markup',hostile.name==='<img src=x>');

 // Use the real result callable, rather than modifying XP between reads.
 const matchId=randomUUID(),matchRef=db.doc('decimalResults/'+matchId),recordRef=profiles.doc(own.uid).collection('matches').doc(matchId);refs.push(matchRef,recordRef);
 const saved=(await saveResult({version:1,matchId,hostUid:own.uid,guestUid:first.uid,side:0,outcome:'win',endedAt:Date.now(),duration:40,solved:10,purchases:5,wrongQuestions:[]})).data;
 const refreshed=(await leaderboard({})).data;publicPayload(refreshed);
 check('a newly saved match immediately refreshes canonical XP and derived level',saved.progress.experience===330&&refreshed.me.experience===330&&refreshed.me.level===3&&refreshed.me.rank===56+priorXp.filter(xp=>xp>330).length);

 await signOut(auth);await signInWithEmailAndPassword(auth,first.email,password);
 const leading=(await leaderboard({})).data;publicPayload(leading);
 check('a top 50 player has exactly one highlighted entry and the same own rank',leading.entries.filter(entry=>entry.isMe).length===1&&leading.me.rank===1&&leading.me.name===first.name&&leading.me.experience===base);
 await signOut(auth);await signInWithEmailAndPassword(auth,unranked.email,password);
 const noProfile=(await leaderboard({})).data;publicPayload(noProfile);
 check('an account with no saved match is unranked at level 1 and zero XP',noProfile.me.rank===null&&noProfile.me.level===1&&noProfile.me.experience===0&&noProfile.me.name===unranked.name&&noProfile.entries.every(entry=>!entry.isMe));
 result={status:'PASS',checks,projectId,scope:'actual HTTP callables with local Auth, Firestore and Functions emulators',productionRequests:0,blockedNonEmulatorRequests:blockedRequests,localRequests,durationMs:Date.now()-started};
}catch(error){
 checks.push({name:'integration continuation',passed:false,errorCode:typeof error?.code==='string'?error.code:'assertion-or-runtime'});
 result={status:'FAIL',checks,projectId,scope:'local demo emulators only',productionRequests:0,blockedNonEmulatorRequests:blockedRequests,localRequests,durationMs:Date.now()-started};process.exitCode=1;
 console.error('FAIL leaderboard emulator integration; see aggregate report');
}finally{
 await signOut(auth).catch(()=>{});
 const documentsRemoved=await Promise.allSettled(refs.map(ref=>ref.delete()));
 const accountsRemoved=await Promise.allSettled(accounts.map(value=>adminAuth.deleteUser(value.uid)));
 const remaining=await Promise.allSettled(refs.map(ref=>ref.get()));
 result.cleanup=documentsRemoved.every(value=>value.status==='fulfilled')&&accountsRemoved.every(value=>value.status==='fulfilled')&&remaining.every(value=>value.status==='fulfilled'&&!value.value.exists);
 if(!result.cleanup||blockedRequests){result.status='FAIL';process.exitCode=1;}
 await deleteApp(clientApp);await adminAppModule.deleteApp(adminApp);globalThis.fetch=originalFetch;
 await mkdir('test-results',{recursive:true});await writeFile('test-results/leaderboard-emulator.json',JSON.stringify(result,null,2));
}
console.log(JSON.stringify({status:result.status,passed:checks.filter(value=>value.passed).length,failed:checks.filter(value=>!value.passed).length,cleanup:result.cleanup,productionRequests:0,localRequests}));
