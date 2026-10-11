import {artURL} from './art';
import './game-motion.css';

export type MotionKind='entry'|'prepare'|'battle'|'victory'|'defeat'|'draw'|'review'|'stage';
export interface MotionOptions{title?:string;subtitle?:string;key?:string;}
const THEMES:Record<MotionKind,{title:string;label:string;color:string;duration:number}>= {
 entry:{title:'수호자의 여정',label:'소수의 성',color:'#ffc974',duration:1000},
 stage:{title:'새로운 모험',label:'성문을 열다',color:'#ffc974',duration:1100},
 prepare:{title:'전투 준비',label:'수호자의 시간',color:'#86e0e3',duration:1000},
 battle:{title:'전투 시작',label:'성을 지켜라',color:'#ffc974',duration:1200},
 victory:{title:'승리',label:'수호자의 영광',color:'#ffe49d',duration:1900},
 defeat:{title:'다시 일어설 시간',label:'꺼지지 않는 불꽃',color:'#e9a698',duration:1700},
 draw:{title:'무승부',label:'팽팽한 결투',color:'#bfcafa',duration:1500},
 review:{title:'성을 지켰어요',label:'수호자의 발걸음',color:'#98dfc6',duration:1500},
};
const ease=(value:number)=>1-(1-Math.max(0,Math.min(1,value)))**3;
let serial=0;
function crest(id:string,broken:boolean){
 const shield=`<path fill="url(#${id}-metal)" stroke="#dfb873" stroke-width="2" d="M60 7 104 23 100 73Q95 105 60 120 25 105 20 73L16 23Z"/><path fill="#111923" stroke="#78634b" stroke-width="2" d="M60 17 93 30 90 73Q86 97 60 109 34 97 30 73L27 30Z"/><path fill="url(#${id}-stone)" stroke="#b6b6ab" stroke-width="1.5" d="M35 87V55H42V45H49V55H55V37H65V55H71V45H78V55H85V87ZM49 87V70H56V87M64 87V70H71V87"/><path fill="#fbd48c" d="M60 77C39 64 60 50 55 29 78 45 71 53 76 59 80 68 68 78 60 77Z"/><path fill="#fff4ca" d="M60 75C50 67 60 59 60 47 69 59 71 70 60 75Z"/>`;
 const definitions=`<defs><linearGradient id="${id}-metal" x2="1" y2="1"><stop stop-color="#454e57"/><stop offset=".27" stop-color="#bfc2b8"/><stop offset=".4" stop-color="#4a5057"/><stop offset=".7" stop-color="#272c34"/><stop offset="1" stop-color="#8d8e83"/></linearGradient><linearGradient id="${id}-stone" x2="0" y2="1"><stop stop-color="#889795"/><stop offset="1" stop-color="#39454c"/></linearGradient></defs>`;
 if(!broken)return `<svg viewBox="0 0 120 128" xmlns="http://www.w3.org/2000/svg">${definitions}${shield}</svg>`;
 return `<svg viewBox="0 0 120 128" xmlns="http://www.w3.org/2000/svg">${definitions}<defs><clipPath id="${id}-left"><path d="M0 0H64L55 43 64 60 51 86 60 128H0Z"/></clipPath><clipPath id="${id}-right"><path d="M64 0H120V128H60L51 86 64 60 55 43Z"/></clipPath></defs><g class="game-motion-shield-left" clip-path="url(#${id}-left)">${shield}</g><g class="game-motion-shield-right" clip-path="url(#${id}-right)">${shield}</g></svg>`;
}

