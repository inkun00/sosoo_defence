import assert from 'node:assert/strict';
import {createHmac,randomBytes,randomUUID} from 'node:crypto';
import {mkdirSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {initializeApp,deleteApp} from 'firebase/app';
import {getAuth,connectAuthEmulator,createUserWithEmailAndPassword,deleteUser} from 'firebase/auth';
import {getFirestore,connectFirestoreEmulator,doc,getDoc,setDoc,setLogLevel} from 'firebase/firestore';

// This checks the compiled handler and real emulator transactions/rules. It
// never contacts a TURN service or invokes a deployed Firebase function.
const projectId='demo-decimal-defense',firestoreHost='127.0.0.1:8080',authHost='127.0.0.1:9099';
for(const key of ['GCLOUD_PROJECT','GOOGLE_CLOUD_PROJECT','GCP_PROJECT']){
 if(process.env[key]&&process.env[key]!==projectId)throw Error('Refusing a non-demo project environment');
}
for(const [key,host]of [['FIRESTORE_EMULATOR_HOST',firestoreHost],['FIREBASE_AUTH_EMULATOR_HOST',authHost]]){
 if(process.env[key]&&process.env[key]!==host)throw Error('Refusing a non-local emulator environment');
}
if(process.env.FIREBASE_CONFIG){
 let config;try{config=JSON.parse(process.env.FIREBASE_CONFIG);}catch{throw Error('Refusing a non-demo Firebase configuration');}
 if(config.projectId!==projectId)throw Error('Refusing a non-demo Firebase configuration');
}
assert.ok(projectId.startsWith('demo-')&&firestoreHost==='127.0.0.1:8080'&&authHost==='127.0.0.1:9099');
setLogLevel('silent');
Object.assign(process.env,{GCLOUD_PROJECT:projectId,GOOGLE_CLOUD_PROJECT:projectId,FIREBASE_CONFIG:JSON.stringify({projectId}),FIRESTORE_EMULATOR_HOST:firestoreHost,FIREBASE_AUTH_EMULATOR_HOST:authHost});
const testSecret=randomBytes(48).toString('base64');
process.env.TURN_URLS='turn:relay.disposable.invalid:3478';
process.env.TURN_SHARED_SECRET=testSecret;

const require=createRequire(new URL('../functions/package.json',import.meta.url));
const admin=require('firebase-admin/app'),adminFirestore=require('firebase-admin/firestore');
const {duelIce,duelPruneRooms}=require('../functions/lib/index.js');
const adminApp=admin.getApp(),db=adminFirestore.getFirestore(adminApp),apps=[],clients=[],refs=[],checks=[];
assert.ok(adminApp.options.projectId===projectId,'Admin SDK must remain in the demo project');
const check=(label,condition=true)=>{assert.ok(condition,label);checks.push(label);console.log('PASS',label);};
const rejected=async(fn,code,label)=>{await assert.rejects(fn,error=>error?.code===code);check(label);};
async function client(){
 const app=initializeApp({apiKey:'demo-key',projectId},'relay-local-'+randomUUID());apps.push(app);
 const auth=getAuth(app);connectAuthEmulator(auth,'http://'+authHost,{disableWarnings:true});
 await createUserWithEmailAndPassword(auth,randomUUID()+'@relay.invalid',randomBytes(24).toString('hex'));
 const store=getFirestore(app);connectFirestoreEmulator(store,'127.0.0.1',8080);
 const value={auth,store,uid:auth.currentUser.uid};clients.push(value);return value;
}
const issue=uid=>duelIce.run({data:{},auth:{uid}});
function validCredentials(value){
 const server=value?.iceServers?.[0],parts=server?.username?.split(':'),now=Date.now();
 return value?.available===true&&value.iceServers.length===1&&server.urls.length===1&&server.urls[0]==='turn:relay.disposable.invalid:3478'
  &&parts?.length===2&&/^[a-f0-9]{32}$/.test(parts[1])&&Number(parts[0])*1000===value.expiresAt
  &&value.expiresAt-now>=1198000&&value.expiresAt-now<=1200000
  &&server.credential===createHmac('sha1',testSecret).update(server.username).digest('base64')
  &&!JSON.stringify(value).includes(testSecret);
}
let result;
try{
 const a=await client(),b=await client();
 const aRef=db.doc('decimalRelayLimits/'+a.uid),bRef=db.doc('decimalRelayLimits/'+b.uid);refs.push(aRef,bRef);
 await rejected(()=>duelIce.run({data:{}}),'unauthenticated','compiled handler rejects unauthenticated requests');
 check('configured compiled function binds only the TURN shared secret',duelIce.__endpoint.secretEnvironmentVariables?.length===1&&duelIce.__endpoint.secretEnvironmentVariables[0].key==='TURN_SHARED_SECRET');
 const first=await issue(a.uid),second=await issue(a.uid);
 check('issued credentials have a valid signature and bounded 20 minute expiry',validCredentials(first)&&validCredentials(second));
 check('separate requests use distinct random credentials',first.iceServers[0].username!==second.iceServers[0].username&&first.iceServers[0].credential!==second.iceServers[0].credential);
 for(let i=2;i<20;i++)await issue(a.uid);
 const counted=(await aRef.get()).data();
 check('real Firestore transaction accepts and records exactly 20 requests',counted.count===20&&counted.expiresAt>Date.now()&&counted.expiresAt<=Date.now()+60000);
 await rejected(()=>issue(a.uid),'resource-exhausted','the 21st request is rejected');
 check('a rejected request does not increase the stored counter',(await aRef.get()).data().count===20);
 await issue(b.uid);check('a different authenticated account has an independent limit',(await bRef.get()).data().count===1);
 await rejected(()=>getDoc(doc(a.store,'decimalRelayLimits',a.uid)),'permission-denied','the authenticated client cannot read its server limit');
 await rejected(()=>setDoc(doc(a.store,'decimalRelayLimits',a.uid),{count:0,expiresAt:0}),'permission-denied','the authenticated client cannot reset its server limit');
 await aRef.set({count:20,expiresAt:Date.now()-1});
 const renewed=await issue(a.uid),reset=(await aRef.get()).data();
 check('an expired window resets the counter and issues fresh valid credentials',reset.count===1&&reset.expiresAt>Date.now()&&validCredentials(renewed));
 await aRef.set({count:20,expiresAt:Date.now()-1});
 await duelPruneRooms.run({});
 check('scheduled cleanup deletes expired relay limits',!(await aRef.get()).exists);
 check('scheduled cleanup preserves active relay limits',(await bRef.get()).exists);
 result={status:'PASS',checks,scope:'compiled handlers called directly with local demo Firestore transactions and local Auth/Firestore rules; no deployed API or actual TURN communication',project:'demo-decimal-defense',credentialsLogged:false};
}catch(error){
 result={status:'FAIL',checks,failedCheck:checks.length+1,errorCode:typeof error?.code==='string'?error.code:'assertion-or-runtime',scope:'local demo emulator only',credentialsLogged:false};
 process.exitCode=1;console.error('FAIL local relay integration check; see aggregate report');
}finally{
 const removed=await Promise.allSettled(refs.map(ref=>ref.delete()));
 const accountsRemoved=await Promise.allSettled(clients.map(c=>deleteUser(c.auth.currentUser)));
 const remaining=await Promise.allSettled(refs.map(ref=>ref.get()));
 result.cleanup=removed.every(r=>r.status==='fulfilled')&&accountsRemoved.every(r=>r.status==='fulfilled')&&remaining.every(r=>r.status==='fulfilled'&&!r.value.exists);
 if(!result.cleanup){result.status='FAIL';process.exitCode=1;}
 await Promise.allSettled(apps.map(app=>deleteApp(app)));
 await admin.deleteApp(adminApp);
 delete process.env.TURN_URLS;delete process.env.TURN_SHARED_SECRET;
 mkdirSync('test-results',{recursive:true});writeFileSync('test-results/priority-fixes-relay.json',JSON.stringify(result,null,2));
}
console.log(JSON.stringify({status:result.status,passed:checks.length,cleanup:result.cleanup,scope:result.scope}));
