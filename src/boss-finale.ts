import {artURL} from './art';
import {Sound} from './audio';
import './boss-finale.css';

export const BOSS_FINALE_DURATION=5.8;
export interface BossFinaleOrigin{x:number;y:number;}
export interface BossFinalePreferences{sfx:boolean;music:boolean;}
const clamp=(value:number)=>Math.max(0,Math.min(1,Number.isFinite(value)?value:0));
const ease=(value:number)=>1-Math.pow(1-clamp(value),3);
const fade=(time:number,start:number,end:number)=>clamp((time-start)/(end-start));
const lerp=(a:number,b:number,t:number)=>a+(b-a)*t;

/** Time is measured in visible, unpaused seconds, independent of the game clock. */
export function bossFinaleFrame(seconds:number){
 const time=Math.max(0,Math.min(BOSS_FINALE_DURATION,Number.isFinite(seconds)?seconds:0));
 return {time,phase:time<1.25?'charge':time<2.3?'shatter':time<3.35?'release':'victory',
  travel:ease(time/.8),collapse:fade(time,1.25,2.3),release:fade(time,2.25,3.4),
  title:ease(fade(time,3.2,3.8)),out:1-fade(time,5.35,BOSS_FINALE_DURATION)} as const;
}

const shards=Array.from({length:35},(_,i)=>({
 angle:i*2.399963,velocity:145+(i*73%250),spin:(i%2?1:-1)*(1.1+i%5*.33),
 size:8+i*17%20,color:['#d4a3ff','#8f58c8','#e6ccff','#ffd989'][i%4]
}));
const motes=Array.from({length:94},(_,i)=>({angle:i*2.399963,radius:110+i*41%570,speed:30+i*19%100,size:1.5+i%4}));

function circle(ctx:CanvasRenderingContext2D,x:number,y:number,radius:number){ctx.beginPath();ctx.arc(x,y,Math.max(.01,radius),0,Math.PI*2);}
function glow(ctx:CanvasRenderingContext2D,x:number,y:number,radius:number,inner:string,outer='#00000000'){
 const gradient=ctx.createRadialGradient(x,y,0,x,y,radius);gradient.addColorStop(0,inner);gradient.addColorStop(1,outer);ctx.fillStyle=gradient;circle(ctx,x,y,radius);ctx.fill();
}
function cover(ctx:CanvasRenderingContext2D,image:HTMLImageElement,width:number,height:number){
 const scale=Math.max(width/image.width,height/image.height);ctx.drawImage(image,(width-image.width*scale)/2,(height-image.height*scale)/2,image.width*scale,image.height*scale);
}
function wizard(ctx:CanvasRenderingContext2D,image:HTMLImageElement|undefined,x:number,y:number,size:number,frame:number,alpha=1){
 ctx.save();ctx.globalAlpha=alpha;
 if(image){const cw=image.width/4,ch=image.height/4;ctx.drawImage(image,(frame%4)*cw,Math.floor(frame/4)*ch,cw,ch,x-size/2,y-size/2,size,size);}
 else{ctx.fillStyle='#251a3c';ctx.strokeStyle='#c797ff';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x,y-size*.45);ctx.lineTo(x+size*.35,y+size*.42);ctx.lineTo(x-size*.35,y+size*.42);ctx.closePath();ctx.fill();ctx.stroke();glow(ctx,x,y-size*.1,size*.18,'#c993ff');}
 ctx.restore();
}

