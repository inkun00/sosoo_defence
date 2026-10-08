import test, {TestContext} from 'node:test';
import assert from 'node:assert/strict';
import {Sound} from '../src/audio';
import {TRACKS,scoreStep,MusicTrack} from '../src/music';
import {TOWERS} from '../src/towers';
import {towerShotScore,towerShotDuration} from '../src/tower-sounds';
import {TowerAudioSamples,TowerAudioSample,towerShotSampleGain} from '../src/tower-audio-samples';

class Param{value=0;events:number[]=[];setValueAtTime(v:number){this.value=v;}exponentialRampToValueAtTime(v:number){this.events.push(v);}setTargetAtTime(v:number){this.value=v;}cancelScheduledValues(){}}
class Node{gain=new Param();frequency=new Param();Q=new Param();threshold=new Param();knee=new Param();ratio=new Param();attack=new Param();release=new Param();delayTime=new Param();type='';buffer:unknown;onended?:()=>void;started:number[]=[];stopped:number[]=[];connect(n:unknown){return n;}disconnect(){}start(t:number){this.started.push(t);}stop(t:number){this.stopped.push(t);}}
class Context{
 currentTime=1;sampleRate=44100;state='running';destination=new Node();sources:Node[]=[];gains:Node[]=[];decoded={duration:.6};decodes=0;
 createGain(){const n=new Node();this.gains.push(n);return n;}createBiquadFilter(){return new Node();}createDynamicsCompressor(){return new Node();}createDelay(){return new Node();}
 createOscillator(){const n=new Node();this.sources.push(n);return n;}createBufferSource(){return this.createOscillator();}createBuffer(_channels:number,length:number){return {getChannelData:()=>new Float32Array(length)};}
 async decodeAudioData(_data:ArrayBuffer){this.decodes++;return this.decoded;}
 async resume(){this.state='running';}async suspend(){this.state='suspended';}async close(){this.state='closed';}
}
function fixture(t:TestContext,samples=new TowerAudioSamples({})){
 const doc=Object.assign(new EventTarget(),{hidden:false});t.mock.timers.enable({apis:['setInterval']});
 const previous=Object.getOwnPropertyDescriptor(globalThis,'AudioContext'),previousDoc=Object.getOwnPropertyDescriptor(globalThis,'document');
 Object.defineProperty(globalThis,'AudioContext',{value:Context,configurable:true});Object.defineProperty(globalThis,'document',{value:doc,configurable:true});
 const sound=new Sound(samples);t.after(()=>{sound.dispose();if(previous)Object.defineProperty(globalThis,'AudioContext',previous);else Reflect.deleteProperty(globalThis,'AudioContext');if(previousDoc)Object.defineProperty(globalThis,'document',previousDoc);else Reflect.deleteProperty(globalThis,'document');});
 return {sound,doc,context:()=>sound.context as unknown as Context};
}
test('music waits for interaction and repeated unlocks never duplicate the score',t=>{
 const {sound,doc,context}=fixture(t);sound.setMusic(true);assert.equal(sound.context,undefined);doc.dispatchEvent(new Event('pointerdown'));const c=context(),count=c.sources.length;assert.ok(count>0);sound.resume();sound.setMusic(true);sound.setTrack('title');assert.equal(c.sources.length,count);
});
test('music and effects mute independently, including already playing sounds',t=>{
 const {sound,context}=fixture(t);sound.setMusic(true);sound.resume();const c=context();sound.setMusic(false);const before=c.sources.length;sound.play('hit');assert.ok(c.sources.length>before);sound.sfx=false;assert.equal(c.gains[1].gain.value,0);const muted=c.sources.length;sound.play('shot');assert.equal(c.sources.length,muted);sound.setMusic(true);c.currentTime+=.5;t.mock.timers.tick(500);assert.ok(c.sources.length>muted);assert.ok(c.gains[0].gain.value>0);
});
test('pausing and changing scene stops the old instruments before a single new arrangement starts',t=>{
 const {sound,context}=fixture(t);sound.setMusic(true);sound.resume();const c=context(),old=c.sources.slice();sound.setPaused(true);assert.ok(old.every(n=>n.stopped.at(-1)===c.currentTime));const count=c.sources.length;sound.setTrack('battle');assert.equal(c.sources.length,count);sound.setPaused(false);assert.ok(c.sources.length>count);const resumed=c.sources.length;sound.setPaused(false);assert.equal(c.sources.length,resumed);
});
test('hidden tabs suspend audio; disposal removes unlock handlers and prevents resurrection',async t=>{
 const {sound,doc,context}=fixture(t);sound.setMusic(true);sound.resume();const c=context();doc.hidden=true;doc.dispatchEvent(new Event('visibilitychange'));assert.equal(c.state,'suspended');const count=c.sources.length;sound.play('hit');assert.equal(c.sources.length,count);doc.hidden=false;doc.dispatchEvent(new Event('visibilitychange'));await Promise.resolve();assert.equal(c.state,'running');sound.dispose();doc.dispatchEvent(new Event('pointerdown'));sound.setMusic(true);assert.equal(c.state,'closed');
});
test('combat effect storms are bounded and narration lowers only the music bus',t=>{
 const {sound,context}=fixture(t);sound.resume();const c=context();for(let i=0;i<100;i++)sound.play('hit');assert.equal(c.sources.length,3);sound.setDucking(true);assert.equal(c.gains[0].gain.value,.25);assert.equal(c.gains[1].gain.value,.85);sound.setDucking(false);assert.equal(c.gains[0].gain.value,.72);
});
test('every full arrangement contains playable, finite notes and distinct instrumentation',()=>{
 for(const track of Object.keys(TRACKS) as MusicTrack[]){const notes=Array.from({length:128},(_,i)=>scoreStep(track,i)).flat();assert.ok(notes.length>32);assert.ok(notes.every(v=>Number.isFinite(v.note)&&v.note>=20&&v.note<=110&&v.volume>0&&v.volume<=.2&&v.duration>0));}
 assert.notDeepEqual(scoreStep('title',0),scoreStep('battle',0));assert.notDeepEqual(scoreStep('opening',0),scoreStep('ending',0));
});

