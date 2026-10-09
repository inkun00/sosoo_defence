import {getAuth} from 'firebase-admin/auth';
import {getFirestore} from 'firebase-admin/firestore';
import {onCall,HttpsError} from 'firebase-functions/v2/https';
import {accountLevel} from '../../src/multiplayer/records';

const LIMIT=50;
const unnamed='이름 없는 수호자';
interface LeaderboardEntry {rank:number|null;name:string;level:number;experience:number;isMe:boolean;}

function experience(data:FirebaseFirestore.DocumentData|undefined):number|null {
 const value=data?.progress?.experience;
 return Number.isSafeInteger(value)&&value>=0?value:null;
}
function displayName(value:string|undefined){return value?.replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim().slice(0,16)||unnamed;}

// Account level increases with total XP, so sorting canonical server XP also
// sorts level first. A single-field query avoids a separate composite index.
export const duelLeaderboard=onCall({region:'asia-northeast3',maxInstances:5,minInstances:0,timeoutSeconds:15,memory:'256MiB',cpu:'gcf_gen1',concurrency:1},async request=>{
 if(!request.auth)throw new HttpsError('unauthenticated','먼저 로그인해 주세요.');
 if(request.data!==null&&request.data!==undefined&&(typeof request.data!=='object'||Array.isArray(request.data)||Object.keys(request.data).length))throw new HttpsError('invalid-argument','순위 조회 요청을 확인해 주세요.');
 const uid=request.auth.uid,profiles=getFirestore().collection('decimalUsers');
 const [top,own]=await Promise.all([profiles.orderBy('progress.experience','desc').limit(LIMIT).get(),profiles.doc(uid).get()]);
 const ownExperience=experience(own.data()),ownIndex=top.docs.findIndex(doc=>doc.id===uid);
 const uids=[...new Set([...top.docs.map(doc=>doc.id),uid])];
 const [accounts,higher]=await Promise.all([
  getAuth().getUsers(uids.map(uid=>({uid}))),
  ownExperience!==null&&ownIndex===-1?profiles.where('progress.experience','>',ownExperience).count().get():Promise.resolve(null),
 ]);
 const names=new Map(accounts.users.map(account=>[account.uid,displayName(account.displayName)]));
 let previous=-1,rank=0;
 const entries:LeaderboardEntry[]=top.docs.map((doc,index)=>{
  const xp=experience(doc.data());
  if(xp===null)throw new HttpsError('data-loss','순위 기록의 경험치를 확인할 수 없어요. 잠시 뒤 다시 시도해 주세요.');
  if(previous!==xp)rank=index+1;
  previous=xp;
  // Only public display information crosses the callable boundary. A removed
  // Auth record retains its server profile's rank with a neutral name.
  return {rank,name:names.get(doc.id)||unnamed,level:accountLevel(xp),experience:xp,isMe:doc.id===uid};
 });
 const me:LeaderboardEntry=ownIndex!==-1?entries[ownIndex]:{
  rank:ownExperience===null?null:higher!.data().count+1,
  name:names.get(uid)||unnamed,
  level:accountLevel(ownExperience??0),experience:ownExperience??0,isMe:true,
 };
 return {entries,me,limit:LIMIT};
});
