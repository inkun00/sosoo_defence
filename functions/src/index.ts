import {initializeApp} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
import {onCall,HttpsError} from 'firebase-functions/v2/https';
import {validRecord,progressAfter,emptyProgress,matchExperience,Progress} from '../../src/multiplayer/records';
initializeApp();const db=getFirestore();
// Match records are separate from the room directory; combat stays on the host.
export const duelSaveResult=onCall({region:'asia-northeast3',maxInstances:10,minInstances:0,timeoutSeconds:30,memory:'256MiB',cpu:'gcf_gen1',concurrency:1},async r=>{
 if(!r.auth)throw new HttpsError('unauthenticated','먼저 로그인해 주세요.');
 let record;try{record=validRecord(r.data,r.auth.uid);}catch(e){throw new HttpsError('invalid-argument',(e as Error).message);}
 const uid=r.auth.uid,profile=db.doc(`decimalUsers/${uid}`),entry=profile.collection('matches').doc(record.matchId),match=db.doc(`decimalResults/${record.matchId}`);
 const winnerUid=record.outcome==='draw'?null:record.outcome==='win'?uid:record.side===0?record.guestUid:record.hostUid;
 return db.runTransaction(async tx=>{
  const [prior,user,finished]=await Promise.all([tx.get(entry),tx.get(profile),tx.get(match)]);
  if(prior.exists)return {saved:true,duplicate:true,progress:user.data()?.progress||prior.data()!.progress,experienceGain:prior.data()!.experienceGain};
  if(finished.exists){const old=finished.data()!;if(old.hostUid!==record.hostUid||old.guestUid!==record.guestUid||old.winnerUid!==winnerUid)throw new HttpsError('failed-precondition','상대가 저장한 승패와 달라요. 연결 중단 기록을 확인해 주세요.');}
  const progress=progressAfter((user.data()?.progress as Progress)||emptyProgress(),record),experienceGain=matchExperience(record);
  if(!finished.exists)tx.set(match,{hostUid:record.hostUid,guestUid:record.guestUid,winnerUid,endedAt:record.endedAt});
  tx.set(entry,{...record,experienceGain,progress,savedAt:Date.now()});tx.set(profile,{progress},{merge:true});
  return {saved:true,duplicate:false,progress,experienceGain};
 });
});

export {duelRoom,duelPruneRooms} from "./rooms";
export {duelIce} from './relay';
export {duelLeaderboard} from './leaderboard';