test('all twelve weapons have distinct, bounded sound signatures and richer higher grades',()=>{
 const signatures=new Set<string>();
 for(const t of TOWERS){const score=towerShotScore(t.id);signatures.add(JSON.stringify(score));assert.ok(score.every(([delay,v])=>Number.isFinite(delay)&&delay>=0&&v.note>=25&&v.note<=110&&v.duration>0&&v.duration<=.6&&v.volume>0&&v.volume<=.12&&(v.endNote===undefined||v.endNote>=25&&v.endNote<=110)));assert.ok(score.reduce((sum,[,v])=>sum+v.volume,0)<.32);}
 assert.equal(signatures.size,TOWERS.length);
 for(let grade=2;grade<=4;grade++){const lower=TOWERS.filter(t=>t.grade===grade-1),higher=TOWERS.filter(t=>t.grade===grade);assert.ok(Math.min(...higher.map(t=>towerShotScore(t.id).length))>Math.max(...lower.map(t=>towerShotScore(t.id).length)));assert.ok(higher.reduce((n,t)=>n+towerShotDuration(t.id),0)/higher.length>lower.reduce((n,t)=>n+towerShotDuration(t.id),0)/lower.length);}
 assert.deepEqual(towerShotScore('old-unknown-tower'),towerShotScore('basic'));
});

test('simultaneous different weapons remain audible while duplicate shots are throttled',t=>{
 const {sound,context}=fixture(t);sound.resume();const c=context();sound.play('shot','basic');sound.play('shot','frost');const count=towerShotScore('basic').length+towerShotScore('frost').length;assert.equal(c.sources.length,count);sound.play('shot','basic');assert.equal(c.sources.length,count);c.currentTime+=.09;sound.play('shot','basic');assert.equal(c.sources.length,count+towerShotScore('basic').length);
});

test('muting cancels magical tails and resumes the chosen weapon independently of music',t=>{
 const {sound,context}=fixture(t);sound.resume();const c=context();sound.play('shot','rune');assert.ok(c.sources.some(n=>n.started[0]>c.currentTime+.3));const old=c.sources.slice();sound.sfx=false;assert.ok(old.every(n=>n.stopped.at(-1)===c.currentTime));c.currentTime+=1;sound.play('shot','siege');assert.equal(c.sources.length,old.length);sound.sfx=true;sound.play('shot','siege');assert.equal(c.sources.length,old.length+towerShotScore('siege').length);assert.equal(sound.music,false);
});

test('a storm of layered tower sounds never exceeds the active voice budget',t=>{
 const {sound,context}=fixture(t);sound.resume();const c=context();for(let i=0;i<100;i++){sound.play('shot',TOWERS[i%TOWERS.length].id);c.currentTime+=.1;}assert.ok(c.sources.length<=32);assert.ok(c.sources.length>=24);const old=c.sources.length;sound.sfx=false;sound.sfx=true;sound.play('shot','rune');assert.equal(c.sources.length,old);c.sources.forEach(n=>n.onended?.());c.currentTime+=.06;sound.play('shot','rune');assert.equal(c.sources.length,old+towerShotScore('rune').length);
});

const sampledAssets:Record<string,TowerAudioSample>={basic:{url:'/audio/test-basic.mp3',bytes:2000,duration:.6},frost:{url:'/audio/test-frost.mp3',bytes:3000,duration:.6}};
const sampleResponse=()=>({ok:true,status:200,arrayBuffer:async()=>new ArrayBuffer(4)} as Response);

