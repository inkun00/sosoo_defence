import {scoreStep,TRACKS,MusicTrack,Voice} from './music';
import {towerShotScore,towerShotDuration,SoundVoice,EffectNote} from './tower-sounds';
import {TowerAudioSamples,towerShotSampleGain} from './tower-audio-samples';
export {TRACKS} from './music';
export type {MusicTrack} from './music';

// The live player and offline previews share sample gain, envelopes and fallback instruments.
type Bus='music'|'sfx';
interface Playing {source:AudioScheduledSourceNode;gain:GainNode;bus:Bus;start:number;}
const midi=(n:number)=>440*2**((n-69)/12);
const noiseCache=new WeakMap<BaseAudioContext,AudioBuffer>();
function noise(context:BaseAudioContext){
 let buffer=noiseCache.get(context);if(buffer)return buffer;
 buffer=context.createBuffer(1,context.sampleRate*2,context.sampleRate);const data=buffer.getChannelData(0);let seed=43129;
 for(let i=0;i<data.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;data[i]=seed/2147483648-1;}
 noiseCache.set(context,buffer);return buffer;
}
function instrument(c:BaseAudioContext,out:AudioNode,v:SoundVoice,time:number,bus:Bus,active?:Set<Playing>){
 const g=c.createGain(),filter=c.createBiquadFilter();let source:AudioScheduledSourceNode;
 const pitch=midi(v.note),duration=Math.max(.04,v.duration),volume=v.volume;
 const percussive=['kick','snare','hat','noise'].includes(v.instrument);
 if(v.instrument==='snare'||v.instrument==='hat'||v.instrument==='noise'){
  const n=c.createBufferSource();n.buffer=noise(c);source=n;filter.type=v.instrument==='hat'?'highpass':'bandpass';filter.frequency.value=v.instrument==='hat'?7000:v.instrument==='snare'?1700:pitch;filter.Q.value=.7;
 }else{
  const o=c.createOscillator();source=o;o.type=v.wave??(v.instrument==='strings'?'sawtooth':v.instrument==='bass'?'triangle':'sine');o.frequency.setValueAtTime(pitch,time);
  if(v.endNote!==undefined)o.frequency.exponentialRampToValueAtTime(midi(v.endNote),time+duration);
  else if(v.instrument==='kick'){o.frequency.setValueAtTime(140,time);o.frequency.exponentialRampToValueAtTime(38,time+.16);}
  else if(v.instrument==='sweep')o.frequency.exponentialRampToValueAtTime(Math.max(35,pitch*.18),time+duration);
  filter.type='lowpass';filter.frequency.value=v.cutoff??(v.instrument==='strings'?950:v.instrument==='bass'?480:9000);
 }
 const attack=v.attack??(v.instrument==='pad'?.25:v.instrument==='strings'?.055:percussive?.003:.009);
 g.gain.setValueAtTime(.0001,time);g.gain.exponentialRampToValueAtTime(Math.max(.0002,volume),time+Math.min(attack,duration/3));
 if(v.instrument==='pad'||v.instrument==='strings')g.gain.exponentialRampToValueAtTime(Math.max(.0002,volume*.65),time+duration*.65);
 g.gain.exponentialRampToValueAtTime(.0001,time+duration);
 source.connect(filter);filter.connect(g);g.connect(out);
 const playing={source,gain:g,bus,start:time};active?.add(playing);
 source.onended=()=>{active?.delete(playing);source.disconnect();filter.disconnect();g.disconnect();};
 source.start(time);source.stop(time+duration+.015);
}
function sample(c:BaseAudioContext,out:AudioNode,buffer:AudioBuffer,typeId:string|undefined,time:number,active?:Set<Playing>){
 const source=c.createBufferSource(),g=c.createGain(),duration=Math.max(.01,buffer.duration),gain=towerShotSampleGain(typeId);
 source.buffer=buffer;g.gain.setValueAtTime(.0001,time);g.gain.exponentialRampToValueAtTime(gain,time+Math.min(.003,duration/4));
 g.gain.setValueAtTime(gain,time+Math.max(.003,duration-.04));g.gain.exponentialRampToValueAtTime(.0001,time+duration);
 source.connect(g);g.connect(out);const playing={source,gain:g,bus:'sfx' as const,start:time};active?.add(playing);
 source.onended=()=>{active?.delete(playing);source.disconnect();g.disconnect();};source.start(time);source.stop(time+duration+.005);
}
function mixer(c:BaseAudioContext){
 const music=c.createGain(),sfx=c.createGain(),master=c.createGain(),compressor=c.createDynamicsCompressor();
 music.gain.value=.72;sfx.gain.value=.85;master.gain.value=.65;
 compressor.threshold.value=-15;compressor.knee.value=15;compressor.ratio.value=5;compressor.attack.value=.005;compressor.release.value=.18;
 music.connect(master);sfx.connect(master);master.connect(compressor);compressor.connect(c.destination);
 const delay=c.createDelay(.6),wet=c.createGain(),feedback=c.createGain();delay.delayTime.value=.27;wet.gain.value=.14;feedback.gain.value=.22;
 music.connect(delay);delay.connect(wet);wet.connect(master);delay.connect(feedback);feedback.connect(delay);
 return {music,sfx,wet};
}
export class Sound{
 context?:AudioContext;music=false;private effects=true;private track:MusicTrack='title';private timer?:ReturnType<typeof setInterval>;
 private buses?:ReturnType<typeof mixer>;private active=new Set<Playing>();private step=0;private next=0;private paused=false;private ducked=false;private disposed=false;private last=new Map<string,number>();
 private unlock=()=>this.resume();
 private visibility=()=>{if(document.hidden){this.stopMusic();this.stopVoices('sfx',true);void this.context?.suspend().catch(()=>{});}else if(this.context)this.resume();};
 constructor(private samples=new TowerAudioSamples()){if(typeof document!=='undefined'){document.addEventListener('pointerdown',this.unlock,{capture:true});document.addEventListener('keydown',this.unlock,{capture:true});document.addEventListener('visibilitychange',this.visibility);}}
 get sfx(){return this.effects;}
 set sfx(enabled:boolean){this.effects=enabled;if(this.buses&&this.context)this.buses.sfx.gain.setTargetAtTime(enabled?.85:0,this.context.currentTime,.015);if(!enabled)this.stopVoices('sfx');}
 resume(){
  if(this.disposed||typeof AudioContext==='undefined'||(typeof document!=='undefined'&&document.hidden))return;
  try{if(!this.context){this.context=new AudioContext();this.buses=mixer(this.context);this.sfx=this.effects;}const c=this.context;
   if(c.state==='running')this.startMusic();else void c.resume().then(()=>this.startMusic()).catch(()=>{});
  }catch{/* Audio may be unavailable; the game remains playable. */}
 }
 setTrack(track:MusicTrack){if(track===this.track)return;this.stopMusic();this.track=track;this.step=0;this.startMusic();}
 setMusic(enabled:boolean){if(this.music===enabled)return;this.music=enabled;if(enabled)this.startMusic();else this.stopMusic();}
 setPaused(paused:boolean){if(paused===this.paused)return;this.paused=paused;if(paused)this.stopMusic();else this.startMusic();}
 setDucking(enabled:boolean){this.ducked=enabled;if(this.buses&&this.context)this.buses.music.gain.setTargetAtTime(enabled?.25:.72,this.context.currentTime,.15);}
 private startMusic(){
  const c=this.context;if(this.disposed||!this.music||this.paused||!c||c.state!=='running'||this.timer!==undefined||(typeof document!=='undefined'&&document.hidden))return;
  this.next=c.currentTime+.04;if(this.buses){this.buses.music.gain.setTargetAtTime(this.ducked?.25:.72,c.currentTime,.05);this.buses.wet.gain.setTargetAtTime(.14,c.currentTime,.04);}
  this.schedule();this.timer=setInterval(()=>this.schedule(),30);
 }
 private schedule(){
  const c=this.context;if(!c||!this.buses)return;const interval=30/TRACKS[this.track].bpm;
  if(this.next<c.currentTime-.1)this.next=c.currentTime+.025;
  while(this.next<c.currentTime+.16){for(const v of scoreStep(this.track,this.step))instrument(c,this.buses.music,v,this.next,'music',this.active);this.step=(this.step+1)%128;this.next+=interval;}
 }
 private stopMusic(){if(this.timer!==undefined)clearInterval(this.timer);this.timer=undefined;this.stopVoices('music');if(this.buses&&this.context)this.buses.wet.gain.setTargetAtTime(0,this.context.currentTime,.015);}
 private stopVoices(bus:Bus,immediate=false){const c=this.context;if(!c)return;for(const v of this.active){if(v.bus!==bus)continue;const cancel=immediate||v.start>c.currentTime;v.gain.gain.cancelScheduledValues(c.currentTime);if(cancel)v.gain.gain.setValueAtTime(.0001,c.currentTime);else v.gain.gain.setTargetAtTime(.0001,c.currentTime,.012);try{v.source.stop(c.currentTime+(cancel?0:.05));}catch{}if(cancel)this.active.delete(v);}}
 towerAudioStatus(typeId:string){return this.samples.status(typeId);}
 async preloadTowerShots(typeIds:readonly string[]){const c=this.context;if(this.disposed||!c)return;await this.samples.preload(typeIds,c);}
 async waitForTowerAudio(){await this.samples.wait();}
 tone(freq:number,duration=.12,volume=.025){if(this.disposed||!this.sfx||!this.context||!this.buses||this.context.state!=='running'||(typeof document!=='undefined'&&document.hidden)||[...this.active].filter(v=>v.bus==='sfx').length>=32)return;instrument(this.context,this.buses.sfx,{instrument:'bell',note:69+12*Math.log2(freq/440),duration,volume},this.context.currentTime+.005,'sfx',this.active);}
 play(type:string,towerTypeId?:string){
  const c=this.context;if(this.disposed||!this.effects||!c||!this.buses||c.state!=='running'||(typeof document!=='undefined'&&document.hidden))return;
  const score=type==='shot'?towerShotScore(towerTypeId):effects(type);if(!score.length)return;const minGap=type==='shot'?.085:type==='hit'?.07:type==='invalid'?.35:.12,key=type==='shot'?`shot:${towerTypeId??'basic'}`:type;
  if(c.currentTime-(this.last.get(key)??-10)<minGap)return;
  const buffer=type==='shot'?this.samples.get(towerTypeId):undefined,voices=buffer?1:score.length;
  if([...this.active].filter(v=>v.bus==='sfx').length+voices>32)return;this.last.set(key,c.currentTime);
  if(buffer){sample(c,this.buses.sfx,buffer,towerTypeId,c.currentTime+.005,this.active);return;}
  if(type==='shot')void this.samples.load(towerTypeId,c);
  for(const [delay,v] of score)instrument(c,this.buses.sfx,v,c.currentTime+.005+delay,'sfx',this.active);
 }
 dispose(){if(this.disposed)return;this.disposed=true;this.samples.dispose();this.stopMusic();this.stopVoices('sfx');if(typeof document!=='undefined'){document.removeEventListener('pointerdown',this.unlock,true);document.removeEventListener('keydown',this.unlock,true);document.removeEventListener('visibilitychange',this.visibility);}void this.context?.close().catch(()=>{});}
}
function effects(type:string):EffectNote[]{
 const tone=(note:number,duration:number,volume:number,instrument:Voice['instrument']='bell',at=0):EffectNote=>[at,{note,duration,volume,instrument}];
 switch(type){
  case 'ui':return [tone(79,.09,.055,'pluck'),tone(86,.12,.025,'bell',.035)];
  case 'hit':return [tone(42,.12,.11,'kick'),tone(69,.09,.065,'noise'),tone(88,.13,.025)];
  case 'kill':return [tone(50,.22,.07,'noise'),...[74,81,86].map((n,i)=>tone(n,.28,.05,'bell',i*.055))];
  case 'money':return [tone(86,.18,.055),tone(93,.28,.04,'bell',.09)];
  case 'brick':return [tone(46,.1,.09,'noise'),tone(65,.17,.055,'pluck',.065)];
  case 'wall':return [tone(44,.3,.12,'kick'),...[62,69,74,81].map((n,i)=>tone(n,.45,.045,'bell',i*.085))];
  case 'wall-impact':return [tone(37,.19,.13,'kick'),tone(48,.12,.09,'noise'),tone(40,.15,.045,'bass',.045)];
  case 'wall-break':return [tone(32,.32,.14,'kick'),tone(53,.42,.09,'noise'),tone(43,.22,.05,'noise',.08),tone(38,.18,.04,'noise',.19)];
  case 'build':return [tone(48,.15,.09,'noise'),tone(62,.24,.065,'pluck',.08),tone(69,.28,.04,'bell',.16)];
  case 'invalid':return [tone(46,.12,.055,'bass'),tone(43,.14,.05,'bass',.12)];
  case 'leak':return [tone(38,.38,.14,'kick'),tone(50,.4,.055,'sweep',.05)];
  case 'start':return [62,69,74].map((n,i)=>tone(n,.45,.07,'strings',i*.12));
  case 'victory':return [65,69,72,77,84].map((n,i)=>tone(n,.7,.075,'bell',i*.13));
  case 'defeat':return [62,60,57,50].map((n,i)=>tone(n,.55,.06,'strings',i*.2));
  case 'portal':return [tone(45,1.2,.07,'sweep'),tone(74,1.5,.045,'pad',.15),tone(75,1.3,.03,'pad',.2)];
  case 'dawn':return [65,72,77,81,84].map((n,i)=>tone(n,1.2,.045,'bell',i*.18));
  default:return [];
 }
}
export async function renderSoundtrack(track:MusicTrack,seconds=12){
 const c=new OfflineAudioContext(2,Math.ceil(seconds*44100),44100),buses=mixer(c),interval=30/TRACKS[track].bpm;
 for(let step=0;step*interval<seconds-.08;step++)for(const v of scoreStep(track,step%128))instrument(c,buses.music,v,.02+step*interval,'music');
 return c.startRendering();
}
const renderSamples=new TowerAudioSamples();
// Audition/export loads actual samples and uses the live mix and fallback on failure.
export async function renderTowerShots(typeIds:readonly string[],spacing=1){
 const seconds=Math.max(1,...typeIds.map((id,i)=>.02+i*spacing+Math.max(towerShotDuration(id),renderSamples.metadata(id)?.duration??0)+.04)),c=new OfflineAudioContext(2,Math.ceil(seconds*44100),44100),buses=mixer(c);
 await renderSamples.preload(typeIds,c);
 typeIds.forEach((id,i)=>{const buffer=renderSamples.get(id);if(buffer)sample(c,buses.sfx,buffer,id,.02+i*spacing);else for(const [delay,v]of towerShotScore(id))instrument(c,buses.sfx,v,.02+i*spacing+delay,'sfx');});
 return c.startRendering();
}
