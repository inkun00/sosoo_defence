import {Sound,renderTowerShots} from '../src/audio';
import {TOWERS} from '../src/towers';
import {TOWER_AUDIO_MANIFEST,type TowerAudioSample,type TowerAudioStatus} from '../src/tower-audio-samples';

type AudioSource={title:string;author:string;url:string;license:string;licenseUrl:string};
type AudioProvenance={sources:Record<string,AudioSource>;towers:Record<string,{description:string;sources:string[];referenceStereoWavBytes:number}>};
// The game only imports playback data. The development audition page retrieves
// provenance separately, so authors and URLs do not enlarge every audio bundle.
const assets=TOWER_AUDIO_MANIFEST as Readonly<Record<string,TowerAudioSample>>;
const provenanceRequest=new AbortController();
const ids=TOWERS.map(tower=>tower.id),spacing=1.2,sound=new Sound();
const element=<T extends HTMLElement>(selector:string)=>document.querySelector<T>(selector)!;
const status=element('#status'),summary=element('#summary'),weapons=element('#weapons');
const compare=element<HTMLButtonElement>('#compare'),load=element<HTMLButtonElement>('#load');
const toggle=element<HTMLButtonElement>('#sound'),render=element<HTMLButtonElement>('#render');
const rendered=element<HTMLAudioElement>('#rendered'),download=element<HTMLAnchorElement>('#download');
const exportStatus=element('#export-status');
const cards=new Map<string,HTMLElement>(),badges=new Map<string,HTMLElement>();
const timers=new Set<ReturnType<typeof setTimeout>>();
let effectsEnabled=true,revision=0,disposed=false,exportPending=false,blobUrl:string|undefined;
sound.setMusic(false);

const size=(bytes:number)=>`${(bytes/1024).toFixed(1)} KiB`;
const statusLabels:Record<TowerAudioStatus,string>={idle:'idle · 준비 전',loading:'loading · 다운로드 / 디코딩',ready:'ready · 실제 샘플 준비됨',failed:'failed · 파일 준비 실패'};

for(const tower of TOWERS){
 const asset=assets[tower.id],card=document.createElement('article');card.className='weapon';card.dataset.tower=tower.id;card.dataset.status='idle';
 const heading=document.createElement('h2');heading.textContent=tower.name;
 const badge=document.createElement('span');badge.className='state';badge.textContent=statusLabels.idle;
 const details=document.createElement('p');details.className='details';details.textContent=asset?`${asset.duration.toFixed(3)}초 · ${size(asset.bytes)} · MP3`:'샘플 manifest 대기 중';
 const button=document.createElement('button');button.type='button';button.textContent='발사 소리 듣기';button.setAttribute('aria-label',`${tower.name} 발사 소리 듣기`);button.onclick=()=>void audition(tower.id);
 card.append(heading,badge,details,button);
 weapons.append(card);cards.set(tower.id,card);badges.set(tower.id,badge);
}

const uniqueAssets=new Map(ids.flatMap(id=>assets[id]?[[assets[id].url,assets[id]] as const]:[]));
const totalBytes=[...uniqueAssets.values()].reduce((sum,asset)=>sum+asset.bytes,0);
const summaryText=`타워 ${ids.length}종 · 고유 샘플 ${uniqueAssets.size}개 · 총 압축 크기 ${size(totalBytes)} (${totalBytes.toLocaleString()} bytes)`;
summary.textContent=summaryText+' · BGM OFF';
const sourceLinks=element('#source-links'),provenanceStatus=document.createElement('p');
provenanceStatus.textContent='공개 원본 출처와 라이선스를 확인하는 중…';sourceLinks.append(provenanceStatus);
const provenance=document.createElement('p'),provenanceLink=document.createElement('a');provenanceLink.href='/licenses/tower-audio-v1.json';provenanceLink.textContent='샘플별 전체 출처와 압축 기록';provenance.append(provenanceLink);sourceLinks.append(provenance);

async function showSources(){
 try{
  const response=await fetch(provenanceLink.href,{signal:provenanceRequest.signal});if(!response.ok)throw Error('Provenance unavailable');
  const report=await response.json() as AudioProvenance;if(disposed)return;
  const sources=new Map<string,AudioSource>();let sourceBytes=0;
  for(const id of ids){
   const clip=report.towers[id],asset=assets[id],card=cards.get(id);if(!clip||!asset||!card)continue;
   card.querySelector('.details')!.textContent=`${clip.description}\n${asset.duration.toFixed(3)}초 · ${size(asset.bytes)} · MP3`;
   sourceBytes+=clip.referenceStereoWavBytes;
   for(const key of clip.sources){const record=report.sources[key];if(record)sources.set(record.url,record);}
   const first=report.sources[clip.sources[0]];
   if(first){const link=document.createElement('a');link.className='source';link.href=first.url;link.target='_blank';link.rel='noopener noreferrer';link.textContent=first.title;card.append(link);}
  }
  if(sourceBytes)summary.textContent=summaryText+` · 동일 길이 WAV 대비 ${(100-totalBytes/sourceBytes*100).toFixed(2)}% 감소 · BGM OFF`;
  const list=document.createElement('ul'),licenses=new Map<string,string>();
  for(const record of sources.values()){
   const item=document.createElement('li'),link=document.createElement('a');link.href=record.url;link.target='_blank';link.rel='noopener noreferrer';link.textContent=`${record.author} — ${record.title} (${record.license})`;item.append(link);list.append(item);licenses.set(record.licenseUrl,record.license);
  }
  provenanceStatus.replaceWith(list);
  for(const [url,name] of licenses){const link=document.createElement('a');link.href=url;link.target='_blank';link.rel='noopener noreferrer';link.textContent=name;sourceLinks.insertBefore(link,provenance);sourceLinks.insertBefore(document.createTextNode(' '),provenance);}
 }catch{if(!disposed)provenanceStatus.textContent='출처 자료를 불러오지 못했습니다. 아래 전체 출처 링크에서 확인하세요.';}
}

