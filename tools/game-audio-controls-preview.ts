import '../src/game.css';
import {mountGameAudioControls} from '../src/game-audio-controls';
import {Sound} from '../src/audio';
import {loadSave,writeSave} from '../src/save';

const original=['decimal-castle-v1','decimal-duel-sfx'].map(key=>({key,value:localStorage.getItem(key)}));
const save=loadSave(),sound=new Sound();
sound.sfx=save.sfx;sound.setMusic(save.music);
const field=document.querySelector<HTMLElement>('#field')!;
field.style.cssText='display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:14px;overflow:auto';
field.innerHTML='<h1>게임 소리 버튼 확인</h1><button id="play-sample">발사 소리 확인</button><button id="restore-save">기존 설정 복원</button><output id="audio-proof" style="white-space:pre-wrap"></output>';
const proof=field.querySelector<HTMLOutputElement>('#audio-proof')!;
function report(){
 const persisted=loadSave(),rect=field.getBoundingClientRect();
 proof.textContent=JSON.stringify({sfx:sound.sfx,music:sound.music,saved:{sfx:persisted.sfx,music:persisted.music},audioContext:sound.context?.state??'not-created',field:{top:rect.top,height:rect.height},viewport:{width:innerWidth,height:innerHeight}},null,2);
}
const controls=mountGameAudioControls(document.querySelector<HTMLElement>('#game-shell')!,{
 getState:()=>({sfx:sound.sfx,music:sound.music}),
 change:(kind,enabled)=>{
  sound.resume();
  if(kind==='sfx'){sound.sfx=enabled;save.sfx=enabled;}else{sound.setMusic(enabled);save.music=enabled;}
  writeSave(save);report();
 }
});
field.querySelector('#play-sample')!.addEventListener('click',async()=>{
 sound.resume();await sound.preloadTowerShots(['basic']);sound.play('shot','basic');report();
});
field.querySelector('#restore-save')!.addEventListener('click',()=>{
 for(const {key,value} of original){if(value===null)localStorage.removeItem(key);else localStorage.setItem(key,value);}
 const restored=loadSave();sound.sfx=restored.sfx;sound.setMusic(restored.music);Object.assign(save,restored);controls.sync();report();
});
addEventListener('resize',report);
addEventListener('pagehide',()=>{controls.dispose();sound.dispose();},{once:true});
report();
