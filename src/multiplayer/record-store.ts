import {doc,getDoc,collection,query,orderBy,limit,getDocs,where,startAfter,documentId,QueryConstraint} from 'firebase/firestore/lite';
import {httpsCallable} from 'firebase/functions';
import {auth,firestore,functions,recordsReady} from './firebase';
import {MatchRecord,Progress,emptyProgress,normalizeProgress,validRecord} from './records';
import {incrementalHistory} from './history-sync';
import {importLearningRecords} from '../learning';
const cache=new Map<string,{time:number;value:unknown}>(),reading=new Map<string,Promise<unknown>>();
async function cached<T>(key:string,read:()=>Promise<T>,fresh=60000):Promise<T>{const value=cache.get(key);if(value&&Date.now()-value.time<fresh)return value.value as T;const existing=reading.get(key);if(existing)return existing as Promise<T>;const request=read().then(value=>{if(fresh>0)cache.set(key,{time:Date.now(),value});return value;}).finally(()=>reading.delete(key));reading.set(key,request);return request;}
export interface FlushResults{message:string;progress:Progress|null;experienceGain:number|null;experienceGains:Record<string,number>;savedMatchIds:string[];}
const key='decimal-duel-pending-results-v1';let memory:MatchRecord[]=[];let memoryOnly=false;const flushing=new Map<string,Promise<FlushResults>>();
function owner(record:MatchRecord){return record.side===0?record.hostUid:record.guestUid;}
function pending():MatchRecord[]{if(memoryOnly)return memory;try{const saved=JSON.parse(localStorage.getItem(key)||'[]');if(!Array.isArray(saved))return memory;return saved.flatMap(record=>{try{return[validRecord(record,owner(record))];}catch{return[];}});}catch{return memory;}}
function write(list:MatchRecord[]){memory=list;try{localStorage.setItem(key,JSON.stringify(list));memoryOnly=false;return true;}catch{memoryOnly=true;return false;}}
export function queueResult(record:MatchRecord){const normalized=validRecord(record,owner(record)),list=pending();if(!list.some(r=>r.matchId===normalized.matchId&&owner(r)===owner(normalized)))list.push(normalized);return write(list);}
export function pendingCount(uid:string){return pending().filter(r=>owner(r)===uid).length;}
export async function loadProgress(uid:string):Promise<Progress>{if(!firestore)return emptyProgress();return normalizeProgress(await cached(uid+':progress',async()=>(await getDoc(doc(firestore!,'decimalUsers',uid))).data()?.progress));}
export async function loadHistory(uid:string){if(!firestore)return [];return cached(uid+':history',async()=>{const rows=await getDocs(query(collection(firestore!,'decimalUsers',uid,'matches'),orderBy('endedAt','desc'),limit(20)));return rows.docs.map(d=>d.data() as MatchRecord&{experienceGain:number});});}
export async function loadLearningHistory(uid:string){if(!firestore||!recordsReady)return [];return cached(uid+':learning',()=>incrementalHistory<MatchRecord>(uid,async(from,cursor)=>{
 if(auth?.currentUser?.uid!==uid)throw Error('같은 계정으로 로그인해 주세요.');
 const constraints:QueryConstraint[]=[where('savedAt','>=',from),orderBy('savedAt','asc'),orderBy(documentId(),'asc'),limit(100)];if(cursor)constraints.push(startAfter(cursor.time,cursor.id));
 const rows=await getDocs(query(collection(firestore!,'decimalUsers',uid,'matches'),...constraints));return rows.docs.map(d=>({cursor:{time:d.data().savedAt as number,id:d.id},record:d.data() as MatchRecord}));
 },rows=>auth?.currentUser?.uid===uid&&importLearningRecords(rows)),0);}
export function flushResults(uid:string){const existing=flushing.get(uid);if(existing)return existing;const work=(async()=>{
 let progress:Progress|null=null,message='저장된 경기 기록이 없어요.',experienceGain:number|null=null;const experienceGains:Record<string,number>={},savedMatchIds:string[]=[],attempted=new Set<string>();
 // A second caller can enqueue a new match while an older upload is in flight.
 // Drain the current queue rather than freezing its first snapshot.
 while(true){
  const r=pending().find(record=>owner(record)===uid&&!attempted.has(record.matchId));if(!r)break;attempted.add(r.matchId);
  if(auth?.currentUser?.uid!==uid){message='같은 계정으로 로그인하면 이 경기 기록을 다시 저장해요.';break;}
  if(!functions||!recordsReady){message='운영 기록 저장 연결을 준비하고 있어요. 이 브라우저에 경기 기록을 보관했어요.';break;}
  try{
   const data=(await httpsCallable<MatchRecord,{progress:Progress;experienceGain?:number}>(functions,'duelSaveResult',{timeout:12000})(r)).data;
   if(auth?.currentUser?.uid!==uid){message='같은 계정으로 로그인하면 이 경기 기록의 저장을 다시 확인해요.';break;}
   if(!data||typeof data.progress!=='object'||data.progress===null)throw Error('저장 결과를 확인한 뒤 경기 기록을 다시 저장해요.');
   progress=normalizeProgress(data.progress);experienceGain=Number.isSafeInteger(data.experienceGain)&&data.experienceGain!>=0?data.experienceGain!:null;
   if(experienceGain!==null)experienceGains[r.matchId]=experienceGain;savedMatchIds.push(r.matchId);
   cache.set(uid+':progress',{time:Date.now(),value:progress});cache.delete(uid+':history');write(pending().filter(v=>!(v.matchId===r.matchId&&owner(v)===uid)));message='Firebase에 경기 기록을 저장했어요.';
  }
  catch(e){message=(e as Error).message||'인터넷 연결 뒤 기록 저장을 다시 시도해요.';break;}
 }
 return {message,progress,experienceGain,experienceGains,savedMatchIds};
 })().finally(()=>{flushing.delete(uid);});flushing.set(uid,work);return work;}
