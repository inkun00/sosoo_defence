import {getApps,initializeApp} from 'firebase/app';
import {getAuth,connectAuthEmulator,signInAnonymously,type Auth} from 'firebase/auth';
import {getFunctions,connectFunctionsEmulator,httpsCallable,type Functions} from 'firebase/functions';
import {auth,functions,firebaseConfigured,firebaseEmulator} from './multiplayer/firebase';
import {validAdventureSubmission,parseAdventureHall,parseAdventureRegistration,type AdventureHallData,type AdventureHallRegistration} from './adventure-hall-data';
import type {CampaignCompletion} from './campaign-score';

const appName='decimal-adventure-hall',pendingKey='decimal-adventure-hall-pending-v1';
export interface PendingAdventureHall {nickname:string;snapshot:CampaignCompletion;uid:string|null;}
let memory:PendingAdventureHall[]=[],memoryOnly=false,anonymous:Auth|null=null,anonymousFunctions:Functions|null=null,identifying:Promise<unknown>|null=null;
const registering=new Map<string,Promise<AdventureHallRegistration>>(),reading=new Map<string,Promise<AdventureHallData>>(),cache=new Map<string,{time:number;data:AdventureHallData}>();

function readPending():PendingAdventureHall[] {
 let raw:unknown=memory;
 if(!memoryOnly)try{raw=JSON.parse(localStorage.getItem(pendingKey)||'[]');}catch{return memory;}
 if(!Array.isArray(raw))return memory;
 return raw.flatMap(value=>{try{
  const data=validAdventureSubmission(value),uid=(value as Record<string,unknown>).uid;
  if(uid!==null&&(typeof uid!=='string'||!uid))return [];
  return [{...data,uid}];
 }catch{return [];}});
}
function writePending(rows:PendingAdventureHall[]) {
 memory=rows;
 try{localStorage.setItem(pendingKey,JSON.stringify(rows));memoryOnly=false;}catch{memoryOnly=true;}
}
export function pendingAdventureHall(runId?:string):PendingAdventureHall|null {
 const rows=readPending();return (runId?rows.find(row=>row.snapshot.runId===runId):rows[rows.length-1])??null;
}

async function connection(identity:boolean):Promise<{auth:Auth;functions:Functions;uid:string|null}> {
 if(!firebaseConfigured||!auth||!functions)throw Error('명예의 전당 연결을 준비하고 있어요. 잠시 뒤 다시 시도해 주세요.');
 await auth.authStateReady();
 if(auth.currentUser&&!auth.currentUser.isAnonymous)return {auth,functions,uid:auth.currentUser.uid};
 if(!anonymous){
  const existing=getApps().find(app=>app.name===appName),app=existing??initializeApp(auth.app.options,appName);
  anonymous=getAuth(app);anonymousFunctions=getFunctions(app,'asia-northeast3');
  if(firebaseEmulator&&!existing){connectAuthEmulator(anonymous,'http://127.0.0.1:9099',{disableWarnings:true});connectFunctionsEmulator(anonymousFunctions,'127.0.0.1',5001);}
 }
 await anonymous.authStateReady();
 if(identity&&!anonymous.currentUser){
  identifying??=signInAnonymously(anonymous).finally(()=>{identifying=null;});
  await identifying;
 }
 return {auth:anonymous,functions:anonymousFunctions!,uid:anonymous.currentUser?.uid??null};
}

function readableError(error:unknown):Error {
 const data=error as {code?:string;message?:string};
 if(['auth/network-request-failed','functions/unavailable','functions/deadline-exceeded','functions/internal'].includes(data.code??''))return Error('인터넷 연결을 확인하고 다시 시도해 주세요. 입력한 닉네임과 점수는 이 브라우저에 보관돼요.');
 if(data.code==='auth/operation-not-allowed')return Error('명예의 전당 연결을 준비하고 있어요. 잠시 뒤 다시 시도해 주세요.');
 return Error(data.message||'명예의 전당 연결을 확인하고 다시 시도해 주세요.');
}

/** Opening the hall never creates an account or asks for an email login. */
export async function loadAdventureHall(options:{fresh?:boolean}={}):Promise<AdventureHallData> {
 try{
  const context=await connection(false),key=context.uid??'public',previous=cache.get(key);
  if(!options.fresh&&previous&&Date.now()-previous.time<60000)return previous.data;
  const existing=reading.get(key);if(existing)return existing;
  const request=httpsCallable<Record<string,never>,unknown>(context.functions,'adventureHall',{timeout:30000})({}).then(reply=>{
   if((context.auth.currentUser?.uid??null)!==context.uid)throw Error('계정이 변경됐어요. 명예의 전당을 다시 열어 주세요.');
   const data=parseAdventureHall(reply.data);cache.set(key,{time:Date.now(),data});return data;
  }).finally(()=>reading.delete(key));
  reading.set(key,request);return await request;
 }catch(error){throw readableError(error);}
}

/** A persisted run and UID make manual retry safe after a lost response. */
export function registerAdventureHall(nickname:string,snapshot:CampaignCompletion):Promise<AdventureHallRegistration> {
 const submission=validAdventureSubmission({nickname,snapshot}),runId=submission.snapshot.runId,existing=registering.get(runId);
 if(existing)return existing;
 const prior=pendingAdventureHall(runId),pending:PendingAdventureHall={...submission,uid:prior?.uid??null};
 writePending([...readPending().filter(row=>row.snapshot.runId!==runId),pending]);
 const work=(async()=>{
  try{
   const context=await connection(true);
   if(!context.uid)throw Error('인터넷 연결을 확인하고 등록을 다시 시도해 주세요.');
   if(pending.uid&&pending.uid!==context.uid)throw Error('이 기록을 처음 등록한 계정으로 다시 시도해 주세요.');
   pending.uid=context.uid;writePending([...readPending().filter(row=>row.snapshot.runId!==runId),pending]);
   const reply=await httpsCallable<typeof submission,unknown>(context.functions,'adventureRegister',{timeout:30000})(submission);
   if(context.auth.currentUser?.uid!==context.uid)throw Error('계정이 변경됐어요. 같은 계정으로 등록을 다시 시도해 주세요.');
   const saved=parseAdventureRegistration(reply.data);
   writePending(readPending().filter(row=>row.snapshot.runId!==runId));cache.clear();return saved;
  }catch(error){throw readableError(error);}
 })().finally(()=>registering.delete(runId));
 registering.set(runId,work);return work;
}
