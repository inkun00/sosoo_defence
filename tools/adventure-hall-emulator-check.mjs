import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';

// This harness can only touch the local demo emulators and deletes only its own
// run's documents/users. It never clears existing shared emulator collections.
const projectId='demo-decimal-defense',authHost='127.0.0.1:9099',dbHost='127.0.0.1:8080';
for(const key of ['GCLOUD_PROJECT','GOOGLE_CLOUD_PROJECT','GCP_PROJECT'])if(process.env[key]&&process.env[key]!==projectId)throw Error('Refusing a non-demo project');
for(const [key,host]of [['FIRESTORE_EMULATOR_HOST',dbHost],['FIREBASE_AUTH_EMULATOR_HOST',authHost]])if(process.env[key]&&process.env[key]!==host)throw Error('Refusing a non-local emulator');
if(process.env.FIREBASE_CONFIG&&JSON.parse(process.env.FIREBASE_CONFIG).projectId!==projectId)throw Error('Refusing a non-demo Firebase configuration');
Object.assign(process.env,{GCLOUD_PROJECT:projectId,GOOGLE_CLOUD_PROJECT:projectId,FIREBASE_CONFIG:JSON.stringify({projectId}),FIRESTORE_EMULATOR_HOST:dbHost,FIREBASE_AUTH_EMULATOR_HOST:authHost});
const oldFetch=globalThis.fetch;let requests=0,blocked=0;
globalThis.fetch=(input,options)=>{
 const url=new URL(typeof input==='string'||input instanceof URL?input:input.url);
 if(url.protocol!=='http:'||url.hostname!=='127.0.0.1'||!['9099','8080','5001'].includes(url.port)){blocked++;throw Error('Non-emulator request blocked');}
 requests++;return oldFetch(input,options);
};
const {initializeApp,deleteApp}=await import('firebase/app');
const {getAuth,initializeAuth,inMemoryPersistence,connectAuthEmulator,signInAnonymously,createUserWithEmailAndPassword,signOut}=await import('firebase/auth');
const {getFunctions,connectFunctionsEmulator,httpsCallable}=await import('firebase/functions');
const {getFirestore,connectFirestoreEmulator,doc,getDoc,setDoc}=await import('firebase/firestore/lite');
const require=createRequire(new URL('../functions/package.json',import.meta.url)),adminApps=require('firebase-admin/app'),adminAuths=require('firebase-admin/auth'),adminFirestore=require('firebase-admin/firestore');
const id=randomUUID(),adminApp=adminApps.initializeApp({projectId},'hall-admin-'+id),db=adminFirestore.getFirestore(adminApp),adminAuth=adminAuths.getAuth(adminApp),profiles=db.collection('adventureHall');
const apps=[],accounts=[],refs=[],checks=[],started=Date.now();let result;
const check=name=>{checks.push({name,passed:true});console.log('PASS',name);};
const refuses=async(fn,code,name)=>{await assert.rejects(fn,error=>error?.code===code);check(name);};
async function client(name,kind='anonymous'){
 const app=initializeApp({apiKey:'demo-key',authDomain:projectId+'.firebaseapp.com',projectId},'hall-'+id+'-'+name);apps.push(app);
 const auth=initializeAuth(app,{persistence:inMemoryPersistence});connectAuthEmulator(auth,'http://'+authHost,{disableWarnings:true});
 const functions=getFunctions(app,'asia-northeast3');connectFunctionsEmulator(functions,'127.0.0.1',5001);
 const firestore=getFirestore(app);connectFirestoreEmulator(firestore,'127.0.0.1',8080);
 if(kind==='anonymous')await signInAnonymously(auth);
 else if(kind==='account')await createUserWithEmailAndPassword(auth,`hall-${id}-${name}@emulator.invalid`,'Emulator-only-123!');
 if(auth.currentUser)accounts.push(auth.currentUser.uid);
 return {auth,firestore,hall:async(data={})=>(await httpsCallable(functions,'adventureHall')(data)).data,register:async(data)=>(await httpsCallable(functions,'adventureRegister')(data)).data};
}
function proof(variation=0,runId=randomUUID()){
 const killHits=variation===1?[100,2,3,4,5,6,7,8,9,10,11,12,13]:[100,5,6,7,8,9,10,11,12,13,14,15,16],purchaseWrongAttempts=variation===1?[0,0]:variation===2?[5,5]:[0,2],fusionWrongAttempts=variation===1?[0]:variation===2?[5]:[1];
 const combatScore=killHits.reduce((sum,hits)=>sum+100+Math.floor(100/hits),0),questionScore=[...purchaseWrongAttempts,...fusionWrongAttempts].reduce((sum,wrong)=>sum+Math.floor(25/(wrong+1)),0);
 const stage={stage:11,difficulty:'standard',combatScore,questionScore,score:combatScore+questionScore,kills:killHits.length,successfulHits:killHits.reduce((sum,hits)=>sum+hits,0),answeredQuestions:3,purchases:2,fusions:1,castle:5,bossDefeated:true,killHits,purchaseWrongAttempts,fusionWrongAttempts};
 return {version:1,runId,score:stage.score,stages:[stage]};
}
const publicFields=['isMe','nickname','rank','score'];
function publicOnly(data){
 assert.deepEqual(Object.keys(data).sort(),['entries','limit','me']);assert.equal(data.limit,50);assert.ok(data.entries.length<=50);
 for(const row of [...data.entries,...(data.me?[data.me]:[])])assert.deepEqual(Object.keys(row).sort(),publicFields);
 for(const uid of accounts)assert.ok(!JSON.stringify(data).includes(uid));assert.ok(!JSON.stringify(data).includes('private-hall-sentinel'));
}
try{
 const guest=await client('guest','guest'),a=await client('a'),b=await client('b','account');
 const before=await profiles.get(),base=Math.max(5000,...before.docs.map(row=>row.data().score).filter(Number.isSafeInteger))+1000;
 const batch=db.batch();
 for(let index=0;index<54;index++){
  const ref=profiles.doc('hall-seed-'+id+'-'+index);refs.push(ref);
  batch.set(ref,{score:base-(index<2?0:index-1),nickname:index===2?'<img src=x>':'검증 수호자 '+index,email:'private-hall-sentinel',stages:['private-hall-sentinel']});
 }
 await batch.commit();
 const publicData=await guest.hall();publicOnly(publicData);assert.equal(publicData.me,null);assert.equal(publicData.entries.length,50);
 assert.deepEqual(publicData.entries.slice(0,3).map(row=>row.rank),[1,1,3]);check('public top 50 with competition ties and no private identifiers');
 await refuses(()=>guest.hall({uid:a.auth.currentUser.uid}),'functions/invalid-argument','caller cannot spoof own identity or increase query fields');
 const first=proof(),payload={nickname:' 소수   수호자 ',snapshot:first};
 await refuses(()=>guest.register(payload),'functions/unauthenticated','unauthenticated score registration denied');
 await refuses(()=>a.register({...payload,nickname:'수\u200b호자'}),'functions/invalid-argument','hidden nickname controls denied');
 await refuses(()=>a.register({...payload,snapshot:{...first,score:999999}}),'functions/invalid-argument','claimed total must match recomputed bounded stage evidence');
 await refuses(()=>a.register({...payload,snapshot:{...first,stages:[{...first.stages[0],bossDefeated:false}]}}),'functions/invalid-argument','stage 11 boss defeat is required');
 await refuses(()=>a.register({...payload,snapshot:{...first,stages:[{...first.stages[0],purchaseWrongAttempts:Array(99).fill(0)}]}}),'functions/invalid-argument','question count cannot exceed stage tower capacity');
 const profileA=profiles.doc(a.auth.currentUser.uid),receiptA=profileA.collection('adventureRuns').doc(first.runId);refs.push(profileA,receiptA);
 const saved=await a.register({...payload,uid:b.auth.currentUser.uid,score:999999});assert.equal(saved.score,first.score);assert.equal(saved.bestScore,first.score);assert.equal(saved.duplicate,false);assert.equal((await profileA.get()).data().nickname,'소수 수호자');check('anonymous completion stored under server UID with normalized nickname');
 const same=(await Promise.all([a.register(payload),a.register(payload)]));assert.ok(same.every(row=>row.duplicate&&row.score===first.score&&row.bestScore===first.score));check('same run receipt is idempotent after duplicate requests or a lost response');
 const own=await a.hall();publicOnly(own);assert.equal(own.me.score,first.score);assert.equal(own.me.rank,55+before.docs.filter(row=>row.data().score>first.score).length);assert.ok(own.entries.every(row=>!row.isMe));check('own rank outside top 50 counts all greater points');
 const improved=proof(1,first.runId),improvedSaved=await a.register({nickname:'향상 수호자',snapshot:improved});assert.equal(improvedSaved.duplicate,false);assert.equal(improvedSaved.score,improved.score);assert.equal((await profileA.collection('adventureRuns').get()).size,1);assert.equal((await a.register({nickname:'향상 수호자',snapshot:improved})).duplicate,true);assert.equal((await a.register(payload)).score,improved.score);check('a better replay updates the same run receipt once without accumulating duplicate points');
 const better=proof(1),betterRef=profileA.collection('adventureRuns').doc(better.runId);refs.push(betterRef);await a.register({nickname:'새 수호자',snapshot:better});
 const low=proof(2),lowRef=profileA.collection('adventureRuns').doc(low.runId);refs.push(lowRef);const lowSaved=await a.register({nickname:'낮은 점수',snapshot:low});assert.equal(lowSaved.bestScore,better.score);assert.equal((await profileA.get()).data().nickname,'새 수호자');assert.equal((await a.register(payload)).bestScore,better.score);check('best result is retained and older run retries return the latest best');
 const profileB=profiles.doc(b.auth.currentUser.uid),receiptB=profileB.collection('adventureRuns').doc(first.runId);refs.push(profileB,receiptB);const real=await b.register({nickname:'계정 수호자',snapshot:first});assert.equal(real.score,first.score);assert.equal(real.duplicate,false);check('existing account and separate user run receipts are supported');
 const race=proof(1),raceRef=profileB.collection('adventureRuns').doc(race.runId);refs.push(raceRef);const racers=await Promise.all([b.register({nickname:'동시 수호자',snapshot:race}),b.register({nickname:'동시 수호자',snapshot:race})]);assert.equal(racers.filter(row=>row.duplicate).length,1);check('simultaneous submissions write one canonical run receipt');
 await refuses(()=>getDoc(doc(a.firestore,'adventureHall',a.auth.currentUser.uid)),'permission-denied','direct profile read denied even to its owner');
 await refuses(()=>getDoc(doc(a.firestore,'adventureHall',a.auth.currentUser.uid,'adventureRuns',first.runId)),'permission-denied','private score proofs are not client readable');
 await refuses(()=>setDoc(doc(a.firestore,'adventureHall',a.auth.currentUser.uid),{score:999999,nickname:'위조 수호자'}),'permission-denied','direct leaderboard mutation denied');
 const finalPublic=await guest.hall();publicOnly(finalPublic);assert.equal(finalPublic.me,null);check('public hall remains readable after registrations without email login');
 result={status:'PASS',checks,projectId,productionRequests:0,blockedNonEmulatorRequests:blocked,localRequests:requests,durationMs:Date.now()-started};
}catch(error){
 checks.push({name:'integration continuation',passed:false,code:typeof error?.code==='string'?error.code:'assertion-or-runtime'});
 result={status:'FAIL',checks,projectId,productionRequests:0,blockedNonEmulatorRequests:blocked,localRequests:requests,durationMs:Date.now()-started};process.exitCode=1;console.error('FAIL adventure hall emulator integration; see aggregate report');
}finally{
 await Promise.all(apps.map(app=>signOut(getAuth(app)).catch(()=>{})));
 const documents=await Promise.allSettled(refs.map(ref=>ref.delete())),users=await Promise.allSettled(accounts.map(uid=>adminAuth.deleteUser(uid))),remaining=await Promise.allSettled(refs.map(ref=>ref.get()));
 result.cleanup=documents.every(item=>item.status==='fulfilled')&&users.every(item=>item.status==='fulfilled')&&remaining.every(item=>item.status==='fulfilled'&&!item.value.exists);
 if(!result.cleanup||blocked){result.status='FAIL';process.exitCode=1;}
 await Promise.all(apps.map(deleteApp));await adminApps.deleteApp(adminApp);globalThis.fetch=oldFetch;
 await mkdir('test-results',{recursive:true});await writeFile('test-results/adventure-hall-emulator.json',JSON.stringify(result,null,2));
}
