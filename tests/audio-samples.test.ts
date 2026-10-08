import test from 'node:test';
import assert from 'node:assert/strict';
import {TowerAudioSamples} from '../src/tower-audio-samples';

const buffer={duration:.75} as AudioBuffer;
const context=(decode=async(_data:ArrayBuffer)=>buffer)=>({decodeAudioData:decode} as BaseAudioContext);
const assets={basic:{url:'/audio/cache-test.mp3',bytes:1234,duration:.75},double:{url:'/audio/cache-test.mp3',bytes:1234,duration:.75}};
const response=()=>({ok:true,status:200,arrayBuffer:async()=>new ArrayBuffer(2)} as Response);

test('sample aliases and concurrent loads share one fetch, one decode, and the cached AudioBuffer',async t=>{
 let finish!:(value:Response)=>void;const request=t.mock.method(globalThis,'fetch',()=>new Promise<Response>(resolve=>{finish=resolve;}));let decodes=0;
 const samples=new TowerAudioSamples(assets),c=context(async()=>{decodes++;return buffer;}),first=samples.load('basic',c),second=samples.load('double',c);
 assert.equal(first,second);assert.equal(samples.status('basic'),'loading');assert.equal(samples.status('double'),'loading');assert.equal(request.mock.callCount(),1);finish(response());
 assert.equal(await first,buffer);assert.equal(await second,buffer);assert.equal(decodes,1);assert.equal(samples.get('double'),buffer);assert.equal(samples.status('basic'),'ready');assert.equal(await samples.load('basic',c),buffer);assert.equal(request.mock.callCount(),1);
});

test('failed HTTP and decode responses leave fallback available without repeated requests',async t=>{
 for(const failure of ['HTTP','decode']){
  const request=t.mock.method(globalThis,'fetch',async()=>failure==='HTTP'?{ok:false,status:404} as Response:response());
  const samples=new TowerAudioSamples(assets),c=context(async()=>{throw Error('Unsupported codec');});
  assert.equal(await samples.load('basic',c),undefined);assert.equal(samples.get('basic'),undefined);assert.equal(samples.status('basic'),'failed');assert.equal(await samples.load('double',c),undefined);assert.equal(request.mock.callCount(),1);
 }
});

test('disposing a cache aborts pending downloads and discards a late decode',async t=>{
 let finish!:(value:AudioBuffer)=>void;let signal:AbortSignal|undefined;t.mock.method(globalThis,'fetch',async(_url:unknown,options?:RequestInit)=>{signal=options?.signal as AbortSignal;return response();});
 const samples=new TowerAudioSamples(assets),pending=samples.load('basic',context(()=>new Promise<AudioBuffer>(resolve=>{finish=resolve;})));
 await Promise.resolve();await Promise.resolve();samples.dispose();assert.equal(signal?.aborted,true);finish(buffer);assert.equal(await pending,undefined);assert.equal(samples.get('basic'),undefined);assert.equal(await samples.load('basic',context()),undefined);
});
