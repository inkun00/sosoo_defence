import {initializeApp} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
import {onCall,HttpsError} from 'firebase-functions/v2/https';
import {validRecord,progressAfter,normalizeProgress,matchExperience,opponentUid,computerOpponentLevel} from '../../src/multiplayer/records';
import {matchLevels,rewardedRecord} from './record-rewards';
initializeApp();const db=getFirestore();
// Match records are separate from the room directory; combat stays on the host.
export const duelSaveResult=onCall({region:'asia-northeast3',maxInstances:10,minInstances:0,timeoutSeconds:30,memory:'256MiB',cpu:'gcf_gen1',concurrency:1},async r=>{
 if(!r.auth)throw new HttpsError('unauthenticated','먼저 로그인해 주세요.');
 let record;try{record=validRecord(r.data,r.auth.uid);}catch(e){throw new HttpsError('invalid-argument',(e as Error).message);}
 const uid=r.auth.uid,profile=db.doc(`decimalUsers/${uid}`),entry=profile.collection('matches').doc(record.matchId),match=db.doc(`decimalResults/${record.matchId}`),other=computerOpponentLevel(opponentUid(record))===null?db.doc(`decimalUsers/${opponentUid(record)}`):null;
 const winnerUid=record.outcome==='draw'?null:record.outcome==='win'?uid:record.side===0?record.guestUid:record.hostUid;
 return db.runTransaction(async tx=>{
  const [prior,user,finished,opponent]=await Promise.all([tx.get(entry),tx.get(profile),tx.get(match),other?tx.get(other):Promise.resolve(null)]);
  if(prior.exists)return {saved:true,duplicate:true,progress:normalizeProgress(user.data()?.progress??prior.data()!.progress),experienceGain:prior.data()!.experienceGain??0};
  if(finished.exists){const old=finished.data()!;if(old.hostUid!==record.hostUid||old.guestUid!==record.guestUid||old.winnerUid!==winnerUid)throw new HttpsError('failed-precondition','상대가 저장한 승패와 달라요. 연결 중단 기록을 확인해 주세요.');}
  let levels;try{levels=matchLevels(record,record.side===0?user.data()?.progress:opponent?.data()?.progress,record.side===1?user.data()?.progress:opponent?.data()?.progress,finished.data());}catch(e){throw new HttpsError('data-loss',(e as Error).message);}
  const canonical=rewardedRecord(record,levels),before=normalizeProgress(user.data()?.progress),progress=progressAfter(before,canonical),experienceGain=matchExperience(canonical,canonical.opponentLevel??1,before.level);
  if(!finished.exists)tx.set(match,{hostUid:record.hostUid,guestUid:record.guestUid,winnerUid,endedAt:record.endedAt,...levels,rewardVersion:3});
  else if(finished.data()?.hostLevel===undefined&&finished.data()?.guestLevel===undefined)tx.set(match,{...levels,rewardVersion:3},{merge:true});
  tx.set(entry,{...canonical,experienceGain,progress,rewardVersion:3,savedAt:Date.now()});tx.set(profile,{progress},{merge:true});
  return {saved:true,duplicate:false,progress,experienceGain};
 });
});

export {duelRoom,duelPruneRooms} from "./rooms";
export {duelIce} from './relay';
export {duelLeaderboard} from './leaderboard';
export {adventureHall,adventureRegister} from './adventure-hall';
