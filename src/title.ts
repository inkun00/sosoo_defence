import {artURL} from './art';
import {loadSave,writeSave,hasAdventure,newAdventure} from './save';
import {DIFFICULTIES,isDifficulty} from './difficulty';
import {hitEquationsEnabled,setHitEquationsEnabled} from './combat-preferences';
import {playCinematic} from './cinematic';
import {Sound} from './audio';
import {mountAudioControls} from './audio-controls';
import './game.css';
import './title.css';
const app=document.querySelector<HTMLDivElement>('#app')!;let save=loadSave(),movie=false;
const sound=new Sound();sound.sfx=save.sfx;sound.setMusic(save.music);
document.addEventListener('click',e=>{if(!movie&&(e.target as HTMLElement).closest('button'))sound.play('ui');});
app.innerHTML=`<main class="title-screen" aria-label="소수 디펜스 시작 화면"><div class="title-art" aria-hidden="true"></div><div class="title-shade" aria-hidden="true"></div><div class="title-flame-glow" aria-hidden="true"></div><canvas class="title-embers" aria-hidden="true"></canvas><section class="title-copy"><h1 aria-label="소수 디펜스"><img class="title-logo" src="${artURL('title-wordmark-v1')}" alt="" width="1200" height="297" decoding="async" fetchpriority="high"></h1><nav class="title-menu" aria-label="모험 선택"><button class="title-button primary" id="title-new">새게임</button><button class="title-button" id="title-continue">이어하기</button><button class="title-button" id="title-duel">1:1대전</button><button class="title-button" id="title-settings">설정</button><button class="title-button title-worksheet" id="title-worksheet">학습지 출력</button></nav><div class="title-replays"><button id="title-opening">오프닝 다시 보기 ↗</button><button id="title-ending" hidden>엔딩 다시 보기 ↗</button></div></section><footer class="title-footer"><span>초등 4학년 · 소수의 덧셈과 뺄셈</span></footer><p class="title-save-warning" role="alert" hidden></p></main><div id="title-dialog" class="title-dialog hidden" role="dialog" aria-modal="true" aria-label="모험 설정"><div class="title-card"><button class="title-close" id="title-dialog-close" aria-label="닫기">×</button><div id="title-dialog-body"></div></div></div>`;
const $=(id:string)=>document.getElementById(id)!;const dialog=$('title-dialog'),body=$('title-dialog-body');let previous:HTMLElement|null=null;
const audioControls=mountAudioControls(sound,(key,enabled)=>{save[key]=enabled;persist();});
function refresh(){
 const progress=hasAdventure(save);($('title-continue') as HTMLButtonElement).disabled=!progress;
 $('title-ending').hidden=!save.campaignCompleted;
}
function persist(){const saved=writeSave(save),warning=document.querySelector<HTMLElement>('.title-save-warning')!;warning.hidden=saved;warning.textContent=saved?'':'이 브라우저에서는 진행 저장이 제한되어 있어요.';refresh();}
function open(html:string){previous=document.activeElement as HTMLElement;body.innerHTML=html;dialog.classList.remove('hidden');document.querySelector<HTMLElement>('.title-screen')!.inert=true;$('title-dialog-close').focus();}
function close(){dialog.classList.add('hidden');document.querySelector<HTMLElement>('.title-screen')!.inert=false;previous?.focus();}
function navigate(mode:'adventure'|'duel'){sound.setMusic(false);const url=new URL(location.href);url.searchParams.set('mode',mode);url.searchParams.delete('preview');url.searchParams.delete('ui');location.assign(url.href);}
async function cinematic(kind:'opening'|'ending',next:()=>void){if(movie)return;movie=true;sound.setPaused(true);await playCinematic(kind,save,()=>{movie=false;sound.setPaused(false);next();});}
function begin(){save=newAdventure(save);persist();close();void cinematic('opening',()=>navigate('adventure'));}
function newGame(){sound.resume();if(hasAdventure(save)){open(`<p class="title-eyebrow">새로운 수호자의 여정</p><h2>처음부터 시작할까요?</h2><p>현재 ${save.resumeStage}단계까지의 모험을 새로 시작합니다.<br>모험 레벨·별·벽돌·성벽 재고가 초기화됩니다.<br>소리와 난이도 설정, 1:1 계정 기록은 유지됩니다.</p><div class="title-card-actions"><button class="title-button" id="title-cancel">돌아가기</button><button class="title-button primary" id="title-confirm">새 모험 시작</button></div>`);$('title-cancel').onclick=close;$('title-confirm').onclick=begin;}else begin();}
function settings(){sound.resume();open(`<p class="title-eyebrow">수호자의 준비</p><h2>내가 편한 화면과 소리로</h2><label class="setting"><span>몬스터 피격 뺄셈식</span><input id="title-hit" type="checkbox" role="switch" ${hitEquationsEnabled()?'checked':''}></label><label class="setting"><span>효과음</span><input id="title-sfx" type="checkbox" role="switch" ${save.sfx?'checked':''}></label><label class="setting"><span>배경음</span><input id="title-music" type="checkbox" role="switch" ${save.music?'checked':''}></label><label class="setting"><span>모험 난이도</span><select id="title-difficulty">${Object.entries(DIFFICULTIES).map(([id,s])=>`<option value="${id}" ${save.difficulty===id?'selected':''}>${s.name}</option>`).join('')}</select></label><p class="title-settings-note">설정은 자동 저장됩니다. 이야기는 한국어 자막으로 표시합니다. 배경음과 효과음은 각각 켜고 끌 수 있어요.</p>`);
 $('title-hit').onchange=()=>setHitEquationsEnabled(($('title-hit') as HTMLInputElement).checked);
 $('title-sfx').onchange=()=>{save.sfx=($('title-sfx') as HTMLInputElement).checked;sound.sfx=save.sfx;persist();audioControls.refresh();};
 $('title-music').onchange=()=>{save.music=($('title-music') as HTMLInputElement).checked;sound.setMusic(save.music);persist();audioControls.refresh();};
 $('title-difficulty').onchange=()=>{const value=($('title-difficulty') as HTMLSelectElement).value;if(isDifficulty(value)){save.difficulty=value;persist();}};
}
refresh();$('title-new').onclick=newGame;$('title-continue').onclick=()=>{if(hasAdventure(save))navigate('adventure');};$('title-duel').onclick=()=>navigate('duel');$('title-worksheet').onclick=()=>{const url=new URL(location.href);url.searchParams.set('mode','worksheet');url.searchParams.set('print','1');url.searchParams.delete('id');url.searchParams.delete('preview');location.assign(url.href);};$('title-settings').onclick=settings;
 $('title-opening').onclick=()=>void cinematic('opening',()=>{if(save.music)sound.setMusic(true);});$('title-ending').onclick=()=>{if(save.campaignCompleted)void cinematic('ending',()=>{if(save.music)sound.setMusic(true);});};
 $('title-dialog-close').onclick=close;dialog.onclick=e=>{if(e.target===dialog)close();};dialog.addEventListener('keydown',e=>{if(e.key==='Escape')close();else if(e.key==='Tab'){const controls=Array.from(dialog.querySelectorAll<HTMLElement>('button,input,select')).filter(e=>!('disabled'in e&&e.disabled));if(!controls.length)return;const first=controls[0],last=controls.at(-1)!;if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});
const canvas=document.querySelector<HTMLCanvasElement>('.title-embers')!,context=canvas.getContext('2d')!,reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
function resize(){canvas.width=Math.round(innerWidth);canvas.height=Math.round(innerHeight);}resize();window.addEventListener('resize',resize);
let raf=0,last=0,clock=0;function embers(now:number){if(last&&!document.hidden&&!movie)clock+=Math.min(.1,(now-last)/1000);last=now;context.clearRect(0,0,canvas.width,canvas.height);if(!reduced){for(let i=0;i<38;i++){const x=(i*147.3+Math.sin(clock*.35+i)*22)%canvas.width,y=canvas.height-(i*49.1+clock*(12+i%5*3))%(canvas.height+25);context.globalAlpha=.15+.45*Math.pow(Math.sin(clock*.7+i),2);context.fillStyle=i%5?'#ffd18a':'#c39cff';context.beginPath();context.arc(x,y,1+i%3*.65,0,Math.PI*2);context.fill();}context.globalAlpha=1;}raf=requestAnimationFrame(embers);}if(!reduced)raf=requestAnimationFrame(embers);
window.addEventListener('pagehide',()=>{cancelAnimationFrame(raf);sound.dispose();});
// Explicit local preview uses the same renderer; it never unlocks or saves an ending.
if(import.meta.env.DEV&&new URLSearchParams(location.search).get('preview')==='ending'){const preview=document.createElement('button');preview.className='title-preview';preview.textContent='엔딩 개발 미리보기';preview.onclick=()=>void cinematic('ending',()=>{});document.querySelector('.title-replays')!.append(preview);}
