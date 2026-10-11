import {artURL} from './art';
import {Sound} from './audio';
import {bossIntroFrame,BossIntroClock,BOSS_INTRO_DURATION,BOSS_INTRO_MECHANICS} from './boss-intro-story';
import './boss-intro.css';

export interface BossIntroPreferences{sfx:boolean;music:boolean;}
export interface BossIntroPresentation{readonly done:Promise<void>;cancel():void;}
const clamp=(value:number)=>Math.max(0,Math.min(1,value));
const ease=(value:number)=>1-Math.pow(1-clamp(value),3);
function circle(ctx:CanvasRenderingContext2D,x:number,y:number,radius:number){ctx.beginPath();ctx.arc(x,y,Math.max(.01,radius),0,Math.PI*2);}
function glow(ctx:CanvasRenderingContext2D,x:number,y:number,radius:number,color:string){
 const gradient=ctx.createRadialGradient(x,y,0,x,y,radius);gradient.addColorStop(0,color);gradient.addColorStop(1,'#00000000');ctx.fillStyle=gradient;circle(ctx,x,y,radius);ctx.fill();
}
function loadImage(name:string,signal:AbortSignal):Promise<HTMLImageElement|undefined>{
 return new Promise(resolve=>{
  const picture=new Image();let settled=false;
  const timer=window.setTimeout(()=>finish(undefined),1600),abort=()=>finish(undefined);
  function finish(value:HTMLImageElement|undefined){if(settled)return;settled=true;clearTimeout(timer);picture.onload=null;picture.onerror=null;signal.removeEventListener('abort',abort);if(!value)picture.removeAttribute('src');resolve(value);}
  signal.addEventListener('abort',abort,{once:true});picture.onload=()=>finish(picture);picture.onerror=()=>finish(undefined);
  if(signal.aborted){finish(undefined);return;}
  try{picture.src=artURL(name);}catch{finish(undefined);}
 });
}

/** Only the existing sorcerer illustration and 4×4 wizard atlas are used. */
export function drawBossIntro(ctx:CanvasRenderingContext2D,width:number,height:number,seconds:number,reduced:boolean,art:ReadonlyMap<string,HTMLImageElement>){
 const frame=bossIntroFrame(seconds,reduced),time=frame.time,unit=width/1600,portrait=height>width,cx=width*.5,cy=height*(portrait?.34:.4);
 const size=Math.min(width*(portrait?.64:.36),height*.54),entry=reduced?1:ease(time/.9),breath=reduced?0:Math.sin(time*1.45)*size*.009;
 const background=art.get('story-sorcerer-v2'),wizard=art.get('monster-wizard-v1');
 ctx.clearRect(0,0,width,height);ctx.fillStyle='#090613';ctx.fillRect(0,0,width,height);
 if(background){
  const zoom=reduced?1:1.04+frame.progress*.08,scale=Math.max(width/background.width,height/background.height)*zoom,bw=background.width*scale,bh=background.height*scale;
  ctx.save();ctx.globalAlpha=.52;ctx.drawImage(background,(width-bw)/2+(reduced?0:Math.sin(time*.15)*width*.018),(height-bh)/2,bw,bh);ctx.restore();
 }
 const shade=ctx.createLinearGradient(0,0,0,height);shade.addColorStop(0,'#07050c77');shade.addColorStop(.38,'#14072140');shade.addColorStop(1,'#05030df5');ctx.fillStyle=shade;ctx.fillRect(0,0,width,height);
 glow(ctx,cx,cy,size*1.1,frame.speaking?'#a865da65':'#753f9b45');
 // The circle turns slowly; speaking brightens the local aura without flashing the screen.
 ctx.save();ctx.translate(cx,cy+size*.34);ctx.scale(1,.3);ctx.rotate(reduced?0:time*.13);ctx.globalAlpha=.55*entry;ctx.strokeStyle='#d3a0ff';ctx.lineWidth=Math.max(1,2.5*unit);
 for(let ring=0;ring<3;ring++){circle(ctx,0,0,size*(.58+ring*.09));ctx.stroke();}
 for(let i=0;i<12;i++){
  const angle=i*Math.PI/6,r=size*.66,x=Math.cos(angle)*r,y=Math.sin(angle)*r;
  ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.beginPath();ctx.moveTo(-size*.025,0);ctx.lineTo(0,-size*.045);ctx.lineTo(size*.025,0);ctx.closePath();ctx.stroke();ctx.restore();
 }ctx.restore();
 if(!reduced){
  for(let i=0;i<30;i++){
   const a=i*2.399963+time*.08,r=size*(.32+i%7*.115),rise=(time*(14+i%4*3)*unit)%Math.max(1,size*.32);
   ctx.save();ctx.globalAlpha=(.15+.35*Math.pow(Math.sin(time*.6+i),2))*entry;ctx.fillStyle=i%3?'#c48eff':'#ffdf9c';circle(ctx,cx+Math.cos(a)*r,cy+Math.sin(a)*r*.65-rise,Math.max(1,unit*(1+i%3)));ctx.fill();ctx.restore();
  }
 }
 const y=cy+breath+(reduced?0:(1-entry)*size*.09),spriteSize=size*(reduced?1:.95+.05*entry);
 ctx.save();ctx.globalAlpha=entry;ctx.shadowColor='#b576ef';ctx.shadowBlur=Math.max(8,size*(frame.speaking?.12:.065));
 if(wizard){
  const column=reduced?0:Math.floor(time*(frame.speaking?5:3))%4,row=frame.speaking?1:0,cw=wizard.width/4,ch=wizard.height/4;
  ctx.drawImage(wizard,column*cw,row*ch,cw,ch,cx-spriteSize/2,y-spriteSize/2,spriteSize,spriteSize);
 }else{
  ctx.fillStyle='#21122f';ctx.strokeStyle='#c08afa';ctx.lineWidth=Math.max(2,3*unit);ctx.beginPath();ctx.moveTo(cx,y-size*.46);ctx.lineTo(cx+size*.25,y-size*.17);ctx.lineTo(cx+size*.36,y+size*.45);ctx.lineTo(cx-size*.36,y+size*.45);ctx.lineTo(cx-size*.25,y-size*.17);ctx.closePath();ctx.fill();ctx.stroke();
  glow(ctx,cx-size*.065,y-size*.12,size*.055,'#efd4ff');glow(ctx,cx+size*.065,y-size*.12,size*.055,'#efd4ff');
 }ctx.restore();
 if(frame.index===1){
  ctx.save();ctx.globalAlpha=reduced?.2:.12+.1*Math.pow(Math.sin(time*.8),2);ctx.strokeStyle='#e7bdff';ctx.lineWidth=Math.max(1,2*unit);circle(ctx,cx,cy,size*.8);ctx.stroke();ctx.restore();
 }
 if(!portrait){ctx.fillStyle='#030208a6';ctx.fillRect(0,0,width,22*unit);}
}