/** Reuses the live wizard atlas; fragments are pieces of the sprite itself. */
export function drawBossFinale(ctx:CanvasRenderingContext2D,width:number,height:number,seconds:number,origin:BossFinaleOrigin,reduced:boolean,art:ReadonlyMap<string,HTMLImageElement>){
 const f=bossFinaleFrame(seconds),t=f.time,cx=width*.5,cy=height*.43;
 const start={x:clamp(origin.x)*width,y:clamp(origin.y)*height},travel=reduced?1:f.travel;
 const x=lerp(start.x,cx,travel),y=lerp(start.y,cy,travel),size=lerp(Math.min(width*.2,height*.29),Math.min(width*.29,height*.49),travel);
 const unit=width/1600,wizardImage=art.get('monster-wizard-v1'),background=art.get('story-dawn-v1');
 ctx.clearRect(0,0,width,height);ctx.save();ctx.globalAlpha=f.out;
 ctx.fillStyle=`rgba(5,6,15,${lerp(.06,.87,ease(t/1.05))})`;ctx.fillRect(0,0,width,height);
 if(background){ctx.save();ctx.globalAlpha=fade(t,2.25,3.35)*.68;cover(ctx,background,width,height);ctx.restore();}
 const curtain=ctx.createLinearGradient(0,0,0,height);curtain.addColorStop(0,'#05051050');curtain.addColorStop(.48,'#10061a35');curtain.addColorStop(1,'#030309d9');ctx.fillStyle=curtain;ctx.fillRect(0,0,width,height);
 // A single restrained impact jolt, never repeated full-screen flashing.
 const impact=Math.max(0,t-1.25),jolt=reduced?0:Math.sin(impact*34)*Math.exp(-impact*6)*12*unit*(t>=1.25?1:0);
 ctx.save();ctx.translate(jolt,-jolt*.48);
 glow(ctx,x,y,size*1.4,t<2.3?'#7135ac55':'#c88c3255');
 if(t<2.3){
  const pull=fade(t,0,1.25);
  ctx.save();ctx.translate(x,y+size*.33);ctx.scale(1,.32);ctx.strokeStyle='#c393ff';ctx.lineWidth=3*unit;ctx.globalAlpha=.25+.5*pull;
  for(let ring=0;ring<3;ring++){circle(ctx,0,0,size*(.59+ring*.12));ctx.stroke();}ctx.restore();
  if(!reduced){
   for(let i=0;i<12;i++){const a=i*Math.PI/6+t*.42,r=size*(1.1-.46*pull);ctx.save();ctx.translate(x+Math.cos(a)*r,y+Math.sin(a)*r*.72);ctx.rotate(a+t*.7);ctx.fillStyle='#d6b5ff';ctx.globalAlpha=.45*pull;ctx.fillRect(-5*unit,-5*unit,10*unit,10*unit);ctx.restore();}
   for(let i=0;i<45;i++){const a=i*2.399963+t*.28,r=size*(.2+((i*.137-t*.44+4)%1)*1.6);ctx.globalAlpha=.65*pull;ctx.fillStyle=i%3?'#bf8cff':'#fff4d5';circle(ctx,x+Math.cos(a)*r,y+Math.sin(a)*r*.72,1.4*unit+i%3*unit);ctx.fill();}ctx.globalAlpha=1;
  }
 }
 if(t<1.4){
  const quiver=reduced?0:Math.sin(t*29)*fade(t,.7,1.25)*5*unit;
  ctx.shadowBlur=24*unit;ctx.shadowColor='#bd74ff';wizard(ctx,wizardImage,x+quiver,y,size,reduced?4:4+Math.min(3,Math.floor(t*6)%4));ctx.shadowBlur=0;
  glow(ctx,x,y-size*.1,size*.37,`rgba(227,185,255,${.12+fade(t,.85,1.3)*.65})`);
 }
 if(t>=1.25&&t<2.8){
  const burst=t-1.25;
  if(reduced)wizard(ctx,wizardImage,cx,cy,size,12+Math.min(3,Math.floor(burst*4)),1-fade(t,1.25,2.3));
  else{
   if(wizardImage){
    const cell=wizardImage.width/4,ch=wizardImage.height/4;
    for(let i=0;i<25;i++){const column=i%5,row=Math.floor(i/5),a=i*2.399963,v=(90+i*29%160)*unit;
     ctx.save();ctx.globalAlpha=1-fade(t,1.55,2.7);ctx.translate(cx+(column-2)*size/5+Math.cos(a)*v*burst,cy+(row-2)*size/5+Math.sin(a)*v*burst+80*unit*burst*burst);ctx.rotate((i%2?1:-1)*burst*1.9);
     ctx.drawImage(wizardImage,column*cell/5,3*ch+row*ch/5,cell/5,ch/5,-size/10,-size/10,size/5,size/5);ctx.restore();
    }
   }
   for(const p of shards){const r=p.velocity*burst*unit;ctx.save();ctx.globalAlpha=(1-fade(t,1.6,2.8))*.95;ctx.translate(cx+Math.cos(p.angle)*r,cy+Math.sin(p.angle)*r*.65+80*unit*burst*burst);ctx.rotate(p.spin*burst);ctx.fillStyle=p.color;ctx.beginPath();ctx.moveTo(-p.size*unit*.6,p.size*unit*.45);ctx.lineTo(0,-p.size*unit*.7);ctx.lineTo(p.size*unit*.5,p.size*unit*.4);ctx.closePath();ctx.fill();ctx.restore();}
   for(let ring=0;ring<3;ring++){const age=burst-ring*.15;if(age<0)continue;ctx.save();ctx.globalAlpha=(1-clamp(age/1.25))*.72;ctx.strokeStyle=ring===0?'#f4d7ff':'#bd86ff';ctx.lineWidth=(9-ring*2)*unit;circle(ctx,cx,cy,28*unit+ease(age/1.25)*width*(.58+ring*.03));ctx.stroke();ctx.restore();}
  }
  glow(ctx,cx,cy,size*(.8+burst*.45),`rgba(236,195,255,${.47*Math.exp(-burst*4)})`);
 }
 if(t>=2.25){
  const release=f.release,gold=fade(t,2.25,3.35),beamWidth=(reduced?size*.3:lerp(10*unit,size*.45,ease(release)));
  ctx.save();ctx.globalAlpha=gold*(1-fade(t,4.4,5.8));
  const beam=ctx.createLinearGradient(cx-beamWidth,0,cx+beamWidth,0);beam.addColorStop(0,'#ffcf6500');beam.addColorStop(.42,'#ffe7a366');beam.addColorStop(.5,'#fff8dcb0');beam.addColorStop(.58,'#ffe7a366');beam.addColorStop(1,'#ffcf6500');ctx.fillStyle=beam;ctx.fillRect(cx-beamWidth,0,beamWidth*2,height);
  glow(ctx,cx,cy,size*1.7,'#ecc15a66');ctx.restore();
  if(!reduced){
   for(const p of motes){const age=t-2.25,a=p.angle-age*.1,r=p.radius*unit*(1+.09*age);ctx.save();ctx.globalAlpha=gold*(.25+.55*(p.size/5));ctx.fillStyle=p.size>3?'#fff3c0':'#e7bd65';ctx.shadowColor='#ffd575';ctx.shadowBlur=8*unit;const px=cx+Math.cos(a)*r,py=cy+Math.sin(a)*r*.62-age*p.speed*unit;circle(ctx,px,py,p.size*unit);ctx.fill();ctx.restore();}
   ctx.save();ctx.globalAlpha=gold*.25;ctx.translate(cx,cy);ctx.rotate((t-2.25)*.08);for(let i=0;i<16;i++){ctx.rotate(Math.PI/8);const ray=ctx.createLinearGradient(0,0,width*.7,0);ray.addColorStop(0,'#ffe6a578');ray.addColorStop(1,'#ffe6a500');ctx.fillStyle=ray;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(width*.7,-width*.035);ctx.lineTo(width*.7,width*.035);ctx.closePath();ctx.fill();}ctx.restore();
  }
 }
 ctx.restore();
 if(f.title>0){
  ctx.save();ctx.globalAlpha=f.title;const textY=height*.55,shift=reduced?0:25*unit*(1-f.title);ctx.translate(0,shift);ctx.textAlign='center';ctx.textBaseline='middle';ctx.shadowColor='#040309';ctx.shadowBlur=24*unit;ctx.font=`700 ${Math.min(79*unit,height*.095)}px 'HahmletEnding','Batang',serif`;ctx.fillStyle='#ffedb6';ctx.fillText('마법사를 물리쳤다',cx,textY,width*.88);ctx.shadowBlur=0;
  const lineY=textY+54*unit;ctx.strokeStyle='#d6b05f';ctx.lineWidth=1.4*unit;ctx.beginPath();ctx.moveTo(cx-width*.19,lineY);ctx.lineTo(cx-17*unit,lineY);ctx.moveTo(cx+17*unit,lineY);ctx.lineTo(cx+width*.19,lineY);ctx.stroke();ctx.save();ctx.translate(cx,lineY);ctx.rotate(Math.PI/4);ctx.fillStyle='#ffdf88';ctx.fillRect(-5*unit,-5*unit,10*unit,10*unit);ctx.restore();
  ctx.font=`500 ${Math.min(28*unit,height*.038)}px 'HahmletEnding','Batang',serif`;ctx.fillStyle='#ebdec3';ctx.fillText('어둠의 지배가 끝났다',cx,textY+105*unit,width*.8);ctx.restore();
 }
 ctx.restore();
}