/** Cosmetic overlays never own a game clock, a score, or an input lock. */
export class GameMotion{
 private played=new Set<string>();
 private overlays=new Set<{finish:()=>void}>();
 private reveals=new Map<HTMLElement,Animation>();
 private disposed=false;
 private onHide=()=>this.dispose();
 constructor(){if(typeof window!=='undefined')window.addEventListener('pagehide',this.onHide);}
 play(kind:MotionKind,options:MotionOptions={}):Promise<void>{
  if(this.disposed||typeof document==='undefined'||(options.key&&this.played.has(options.key)))return Promise.resolve();
  if(options.key){this.played.add(options.key);if(this.played.size>128)this.played.delete(this.played.values().next().value!);}
  if(matchMedia('(prefers-reduced-motion: reduce)').matches||document.hidden)return Promise.resolve();
  // A new event replaces the old celebration; its completion still resolves.
  for(const overlay of this.overlays)overlay.finish();
  const theme=THEMES[kind],id='game-motion-'+(++serial),root=document.createElement('div');
  root.className=`game-motion game-motion--${kind}`;root.dataset.motionKind=kind;root.setAttribute('aria-hidden','true');
  root.style.setProperty('--motion-color',theme.color);root.style.setProperty('--motion-duration',theme.duration+'ms');
  root.style.setProperty('--motion-menu-art',`url("${artURL('menu-button-v1')}")`);
  root.innerHTML=`<div class="game-motion-shade"></div><canvas class="game-motion-particles"></canvas><div class="game-motion-sigil"><div class="game-motion-orbit"></div><div class="game-motion-orbit inner"></div><i></i><i></i><i></i><i></i></div><div class="game-motion-announcement"><div class="game-motion-crest">${crest(id,kind==='defeat')}</div><div class="game-motion-ribbon"><span class="game-motion-label"></span><strong></strong><small></small></div></div>`;
  root.querySelector('.game-motion-label')!.textContent=theme.label;
  root.querySelector('strong')!.textContent=options.title??theme.title;
  root.querySelector('small')!.textContent=options.subtitle??'';
  document.body.append(root);
  const canvas=root.querySelector('canvas')!,context=canvas.getContext('2d');
  const width=innerWidth,height=innerHeight,dpr=Math.min(1.5,devicePixelRatio||1);
  canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
  const began=performance.now();let raf=0,timer:ReturnType<typeof setTimeout>,done=false;
  return new Promise(resolve=>{
   const overlay={finish:()=>{
    if(done)return;done=true;cancelAnimationFrame(raf);clearTimeout(timer);root.remove();this.overlays.delete(overlay);resolve();
   }};
   this.overlays.add(overlay);
   const frame=(now:number)=>{
    if(done)return;
    const local=(now-began)/theme.duration;
    if(local>=1||document.hidden){overlay.finish();return;}
    if(context)drawMotionParticles(context,kind,local,width,height,dpr);
    raf=requestAnimationFrame(frame);
   };
   raf=requestAnimationFrame(frame);
   // Background tabs, unsupported rendering, or a suspended RAF cannot strand it.
   timer=setTimeout(overlay.finish,theme.duration+120);
  });
 }
 reveal(element:HTMLElement,delay=0):void{
  this.reveals.get(element)?.cancel();this.reveals.delete(element);
  if(this.disposed||matchMedia('(prefers-reduced-motion: reduce)').matches||typeof element.animate!=='function')return;
  const style=getComputedStyle(element),base=style.transform==='none'?'':style.transform,filter=style.filter==='none'?'':style.filter;
  // A live canvas must keep its bounds: Phaser maps pointer coordinates against it.
  const offset=element instanceof HTMLCanvasElement||element.querySelector('canvas')?'':' translateY(10px)';
  const animation=element.animate([{opacity:.15,transform:`${base}${offset}`||'none',filter:`${filter} brightness(.75)`},{opacity:style.opacity,transform:base||'none',filter:filter||'none'}],{duration:260,delay,fill:'backwards',easing:'cubic-bezier(.18,.72,.24,1)'});
  this.reveals.set(element,animation);
  const finish=()=>{if(this.reveals.get(element)===animation)this.reveals.delete(element);};
  animation.addEventListener('finish',finish,{once:true});animation.addEventListener('cancel',finish,{once:true});
 }
 clear():void{for(const overlay of this.overlays)overlay.finish();for(const animation of this.reveals.values())animation.cancel();this.reveals.clear();this.played.clear();}
 dispose():void{if(this.disposed)return;this.disposed=true;this.clear();if(typeof window!=='undefined')window.removeEventListener('pagehide',this.onHide);}
}