function refreshStates(){for(const id of ids){const state=sound.towerAudioStatus(id);cards.get(id)!.dataset.status=state;badges.get(id)!.textContent=statusLabels[state];}}
function valid(token:number){return !disposed&&token===revision&&!document.hidden;}
function later(callback:()=>void,milliseconds:number){const timer=setTimeout(()=>{timers.delete(timer);callback();},milliseconds);timers.add(timer);}
function clearTimers(){for(const timer of timers)clearTimeout(timer);timers.clear();}
function halt(message?:string){
 revision++;clearTimers();for(const card of cards.values())card.classList.remove('active');
 if(exportPending){exportPending=false;exportStatus.textContent='WAV 준비 작업 취소됨 · 다시 만들기를 누르세요.';}
 sound.sfx=false;if(effectsEnabled&&!disposed)sound.sfx=true;
 rendered.pause();compare.textContent='12종 순서 비교';render.disabled=false;load.disabled=false;
 if(message)status.textContent=message;
 refreshStates();
}
function startOperation(){halt();return revision;}
function loadingPoll(token:number){if(!valid(token))return;refreshStates();if(ids.some(id=>sound.towerAudioStatus(id)==='loading'))later(()=>loadingPoll(token),100);}
async function prepare(token:number,needed:readonly string[]){
 if(!valid(token))return false;
 sound.resume();const context=sound.context;
 if(!context){status.textContent='이 브라우저에서 오디오를 사용할 수 없습니다.';return false;}
 try{
  if(context.state!=='running')await context.resume();
  if(!valid(token))return false;
  status.textContent='실제 샘플 다운로드와 디코딩을 기다리는 중…';
  const pending=sound.preloadTowerShots(needed);loadingPoll(token);await pending;await sound.waitForTowerAudio();
  if(!valid(token))return false;
  refreshStates();const failed=needed.filter(id=>sound.towerAudioStatus(id)!=='ready');
  if(failed.length){status.textContent=`실제 샘플 준비 실패: ${failed.map(id=>TOWERS.find(tower=>tower.id===id)!.name).join(', ')}. 파일 경로를 확인하고 새로고침하세요.`;return false;}
  status.textContent=`ready ${ids.filter(id=>sound.towerAudioStatus(id)==='ready').length}/${ids.length} · 실제 샘플 준비됨`;return true;
 }catch{if(valid(token)){refreshStates();status.textContent='오디오 준비에 실패했습니다. 브라우저 오디오 권한을 확인하세요.';}return false;}
}
function highlight(id?:string){for(const [key,card] of cards)card.classList.toggle('active',key===id);}
async function audition(id:string){
 const token=startOperation();
 if(!effectsEnabled){status.textContent='효과음 OFF · 효과음을 켜고 청취하세요.';return;}
 if(!await prepare(token,[id])||!valid(token)||!effectsEnabled)return;
 sound.play('shot',id);highlight(id);status.textContent=`${TOWERS.find(tower=>tower.id===id)!.name} · 실제 샘플 재생`;
 later(()=>{if(valid(token)){highlight();status.textContent='ready · 청취 대기 중';}},Math.ceil((assets[id]?.duration??1)*1000)+100);
}
load.onclick=async()=>{const token=startOperation();load.disabled=true;await prepare(token,ids);if(valid(token))load.disabled=false;};
compare.onclick=async()=>{
 const token=startOperation();
 if(!effectsEnabled){status.textContent='효과음 OFF · 효과음을 켜고 비교하세요.';return;}
 if(!await prepare(token,ids)||!valid(token)||!effectsEnabled)return;
 compare.textContent='순서 비교 재시작';
 const playAt=(index:number)=>{if(!valid(token)||!effectsEnabled)return;const tower=TOWERS[index];highlight(tower.id);sound.play('shot',tower.id);status.textContent=`순서 비교 ${index+1}/${ids.length} · ${tower.name} · ready`;};
 playAt(0);for(let index=1;index<ids.length;index++)later(()=>playAt(index),index*spacing*1000);
 later(()=>{if(valid(token)){highlight();compare.textContent='12종 순서 비교';status.textContent='12종 순서 비교 완료 · 실제 샘플 12/12';}},((ids.length-1)*spacing+(assets[ids.at(-1)!]?.duration??1)+.1)*1000);
};
element<HTMLButtonElement>('#stop').onclick=()=>halt('재생 중단 · 예약된 비교 재생 취소됨');
toggle.onclick=()=>{
 effectsEnabled=!effectsEnabled;halt(effectsEnabled?'효과음 ON · 청취 대기 중':'효과음 OFF · 재생 중단');
 sound.sfx=effectsEnabled;rendered.muted=!effectsEnabled;toggle.textContent=`효과음 ${effectsEnabled?'ON':'OFF'}`;toggle.setAttribute('aria-pressed',String(effectsEnabled));
};