const imageCache=new Map<string,Promise<HTMLImageElement|undefined>>();
function loadImage(name:string){
 let task=imageCache.get(name);if(task)return task;
 task=new Promise<HTMLImageElement|undefined>(resolve=>{
  const picture=new Image();let done=false;const timer=window.setTimeout(()=>finish(undefined),1400);
  function finish(value:HTMLImageElement|undefined){if(done)return;done=true;clearTimeout(timer);picture.onload=null;picture.onerror=null;if(!value)imageCache.delete(name);resolve(value);}
  picture.onload=()=>finish(picture);picture.onerror=()=>finish(undefined);picture.src=artURL(name);
 });imageCache.set(name,task);return task;
}

/** Origin is a viewport-normalized point, not Phaser's world coordinate. Resolves after cleanup. */
export async function playBossFinale(preferences:BossFinalePreferences,origin:BossFinaleOrigin,onComplete:()=>void):Promise<void>{
 const previous=document.activeElement as HTMLElement|null,app=document.getElementById('app'),wasInert=app?.inert??false;
 const root=document.createElement('section');root.className='boss-finale';root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-label','저주 마법사 격파 연출');
 root.innerHTML='<canvas aria-hidden="true"></canvas><div class="boss-finale-controls"><button type="button" data-finale="pause" aria-pressed="false">일시 정지</button><button type="button" data-finale="skip">연출 건너뛰기 ↗</button></div><p class="boss-finale-status" role="status" aria-live="polite">저주 마법사의 어둠이 무너지기 시작합니다.</p><div class="boss-finale-fallback" hidden><strong>마법사를 물리쳤다</strong><span>어둠의 지배가 끝났다</span></div>';
 if(app)app.inert=true;document.body.append(root);
 const canvas=root.querySelector('canvas')!,ctx=canvas.getContext('2d'),pause=root.querySelector<HTMLButtonElement>('[data-finale="pause"]')!,skip=root.querySelector<HTMLButtonElement>('[data-finale="skip"]')!,status=root.querySelector<HTMLElement>('.boss-finale-status')!;
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches,sound=new Sound();sound.sfx=preferences.sfx;sound.setPaused(true);sound.setTrack('victory');sound.setMusic(preferences.music);sound.resume();
 let disposed=false,raf=0,time=0,last=0,paused=false,victory=false;const cues=new Set<string>(),art=new Map<string,HTMLImageElement>();
 let resolveDone!:()=>void;const done=new Promise<void>(resolve=>{resolveDone=resolve;});
 function finish(notify=true){
  if(disposed)return;disposed=true;cancelAnimationFrame(raf);document.removeEventListener('visibilitychange',visibility);window.removeEventListener('pagehide',pagehide);window.removeEventListener('resize',resize);root.removeEventListener('keydown',keyboard);sound.dispose();root.remove();if(app)app.inert=wasInert;if(previous?.isConnected)previous.focus();
  try{if(notify)onComplete();}finally{resolveDone();}
 }
 function resize(){canvas.width=1600;canvas.height=Math.max(300,Math.min(3200,Math.round(1600*window.innerHeight/Math.max(1,window.innerWidth))));if(ctx)drawBossFinale(ctx,canvas.width,canvas.height,time,origin,reduced,art);}
 function setPaused(value:boolean){paused=value;last=0;sound.setPaused(paused||!victory||document.hidden);pause.textContent=paused?'재생':'일시 정지';pause.setAttribute('aria-pressed',String(paused));}
 function visibility(){last=0;sound.setPaused(paused||!victory||document.hidden);if(!document.hidden)sound.resume();}
 function pagehide(){finish(false);}
 function keyboard(event:KeyboardEvent){
  if(event.key==='Escape'){event.preventDefault();event.stopPropagation();finish();}
  else if(event.code==='Space'&&!(event.target as HTMLElement).closest('button')){event.preventDefault();event.stopPropagation();setPaused(!paused);}
  else if(event.key==='Tab'){const buttons=[pause,skip],index=buttons.indexOf(document.activeElement as HTMLButtonElement);if(event.shiftKey&&index<=0){event.preventDefault();event.stopPropagation();skip.focus();}else if(!event.shiftKey&&index===1){event.preventDefault();event.stopPropagation();pause.focus();}}
  else event.stopPropagation();
 }
 root.addEventListener('keydown',keyboard);document.addEventListener('visibilitychange',visibility);window.addEventListener('pagehide',pagehide);window.addEventListener('resize',resize);skip.onclick=()=>finish();pause.onclick=()=>setPaused(!paused);skip.focus();resize();
 if(!ctx)root.querySelector<HTMLElement>('.boss-finale-fallback')!.hidden=false;
 // These glyphs are already in the ending's small local font subset.
 void document.fonts.load("700 70px 'HahmletEnding'",'마법사를 물리쳤다 어둠의 지배가 끝났다').catch(()=>{});
 await Promise.all(['monster-wizard-v1','story-dawn-v1'].map(async name=>{const picture=await loadImage(name);if(picture)art.set(name,picture);}));
 if(disposed)return done;
 function cue(name:string,at:number){if(time<at||cues.has(name)||paused||document.hidden)return;cues.add(name);sound.play(name);}
 function tick(now:number){
  if(disposed)return;if(last&&!paused&&!document.hidden)time+=Math.min(.1,(now-last)/1000);last=now;
  cue('boss-charge',0);cue('boss-shatter',1.25);cue('boss-release',2.25);cue('victory',3.35);
  if(!victory&&time>=3.35){victory=true;sound.setPaused(paused||document.hidden);status.textContent='저주 마법사 격파. 어둠의 지배가 끝났습니다.';}
  if(ctx)drawBossFinale(ctx,canvas.width,canvas.height,time,origin,reduced,art);
  if(time>=BOSS_FINALE_DURATION){finish();return;}raf=requestAnimationFrame(tick);
 }
 raf=requestAnimationFrame(tick);return done;
}
