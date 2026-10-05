import test, {TestContext} from 'node:test';
import assert from 'node:assert/strict';
import {Sound} from '../src/audio';
import {TRACKS,scoreStep,MusicTrack} from '../src/music';

class Param{value=0;events:number[]=[];setValueAtTime(v:number){this.value=v;}exponentialRampToValueAtTime(v:number){this.events.push(v);}setTargetAtTime(v:number){this.value=v;}cancelScheduledValues(){}}
class Node{gain=new Param();frequency=new Param();Q=new Param();threshold=new Param();knee=new Param();ratio=new Param();attack=new Param();release=new Param();delayTime=new Param();type='';buffer:unknown;onended?:()=>void;started:number[]=[];stopped:number[]=[];connect(n:unknown){return n;}disconnect(){}start(t:number){this.started.push(t);}stop(t:number){this.stopped.push(t);}}
class Context{
 currentTime=1;sampleRate=44100;state='running';destination=new Node();sources:Node[]=[];gains:Node[]=[];
 createGain(){const n=new Node();this.gains.push(n);return n;}createBiquadFilter(){return new Node();}createDynamicsCompressor(){return new Node();}createDelay(){return new Node();}
 createOscillator(){const n=new Node();this.sources.push(n);return n;}createBufferSource(){return this.createOscillator();}createBuffer(_channels:number,length:number){return {getChannelData:()=>new Float32Array(length)};}
 async resume(){this.state='running';}async suspend(){this.state='suspended';}async close(){this.state='closed';}
}
function fixture(t:TestContext){
 const doc=Object.assign(new EventTarget(),{hidden:false});t.mock.timers.enable({apis:['setInterval']});
 const previous=Object.getOwnPropertyDescriptor(globalThis,'AudioContext'),previousDoc=Object.getOwnPropertyDescriptor(globalThis,'document');
 Object.defineProperty(globalThis,'AudioContext',{value:Context,configurable:true});Object.defineProperty(globalThis,'document',{value:doc,configurable:true});
 const sound=new Sound();t.after(()=>{sound.dispose();if(previous)Object.defineProperty(globalThis,'AudioContext',previous);else Reflect.deleteProperty(globalThis,'AudioContext');if(previousDoc)Object.defineProperty(globalThis,'document',previousDoc);else Reflect.deleteProperty(globalThis,'document');});
 return {sound,doc,context:()=>sound.context as unknown as Context};
}
test('music waits for interaction and repeated unlocks never duplicate the score',t=>{
 const {sound,doc,context}=fixture(t);sound.setMusic(true);assert.equal(sound.context,undefined);doc.dispatchEvent(new Event('pointerdown'));const c=context(),count=c.sources.length;assert.ok(count>0);sound.resume();sound.setMusic(true);sound.setTrack('title');assert.equal(c.sources.length,count);
});
test('music and effects mute independently, including already playing sounds',t=>{
 const {sound,context}=fixture(t);sound.setMusic(true);sound.resume();const c=context();sound.setMusic(false);const before=c.sources.length;sound.play('hit');assert.ok(c.sources.length>before);sound.sfx=false;assert.equal(c.gains[1].gain.value,0);const muted=c.sources.length;sound.play('shot');assert.equal(c.sources.length,muted);sound.setMusic(true);c.currentTime+=.5;t.mock.timers.tick(500);assert.ok(c.sources.length>muted);assert.ok(c.gains[0].gain.value>0);
});
test('pausing and changing scene stops the old instruments before a single new arrangement starts',t=>{
 const {sound,context}=fixture(t);sound.setMusic(true);sound.resume();const c=context(),old=c.sources.slice();sound.setPaused(true);assert.ok(old.every(n=>n.stopped.at(-1)===c.currentTime+.05));const count=c.sources.length;sound.setTrack('battle');assert.equal(c.sources.length,count);sound.setPaused(false);assert.ok(c.sources.length>count);const resumed=c.sources.length;sound.setPaused(false);assert.equal(c.sources.length,resumed);
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
