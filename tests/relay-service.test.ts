import {test} from 'node:test';
import assert from 'node:assert/strict';

test('unconfigured relay callable binds no secret, rejects anonymous callers and safely reports no relay',async()=>{
 const previousURLs=process.env.TURN_URLS;
 delete process.env.TURN_URLS;
 try{
  const {duelIce}=await import('../functions/src/relay');
  assert.deepEqual(duelIce.__endpoint.secretEnvironmentVariables??[],[],'an unconfigured deployment must never create or request a secret');
  await assert.rejects(()=>duelIce.run({data:{},auth:undefined} as never),(error:{code:string})=>error.code==='unauthenticated');
  assert.deepEqual(await duelIce.run({data:{},auth:{uid:'relay-test-account'}} as never),{available:false,expiresAt:0,iceServers:[]});
 }finally{if(previousURLs===undefined)delete process.env.TURN_URLS;else process.env.TURN_URLS=previousURLs;}
});
