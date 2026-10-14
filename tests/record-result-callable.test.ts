import test from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import {COMPUTER_OPPONENTS} from '../src/multiplayer/computer-opponents';
import {accountLevelThreshold,type MatchRecord,type Progress} from '../src/multiplayer/records';

const now=Date.now();
const record=(extra:Partial<MatchRecord>={}):MatchRecord=>({version:1,matchId:'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',hostUid:'human-a',guestUid:'human-b',side:0,outcome:'win',endedAt:now,duration:30,solved:2,purchases:1,wrongQuestions:[],...extra});
const cpu=(level=5,sequence=1)=>record({matchId:`computer-${now}-${sequence}`,guestUid:'computer-'+COMPUTER_OPPONENTS[level-1].id,opponentType:'computer',opponentLevel:level});
type Document=Record<string,unknown>;
type Reference={path:string;collection:(name:string)=>{doc:(id:string)=>Reference}};
type Response={saved:boolean;duplicate:boolean;progress:Progress;experienceGain:number};

// Run the production callable and its real reward helpers with an atomic in-memory
// Firestore boundary. These tests never initialize Firebase or touch live accounts.
async function callable(initial:Record<string,Document>={}){
 const documents=new Map(Object.entries(structuredClone(initial))),writes:string[]=[];
 const reference=(path:string):Reference=>({path,collection:name=>({doc:id=>reference(`${path}/${name}/${id}`)})});
 const db={doc:reference,async runTransaction(work:(tx:unknown)=>Promise<Response>){
  const snapshot=new Map(structuredClone([...documents])),pending:{path:string;data:Document;merge:boolean}[]=[];
  const result=await work({
   get:async(ref:Reference)=>({exists:snapshot.has(ref.path),data:()=>structuredClone(snapshot.get(ref.path))}),
   set:(ref:Reference,data:Document,options?:{merge?:boolean})=>pending.push({path:ref.path,data:structuredClone(data),merge:options?.merge??false}),
  });
  for(const write of pending){documents.set(write.path,write.merge?{...documents.get(write.path),...write.data}:write.data);writes.push(write.path);}
  return result;
 }};
 const key=`__duelResultTests_${Math.random().toString(36).slice(2)}`;
 Object.defineProperty(globalThis,key,{configurable:true,value:{db}});
 const modules:Record<string,string>={
  'firebase-admin/app':'export const initializeApp=()=>{};',
  'firebase-admin/firestore':`export const getFirestore=()=>globalThis[${JSON.stringify(key)}].db;`,
  'firebase-functions/v2/https':`export const onCall=(_options,handler)=>handler;export class HttpsError extends Error{constructor(code,message){super(message);this.code=code;}}`,
  './rooms':'export const duelRoom={},duelPruneRooms={};',
  './relay':'export const duelIce={};',
  './leaderboard':'export const duelLeaderboard={};',
  './adventure-hall':'export const adventureHall={},adventureRegister={};',
 };
 try{
  const bundle=await build({entryPoints:[fileURLToPath(new URL('../functions/src/index.ts',import.meta.url))],bundle:true,write:false,platform:'node',format:'esm',target:'node22',plugins:[{name:'mock-result-sdk',setup(builder){
   builder.onResolve({filter:/^(firebase-admin\/(app|firestore)|firebase-functions\/v2\/https|\.\/(rooms|relay|leaderboard|adventure-hall))$/},args=>({path:args.path,namespace:'mock-result'}));
   builder.onLoad({filter:/.*/,namespace:'mock-result'},args=>({contents:modules[args.path],loader:'js'}));
  }}]});
  const module=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
  return{documents,writes,save:(data:unknown,uid='human-a')=>module.duelSaveResult({auth:{uid},data}) as Promise<Response>,close(){delete(globalThis as Record<string,unknown>)[key];}};
 }catch(error){delete(globalThis as Record<string,unknown>)[key];throw error;}
}

test('the callable uses persisted XP before a CPU level-up and rejects client reward claims',async()=>{
 const context=await callable({'decimalUsers/human-a':{progress:{wins:3,losses:1,draws:0,experience:1499,level:1},displayName:'수호자'}});
 try{
  const r=cpu(),saved=await context.save({...r,level:1,playerLevel:1,experienceGain:999999,progress:{experience:0}});
  assert.deepEqual(saved,{saved:true,duplicate:false,experienceGain:153,progress:{wins:4,losses:1,draws:0,experience:1652,level:6}});
  const entry=context.documents.get(`decimalUsers/human-a/matches/${r.matchId}`)!;
  assert.equal(entry.experienceGain,153);assert.equal(entry.rewardVersion,4);assert.equal('playerLevel' in entry,false);assert.equal('level' in entry,false);
  assert.equal(context.documents.get('decimalUsers/human-a')!.displayName,'수호자');
  assert.equal(context.documents.get(`decimalResults/${r.matchId}`)!.hostLevel,5);
  const writeCount=context.writes.length,again=await context.save(r);
  assert.deepEqual(again,{...saved,duplicate:true});assert.equal(context.writes.length,writeCount,'retry returns the original gain without applying XP or wins again');
 }finally{context.close();}
});

test('later CPU wins use the current persisted owner level even if a receipt has an older snapshot',async()=>{
 const second=cpu(5,2),context=await callable({
  'decimalUsers/human-a':{progress:{experience:1499}},
  [`decimalResults/${second.matchId}`]:{hostUid:'human-a',guestUid:second.guestUid,winnerUid:'human-a',hostLevel:1,guestLevel:5,rewardVersion:2},
 });
 try{
  const first=await context.save(cpu());assert.equal(first.experienceGain,153);assert.equal(first.progress.level,6);
  const saved=await context.save(second);assert.equal(saved.experienceGain,138);assert.equal(saved.progress.experience,1790);assert.equal(saved.progress.level,6);
  assert.equal(context.documents.get(`decimalUsers/human-a/matches/${second.matchId}`)!.experienceGain,138);
 }finally{context.close();}
});

