import type {Sound} from './audio';
import './audio-controls.css';

export type AudioPreference='music'|'sfx';
// A separate toolbar reserves space above the canvas, including on tablets.
export function mountAudioControls(sound:Sound,persist:(key:AudioPreference,enabled:boolean)=>void){
 const app=document.getElementById('app')!;
 app.classList.add('with-audio-controls');
 const toolbar=document.createElement('nav');toolbar.className='audio-controls';toolbar.setAttribute('aria-label','소리 조절');
 const buttons=new Map<AudioPreference,HTMLButtonElement>();
 function refresh(){
  for(const [key,button]of buttons){const enabled=key==='music'?sound.music:sound.sfx;
   button.textContent=`${key==='music'?'♫ 배경음악':'♬ 효과음'} ${enabled?'ON':'OFF'}`;
   button.setAttribute('aria-pressed',String(enabled));
   button.setAttribute('aria-label',`${key==='music'?'배경음악':'효과음'} ${enabled?'켜짐':'꺼짐'}`);
   for(const id of [`setting-${key}`,`title-${key}`]){const input=document.getElementById(id) as HTMLInputElement|null;if(input)input.checked=enabled;}
  }
 }
 for(const key of ['music','sfx'] as const){
  const button=document.createElement('button');button.type='button';button.dataset.audio=key;
  button.onclick=()=>{sound.resume();const enabled=!(key==='music'?sound.music:sound.sfx);
   if(key==='music')sound.setMusic(enabled);else sound.sfx=enabled;
   persist(key,enabled);refresh();if(enabled)sound.play('ui');
  };
  buttons.set(key,button);toolbar.append(button);
 }
 app.append(toolbar);refresh();return {refresh};
}
