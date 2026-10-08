import {artURL} from './art';
import {STORY,storyDuration,storyFrame,StoryKind} from './story';
import {Sound} from './audio';
import {Save} from './save';
import {drawOpeningMotion,OPENING_ASSETS} from './opening-motion';
import {drawEndingMotion,drawRestoredWorld,ENDING_CHAPTERS} from './ending-motion';
import './cinematic.css';
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
const ease=(n:number)=>1-Math.pow(1-clamp(n),3);
const images=new Map<string,Promise<HTMLImageElement>>();
function image(name:string){let pending=images.get(name);if(!pending){pending=new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>reject(Error('장면 그림을 불러오지 못했어요.'));i.src=artURL(name);});images.set(name,pending);}return pending;}
let fontReady:Promise<void>|undefined;
function endingFont(){return fontReady??=document.fonts.load("700 70px 'HahmletEnding'",STORY.ending.map(b=>b.title+b.subtitle).join('')).then(()=>{}).catch(()=>{fontReady=undefined;});}

export async function playCinematic(kind:StoryKind,preferences:Save,onComplete:()=>void){
 const previous=document.activeElement as HTMLElement|null,root=document.createElement('section');
 root.className=`cinematic cinematic-${kind}`;root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-label',kind==='opening'?'소수의 성 오프닝':'평화의 귀환 · 엔딩');
 root.innerHTML=`<div class="cinematic-stage"><canvas aria-label="${kind==='ending'?'마법사 퇴치와 세상의 회복 이야기':'소수의 성 이야기 모션 그래픽'}"></canvas><div class="cinematic-top"><span>${kind==='opening'?'프롤로그 · 소수의 저주':'에필로그 · 돌아온 아침'}</span><div><button type="button" data-movie="pause">일시 정지</button><button type="button" data-movie="skip">${kind==='opening'?'건너뛰기':'엔딩 마치기'} ↗</button></div></div><div class="cinematic-caption" aria-live="polite"><h2></h2><p></p></div><div class="cinematic-footer"><span data-movie="chapter"></span><div class="cinematic-track"><i></i></div><span data-movie="time"></span></div><div class="cinematic-loading" role="status">이야기의 막이 오르는 중…</div></div>`;
 const app=document.getElementById('app')!,wasInert=app.inert;app.inert=true;
 document.body.append(root);const canvas=root.querySelector('canvas')!,ctx=canvas.getContext('2d')!;canvas.width=1600;canvas.height=900;
 const title=root.querySelector('h2')!,subtitle=root.querySelector('.cinematic-caption p')!,bar=root.querySelector<HTMLElement>('.cinematic-track i')!,loading=root.querySelector<HTMLElement>('.cinematic-loading')!;
 const pauseButton=root.querySelector<HTMLButtonElement>('[data-movie="pause"]')!,skip=root.querySelector<HTMLButtonElement>('[data-movie="skip"]')!;
 const total=storyDuration(kind),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches,sound=new Sound();sound.sfx=preferences.sfx;sound.setTrack(kind);sound.setPaused(true);sound.setMusic(preferences.music);sound.resume();
 let disposed=false,raf=0,time=0,last=0,chapter=-1,paused=false;const cues=new Set<string>();const art=new Map<string,HTMLImageElement>();
 function leave(){sound.dispose();cancelAnimationFrame(raf);}
 function finish(){if(disposed)return;disposed=true;cancelAnimationFrame(raf);document.removeEventListener('visibilitychange',visibility);window.removeEventListener('pagehide',leave);root.removeEventListener('keydown',keyboard);sound.dispose();root.remove();app.inert=wasInert;previous?.focus();onComplete();}
 function setPaused(value:boolean){paused=value;sound.setPaused(value);pauseButton.textContent=paused?'재생':'일시 정지';pauseButton.setAttribute('aria-pressed',String(paused));}
 function visibility(){if(document.hidden)setPaused(true);}
 function keyboard(e:KeyboardEvent){if(e.key==='Escape'){e.preventDefault();e.stopPropagation();finish();}else if(e.code==='Space'&&!(e.target as HTMLElement).closest('button')){e.preventDefault();e.stopPropagation();setPaused(!paused);}else if(e.key==='Tab'){const buttons=[pauseButton,skip],index=buttons.indexOf(document.activeElement as HTMLButtonElement);if(e.shiftKey&&index<=0){e.preventDefault();skip.focus();}else if(!e.shiftKey&&index===1){e.preventDefault();pauseButton.focus();}}}
 root.addEventListener('keydown',keyboard);document.addEventListener('visibilitychange',visibility);skip.onclick=finish;pauseButton.onclick=()=>setPaused(!paused);skip.focus();
 const needed=new Set<string>(STORY[kind].map(b=>b.art));
 if(kind==='opening')for(const name of OPENING_ASSETS)needed.add(name);
 try{await Promise.all([...needed].map(async name=>art.set(name,await image(name))));if(kind==='ending')await endingFont();}catch{loading.textContent='그림을 불러오지 못했어요. 건너뛰기로 모험을 시작할 수 있어요.';pauseButton.disabled=true;return;}
 if(disposed)return;loading.hidden=true;sound.setPaused(paused);window.addEventListener('pagehide',leave);
 function background(name:string,progress:number,opacity=1){
  const i=art.get(name)!;const zoom=reduced?1:1.03+progress*.065,scale=Math.max(1600/i.width,900/i.height)*zoom,w=i.width*scale,h=i.height*scale;
  ctx.save();ctx.globalAlpha=opacity;ctx.drawImage(i,(1600-w)/2+(reduced?0:Math.sin(progress*Math.PI)*-18),(900-h)/2,w,h);ctx.restore();
 }
 function draw(){
  const f=storyFrame(kind,time),b=f.beat,p=f.local/b.duration;ctx.fillStyle='#080a10';ctx.fillRect(0,0,1600,900);background(b.art,p);
  if(kind==='ending'&&f.index===0)drawRestoredWorld(ctx,f.local,reduced,()=>background('story-dawn-v1',p));
  if(kind==='opening'&&f.index>0&&f.local<.8&&!reduced)background(STORY[kind][f.index-1].art,1,1-ease(f.local/.8));
  const shade=ctx.createLinearGradient(0,0,0,900);shade.addColorStop(0,'#080b16aa');shade.addColorStop(.45,'#0a0c161c');shade.addColorStop(1,'#060912ef');ctx.fillStyle=shade;ctx.fillRect(0,0,1600,900);
  if(!reduced){for(let i=0;i<52;i++){const x=(i*397.31+time*(i%3-1)*8+1600)%1600,y=900-((i*147.7+time*(15+i%9*2))%920);ctx.globalAlpha=.15+.45*Math.pow(Math.sin(time+i),2);ctx.fillStyle=b.accent;ctx.beginPath();ctx.arc(x,y,1.2+i%3,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;}
  // A broad ring and travelling ribbons create a reveal, never rapid flashing.
  if(!reduced&&f.local<1.6){ctx.save();ctx.globalAlpha=.18*(1-f.local/1.6);ctx.strokeStyle=b.accent;ctx.lineWidth=4;ctx.beginPath();ctx.arc(800,445,90+ease(f.local/1.6)*850,0,Math.PI*2);ctx.stroke();ctx.restore();}
  if(kind==='opening')drawOpeningMotion(ctx,f.index,f.local,reduced,art);
  else drawEndingMotion(ctx,f.index,f.local,reduced);
  const entry=ease(f.local/.9),end=clamp((b.duration-f.local)/.5);ctx.save();ctx.globalAlpha=entry*end;ctx.translate(0,reduced?0:30*(1-entry));
  const ending=kind==='ending';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=ending?"700 70px 'HahmletEnding','Batang',serif":"900 68px 'Malgun Gothic',sans-serif";ctx.shadowColor='#000';ctx.shadowBlur=20;ctx.fillStyle='#fff1d8';ctx.fillText(b.title,800,552,1350);ctx.shadowBlur=0;
  if(!ending){ctx.fillStyle=b.accent;ctx.fillRect(748,610,104,3);}
  ctx.font=ending?"500 30px 'HahmletEnding','Batang',serif":"500 26px 'Malgun Gothic',sans-serif";ctx.fillStyle='#eee4d5';ctx.fillText(b.subtitle,800,657,1350);
  ctx.restore();
  if(f.index!==chapter){chapter=f.index;title.textContent=b.title;subtitle.textContent=b.caption;root.querySelector('[data-movie="chapter"]')!.textContent=kind==='ending'?ENDING_CHAPTERS[chapter]:`${chapter+1} / ${STORY[kind].length}`;sound.play(kind==='ending'?(chapter===0?'victory':'dawn'):['dawn','portal','portal','portal','leak','start'][chapter]);}
  if(kind==='opening'&&!paused){for(const [scene,at,effect]of [[3,1.6,'brick'],[3,2.6,'portal'],[4,3,'leak']] as const){const id=scene+effect;if(chapter===scene&&f.local>=at&&!cues.has(id)){cues.add(id);sound.play(effect);}}}
  bar.style.width=String(time/total*100)+'%';root.querySelector('[data-movie="time"]')!.textContent=kind==='ending'?'':`${String(Math.floor(time)).padStart(2,'0')} / ${total}초`;
 }
 function tick(now:number){if(disposed)return;if(last&&!paused&&!document.hidden)time+=Math.min(.1,(now-last)/1000);last=now;draw();if(time>=total){finish();return;}raf=requestAnimationFrame(tick);}
 raf=requestAnimationFrame(tick);
}
