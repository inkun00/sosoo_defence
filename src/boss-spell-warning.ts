import type Phaser from 'phaser';
import type {BossSpellState} from './boss-spells';
import type {LabelBounds} from './combat-label-layout';
import './boss-spell-warning.css';
export interface BossSpeechAnchor{x:number;y:number;head?:{x:number;y:number};labels?:LabelBounds;}

/** A passive, boss-anchored speech bubble. Combat owns its timing. */
export class BossSpellWarning{
 private root:HTMLElement;
 private bubble:HTMLElement;
 private announcement:HTMLElement;
 private announced=new Set<string>();
 private contentSignature='';
 private disposed=false;
 constructor(private scene:Phaser.Scene){
  this.root=document.createElement('aside');this.root.className='boss-spell-warning';this.root.setAttribute('aria-label','저주 마법사의 대사');
  this.root.innerHTML='<p data-boss-spell="taunt" aria-hidden="true" hidden></p><p class="boss-spell-announcement" role="status" aria-live="polite" aria-atomic="true"></p>';
  this.bubble=this.root.querySelector('[data-boss-spell="taunt"]')!;this.announcement=this.root.querySelector('.boss-spell-announcement')!;
  (scene.game.canvas.parentElement??document.body).append(this.root);this.clear();
 }
 /** CSS viewport bounds, used to keep floating combat calculations readable. */
 get speechBounds(){
  if(this.bubble.hidden||this.disposed)return null;
  const b=this.bubble.getBoundingClientRect();return {left:b.left-10,top:b.top-4,right:b.right+10,bottom:b.bottom+12};
 }
 sync(state:BossSpellState|null,anchor:BossSpeechAnchor|null){
  if(this.disposed)return;
  if(!state){this.clear();return;}
  const {spell,phase,cycle,sourceId}=state,countdown=Math.max(0,Math.ceil(state.remaining-1e-8)),signature=[sourceId,cycle,phase,spell.id,countdown].join(':');
  if(signature!==this.contentSignature){
   this.contentSignature=signature;this.root.dataset.phase=phase;this.root.dataset.spellId=spell.id;this.root.dataset.sourceId=String(sourceId);this.root.dataset.cycle=String(cycle);this.root.dataset.countdown=String(countdown);
   this.bubble.textContent=spell.taunt;
   this.root.style.setProperty('--boss-spell-color','#'+spell.color.toString(16).padStart(6,'0'));
  }
  this.bubble.hidden=phase!=='warning'||!anchor;
  if(phase==='rest'&&this.announcement.textContent)this.announcement.textContent='';
  const announcementId=[sourceId,cycle,spell.id,phase].join(':');
  if(phase!=='rest'&&!this.announced.has(announcementId)){
   this.announced.add(announcementId);
   this.announcement.textContent=phase==='warning'?'저주 마법사: '+spell.taunt:spell.name+'. '+spell.description;
  }
  if(!this.bubble.hidden)this.place(anchor!);
 }
 private place(anchor:BossSpeechAnchor){
  const canvas=this.scene.game.canvas,box=canvas.getBoundingClientRect(),c=this.scene.cameras.main;
  const sx=box.width/Math.max(1,this.scene.scale.width),sy=box.height/Math.max(1,this.scene.scale.height);
  // The field camera uses a fixed facing; preserve its viewport, scroll and zoom.
  const ox=c.width*c.originX,oy=c.height*c.originY;
  const project=(p:{x:number;y:number})=>({x:box.left+(Math.round(c.x+ox)+(p.x-c.scrollX-ox)*c.zoomX)*sx,y:box.top+(Math.round(c.y+oy)+(p.y-c.scrollY-oy)*c.zoomY)*sy}),point=project(anchor),x=point.x,y=point.y;
  const fieldLeft=Math.max(8,box.left+c.x*sx),fieldRight=Math.min(window.innerWidth-8,box.left+(c.x+c.width)*sx);
  let width=Math.min(260,Math.max(156,(fieldRight-fieldLeft)*.55),window.innerWidth-16);
  this.bubble.style.width=width+'px';
  let left=Math.max(fieldLeft,Math.min(Math.max(fieldLeft,fieldRight-width),x-width/2)),height=this.bubble.getBoundingClientRect().height,top=y-height-9;
  const fieldTop=box.top+c.y*sy+4;
  this.bubble.dataset.placement='above';
  if(top<fieldTop&&anchor.head&&anchor.labels){
   // A small fitted screen has little space between the head and the HUD.
   // Use the upper side of the head, outside its name and HP, before any margin.
   const a=project({x:anchor.labels.left,y:anchor.labels.top}),b=project({x:anchor.labels.right,y:anchor.labels.bottom}),rightSpace=fieldRight-b.x-8,leftSpace=a.x-fieldLeft-8,right=rightSpace>=leftSpace,space=right?rightSpace:leftSpace;
   if(space>=132){
    width=Math.min(width,space);this.bubble.style.width=width+'px';height=this.bubble.getBoundingClientRect().height;
    left=right?b.x+8:a.x-8-width;top=Math.max(fieldTop,project(anchor.head).y-height-9);this.bubble.dataset.placement=right?'right':'left';
   }else top=box.top-height-8;
  }
  this.bubble.style.left=left+'px';this.bubble.style.top=Math.max(8,Math.min(window.innerHeight-height-18,top))+'px';
  this.bubble.style.setProperty('--boss-speech-tail',Math.max(10,Math.min(width-10,x-left))+'px');
  this.root.dataset.anchorX=String(x);this.root.dataset.anchorY=String(y);
 }
 clear(){
  if(this.disposed)return;this.bubble.hidden=true;this.contentSignature='';this.announced.clear();this.announcement.textContent='';
  this.root.dataset.phase='none';this.root.dataset.spellId='';this.root.dataset.sourceId='';this.root.dataset.countdown='0';delete this.root.dataset.anchorX;delete this.root.dataset.anchorY;
 }
 destroy(){if(this.disposed)return;this.clear();this.disposed=true;this.root.remove();}
}
