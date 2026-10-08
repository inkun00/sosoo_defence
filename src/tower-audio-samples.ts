import manifest from './tower-audio-manifest.json';

export interface TowerAudioSample {url:string;bytes:number;duration:number;}
export type TowerAudioStatus='idle'|'loading'|'ready'|'failed';
type SampleEntry={status:TowerAudioStatus;buffer?:AudioBuffer;promise?:Promise<AudioBuffer|undefined>;controller?:AbortController;};

export const TOWER_AUDIO_MANIFEST=manifest as Readonly<Record<string,TowerAudioSample>>;
const gains:Readonly<Record<string,number>>={basic:.35,double:.39,needle:.28,pebble:.34,frost:.38,ice:.4,catapult:.44,lightning:.42,crystal:.4,sniper:.44,siege:.48,rune:.44};
export function towerShotSampleGain(typeId='basic'){return gains[typeId]??gains.basic;}

// Entries are keyed by the fingerprinted URL, so aliases share a single request
// and decoded buffer. Loading never starts a voice or unlocks an audio context.
export class TowerAudioSamples{
 private entries=new Map<string,SampleEntry>();private disposed=false;
 constructor(private readonly assets:Readonly<Record<string,TowerAudioSample>>=TOWER_AUDIO_MANIFEST){}
 metadata(typeId='basic'){return this.assets[typeId]??this.assets.basic;}
 status(typeId='basic'):TowerAudioStatus{const asset=this.metadata(typeId);return asset?this.entries.get(asset.url)?.status??'idle':'idle';}
 get(typeId='basic'){const asset=this.metadata(typeId);return asset?this.entries.get(asset.url)?.buffer:undefined;}
 load(typeId:string|undefined,context:BaseAudioContext):Promise<AudioBuffer|undefined>{
  const asset=this.metadata(typeId);if(this.disposed||!asset)return Promise.resolve(undefined);
  const previous=this.entries.get(asset.url);if(previous)return previous.promise??Promise.resolve(previous.buffer);
  const entry:SampleEntry={status:'loading',controller:new AbortController()};this.entries.set(asset.url,entry);
  entry.promise=(async()=>{
   try{
    if(typeof context.decodeAudioData!=='function')throw Error('Audio decoding unavailable');
    const response=await fetch(asset.url,{signal:entry.controller!.signal});if(!response.ok)throw Error(`Tower audio HTTP ${response.status}`);
    const data=await response.arrayBuffer();if(this.disposed)return undefined;
    const buffer=await context.decodeAudioData(data);if(this.disposed)return undefined;
    entry.buffer=buffer;entry.status='ready';return buffer;
   }catch{entry.status='failed';return undefined;}
   finally{entry.controller=undefined;}
  })();return entry.promise;
 }
 async preload(typeIds:readonly string[],context:BaseAudioContext){await Promise.all(typeIds.map(id=>this.load(id,context)));}
 async wait(){await Promise.all([...this.entries.values()].map(entry=>entry.promise));}
 dispose(){if(this.disposed)return;this.disposed=true;for(const entry of this.entries.values())entry.controller?.abort();this.entries.clear();}
}