test('the callable grants bounded stronger and weaker CPU rewards, including legacy uploads',async()=>{
 const context=await callable({
  'decimalUsers/strong':{progress:{experience:0,level:10}},
  'decimalUsers/weak':{progress:{experience:4500,level:1}},
 });
 try{
  const strong={...cpu(10,3),hostUid:'strong'};delete strong.opponentType;delete strong.opponentLevel;
  const boosted=await context.save(strong,'strong');assert.equal(boosted.experienceGain,453);assert.equal(boosted.progress.experience,453);
  const reduced=await context.save({...cpu(1,4),hostUid:'weak'},'weak');assert.equal(reduced.experienceGain,9);assert.equal(reduced.progress.level,10);
  await assert.rejects(()=>context.save({...cpu(1,5),hostUid:'weak',opponentLevel:10},'weak'),/상대와 레벨/);
  assert.equal(context.documents.has(`decimalUsers/weak/matches/${cpu(1,5).matchId}`),false);
 }finally{context.close();}
});

test('saved legacy results keep their original award on duplicate upload after the reward policy changes',async()=>{
 for(const version of [2,3]){
 const r=cpu(1,6),context=await callable({
  'decimalUsers/human-a':{progress:{wins:7,experience:5000,level:10}},
  [`decimalUsers/human-a/matches/${r.matchId}`]:{...r,experienceGain:115,progress:{wins:1,experience:115,level:2},rewardVersion:version},
 });
 try{
  const saved=await context.save(r);assert.equal(saved.duplicate,true);assert.equal(saved.experienceGain,115);assert.equal(saved.progress.experience,5000);assert.equal(saved.progress.wins,7);
  assert.equal(context.writes.length,0,'historical XP and stored rewards are never recalculated');
 }finally{context.close();}
 }
});

test('PvP callable rewards retain the server opponent level and the first saved level snapshot',async()=>{
 const context=await callable({
  'decimalUsers/human-a':{progress:{experience:99,level:10}},
  'decimalUsers/human-b':{progress:{experience:accountLevelThreshold(3),level:1}},
 });
 try{
  const host=await context.save(record({outcome:'loss',opponentLevel:50}));assert.equal(host.experienceGain,15);assert.equal(host.progress.level,2);
  const guest=await context.save(record({side:1,outcome:'win',opponentLevel:50}),'human-b');assert.equal(guest.experienceGain,33);
  const receipt=context.documents.get(`decimalResults/${record().matchId}`)!;assert.equal(receipt.hostLevel,1);assert.equal(receipt.guestLevel,3);
 }finally{context.close();}
});

test('level 50 PvP rewards use server XP and preserve the first snapshot in either save order',async()=>{
 for(const firstSide of [0,1] as const){
  const context=await callable({
   'decimalUsers/human-a':{progress:{experience:accountLevelThreshold(49)-1,level:1}},
   'decimalUsers/human-b':{progress:{experience:accountLevelThreshold(50),level:1}},
  });
  try{
   const host=record({opponentLevel:1}),guest=record({side:1,outcome:'loss',opponentLevel:1});
   let savedHost:Response,savedGuest:Response;
   if(firstSide===0){savedHost=await context.save(host);savedGuest=await context.save(guest,'human-b');}
   else{savedGuest=await context.save(guest,'human-b');savedHost=await context.save(host);}
   assert.equal(savedHost.experienceGain,1503);assert.equal(savedHost.progress.level,49);
   assert.equal(savedGuest.experienceGain,15);assert.equal(savedGuest.progress.level,50);
   const receipt=context.documents.get(`decimalResults/${host.matchId}`)!;
   assert.equal(receipt.hostLevel,48);assert.equal(receipt.guestLevel,50);assert.equal(receipt.rewardVersion,4);
   const retry=await context.save(host);assert.equal(retry.experienceGain,1503);assert.equal(retry.duplicate,true);
  }finally{context.close();}
 }
});

test('legacy level-10 profile XP above the old cap recalculates to its new level without rewriting historical rewards',async()=>{
 const r=cpu(10,7),context=await callable({'decimalUsers/human-a':{progress:{wins:8,losses:2,draws:1,experience:50000,level:10}}});
 try{
  const saved=await context.save(r);
  assert.equal(saved.experienceGain,63);assert.deepEqual(saved.progress,{wins:9,losses:2,draws:1,experience:50063,level:32});
  assert.equal(context.documents.get(`decimalResults/${r.matchId}`)!.hostLevel,32);
 }finally{context.close();}
});

test('existing level snapshots remain valid through 50 and malformed newer receipts do not award XP',async()=>{
 for(const guestLevel of [10,50,51]){
  const r=record(),context=await callable({
   'decimalUsers/human-a':{progress:{experience:0}},
   [`decimalResults/${r.matchId}`]:{hostUid:r.hostUid,guestUid:r.guestUid,winnerUid:r.hostUid,hostLevel:1,guestLevel,rewardVersion:3},
  });
  try{
   if(guestLevel===51){await assert.rejects(()=>context.save(r),/저장된 레벨/);assert.equal(context.writes.length,0);}
   else{const saved=await context.save(r);assert.equal(saved.experienceGain,30*guestLevel+3);}
  }finally{context.close();}
 }
});
