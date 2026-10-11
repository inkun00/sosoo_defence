import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {build} from 'esbuild';
import {adventureNickname,validAdventureSubmission,parseAdventureHall,parseAdventureRegistration,type AdventureHallEntry} from '../src/adventure-hall-data';
import {campaignKillScore,campaignQuestionScore,type StageScore,type CampaignCompletion} from '../src/campaign-score';

function stage():StageScore {
 const killHits=[100,5,6,7,8,9,10,11,12,13,14,15,16],purchaseWrongAttempts=[0,2],fusionWrongAttempts=[1],combatScore=killHits.reduce((sum,hits)=>sum+campaignKillScore(hits),0),questionScore=[...purchaseWrongAttempts,...fusionWrongAttempts].reduce((sum,wrong)=>sum+campaignQuestionScore(wrong),0);
 return {stage:11,difficulty:'standard',combatScore,questionScore,score:combatScore+questionScore,kills:killHits.length,successfulHits:killHits.reduce((sum,hits)=>sum+hits,0),answeredQuestions:3,purchases:2,fusions:1,castle:5,bossDefeated:true,killHits,purchaseWrongAttempts,fusionWrongAttempts};
}
function snapshot():CampaignCompletion {const result=stage();return {version:1,runId:'bbaebcc0-d932-441d-b132-768ed775a97c',score:result.score,stages:[result]};}
const entry=(change:Partial<AdventureHallEntry>={}):AdventureHallEntry=>({rank:1,nickname:'첫 수호자',score:2000,isMe:false,...change});
function board(){const entries=[entry({isMe:true}),entry({nickname:'공동 수호자'}),entry({rank:3,nickname:'세 번째',score:1500})];return {entries,me:{...entries[0]},limit:50};}

