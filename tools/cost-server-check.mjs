import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8080')throw Error('Only the local demo emulator may run this check');
process.env.GCLOUD_PROJECT='demo-decimal-defense';
const require=createRequire(new URL('../functions/package.json',import.meta.url));
const {duelPruneRooms,duelRoom,duelSaveResult}=require('./lib/index.js');
const {getFirestore}=require('firebase-admin/firestore'),{deleteApp,getApp}=require('firebase-admin/app');
const db=getFirestore(),stamp=Date.now();
try{
 const batch=db.batch();for(let i=0;i<111;i++)for(const c of ['decimalLobby','decimalLobbyPrivate','decimalLobbyLimits'])batch.set(db.doc(`${c}/cost-${stamp}-${i}`),{expiresAt:stamp-1});
 for(const c of ['decimalLobby','decimalLobbyPrivate','decimalLobbyLimits'])batch.set(db.doc(`${c}/cost-live-${stamp}`),{expiresAt:stamp+3600000});
 await batch.commit();assert.equal(duelPruneRooms.__endpoint.scheduleTrigger.schedule,'0 * * * *');
 for(const fn of [duelPruneRooms,duelRoom,duelSaveResult]){assert.equal(fn.__endpoint.minInstances,0);assert.equal(fn.__endpoint.concurrency,1);assert.equal(fn.__endpoint.availableMemoryMb,256);assert.equal(fn.__endpoint.cpu,'gcf_gen1');}
 await duelPruneRooms.run({scheduleTime:new Date().toISOString()});
 for(const c of ['decimalLobby','decimalLobbyPrivate','decimalLobbyLimits']){const rows=await db.collection(c).get();assert.ok(rows.docs.some(d=>d.id===`cost-live-${stamp}`));assert.ok(!rows.docs.some(d=>d.id.startsWith(`cost-${stamp}-`)));}
 console.log('PASS hourly cleanup crosses the 100-document page boundary, preserves live rooms, and has no warm instances.');
}finally{await deleteApp(getApp());}
