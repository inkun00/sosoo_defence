import {doc,getDoc,collection,query,orderBy,limit,getDocs,where,startAfter,documentId,QueryConstraint} from 'firebase/firestore/lite';
import {httpsCallable} from 'firebase/functions';
import {auth,firestore,functions,recordsReady} from './firebase';
import {MatchRecord,Progress,emptyProgress} from './records';
import {incrementalHistory} from './history-sync';
import {importLearningRecords} from '../learning';
const cache=new Map<string,{time:number;value:unknown}>(),reading=new Map<string,Promise<unknown>>();
async function cached<T>(key:string,read:()=>Promise<T>,fresh=60000):Promise<T>{const value=cache.get(key);if(value&&Date.now()-value.time<fresh)return value.value as T;const existing=reading.get(key);if(existing)return existing as Promise<T>;const request=read().then(value=>{if(fresh>0)cache.set(key,{time:Date.now(),value});return value;}).finally(()=>reading.delete(key));reading.set(key,request);return request;}
const key='decimal-duel-pending-results-v1';let memory:MatchRecord[]=[];let memoryOnly=false;const flushing=new Map<string,Promise<{message:string;progress:Progress|null}>>();
function pending():MatchRecord[]{if(memoryOnly)return memory;try{const saved=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(saved)?saved:memory;}catch{return memory;}}
function write(list:MatchRecord[]){memory=list;try{localStorage.setItem(key,JSON.stringify(list));memoryOnly=false;return true;}catch{memoryOnly=true;return false;}}
export function queueResult(record:MatchRecord){const list=pending();if(!list.some(r=>r.matchId===record.matchId&&(r.side===0?r.hostUid:r.guestUid)===(record.side===0?record.hostUid:record.guestUid)))list.push(record);return write(list);}
export function pendingCount(uid:string){return pending().filter(r=>(r.side===0?r.hostUid:r.guestUid)===uid).length;}
export async function loadProgress(uid:string):Promise<Progress>{if(!firestore)return emptyProgress();return cached(uid+':progress',async()=>(await getDoc(doc(firestore!,'decimalUsers',uid))).data()?.progress||emptyProgress());}
export async function loadHistory(uid:string){if(!firestore)return [];return cached(uid+':history',async()=>{const rows=await getDocs(query(collection(firestore!,'decimalUsers',uid,'matches'),orderBy('endedAt','desc'),limit(20)));return rows.docs.map(d=>d.data() as MatchRecord&{experienceGain:number});});}
export async function loadLearningHistory(uid:string){if(!firestore||!recordsReady)return [];return cached(uid+':learning',()=>incrementalHistory<MatchRecord>(uid,async(from,cursor)=>{
 if(auth?.currentUser?.uid!==uid)throw Error('같은 계정으로 로그인해 주세요.');
 const constraints:QueryConstraint[]=[where('savedAt','>=',from),orderBy('savedAt','asc'),orderBy(documentId(),'asc'),limit(100)];if(cursor)constraints.push(startAfter(cursor.time,cursor.id));
 const rows=await getDocs(query(collection(firestore!,'decimalUsers',uid,'matches'),...constraints));return rows.docs.map(d=>({cursor:{time:d.data().savedAt as number,id:d.id},record:d.data() as MatchRecord}));
 },rows=>auth?.currentUser?.uid===uid&&importLearningRecords(rows)),0);}
export function flushResults(uid:string){const existing=flushing.get(uid);if(existing)return existing;const work=(async()=>{
 let progress:Progress|null=null,message='저장된 경기 기록이 없어요.';
 for(const r of pending().filter(r=>(r.side===0?r.hostUid:r.guestUid)===uid)){
  if(auth?.currentUser?.uid!==uid){message='같은 계정으로 로그인하면 이 경기 기록을 다시 저장해요.';break;}
  if(!functions||!recordsReady){message='운영 기록 저장 연결을 준비하고 있어요. 이 브라우저에 경기 기록을 보관했어요.';break;}
  try{const data=(await httpsCallable<MatchRecord,{progress:Progress}>(functions,'duelSaveResult',{timeout:12000})(r)).data;progress=data.progress;cache.set(uid+':progress',{time:Date.now(),value:progress});cache.delete(uid+':history');write(pending().filter(v=>!(v.matchId===r.matchId&&v.side===r.side&&(v.side===0?v.hostUid:v.guestUid)===uid)));message='Firebase에 경기 기록을 저장했어요.';}
  catch(e){message=(e as Error).message||'인터넷 연결 뒤 기록 저장을 다시 시도해요.';break;}
 }
 return {message,progress};
 })().finally(()=>{flushing.delete(uid);});flushing.set(uid,work);return work;}