test('닉네임은 한글 정규화와 공백을 정리하고 2~16글자만 받는다',()=>{
 assert.equal(adventureNickname('  소수   수호자  '),'소수 수호자');assert.equal(adventureNickname('수호자'),'수호자');assert.equal(adventureNickname('😀😀'),'😀😀');
 for(const value of [null,12,'','가','가'.repeat(17),'수\n호자','수\u200b호자','수\u202e호자'])assert.throws(()=>adventureNickname(value));
});
test('최종 보스 클리어 증거와 누적 총점을 다시 검증하며 임의 UID는 전달하지 않는다',()=>{
 const saved=snapshot(),parsed=validAdventureSubmission({nickname:' 소수 수호자 ',snapshot:saved,uid:'another-user',score:999999});
 assert.deepEqual(Object.keys(parsed).sort(),['nickname','snapshot']);assert.equal(parsed.nickname,'소수 수호자');assert.equal(parsed.snapshot.score,saved.score);
 assert.ok(!JSON.stringify(parsed).includes('another-user'));assert.notEqual(parsed.snapshot.stages[0].killHits,saved.stages[0].killHits);
});
test('조작 총점·보스 미처치·중복 스테이지·과도한 처치와 문항 수를 거부한다',()=>{
 const saved=snapshot();
 for(const invalid of [
  {...saved,score:999999}, {...saved,stages:[]}, {...saved,stages:[saved.stages[0],saved.stages[0]]},
  {...saved,stages:[{...saved.stages[0],bossDefeated:false}]},
  {...saved,stages:[{...saved.stages[0],killHits:Array(14).fill(1),kills:14}]},
  {...saved,stages:[{...saved.stages[0],purchaseWrongAttempts:Array(100).fill(0)}]},
  {...saved,stages:[{...saved.stages[0],successfulHits:0}]},
 ])assert.throws(()=>validAdventureSubmission({nickname:'수호자',snapshot:invalid}));
});
test('공개 순위는 공동 순위를 1, 1, 3으로 표현하고 계정 개인정보를 제거한다',()=>{
 const data=board(),privateRow={...data.entries[0],uid:'private-uid',email:'private-email',stages:['private-proof']};
 const parsed=parseAdventureHall({...data,entries:[privateRow,...data.entries.slice(1)],me:privateRow,private:'private-data'});
 assert.deepEqual(parsed.entries.map(row=>row.rank),[1,1,3]);assert.deepEqual(Object.keys(parsed.entries[0]).sort(),['isMe','nickname','rank','score']);assert.deepEqual(parsed.me,parsed.entries[0]);assert.ok(!JSON.stringify(parsed).includes('private-'));
});
test('로그인 없이 빈 명예의 전당을 볼 수 있고 상위 50명 밖 내 순위도 표시한다',()=>{
 assert.deepEqual(parseAdventureHall({entries:[],me:null,limit:50}),{entries:[],me:null,limit:50});
 const data=board();data.entries=data.entries.map(row=>({...row,isMe:false}));data.me=entry({rank:71,nickname:'내 수호자',score:1000,isMe:true});assert.equal(parseAdventureHall(data).me?.rank,71);
});
test('잘못된 정렬·공동 순위·내 행·조회 개수와 응답 수치를 거부한다',()=>{
 const tie=board();tie.entries[1].rank=2;
 const reversed=board();reversed.entries.reverse();
 const duplicate=board();duplicate.entries[1].isMe=true;
 const mismatched=board();mismatched.me.score=10;
 for(const invalid of [null,{},tie,reversed,duplicate,mismatched,{...board(),limit:500},{...board(),entries:Array(51).fill(entry())},{...board(),entries:[entry({score:-1})]}])assert.throws(()=>parseAdventureHall(invalid));
});
test('확인된 저장 응답만 성공으로 처리하고 점수·순위 필드를 검증한다',()=>{
 const data={saved:true,duplicate:false,score:1000,bestScore:1500,rank:3};assert.deepEqual(parseAdventureRegistration({...data,uid:'private-uid'}),data);
 for(const invalid of [{...data,saved:false},{...data,rank:0},{...data,bestScore:999},{...data,score:Infinity}])assert.throws(()=>parseAdventureRegistration(invalid));
});
test('명예의 전당 색인은 점수 정렬·자기 순위 집계만 활성화하고 증거 배열은 비활성화한다',()=>{
 const config=JSON.parse(readFileSync(new URL('../firestore.indexes.json',import.meta.url),'utf8'));
 const fields=config.fieldOverrides.filter((field:{collectionGroup:string})=>field.collectionGroup==='adventureHall');
 assert.deepEqual(fields.find((field:{fieldPath:string})=>field.fieldPath==='*').indexes,[]);
 assert.deepEqual(fields.find((field:{fieldPath:string})=>field.fieldPath==='score').indexes,[{order:'ASCENDING',queryScope:'COLLECTION'},{order:'DESCENDING',queryScope:'COLLECTION'}]);
 assert.deepEqual(config.fieldOverrides.find((field:{collectionGroup:string})=>field.collectionGroup==='adventureRuns').indexes,[]);
});

