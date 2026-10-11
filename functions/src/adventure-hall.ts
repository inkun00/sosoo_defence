import {getFirestore} from 'firebase-admin/firestore';
import {onCall,HttpsError} from 'firebase-functions/v2/https';
import {validAdventureSubmission,ADVENTURE_HALL_LIMIT,type AdventureHallEntry} from '../../src/adventure-hall-data';

const options={region:'asia-northeast3',maxInstances:10,minInstances:0,timeoutSeconds:30,memory:'256MiB' as const,cpu:'gcf_gen1' as const,concurrency:1};
function points(data:FirebaseFirestore.DocumentData|undefined):number|null {
 const value=data?.score;return Number.isSafeInteger(value)&&value>=0?value:null;
}
function publicRow(data:FirebaseFirestore.DocumentData,rank:number,isMe:boolean):AdventureHallEntry {
 const score=points(data);
 if(score===null||typeof data.nickname!=='string')throw new HttpsError('data-loss','명예의 전당 기록을 확인할 수 없어요. 잠시 뒤 다시 시도해 주세요.');
 return {rank,nickname:data.nickname,score,isMe};
}

/** Public top 50, with only the caller's own row marked when authenticated. */
export const adventureHall=onCall(options,async request=>{
 if(request.data!==null&&request.data!==undefined&&(typeof request.data!=='object'||Array.isArray(request.data)||Object.keys(request.data).length))throw new HttpsError('invalid-argument','순위 조회 요청을 확인해 주세요.');
 const profiles=getFirestore().collection('adventureHall'),uid=request.auth?.uid;
 const [top,own]=await Promise.all([profiles.orderBy('score','desc').limit(ADVENTURE_HALL_LIMIT).get(),uid?profiles.doc(uid).get():Promise.resolve(null)]);
 let previous:number|null=null,rank=0;
 const entries=top.docs.map((doc,index)=>{
  const score=points(doc.data());if(score===null)throw new HttpsError('data-loss','명예의 전당 점수 기록을 확인할 수 없어요.');
  if(previous!==score)rank=index+1;previous=score;
  return publicRow(doc.data(),rank,doc.id===uid);
 });
 let me=entries.find(entry=>entry.isMe)??null;
 if(!me&&own?.exists){
  const score=points(own.data());if(score===null)throw new HttpsError('data-loss','내 점수 기록을 확인할 수 없어요.');
  const higher=await profiles.where('score','>',score).count().get();
  me=publicRow(own.data()!,higher.data().count+1,true);
 }
 return {entries,me,limit:ADVENTURE_HALL_LIMIT};
});

/** Server-recomputed stage proofs; each UID has one best score and run receipts. */
export const adventureRegister=onCall(options,async request=>{
 if(!request.auth)throw new HttpsError('unauthenticated','인터넷 연결을 확인하고 등록을 다시 시도해 주세요.');
 let submission;try{submission=validAdventureSubmission(request.data);}catch(error){throw new HttpsError('invalid-argument',(error as Error).message);}
 const {nickname,snapshot}=submission,uid=request.auth.uid,db=getFirestore(),profile=db.doc(`adventureHall/${uid}`),receipt=profile.collection('adventureRuns').doc(snapshot.runId);
 const saved=await db.runTransaction(async transaction=>{
  const [prior,user]=await Promise.all([transaction.get(receipt),transaction.get(profile)]),oldScore=points(user.data());
  if(prior.exists){
   const priorScore=points(prior.data());if(priorScore===null||oldScore===null)throw new HttpsError('data-loss','저장된 점수를 확인할 수 없어요.');
   if(snapshot.score<=priorScore)return {duplicate:true,score:priorScore,bestScore:oldScore};
   const previous=prior.data()!.stages as {stage:number;score:number}[];
   if(!Array.isArray(previous)||!previous.every(stage=>snapshot.stages.some(next=>next.stage===stage.stage&&next.score>=stage.score)))throw new HttpsError('failed-precondition','이전에 클리어한 스테이지의 최고 점수를 유지한 기록으로 다시 시도해 주세요.');
  }
  const completedAt=Date.now(),bestScore=Math.max(oldScore??0,snapshot.score);
  // The total was reconstructed from the individually validated hit/question
  // arrays. Neither an arbitrary total nor a caller-supplied UID is stored.
  transaction.set(receipt,{score:snapshot.score,nickname,stages:snapshot.stages,savedAt:completedAt});
  if(oldScore===null||snapshot.score>=oldScore)transaction.set(profile,{score:snapshot.score,nickname,bestRunId:snapshot.runId,completedAt});
  return {duplicate:false,score:snapshot.score,bestScore};
 });
 const higher=await db.collection('adventureHall').where('score','>',saved.bestScore).count().get();
 return {saved:true,...saved,rank:higher.data().count+1};
});
