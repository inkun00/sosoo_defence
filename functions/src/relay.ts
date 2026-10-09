import {getFirestore} from 'firebase-admin/firestore';
import {onCall,HttpsError} from 'firebase-functions/v2/https';
import {relayURLs} from '../../src/multiplayer/relay';
import {issueRelayConfiguration} from './relay-credentials';

// Firebase loads functions/.env.<project> while discovering functions. Bind
// the existing Secret Manager secret only when an operator configures URLs.
// An unconfigured project deploys without creating a secret or prompting for it.
const urls=relayURLs((process.env.TURN_URLS??'').split(',').map(url=>url.trim()));
export const duelIce=onCall({region:'asia-northeast3',maxInstances:10,minInstances:0,timeoutSeconds:10,memory:'256MiB',cpu:'gcf_gen1',concurrency:1,secrets:urls.length?['TURN_SHARED_SECRET']:[]},async request=>{
 if(!request.auth)throw new HttpsError('unauthenticated','먼저 로그인해 주세요.');
 const configuration=issueRelayConfiguration(urls,process.env.TURN_SHARED_SECRET);
 if(!configuration.available)return configuration;
 const now=Date.now(),ref=getFirestore().doc(`decimalRelayLimits/${request.auth.uid}`);
 await getFirestore().runTransaction(async tx=>{
  const prior=(await tx.get(ref)).data(),active=typeof prior?.expiresAt==='number'&&prior.expiresAt>now,count=active&&Number.isSafeInteger(prior?.count)?prior!.count:0;
  if(count>=20)throw new HttpsError('resource-exhausted','연결을 여러 번 요청했어요. 잠시 뒤 다시 시도해 주세요.');
  tx.set(ref,{count:count+1,expiresAt:active?prior!.expiresAt:now+60000});
 });
 return configuration;
});
