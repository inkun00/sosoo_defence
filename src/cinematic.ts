import {artURL} from './art';
import {STORY,storyDuration,storyFrame,StoryKind} from './story';
import {Sound} from './audio';
import {Save} from './save';
import './cinematic.css';
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
const ease=(n:number)=>1-Math.pow(1-clamp(n),3);
const images=new Map<string,Promise<HTMLImageElement>>();
function image(name:string){let pending=images.get(name);if(!pending){pending=new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>reject(Error('장면 그림을 불러오지 못했어요.'));i.src=artURL(name);});images.set(name,pending);}return pending;}

export async function playCinematic(kind:StoryKind,preferences:Save,onComplete:()=>void){
 const previous=document.activeElement as HTMLElement|null,root=document.createElement('section');
 root.className='cinematic';root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-label',kind==='opening'?'소수의 성 오프닝':'소수의 성 엔딩');
 root.innerHTML=`<div class="cinematic-stage"><canvas aria-label="소수의 성 이야기 모션 그래픽"></canvas><div class="cinematic-top"><span>${kind==='opening'?'프롤로그 · 마지막 불꽃':'에필로그 · 돌아온 아침'}</span><div><button type="button" data-movie="voice" aria-pressed="${preferences.narration}">나레이션 ${preferences.narration?'ON':'OFF'}</button><button type="button" data-movie="pause">일시 정지</button><button type="button" data-movie="skip">${kind==='opening'?'건너뛰기':'엔딩 마치기'} ↗</button></div></div><div class="cinematic-caption" aria-live="polite"><h2></h2><p></p></div><div class="cinematic-footer"><span data-movie="chapter"></span><div class="cinematic-track"><i></i></div><span data-movie="time"></span></div><div class="cinematic-loading" role="status">불꽃의 이야기를 펼치는 중…</div></div>`;
 const app=document.getElementById('app')!,wasInert=app.inert;app.inert=true;
 document.body.append(root);const canvas=root.querySelector('canvas')!,ctx=canvas.getContext('2d')!;canvas.width=1600;canvas.height=900;
 const title=root.querySelector('h2')!,subtitle=root.querySelector('.cinematic-caption p')!,bar=root.querySelector<HTMLElement>('.cinematic-track i')!,loading=root.querySelector<HTMLElement>('.cinematic-loading')!;
 const pauseButton=root.querySelector<HTMLButtonElement>('[data-movie="pause"]')!,voiceButton=root.querySelector<HTMLButtonElement>('[data-movie="voice"]')!,skip=root.querySelector<HTMLButtonElement>('[data-movie="skip"]')!;
 const total=storyDuration(kind),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches,sound=new Sound();sound.sfx=preferences.sfx;sound.setTrack(kind);sound.setPaused(true);sound.setMusic(preferences.music);sound.resume();
 let disposed=false,raf=0,time=0,last=0,chapter=-1,paused=false,voiceOn=preferences.narration,narrationId=0;const cues=new Set<string>();const art=new Map<string,HTMLImageElement>();
 function leave(){sound.dispose();cancelAnimationFrame(raf);if('speechSynthesis'in window)speechSynthesis.cancel();}
 function finish(){if(disposed)return;disposed=true;cancelAnimationFrame(raf);document.removeEventListener('visibilitychange',visibility);window.removeEventListener('pagehide',leave);root.removeEventListener('keydown',keyboard);if('speechSynthesis'in window)speechSynthesis.cancel();sound.dispose();root.remove();app.inert=wasInert;previous?.focus();onComplete();}
 function narrate(){if(!voiceOn||paused||chapter<0||!('speechSynthesis'in window)||!('SpeechSynthesisUtterance'in window))return;const voice=speechSynthesis.getVoices().find(v=>v.lang.startsWith('ko'));if(!voice)return;const line=new SpeechSynthesisUtterance(STORY[kind][chapter].voice);line.lang='ko-KR';line.voice=voice;line.rate=1.08;speechSynthesis.cancel();const id=++narrationId;line.onstart=()=>{if(id===narrationId)sound.setDucking(true);};line.onend=line.onerror=()=>{if(id===narrationId)sound.setDucking(false);};speechSynthesis.speak(line);}
 function setPaused(value:boolean){paused=value;sound.setPaused(value);pauseButton.textContent=paused?'재생':'일시 정지';pauseButton.setAttribute('aria-pressed',String(paused));if('speechSynthesis'in window){if(paused)speechSynthesis.pause();else speechSynthesis.resume();}}
 function visibility(){if(document.hidden)setPaused(true);}
 function keyboard(e:KeyboardEvent){if(e.key==='Escape'){e.preventDefault();e.stopPropagation();finish();}else if(e.code==='Space'&&!(e.target as HTMLElement).closest('button')){e.preventDefault();e.stopPropagation();setPaused(!paused);}else if(e.key==='Tab'){const buttons=[voiceButton,pauseButton,skip],index=buttons.indexOf(document.activeElement as HTMLButtonElement);if(e.shiftKey&&index<=0){e.preventDefault();skip.focus();}else if(!e.shiftKey&&index===2){e.preventDefault();voiceButton.focus();}}}
 root.addEventListener('keydown',keyboard);document.addEventListener('visibilitychange',visibility);skip.onclick=finish;pauseButton.onclick=()=>setPaused(!paused);voiceButton.onclick=()=>{voiceOn=!voiceOn;voiceButton.textContent='나레이션 '+(voiceOn?'ON':'OFF');voiceButton.setAttribute('aria-pressed',String(voiceOn));if(voiceOn)narrate();else {narrationId++;sound.setDucking(false);if('speechSynthesis'in window)speechSynthesis.cancel();}};skip.focus();
 const needed=new Set<string>(STORY[kind].map(b=>b.art));
 if(STORY[kind].some(b=>b.formula==='0.3 + 0.4 = 0.7'))needed.add('props');
 if(STORY[kind].some(b=>b.formula==='0.6 − 0.2 = 0.4')){needed.add('slime');needed.add('turret-parts-v1');}
 try{await Promise.all([...needed].map(async name=>art.set(name,await image(name))));}catch{loading.textContent='그림을 불러오지 못했어요. 건너뛰기로 모험을 시작할 수 있어요.';pauseButton.disabled=true;voiceButton.disabled=true;return;}
 if(disposed)return;loading.hidden=true;sound.setPaused(paused);window.addEventListener('pagehide',leave);
 function background(name:string,progress:number,opacity=1){
  const i=art.get(name)!;const zoom=reduced?1:1.03+progress*.065,scale=Math.max(1600/i.width,900/i.height)*zoom,w=i.width*scale,h=i.height*scale;
  ctx.save();ctx.globalAlpha=opacity;ctx.drawImage(i,(1600-w)/2+(reduced?0:Math.sin(progress*Math.PI)*-18),(900-h)/2,w,h);ctx.restore();
 }
 function draw(){
  const f=storyFrame(kind,time),b=f.beat,p=f.local/b.duration;ctx.fillStyle='#080a10';ctx.fillRect(0,0,1600,900);background(b.art,p);
  if(f.index>0&&f.local<.8&&!reduced)background(STORY[kind][f.index-1].art,1,1-ease(f.local/.8));
  const shade=ctx.createLinearGradient(0,0,0,900);shade.addColorStop(0,'#080b16aa');shade.addColorStop(.45,'#0a0c161c');shade.addColorStop(1,'#060912ef');ctx.fillStyle=shade;ctx.fillRect(0,0,1600,900);
  if(!reduced){for(let i=0;i<52;i++){const x=(i*397.31+time*(i%3-1)*8+1600)%1600,y=900-((i*147.7+time*(15+i%9*2))%920);ctx.globalAlpha=.15+.45*Math.pow(Math.sin(time+i),2);ctx.fillStyle=b.accent;ctx.beginPath();ctx.arc(x,y,1.2+i%3,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;}
  // A broad ring and travelling ribbons create a reveal, never rapid flashing.
  if(!reduced&&f.local<1.6){ctx.save();ctx.globalAlpha=.18*(1-f.local/1.6);ctx.strokeStyle=b.accent;ctx.lineWidth=4;ctx.beginPath();ctx.arc(800,445,90+ease(f.local/1.6)*850,0,Math.PI*2);ctx.stroke();ctx.restore();}
  // Learning has visible consequences: seven tenths join into a wall, and
  // a two-tenths projectile removes one of three matching health segments.
  if(b.formula==='0.3 + 0.4 = 0.7'){
   const props=art.get('props')!,cw=props.width/3,ch=props.height/3,join=reduced?1:ease((f.local-1.2)/2.2);
   ctx.save();ctx.globalAlpha=ease(f.local/.9)*clamp((b.duration-f.local)/.5);
   for(let i=0;i<7;i++){const origin=i<3?470+i*92:790+(i-3)*92,destination=500+i*100,x=origin+(destination-origin)*join,y=319+(1-join)*Math.sin(i*1.2)*35;ctx.drawImage(props,cw,0,cw,ch,x-45,y-45,90,90);ctx.fillStyle=b.accent;ctx.font="700 24px 'Malgun Gothic',sans-serif";ctx.textAlign='center';ctx.fillText('0.1',x,y+65);}
   ctx.strokeStyle=b.accent;ctx.globalAlpha*=.3;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(438,412);ctx.lineTo(1162,412);ctx.stroke();ctx.restore();
  }
  if(kind==='opening'&&f.index===3){
   const turret=art.get('turret-parts-v1')!,slime=art.get('slime')!,travel=clamp((f.local-1.3)/1),hit=travel===1,frame=reduced?0:Math.floor(f.local*5)%4;
   ctx.save();ctx.globalAlpha=ease(f.local/.9)*clamp((b.duration-f.local)/.5);
   ctx.save();ctx.translate(430,311);ctx.rotate(Math.PI/2);ctx.drawImage(turret,turret.width/3,0,turret.width/3,turret.height/2,-80,-80,160,160);ctx.restore();ctx.drawImage(slime,frame*slime.width/4,0,slime.width/4,slime.height/4,1025,230,160,160);
   ctx.font="700 28px 'Malgun Gothic',sans-serif";ctx.textAlign='center';ctx.fillStyle='#ffe4a1';ctx.fillText('공격 0.2',430,411);ctx.fillStyle=b.accent;ctx.fillText('체력 '+(hit?'0.4':'0.6'),1105,208);
   for(let i=0;i<3;i++){ctx.fillStyle=hit&&i===2?'#171f30':'#aee7ff';ctx.fillRect(1033+i*48,422,42,7);}
   if(travel>0&&travel<1){const x=500+travel*540,y=322-Math.sin(travel*Math.PI)*55;ctx.strokeStyle='#ffd49388';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x-38,y+5);ctx.lineTo(x,y);ctx.stroke();ctx.fillStyle='#ffe8b6';ctx.shadowColor='#ffc45d';ctx.shadowBlur=20;ctx.beginPath();ctx.arc(x,y,11,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;}
   if(hit&&f.local<3.3&&!reduced){ctx.globalAlpha*=1-(f.local-2.3);ctx.strokeStyle='#ffe5af';ctx.lineWidth=4;ctx.beginPath();ctx.arc(1105,315,20+(f.local-2.3)*100,0,Math.PI*2);ctx.stroke();}
   ctx.restore();
  }
  const entry=ease(f.local/.9),end=clamp((b.duration-f.local)/.5);ctx.save();ctx.globalAlpha=entry*end;ctx.translate(0,reduced?0:30*(1-entry));
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.font="900 68px 'Malgun Gothic',sans-serif";ctx.shadowColor='#000';ctx.shadowBlur=20;ctx.fillStyle='#fff1d8';ctx.fillText(b.title,800,b.formula?494:552);ctx.shadowBlur=0;
  ctx.fillStyle=b.accent;ctx.fillRect(748,b.formula?548:610,104,3);
  ctx.font="500 26px 'Malgun Gothic',sans-serif";ctx.fillStyle='#eee4d5';ctx.fillText(b.subtitle,800,b.formula?594:657);
  if(b.formula){const tokens=b.formula.split(' '),spacing=b.formula.includes('0.3')||b.formula.includes('0.6')?155:180;ctx.font="800 74px 'Malgun Gothic',sans-serif";tokens.forEach((token,i)=>{const a=reduced?1:ease((f.local-.65-i*.2)/.7);ctx.save();ctx.globalAlpha*=a;ctx.translate(800+(i-(tokens.length-1)/2)*spacing,707+(1-a)*28);ctx.scale(.86+.14*a,.86+.14*a);ctx.shadowColor=b.accent;ctx.shadowBlur=18;ctx.fillStyle=token==='+'||token==='−'||token==='='?'#eee1cc':b.accent;ctx.fillText(token,0,0);ctx.restore();});}
  ctx.restore();
  if(f.index!==chapter){chapter=f.index;title.textContent=b.title;subtitle.textContent=b.voice;root.querySelector('[data-movie="chapter"]')!.textContent=`${chapter+1} / ${STORY[kind].length}`;narrate();sound.play(kind==='ending'?(chapter===0?'victory':'dawn'):['dawn','portal','','','start'][chapter]);}
  if(kind==='opening'&&!paused){for(const [scene,at,effect]of [[2,3.3,'wall'],[3,1,'shot'],[3,2.3,'hit']] as const){const id=scene+effect;if(chapter===scene&&f.local>=at&&!cues.has(id)){cues.add(id);sound.play(effect);}}}
  bar.style.width=String(time/total*100)+'%';root.querySelector('[data-movie="time"]')!.textContent=`${String(Math.floor(time)).padStart(2,'0')} / ${total}초`;
 }
 function tick(now:number){if(disposed)return;if(last&&!paused&&!document.hidden)time+=Math.min(.1,(now-last)/1000);last=now;draw();if(time>=total){finish();return;}raf=requestAnimationFrame(tick);}
 raf=requestAnimationFrame(tick);
}