function drawMotionParticles(ctx:CanvasRenderingContext2D,kind:MotionKind,t:number,w:number,h:number,dpr:number){
 ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
 const cx=w/2,cy=h/2,unit=Math.min(w*.28,h*.39,280),arrival=ease(t*4),fade=Math.min(1,(1-t)*5);
 const win=kind==='victory',loss=kind==='defeat',cool=kind==='prepare'||kind==='draw'||kind==='review';
 const color=loss?'#eaa08d':cool?'#9cdde6':'#ffe0a0';
 ctx.save();ctx.translate(cx,cy);ctx.globalAlpha=fade;
 // Broken lines and falling ash have a different weight from a rising victory.
 if(loss){
  ctx.strokeStyle='#a5566570';ctx.lineWidth=1.5;
  for(let i=0;i<7;i++){
   const angle=i*2.399+1.1,length=unit*(.6+i%3*.25)*arrival;
   ctx.beginPath();ctx.moveTo(Math.cos(angle)*28,Math.sin(angle)*28);
   ctx.lineTo(Math.cos(angle)*length*.55+12,Math.sin(angle)*length*.55);
   ctx.lineTo(Math.cos(angle)*length,Math.sin(angle)*length+8);ctx.stroke();
  }
 }else{
  const glow=ctx.createRadialGradient(0,0,0,0,0,unit*2.4);glow.addColorStop(0,cool?'#8ce2ff25':'#ffd38a30');glow.addColorStop(1,'#ffc76a00');
  ctx.fillStyle=glow;ctx.fillRect(-unit*2.4,-unit*2.4,unit*4.8,unit*4.8);
  // The seal expands before the ribbon arrives. No full-screen white flash.
  ctx.strokeStyle=color;ctx.lineWidth=1.5;ctx.globalAlpha=fade*(1-arrival)*.75;
  ctx.beginPath();ctx.arc(0,0,unit*(.2+arrival*1.4),0,Math.PI*2);ctx.stroke();
  if(win){
   ctx.globalAlpha=fade*.13;
   for(let i=0;i<14;i++){
    const a=i*Math.PI/7+t*.16;ctx.save();ctx.rotate(a);ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(0,-25);ctx.lineTo(-unit*.09,-unit*2.8);ctx.lineTo(unit*.09,-unit*2.8);ctx.closePath();ctx.fill();ctx.restore();
   }
   // Heraldic laurels unfold around the shield, instead of unrelated confetti.
   const sprout=ease((t-.12)*4);ctx.globalAlpha=fade*.75;
   for(const side of [-1,1])for(let i=0;i<9*sprout;i++){
    const a=(-.7+i*.15)*side,x=Math.sin(a)*unit*.55,y=55+Math.cos(a)*unit*.43;
    ctx.save();ctx.translate(x,y);ctx.rotate(-a+side*.7);ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(0,0,5,12,0,0,Math.PI*2);ctx.fill();ctx.restore();
   }
  }
 }
 const count=loss?26:win?44:24;
 for(let i=0;i<count;i++){
  const a=i*2.399,seed=(i*137%100)/100,progress=Math.max(0,(t-seed*.17)/(1-seed*.17));
  const distance=unit*(.3+progress*(win?1.7:1.15)),x=Math.cos(a)*distance;
  const y=loss?-unit*.4+progress*h*.5+Math.sin(a)*unit*.5:Math.sin(a)*distance*.66-progress*unit*.45;
  ctx.globalAlpha=fade*Math.sin(Math.min(1,progress)*Math.PI)*(.3+i%4*.12);ctx.fillStyle=color;
  ctx.save();ctx.translate(x,y);ctx.rotate(a+progress*(loss?1.4:3));
  if(loss){ctx.fillStyle=i%3?'#b89886':'#d86b71';ctx.fillRect(-2,-2,3+i%3,5+i%4);}
  else if(win&&i%7===0){ctx.beginPath();for(let point=0;point<8;point++){const r=point%2?2:7,angle=point*Math.PI/4;point?ctx.lineTo(Math.cos(angle)*r,Math.sin(angle)*r):ctx.moveTo(r,0);}ctx.closePath();ctx.fill();}
  else{ctx.fillRect(-1.5,-1.5,3+i%3,3+i%3);}
  ctx.restore();
 }
 ctx.restore();
}

/** Small navigation curtain: only route activation waits, never a live match. */
let departing=false;
export function navigateWithMotion(url:string):void{
 if(departing)return;departing=true;
 if(matchMedia('(prefers-reduced-motion: reduce)').matches){location.assign(url);return;}
 const cover=document.createElement('div');cover.className='game-motion-departure';cover.setAttribute('aria-hidden','true');
 cover.innerHTML='<div class="game-motion-gate left"></div><div class="game-motion-gate right"></div><div class="game-motion-gate-seal">✦</div>';
 document.body.append(cover);
 // A CSS event alone is not reliable when a tab is backgrounded.
 const timer=setTimeout(()=>location.assign(url),280);
 window.addEventListener('pagehide',()=>{clearTimeout(timer);cover.remove();},{once:true});
}