test('title music interaction never downloads tower samples and explicit preload waits for a context',async t=>{
 const request=t.mock.method(globalThis,'fetch',async()=>sampleResponse()),{sound,doc}=fixture(t,new TowerAudioSamples(sampledAssets));
 await sound.preloadTowerShots(['basic']);assert.equal(request.mock.callCount(),0);sound.setMusic(true);doc.dispatchEvent(new Event('pointerdown'));sound.play('ui');assert.equal(request.mock.callCount(),0);assert.equal(sound.towerAudioStatus('basic'),'idle');
 await sound.preloadTowerShots(['basic','basic']);assert.equal(request.mock.callCount(),1);assert.equal(sound.towerAudioStatus('basic'),'ready');
});

test('first shot has an immediate fallback, one lazy request, and subsequent shots prefer the decoded sample',async t=>{
 let complete!:(value:Response)=>void;const request=t.mock.method(globalThis,'fetch',()=>new Promise<Response>(resolve=>{complete=resolve;}));
 const {sound,context}=fixture(t,new TowerAudioSamples(sampledAssets));sound.resume();const c=context();sound.play('shot','basic');assert.equal(c.sources.length,towerShotScore('basic').length);assert.equal(sound.towerAudioStatus('basic'),'loading');
 c.currentTime+=.1;sound.play('shot','basic');assert.equal(c.sources.length,2*towerShotScore('basic').length);assert.equal(request.mock.callCount(),1);const old=c.sources.length;
 complete(sampleResponse());await sound.waitForTowerAudio();assert.equal(c.decodes,1);assert.equal(c.sources.length,old);assert.equal(sound.towerAudioStatus('basic'),'ready');
 c.currentTime+=.1;sound.play('shot','basic');assert.equal(c.sources.length,old+1);assert.equal(c.sources.at(-1)!.buffer,c.decoded);assert.equal(c.gains.at(-1)!.gain.events[0],towerShotSampleGain('basic'));
 sound.play('shot','basic');assert.equal(c.sources.length,old+1);
});

for(const action of ['mute','hidden','dispose'] as const)test(`${action} cannot replay a shot that finishes loading later`,async t=>{
  let complete!:(value:Response)=>void;t.mock.method(globalThis,'fetch',()=>new Promise<Response>(resolve=>{complete=resolve;}));
  const {sound,doc,context}=fixture(t,new TowerAudioSamples(sampledAssets));sound.resume();const c=context();sound.play('shot','basic');const old=c.sources.length;
  if(action==='mute')sound.sfx=false;else if(action==='hidden'){doc.hidden=true;doc.dispatchEvent(new Event('visibilitychange'));}else sound.dispose();
  complete(sampleResponse());await sound.waitForTowerAudio();await Promise.resolve();assert.equal(c.sources.length,old);assert.ok(c.sources.every(n=>n.stopped.at(-1)===c.currentTime));
  c.currentTime+=1;sound.play('shot','basic');assert.equal(c.sources.length,old);
});

test('sample and procedural voices share the same 32-voice limit and muting releases it',async t=>{
 const request=t.mock.method(globalThis,'fetch',async()=>sampleResponse()),{sound,context}=fixture(t,new TowerAudioSamples(sampledAssets));sound.resume();const c=context();await sound.preloadTowerShots(['basic']);
 sound.play('hit');const fallback=3;assert.equal(c.sources.length,fallback);
 for(let i=0;i<100;i++){c.currentTime+=.1;sound.play('shot','basic');}assert.equal(c.sources.length,32);assert.equal(c.sources.filter(n=>n.buffer===c.decoded).length,32-fallback);assert.equal(request.mock.callCount(),1);
 c.sources.find(n=>n.buffer===c.decoded)!.onended!();c.currentTime+=.1;sound.play('shot','basic');assert.equal(c.sources.length,33);
 const old=c.sources.length;sound.sfx=false;sound.sfx=true;c.currentTime+=1;sound.play('shot','basic');assert.equal(c.sources.length,old+1);
});

test('playing samples fade on mute, retain their voice slot until ended, and hard-stop before background suspension',async t=>{
 t.mock.method(globalThis,'fetch',async()=>sampleResponse());const {sound,doc,context}=fixture(t,new TowerAudioSamples(sampledAssets));sound.resume();const c=context();await sound.preloadTowerShots(['basic']);
 for(let i=0;i<32;i++){sound.play('shot','basic');c.currentTime+=.1;}const old=c.sources.slice();assert.equal(old.length,32);sound.sfx=false;assert.ok(old.every(n=>n.stopped.at(-1)===c.currentTime+.05));sound.sfx=true;sound.play('shot','basic');assert.equal(c.sources.length,32);
 old.forEach(n=>n.onended?.());c.currentTime+=.1;sound.play('shot','basic');const active=c.sources.at(-1)!;c.currentTime+=.01;doc.hidden=true;doc.dispatchEvent(new Event('visibilitychange'));assert.equal(active.stopped.at(-1),c.currentTime);assert.equal(c.state,'suspended');
 doc.hidden=false;doc.dispatchEvent(new Event('visibilitychange'));await Promise.resolve();assert.equal(c.sources.length,33);
});