/** Returns a synchronous cancel handle so stage switches never inherit an old overlay. */
export function playBossIntro(preferences:BossIntroPreferences,onComplete:()=>void):BossIntroPresentation{
 const previous=document.activeElement as HTMLElement|null,app=document.getElementById('app'),wasInert=app?.inert??false,loads=new AbortController();
 const root=document.createElement('section');root.className='boss-intro';root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-label','11스테이지 · 저주 마법사와의 대면');
 root.innerHTML='<canvas aria-hidden="true"></canvas><header class="boss-intro-top"><p class="boss-intro-heading">마지막 관문 · 저주의 성</p><div class="boss-intro-controls"><button type="button" data-boss-intro="pause" aria-pressed="false">일시 정지</button><button type="button" data-boss-intro="skip">건너뛰기 ↗</button></div></header><div class="boss-intro-fallback" hidden aria-hidden="true"><div class="boss-intro-sigil">✦</div><strong>저주 마법사</strong></div><div class="boss-intro-caption"><h2 class="boss-intro-speaker">저주 마법사</h2><p class="boss-intro-dialogue" aria-hidden="true"></p><p class="boss-intro-mechanics" aria-label="마법사의 저주 효과"></p><div class="boss-intro-progress" aria-hidden="true"><span data-boss-intro="chapter">1 / 3</span><div class="boss-intro-track"><i></i></div><span>대면 후 타워 준비</span></div></div><p class="boss-intro-announcement" role="status" aria-live="polite"></p>';
 const canvas=root.querySelector('canvas')!,pause=root.querySelector<HTMLButtonElement>('[data-boss-intro="pause"]')!,skip=root.querySelector<HTMLButtonElement>('[data-boss-intro="skip"]')!,dialogue=root.querySelector<HTMLElement>('.boss-intro-dialogue')!,announcement=root.querySelector<HTMLElement>('.boss-intro-announcement')!,bar=root.querySelector<HTMLElement>('.boss-intro-track i')!,fallback=root.querySelector<HTMLElement>('.boss-intro-fallback')!,mechanics=root.querySelector<HTMLElement>('.boss-intro-mechanics')!;
 mechanics.replaceChildren(...BOSS_INTRO_MECHANICS.map(text=>{const item=document.createElement('span');item.textContent=text;return item;}));
 if(app)app.inert=true;document.body.append(root);
 let ctx:CanvasRenderingContext2D|null=null;try{ctx=canvas.getContext('2d');}catch{/* Text and CSS keep the encounter usable without a renderer. */}
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches,sound=new Sound(),clock=new BossIntroClock(),art=new Map<string,HTMLImageElement>();
 sound.sfx=preferences.sfx;sound.setTrack('boss');sound.setPaused(true);sound.setMusic(preferences.music);sound.resume();
 let disposed=false,raf=0,paused=false,loaded=false,chapter=-1;root.dataset.reduced=String(reduced);root.dataset.paused='false';root.dataset.elapsed='0';root.dataset.artStatus='loading';
 let resolveDone!:()=>void;const done=new Promise<void>(resolve=>{resolveDone=resolve;});
 function finish(notify=true){
  if(disposed)return;disposed=true;cancelAnimationFrame(raf);loads.abort();document.removeEventListener('visibilitychange',visibility);window.removeEventListener('pagehide',pagehide);window.removeEventListener('resize',resize);root.removeEventListener('keydown',keyboard);sound.dispose();root.remove();if(app)app.inert=wasInert;
  if(notify&&previous?.isConnected&&previous!==document.body&&previous!==document.documentElement)previous.focus({preventScroll:true});
  try{if(notify)onComplete();}finally{resolveDone();}
 }
 function render(){
  const frame=bossIntroFrame(clock.elapsed,reduced);root.dataset.elapsed=clock.elapsed.toFixed(3);bar.style.width=String(frame.progress*100)+'%';
  if(dialogue.textContent!==frame.dialogue)dialogue.textContent=frame.dialogue;
  if(frame.index!==chapter){chapter=frame.index;announcement.textContent=`저주 마법사: ${frame.beat.line}`;root.querySelector('[data-boss-intro="chapter"]')!.textContent=`${chapter+1} / 3 · ${frame.beat.title}`;if(loaded&&!paused&&!document.hidden)sound.play(chapter===2?'start':'portal');}
  if(ctx){try{drawBossIntro(ctx,canvas.width,canvas.height,clock.elapsed,reduced,art);}catch{ctx=null;root.dataset.artStatus='fallback';}}
  fallback.hidden=!!ctx;
 }
 function resize(){const width=Math.max(600,Math.min(1600,Math.round(window.innerWidth*Math.min(2,window.devicePixelRatio||1))));canvas.width=width;canvas.height=Math.max(300,Math.round(width*window.innerHeight/Math.max(1,window.innerWidth)));render();}
 function setPaused(value:boolean){paused=value;clock.resetBaseline();root.dataset.paused=String(paused);pause.textContent=paused?'재생':'일시 정지';pause.setAttribute('aria-pressed',String(paused));sound.setPaused(paused||!loaded||document.hidden);}
 function visibility(){clock.resetBaseline();sound.setPaused(paused||!loaded||document.hidden);if(!document.hidden)sound.resume();}
 function pagehide(){finish(false);}
 function keyboard(event:KeyboardEvent){
  if(event.key==='Escape'){event.preventDefault();event.stopPropagation();finish();}
  else if(event.code==='Space'&&!(event.target as HTMLElement).closest('button')){event.preventDefault();event.stopPropagation();setPaused(!paused);}
  else if(event.key==='Tab'){const buttons=[pause,skip],index=buttons.indexOf(document.activeElement as HTMLButtonElement);if(event.shiftKey&&index<=0){event.preventDefault();event.stopPropagation();skip.focus();}else if(!event.shiftKey&&index===1){event.preventDefault();event.stopPropagation();pause.focus();}}
  else event.stopPropagation();
 }
 root.addEventListener('keydown',keyboard);document.addEventListener('visibilitychange',visibility);window.addEventListener('pagehide',pagehide);window.addEventListener('resize',resize);skip.onclick=()=>finish();pause.onclick=()=>setPaused(!paused);
 // Phaser receives window pointer events even when the original game subtree is inert.
 for(const name of ['pointerdown','mousedown','touchstart'])root.addEventListener(name,event=>event.stopPropagation());
 skip.focus({preventScroll:true});resize();
 void Promise.all(['story-sorcerer-v2','monster-wizard-v1'].map(async name=>{const picture=await loadImage(name,loads.signal);if(picture)art.set(name,picture);})).then(()=>{
  if(disposed)return;loaded=true;root.dataset.artStatus=!ctx||!art.size?'fallback':art.size===2?'ready':'partial';sound.setPaused(paused||document.hidden);clock.resetBaseline();render();
  function tick(now:number){if(disposed)return;clock.tick(now,paused||document.hidden);render();if(clock.elapsed>=BOSS_INTRO_DURATION){finish();return;}raf=requestAnimationFrame(tick);}
  raf=requestAnimationFrame(tick);
 });
 return {done,cancel:()=>finish(false)};
}
