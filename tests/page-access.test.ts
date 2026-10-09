import {test} from 'node:test';
import assert from 'node:assert/strict';
import {AccountSession,PageRequest,pageRequest,openAuthorizedPage,requiresAccount,runAccountAction} from '../src/page-access';
function pending<T=void>(){let resolve!:(value:T|PromiseLike<T>)=>void;const promise=new Promise<T>(r=>resolve=r);return {promise,resolve};}
test('title and adventure load without initializing Firebase or showing login',async()=>{
 for(const search of ['', '?mode=title','?mode=adventure','?mode=https://example.com']){
  const request=pageRequest(search),loaded:PageRequest[]=[];
  assert.equal(await openAuthorizedPage(request,{session:async()=>{throw Error('public route must not initialize auth');},login:async()=>{throw Error('public route must not show login');},load:async value=>loaded.push(value)}),true);
  assert.deepEqual(loaded,[request]);assert.equal(requiresAccount(request.mode),false);
 }
});
test('duel and worksheet wait for persisted Firebase authentication before importing a page',async()=>{
 for(const mode of ['duel','worksheet'] as const){
  const ready=pending(),events:string[]=[],session:AccountSession={currentUser:{uid:'persisted'},authStateReady:()=>{events.push('waiting');return ready.promise;}};
  const entering=openAuthorizedPage(pageRequest('?mode='+mode),{session:async()=>session,login:async()=>{events.push('login');},load:async()=>events.push('import')});
  await Promise.resolve();assert.deepEqual(events,['waiting']);
  ready.resolve();assert.equal(await entering,true);assert.deepEqual(events,['waiting','import']);
 }
});
test('anonymous protected requests stay on login until an account is available',async()=>{
 for(const mode of ['duel','worksheet'] as const){
  const login=pending(),events:string[]=[],session:AccountSession={currentUser:null,authStateReady:async()=>{events.push('ready');}};
  const entering=openAuthorizedPage(pageRequest('?mode='+mode),{session:async()=>session,login:()=>{events.push('login');return login.promise;},load:async()=>events.push('import')});
  await Promise.resolve();await Promise.resolve();assert.deepEqual(events,['ready','login']);
  session.currentUser={uid:'guardian'};login.resolve();assert.equal(await entering,true);assert.deepEqual(events,['ready','login','import']);
 }
});
test('worksheet id, print request and local emulator intent survive login unchanged',async()=>{
 const request=pageRequest('?mode=worksheet&id=saved%20sheet&print=1&emulator=1&return=https%3A%2F%2Fexample.com'),session:AccountSession={currentUser:null,authStateReady:async()=>{}},loaded:PageRequest[]=[];
 await openAuthorizedPage(request,{session:async()=>session,login:async mode=>{assert.equal(mode,'worksheet');session.currentUser={uid:'guardian'};},load:async value=>loaded.push(value)});
 assert.deepEqual(loaded,[request]);assert.equal(loaded[0].mode,'worksheet');assert.equal(loaded[0].search,request.search);
 const params=new URLSearchParams(loaded[0].search);assert.equal(params.get('id'),'saved sheet');assert.equal(params.get('print'),'1');assert.equal(params.get('emulator'),'1');
});
test('unconfigured auth and login callbacks without a current account cannot import protected pages',async()=>{
 for(const session of [null,{currentUser:null,authStateReady:async()=>{}}]){
  let loaded=false,logins=0;
  assert.equal(await openAuthorizedPage(pageRequest('?mode=worksheet&print=1'),{session:async()=>session,login:async()=>{logins++;},load:async()=>{loaded=true;}}),false);
  assert.equal(logins,1);assert.equal(loaded,false);
 }
});
test('a readiness failure never imports or starts a worksheet',async()=>{
 let loaded=false;
 await assert.rejects(openAuthorizedPage(pageRequest('?mode=worksheet&print=1'),{session:async()=>({currentUser:{uid:'unresolved'},authStateReady:async()=>{throw Error('not ready');}}),login:async()=>{},load:async()=>{loaded=true;}}),/not ready/);
 assert.equal(loaded,false);
});
test('unauthorized worksheet printing does not prepare fonts, artwork or print',async()=>{
 const calls:string[]=[];
 assert.equal(await runAccountAction(()=>false,[async()=>{calls.push('fonts');},async()=>{calls.push('art');}],()=>{calls.push('print');}),false);
 assert.deepEqual(calls,[]);
});
test('logout during either print preparation prevents the pending print',async()=>{
 for(const revokeAt of [0,1]){
  let signedIn=true;const waiting=pending(),calls:string[]=[];
  const preparations=['fonts','art'].map((name,index)=>async()=>{calls.push(name);if(index===revokeAt)await waiting.promise;});
  const printing=runAccountAction(()=>signedIn,preparations,()=>{calls.push('print');});
  await Promise.resolve();signedIn=false;waiting.resolve();
  assert.equal(await printing,false);assert.deepEqual(calls,revokeAt===0?['fonts']:['fonts','art']);
 }
});
test('authorized printing runs once after every preparation',async()=>{
 const calls:string[]=[];
 assert.equal(await runAccountAction(()=>true,[async()=>{calls.push('fonts');},async()=>{calls.push('art');}],()=>{calls.push('print');}),true);
 assert.deepEqual(calls,['fonts','art','print']);
});
