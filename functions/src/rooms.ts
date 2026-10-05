import {randomBytes,scryptSync,timingSafeEqual} from 'node:crypto';
import {getFirestore} from 'firebase-admin/firestore';
import {onCall,HttpsError} from 'firebase-functions/v2/https';
import {onSchedule} from 'firebase-functions/v2/scheduler';
import {ROOM_LIFETIME,ROOM_LEASE,roomOptions,validRoomId,publicRoom} from '../../src/multiplayer/rooms';
const db=()=>getFirestore(),lobby=()=>db().collection('decimalLobby'),secret=(id:string)=>db().doc(`decimalLobbyPrivate/${id}`),owner=(uid:string)=>db().doc(`decimalLobbyOwners/${uid}`);
function invitation(code:unknown,kind:'offer'|'answer',id:string,uid:string){
 if(typeof code!=='string'||code.length>24000||!code.startsWith('SDS1.'))throw new HttpsError('invalid-argument','접속 정보가 올바르지 않아요.');
 let v:any;try{v=JSON.parse(Buffer.from(code.slice(5),'base64').toString('utf8'));}catch{throw new HttpsError('invalid-argument','접속 정보를 확인해 주세요.');}
 if(v.v!==1||v.kind!==kind||v.id!==id||v.host?.uid!==uid||typeof v.host?.name!=='string'||v.host.name.length<1||v.host.name.length>16||v.sdp?.type!==kind||typeof v.sdp?.sdp!=='string'||v.sdp.sdp.length>16000)throw new HttpsError('invalid-argument','접속 정보가 방과 맞지 않아요.');
 return v;
}
function hash(password:string,salt:string){return scryptSync(password,salt,32);}
export async function pruneRooms(now=Date.now()){
 // Expiry is enforced in list/join immediately. Physical cleanup runs hourly
 // and drains a bounded backlog instead of billing a scheduled call each minute.
 for(let page=0;page<10;page++){const expired=await lobby().where('expiresAt','<=',now).limit(100).get();if(expired.empty)break;
  const batch=db().batch();for(const doc of expired.docs){batch.delete(doc.ref);batch.delete(secret(doc.id));}await batch.commit();if(expired.size<100)break;
 }
 for(let page=0;page<10;page++){const attempts=await db().collection('decimalLobbyLimits').where('expiresAt','<=',now).limit(100).get();if(attempts.empty)break;
  const batch=db().batch();attempts.docs.forEach(d=>batch.delete(d.ref));await batch.commit();if(attempts.size<100)break;
 }
}
export const duelPruneRooms=onSchedule({schedule:'0 * * * *',region:'asia-northeast3',maxInstances:1,minInstances:0,timeoutSeconds:60,memory:'256MiB',cpu:'gcf_gen1',concurrency:1},async()=>{await pruneRooms();});
export const duelRoom=onCall({region:'asia-northeast3',maxInstances:10,minInstances:0,timeoutSeconds:30,memory:'256MiB',cpu:'gcf_gen1',concurrency:1},async r=>{
 if(!r.auth)throw new HttpsError('unauthenticated','먼저 로그인해 주세요.');
 const uid=r.auth.uid,d=r.data as Record<string,any>,now=Date.now();
 if(!d||!['list','create','join','answer','poll','close','release','connected'].includes(d.action))throw new HttpsError('invalid-argument','방 조작을 확인해 주세요.');
 if(d.action==='list'){
  const rows=await lobby().where('expiresAt','>',now).orderBy('expiresAt','asc').limit(50).get();
  return {now,rooms:rows.docs.map(doc=>publicRoom(doc.id,doc.data(),now))};
 }
 if(!validRoomId(d.id))throw new HttpsError('invalid-argument','방 번호를 확인해 주세요.');
 const ref=lobby().doc(d.id),privateRef=secret(d.id);
 if(d.action==='create'){
  let options;try{options=roomOptions(d);}catch(e){throw new HttpsError('invalid-argument',(e as Error).message);}
  const v=invitation(d.offer,'offer',d.id,uid),salt=randomBytes(16).toString('hex'),passwordHash=options.protected?hash(options.password,salt).toString('hex'):'';
  return db().runTransaction(async tx=>{
   const [old,own,profile]=await Promise.all([tx.get(ref),tx.get(owner(uid)),tx.get(db().doc(`decimalUsers/${uid}`))]);
   if(old.exists)throw new HttpsError('already-exists','이미 등록된 방이에요.');
   const previous=own.data();if(previous?.expiresAt>now)throw new HttpsError('failed-precondition','이전에 만든 방을 닫고 새 방을 만들어 주세요.');
   const metadata={title:options.title,hostName:v.host.name,hostUid:uid,level:profile.data()?.progress?.level||1,protected:options.protected,internet:options.internet,createdAt:now,expiresAt:now+ROOM_LIFETIME,guestUntil:0};
   tx.set(ref,metadata);tx.set(privateRef,{hostUid:uid,offer:d.offer,salt,passwordHash,expiresAt:metadata.expiresAt,guestUid:'',guestUntil:0,claim:'',answer:''});tx.set(owner(uid),{id:d.id,expiresAt:metadata.expiresAt});
   return {now,room:publicRoom(d.id,metadata,now)};
  });
 }
 if(d.action==='join'){
  if(typeof d.password!=='string'||d.password.length>32)throw new HttpsError('invalid-argument','비밀번호를 확인해 주세요.');
  const limitRef=db().doc(`decimalLobbyLimits/${uid}`),claim=randomBytes(24).toString('hex');
  const result=await db().runTransaction(async tx=>{
   const [room,privateDoc,limit]=await Promise.all([tx.get(ref),tx.get(privateRef),tx.get(limitRef)]);const metadata=room.data(),p=privateDoc.data(),attempt=limit.data();
   if(!metadata||!p||metadata.expiresAt<=now)throw new HttpsError('not-found','방이 시작되었거나 5분이 지나 목록에서 사라졌어요.');
   if(metadata.hostUid===uid)throw new HttpsError('failed-precondition','내 방에는 다른 계정으로 참가해 주세요.');
   if(attempt?.expiresAt>now&&(attempt?.count??0)>=5)throw new HttpsError('resource-exhausted','비밀번호를 여러 번 틀렸어요. 1분 뒤 다시 시도해 주세요.');
   if(metadata.protected&&!timingSafeEqual(hash(d.password,p.salt),Buffer.from(p.passwordHash,'hex'))){tx.set(limitRef,{count:attempt?.expiresAt>now?(attempt?.count??0)+1:1,expiresAt:attempt?.expiresAt>now?attempt!.expiresAt:now+60000});return {denied:true};}
   if(p.guestUid&&p.guestUid!==uid&&p.guestUntil>now)throw new HttpsError('already-exists','다른 친구가 입장하고 있어요.');
   if(p.guestUid===uid&&p.guestUntil>now)return {offer:p.offer,claim:p.claim,internet:metadata.internet,expiresAt:metadata.expiresAt};
   tx.update(privateRef,{guestUid:uid,guestUntil:now+ROOM_LEASE,claim,answer:''});tx.update(ref,{guestUntil:now+ROOM_LEASE});return {offer:p.offer,claim,internet:metadata.internet,expiresAt:metadata.expiresAt};
  });
  if('denied'in result)throw new HttpsError('permission-denied','방 비밀번호가 맞지 않아요.');return result;
 }
 return db().runTransaction(async tx=>{
  const [room,pdoc]=await Promise.all([tx.get(ref),tx.get(privateRef)]);const metadata=room.data(),p=pdoc.data();
  if(d.action==='close'){
   if(p&&p.hostUid!==uid)throw new HttpsError('permission-denied','방을 만든 사람만 닫을 수 있어요.');
   const own=await tx.get(owner(uid));if(p){tx.delete(ref);tx.delete(privateRef);}if(own.data()?.id===d.id)tx.delete(owner(uid));return {closed:true};
  }
  if(!p||!metadata||metadata.expiresAt<=now)throw new HttpsError('not-found','방이 시작되었거나 5분이 지나 목록에서 사라졌어요.');
  if(d.action==='connected'){
   if(p.hostUid!==uid||!p.guestUid)throw new HttpsError('permission-denied','호스트 연결을 확인해 주세요.');
   tx.update(privateRef,{guestUntil:metadata.expiresAt});tx.update(ref,{guestUntil:metadata.expiresAt});return {connected:true};
  }
  if(d.action==='poll'){
   if(p.hostUid!==uid)throw new HttpsError('permission-denied','호스트만 응답 정보를 받을 수 있어요.');
   return {answer:p.guestUntil>now?p.answer:'',guestUid:p.guestUntil>now?p.guestUid:'',guestUntil:p.guestUntil,expiresAt:metadata.expiresAt};
  }
  if(p.guestUid!==uid||p.claim!==d.claim||p.guestUntil<=now)throw new HttpsError('permission-denied','입장 시간이 지났어요. 목록에서 다시 참가해 주세요.');
  if(d.action==='release'){tx.update(privateRef,{guestUid:'',guestUntil:0,claim:'',answer:''});tx.update(ref,{guestUntil:0});return {released:true};}
  invitation(d.answer,'answer',d.id,p.hostUid);tx.update(privateRef,{answer:d.answer});return {sent:true};
 });
});
