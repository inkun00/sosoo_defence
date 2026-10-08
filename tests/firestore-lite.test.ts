import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdir,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {connectFirestoreEmulator} from 'firebase/firestore/lite';
import {getApps,deleteApp} from 'firebase/app';

// Run the real record-store against a local-only REST transport. This verifies
// SDK compatibility, caching and offline queues without accessing cloud data.
test('Firestore Lite preserves record queries, caching and pending results',async t=>{
 const storage=new Map<string,string>(),originalFetch=globalThis.fetch,requests:{url:string;body:any}[]=[];
 Object.defineProperty(globalThis,'localStorage',{value:{getItem:(key:string)=>storage.get(key)??null,setItem:(key:string,value:string)=>storage.set(key,value)},configurable:true});
 Object.defineProperty(globalThis,'location',{value:{hostname:'127.0.0.1',search:''},configurable:true});
 const now=Math.floor(Date.now()/1000),project='demo-lite-compatibility';
 const token=[{alg:'none',typ:'JWT'},{aud:project,auth_time:now,exp:now+3600,iat:now,iss:`https://securetoken.google.com/${project}`,sub:'owner',user_id:'owner',firebase:{identities:{},sign_in_provider:'custom'}}].map(value=>Buffer.from(JSON.stringify(value)).toString('base64url')).join('.')+'.';
 const fields=(values:Record<string,any>):Record<string,any>=>Object.fromEntries(Object.entries(values).map(([key,value])=>[key,typeof value==='number'?{integerValue:String(value)}:typeof value==='string'?{stringValue:value}:Array.isArray(value)?{arrayValue:{values:value}}:{mapValue:{fields:fields(value)}}]));
 const progress={wins:3,losses:1,draws:0,experience:450,level:3},record={version:1,matchId:'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',hostUid:'owner',guestUid:'other',side:0,outcome:'win',endedAt:1700000000000,duration:120,solved:4,purchases:3,wrongQuestions:[],savedAt:100000};
 let unavailable=false;
 globalThis.fetch=async(input,init)=>{
  const url=String(input),body=JSON.parse(String(init?.body??'{}'));assert.equal(new URL(url).hostname,'127.0.0.1','test requests must never reach a live project');requests.push({url,body});
  if(url.includes('signInWithCustomToken'))return Response.json({idToken:token,refreshToken:'local-only',expiresIn:'3600',isNewUser:true});
  if(url.includes('accounts:lookup'))return Response.json({users:[{localId:'owner',displayName:'Local test'}]});
  if(url.includes(':batchGet'))return Response.json([{found:{name:body.documents[0],fields:fields({progress}),createTime:'2026-01-01T00:00:00Z',updateTime:'2026-01-01T00:00:00Z'},readTime:'2026-01-01T00:00:01Z'}]);
  if(url.includes(':runQuery'))return Response.json([{document:{name:`projects/${project}/databases/(default)/documents/decimalUsers/owner/matches/${record.matchId}`,fields:fields(record),createTime:'2026-01-01T00:00:00Z',updateTime:'2026-01-01T00:00:00Z'},readTime:'2026-01-01T00:00:01Z'}]);
  if(url.includes('duelSaveResult')&&unavailable)throw Error('offline');
  throw Error('Unexpected test request: '+url);
 };
 // Keep Firebase packages external so auth and emulator helpers share the same
 // SDK instance as the real product modules; only import.meta.env is supplied.
 const env={VITE_FIREBASE_ENABLED:'true',VITE_FIREBASE_API_KEY:'local-only',VITE_FIREBASE_AUTH_DOMAIN:`${project}.firebaseapp.com`,VITE_FIREBASE_PROJECT_ID:project,VITE_FIREBASE_APP_ID:'demo-lite-app'};
 const result=await build({stdin:{contents:"export * from './src/multiplayer/firebase'; export * from './src/multiplayer/record-store';",resolveDir:process.cwd()},bundle:true,format:'esm',platform:'node',packages:'external',write:false,define:{'import.meta.env':JSON.stringify(env)},logLevel:'silent'});
 const directory=resolve('test-results/firestore-lite');await mkdir(directory,{recursive:true});const file=resolve(directory,'record-store-fixture.mjs');await writeFile(file,result.outputFiles[0].contents);
 try{
  const {connectAuthEmulator,signInWithCustomToken,signOut}=await import('firebase/auth');
  const {connectFunctionsEmulator}=await import('firebase/functions');
  const store=await import(pathToFileURL(file).href+'?run='+Date.now());connectFirestoreEmulator(store.firestore,'127.0.0.1',18080,{mockUserToken:{sub:'owner'}});connectAuthEmulator(store.auth,'http://127.0.0.1:19099',{disableWarnings:true});
  connectFunctionsEmulator(store.functions,'127.0.0.1',15001);
  await t.test('getDoc and history reads use the existing one-minute cache',async()=>{
   assert.deepEqual(await store.loadProgress('owner'),progress);assert.deepEqual(await store.loadProgress('owner'),progress);assert.equal(requests.filter(request=>request.url.includes(':batchGet')).length,1);
   const history=await store.loadHistory('owner');assert.equal(history[0].matchId,record.matchId);assert.deepEqual(await store.loadHistory('owner'),history);
   const reads=requests.filter(request=>request.url.includes(':runQuery'));assert.equal(reads.length,1);assert.equal(reads[0].body.structuredQuery.limit,20);assert.equal(reads[0].body.structuredQuery.orderBy[0].field.fieldPath,'endedAt');assert.equal(reads[0].body.structuredQuery.orderBy[0].direction,'DESCENDING');
  });
  await t.test('signed-in incremental learning retains filter and stable document cursor',async()=>{
   await signInWithCustomToken(store.auth,'local-test-token');assert.equal(store.auth.currentUser.uid,'owner');
   const learned=await store.loadLearningHistory('owner');assert.equal(learned[0].matchId,record.matchId);
   const query=requests.filter(request=>request.url.includes(':runQuery')).at(-1)!.body.structuredQuery;assert.equal(query.limit,100);assert.equal(query.where.fieldFilter.field.fieldPath,'savedAt');assert.deepEqual(query.orderBy.map((order:any)=>order.field.fieldPath),['savedAt','__name__']);
   const checkpoint=JSON.parse(storage.get('decimal-history-sync-v1:owner')!);assert.deepEqual(checkpoint.after,{time:record.savedAt,id:record.matchId});
  });
  await t.test('offline callable failures preserve the local pending queue',async()=>{
   store.queueResult(record);store.queueResult(record);assert.equal(store.pendingCount('owner'),1);unavailable=true;
   const flushed=await store.flushResults('owner');assert.equal(flushed.progress,null);assert.equal(store.pendingCount('owner'),1);assert.equal(JSON.parse(storage.get('decimal-duel-pending-results-v1')!).length,1);
   assert.equal(requests.filter(request=>request.url.includes('duelSaveResult')).length,1,'one failed local callable must leave the queued result intact');
   await signOut(store.auth);await store.flushResults('owner');assert.equal(store.pendingCount('owner'),1,'switching accounts must never drop an unsaved result');
  });
 }finally{await Promise.all(getApps().map(deleteApp));globalThis.fetch=originalFetch;}
});