function wav(buffer:AudioBuffer){
 const channels=buffer.numberOfChannels,frames=buffer.length,blockAlign=channels*2,bytes=frames*blockAlign;
 const data=new ArrayBuffer(44+bytes),view=new DataView(data);
 const write=(offset:number,text:string)=>{for(let index=0;index<text.length;index++)view.setUint8(offset+index,text.charCodeAt(index));};
 write(0,'RIFF');view.setUint32(4,36+bytes,true);write(8,'WAVE');write(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,channels,true);view.setUint32(24,buffer.sampleRate,true);view.setUint32(28,buffer.sampleRate*blockAlign,true);view.setUint16(32,blockAlign,true);view.setUint16(34,16,true);write(36,'data');view.setUint32(40,bytes,true);
 const tracks=Array.from({length:channels},(_,channel)=>buffer.getChannelData(channel));let offset=44;
 for(let frame=0;frame<frames;frame++)for(let channel=0;channel<channels;channel++){const sample=Math.max(-1,Math.min(1,tracks[channel][frame]));view.setInt16(offset,Math.round(sample*(sample<0?32768:32767)),true);offset+=2;}
 return new Blob([data],{type:'audio/wav'});
}
render.onclick=async()=>{
 const token=startOperation();exportPending=true;render.disabled=true;exportStatus.textContent='샘플 준비 중…';
 if(!await prepare(token,ids)||!valid(token)){if(valid(token)){exportPending=false;render.disabled=false;exportStatus.textContent='실제 샘플 준비가 완료되면 렌더링할 수 있습니다.';}return;}
 exportStatus.textContent='같은 샘플과 믹서로 WAV 렌더링 중…';
 try{
  const buffer=await renderTowerShots(ids,spacing);if(!valid(token))return;
  const file=wav(buffer);if(blobUrl)URL.revokeObjectURL(blobUrl);blobUrl=URL.createObjectURL(file);
  rendered.src=blobUrl;rendered.muted=!effectsEnabled;rendered.hidden=false;rendered.load();download.href=blobUrl;download.hidden=false;
  exportStatus.textContent=`WAV 준비됨 · ${buffer.duration.toFixed(2)}초 · ${size(file.size)} · PCM 16-bit / ${buffer.sampleRate.toLocaleString()} Hz / ${buffer.numberOfChannels}채널`;
  status.textContent='ready 12/12 · WAV는 아래 플레이어에서 재생하세요.';
 }catch{if(valid(token))exportStatus.textContent='WAV 렌더링에 실패했습니다. 다시 시도하세요.';}
 finally{if(valid(token)){exportPending=false;render.disabled=false;}}
};
rendered.addEventListener('play',()=>{
 if(disposed||document.hidden||!effectsEnabled){rendered.pause();return;}
 if(exportPending){exportPending=false;exportStatus.textContent='WAV 준비 작업 취소됨 · 기존 파일 청취 중';}
 revision++;clearTimers();highlight();sound.sfx=false;sound.sfx=effectsEnabled;compare.textContent='12종 순서 비교';render.disabled=false;load.disabled=false;status.textContent='렌더링된 WAV 비교 파일 재생 중';
});
rendered.addEventListener('ended',()=>{if(!disposed)status.textContent='WAV 청취 완료 · ready 12/12';});
function visibility(){if(document.hidden){halt('탭이 숨겨져 재생 중단 · 다시 버튼을 누르면 재생됩니다.');exportStatus.textContent=rendered.src?'WAV 준비됨 · 자동 재생하지 않습니다.':'';}}
function dispose(){if(disposed)return;halt();disposed=true;provenanceRequest.abort();sound.dispose();rendered.pause();rendered.removeAttribute('src');rendered.load();if(blobUrl)URL.revokeObjectURL(blobUrl);document.removeEventListener('visibilitychange',visibility);}
document.addEventListener('visibilitychange',visibility);
window.addEventListener('pagehide',event=>{halt();if(!event.persisted)dispose();});
(import.meta as ImportMeta & {hot?:{dispose:(callback:()=>void)=>void}}).hot?.dispose(dispose);
refreshStates();
void showSources();