// Exercise the actual store with SDK boundaries replaced, so offline retries and
// account races are deterministic and make no Firebase/network requests.
async function mockStore(){
 const storage=new Map<string,string>(),defaultApp={name:'[DEFAULT]',options:{projectId:'demo-decimal-defense'}},defaultAuth={app:defaultApp,currentUser:null as null|{uid:string;isAnonymous:boolean},authStateReady:async()=>{}};
 const state={apps:[defaultApp],auths:new Map<string,typeof defaultAuth>([['[DEFAULT]',defaultAuth]]),defaultAuth,mainFunctions:{app:defaultApp},anonymousSignIns:0,calls:[] as {app:string;name:string;payload:any}[],signInGate:Promise.resolve(),call:async(_app:string,name:string,payload:any):Promise<any>=>name==='adventureHall'?{entries:[],me:null,limit:50}:{saved:true,duplicate:false,score:payload.snapshot.score,bestScore:payload.snapshot.score,rank:1}};
 const previousStorage=Object.getOwnPropertyDescriptor(globalThis,'localStorage'),previousState=Object.getOwnPropertyDescriptor(globalThis,'__adventureHallStoreTests');
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(key:string)=>storage.get(key)??null,setItem:(key:string,value:string)=>storage.set(key,value)}});
 Object.defineProperty(globalThis,'__adventureHallStoreTests',{configurable:true,value:state});
 const modules:Record<string,string>={
  'firebase/app':`const s=globalThis.__adventureHallStoreTests; export const getApps=()=>s.apps; export function initializeApp(options,name){const app={options,name};s.apps.push(app);return app;}`,
  'firebase/auth':`const s=globalThis.__adventureHallStoreTests; export function getAuth(app){let auth=s.auths.get(app.name);if(!auth){auth={app,currentUser:null,authStateReady:async()=>{}};s.auths.set(app.name,auth);}return auth;} export const connectAuthEmulator=()=>{}; export async function signInAnonymously(auth){s.anonymousSignIns++;await s.signInGate;auth.currentUser={uid:'anonymous-owner',isAnonymous:true};return {user:auth.currentUser};}`,
  'firebase/functions':`const s=globalThis.__adventureHallStoreTests; export const getFunctions=app=>({app}); export const connectFunctionsEmulator=()=>{}; export const httpsCallable=(functions,name)=>async payload=>{s.calls.push({app:functions.app.name,name,payload});return {data:await s.call(functions.app.name,name,payload)}};`,
  './multiplayer/firebase':`const s=globalThis.__adventureHallStoreTests; export const auth=s.defaultAuth,functions=s.mainFunctions,firebaseConfigured=true,firebaseEmulator=false;`,
 };
 const bundled=await build({entryPoints:[new URL('../src/adventure-hall-store.ts',import.meta.url).pathname.replace(/^\/([A-Z]:)/,'$1')],bundle:true,write:false,platform:'node',format:'esm',target:'node22',plugins:[{name:'mock-store-sdk',setup(builder){builder.onResolve({filter:/^(firebase\/(app|auth|functions)|\.\/multiplayer\/firebase)$/},args=>({path:args.path,namespace:'mock-store'}));builder.onLoad({filter:/.*/,namespace:'mock-store'},args=>({contents:modules[args.path],loader:'js'}));}}]});
 const store=await import('data:text/javascript;base64,'+Buffer.from(bundled.outputFiles[0].text+'\n// '+Math.random()).toString('base64')) as typeof import('../src/adventure-hall-store');
 return {store,state,storage,close(){if(previousStorage)Object.defineProperty(globalThis,'localStorage',previousStorage);else delete (globalThis as any).localStorage;if(previousState)Object.defineProperty(globalThis,'__adventureHallStoreTests',previousState);else delete (globalThis as any).__adventureHallStoreTests;}};
}
test('명예의 전당 조회는 익명 계정을 만들지 않고 등록만 별도 앱에서 인증한다',async()=>{
 const context=await mockStore();try{
  await context.store.loadAdventureHall();assert.equal(context.state.anonymousSignIns,0);
  await context.store.registerAdventureHall('익명 수호자',snapshot());
  assert.equal(context.state.anonymousSignIns,1);assert.equal(context.state.defaultAuth.currentUser,null);
  assert.equal(context.state.calls.at(-1)?.app,'decimal-adventure-hall');assert.equal(context.store.pendingAdventureHall(),null);
 }finally{context.close();}
});
test('이미 로그인한 계정으로 등록할 때 기본 인증 주체를 유지한다',async()=>{
 const context=await mockStore();try{
  const current={uid:'existing-account',isAnonymous:false};context.state.defaultAuth.currentUser=current;
  await context.store.registerAdventureHall('계정 수호자',snapshot());
  assert.equal(context.state.anonymousSignIns,0);assert.equal(context.state.calls.at(-1)?.app,'[DEFAULT]');assert.equal(context.state.defaultAuth.currentUser,current);assert.equal(context.state.apps.length,1);
 }finally{context.close();}
});
test('네트워크 실패 뒤에는 닉네임·점수·UID를 보관하고 확인된 재시도만 대기를 지운다',async()=>{
 const context=await mockStore();try{
  context.state.call=async()=>{throw Object.assign(Error('offline'),{code:'functions/unavailable'});};
  const saved=snapshot();await assert.rejects(()=>context.store.registerAdventureHall('재시도 수호자',saved),/인터넷/);
  const pending=context.store.pendingAdventureHall(saved.runId);assert.equal(pending?.uid,'anonymous-owner');assert.equal(pending?.nickname,'재시도 수호자');assert.equal(pending?.snapshot.score,saved.score);assert.ok(context.storage.size>0);
  context.state.call=async(_app,_name,payload)=>({saved:true,duplicate:true,score:payload.snapshot.score,bestScore:payload.snapshot.score,rank:3});
  const reply=await context.store.registerAdventureHall(pending!.nickname,pending!.snapshot);assert.equal(reply.duplicate,true);assert.equal(context.store.pendingAdventureHall(saved.runId),null);
 }finally{context.close();}
});
test('대기 기록을 다른 로그인 계정으로 다시 전송하지 않는다',async()=>{
 const context=await mockStore();try{
  const saved=snapshot();context.state.call=async()=>{throw Object.assign(Error('offline'),{code:'functions/unavailable'});};await assert.rejects(()=>context.store.registerAdventureHall('원래 수호자',saved));
  context.state.defaultAuth.currentUser={uid:'different-account',isAnonymous:false};const calls=context.state.calls.length;
  await assert.rejects(()=>context.store.registerAdventureHall('원래 수호자',saved),/처음 등록한 계정/);assert.equal(context.state.calls.length,calls);assert.equal(context.store.pendingAdventureHall(saved.runId)?.uid,'anonymous-owner');
 }finally{context.close();}
});
test('동시 등록은 익명 인증 한 번을 공유하고 같은 캠페인의 중복 요청을 합친다',async()=>{
 const context=await mockStore();try{
  let identify!:()=>void;context.state.signInGate=new Promise<void>(resolve=>{identify=resolve;});
  const first=snapshot(),second={...snapshot(),runId:'second-campaign-run'},one=context.store.registerAdventureHall('첫 수호자',first),duplicate=context.store.registerAdventureHall('첫 수호자',first),two=context.store.registerAdventureHall('둘째 수호자',second);
  assert.equal(one,duplicate);await new Promise(resolve=>setTimeout(resolve,0));assert.equal(context.state.anonymousSignIns,1);identify();await Promise.all([one,two]);
  assert.equal(context.state.calls.filter(call=>call.name==='adventureRegister').length,2);assert.equal(context.state.defaultAuth.currentUser,null);
 }finally{context.close();}
});
test('응답을 기다리는 동안 계정이 바뀌면 성공 처리와 대기 삭제를 멈춘다',async()=>{
 const context=await mockStore();try{
  context.state.defaultAuth.currentUser={uid:'original-account',isAnonymous:false};let reply!:(value:any)=>void;let called!:()=>void;const callStarted=new Promise<void>(resolve=>{called=resolve;});
  context.state.call=async()=>{called();return new Promise(resolve=>{reply=resolve;});};const saved=snapshot(),registering=context.store.registerAdventureHall('원래 수호자',saved);await callStarted;
  context.state.defaultAuth.currentUser={uid:'new-account',isAnonymous:false};reply({saved:true,duplicate:false,score:saved.score,bestScore:saved.score,rank:1});
  await assert.rejects(()=>registering,/계정이 변경/);assert.equal(context.store.pendingAdventureHall(saved.runId)?.uid,'original-account');
 }finally{context.close();}
});
