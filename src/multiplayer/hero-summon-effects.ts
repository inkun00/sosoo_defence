import type Phaser from 'phaser';
import {heroSummonStyle,type HeroSummonStyle} from '../hero-summon-style';
import type {HeroSummonEvent} from './hero-summon-stream';

interface Bounds{left:number;right:number;top:number;bottom:number;}
interface SummonVisual{event:HeroSummonEvent;style:Readonly<HeroSummonStyle>;start:number;x:number;y:number;graphics:Phaser.GameObjects.Graphics;badge:Phaser.GameObjects.Text;}
export interface SummonPose{scale:number;alpha:number;lift:number;}
const clamp=(value:number,min=0,max=1)=>Math.max(min,Math.min(max,value));
const ease=(t:number)=>1-Math.pow(1-clamp(t),3);
const prism=[0xffdf9d,0x9cf3ee,0xc194ff,0xff9fc9,0xd6f7ff];

/** Pure entrance pose; movement/HP continue to be owned by the host simulation. */
export function heroSummonPose(age:number,reduced=false):SummonPose{
 if(reduced||age<0||age>=520)return {scale:1,alpha:1,lift:0};
 const t=clamp(age/330),c=1.70158,back=1+(c+1)*Math.pow(t-1,3)+c*Math.pow(t-1,2);
 return {scale:.6+.4*back,alpha:clamp(age/140),lift:Math.sin(clamp(age/520)*Math.PI)*8};
}

/** At most two bounded, clipped effects exist: one reserve hero per player. */
export class HeroSummonEffects{
 private active:SummonVisual[]=[];private clip:Phaser.GameObjects.Graphics;private mask:Phaser.Display.Masks.GeometryMask;
 constructor(private scene:Phaser.Scene,private bounds:Bounds,private reduced:boolean){
  this.clip=scene.make.graphics({},false).fillStyle(0xffffff).fillRect(bounds.left,bounds.top,bounds.right-bounds.left,bounds.bottom-bounds.top);
  this.mask=this.clip.createGeometryMask();
 }
 get count():number{return this.active.length;}
 play(event:HeroSummonEvent,x:number,y:number):void{
  if(this.active.some(v=>v.event.enemyId===event.enemyId))return;
  if(this.active.length>=2)this.remove(this.active[0]);
  const style=heroSummonStyle(event.level),graphics=this.scene.add.graphics().setName('collected-hero-summon-'+event.enemyId).setDepth(6.3).setPosition(x,y).setMask(this.mask);
  const captionHalf=Math.min(145,(this.bounds.right-this.bounds.left-12)/2);
  const badge=this.scene.add.text(clamp(x,this.bounds.left+captionHalf,this.bounds.right-captionHalf),this.bounds.bottom-20,`${style.label} 영웅 소환 · ${event.name}`,
   {fontFamily:'Malgun Gothic, sans-serif',fontSize:14,fontStyle:'bold',color:style.cssAccent,stroke:'#12151d',strokeThickness:3,backgroundColor:'#141923dd',padding:{x:10,y:5}}).setName('hero-summon-caption-'+event.enemyId).setOrigin(.5).setDepth(7.1).setMask(this.mask);
  badge.setScale(Math.min(1,(this.bounds.right-this.bounds.left-14)/badge.width));
  this.active.push({event,style,start:this.scene.time.now,x,y,graphics,badge});this.update();
 }
 private remove(v:SummonVisual):void{v.graphics.destroy();v.badge.destroy();this.active=this.active.filter(o=>o!==v);}
 clear():void{for(const v of [...this.active])this.remove(v);}
 destroy():void{this.clear();this.mask.destroy();this.clip.destroy();}
 pose(enemyId:number):SummonPose|undefined{const v=this.active.find(v=>v.event.enemyId===enemyId),age=v?this.scene.time.now-v.start:Infinity;return v&&!this.reduced&&age<520?heroSummonPose(age):undefined;}
 update():void{
  for(const v of [...this.active]){
   const age=this.scene.time.now-v.start,duration=this.reduced?650:v.style.duration;
   if(age>=duration){this.remove(v);continue;}
   const t=clamp(age/duration),alpha=Math.min(1,age/100)*clamp((duration-age)/300),g=v.graphics,p=v.style;
   g.clear();v.badge.setAlpha(alpha);
   if(this.reduced){
    // No flash, spinning light, travel, bounce, or camera movement in this mode.
    g.lineStyle(2,p.color,.65*alpha).strokeEllipse(0,17,58,22).lineStyle(1,p.accent,.5*alpha).strokeEllipse(0,17,70,27);continue;
   }
   const radius=24+ease(age/280)*(13+p.rank*4),ringAlpha=alpha*(.65+.15*Math.sin(t*Math.PI));
   g.fillStyle(p.color,.09*alpha).fillEllipse(0,17,radius*2.5,radius*.85);
   // Rank-scaled concentric sigils, counter-rotating diamonds, and rune rays.
   for(let ring=0;ring<p.rings;ring++){
    const r=radius+ring*5,color=p.rank===5?prism[ring%prism.length]:ring%2?p.accent:p.color;
    g.lineStyle(ring===0?2:1.2,color,ringAlpha/(1+ring*.12)).strokeEllipse(0,17,r*2,r*.64);
    const markers=4+p.rank*2;
    for(let n=0;n<markers;n++){
     const angle=n*Math.PI*2/markers+age*.00055*(ring%2?-1:1),xx=Math.cos(angle)*r,yy=17+Math.sin(angle)*r*.32,d=2+ring*.35;
     g.lineStyle(1,color,ringAlpha).strokeTriangle(xx-d,yy,xx,yy-d,xx+d,yy).strokeTriangle(xx-d,yy,xx,yy+d,xx+d,yy);
    }
   }
   // A soft tapered light column opens, then collapses without hiding HP text.
   const column=(Math.sin(clamp(age/900)*Math.PI)*.75+Math.exp(-age/180)*.25)*alpha;
   if(column>0){
    const height=Math.min(p.columnHeight,v.y-this.bounds.top-8),width=13+p.rank*5;
    g.fillStyle(p.color,column*.07).fillTriangle(-width,17,width,17,-width*.3,-height).fillTriangle(width,17,-width*.3,-height,width*.3,-height);
    for(let line=0;line<p.rank+1;line++){
     const xx=(line-p.rank/2)*4;
     g.lineStyle(line===Math.floor(p.rank/2)?3:1,p.rank===5?prism[line%5]:p.accent,column*.28).lineBetween(xx,17,xx*.35,-height);
    }
   }
   // Rings arrive in staggered shock waves. They stay inside the battlefield.
   for(let n=0;n<p.rings;n++){
    const u=clamp((age-n*90)/610);if(u<=0||u>=1)continue;
    const r=12+u*(42+p.rank*5);
    g.lineStyle(2.4-u*1.8,p.rank===5?prism[n%5]:p.color,(1-u)*alpha*.65).strokeEllipse(0,17,r*2,r*.73);
   }
   const spark=ease(age/750),seed=v.event.enemyId*1.6180339887;
   for(let n=0;n<p.particles;n++){
    const angle=n*2.3999632297+seed,spread=16+(n%7)*5+p.rank*3;
    const xx=Math.cos(angle)*spread*spark,yy=9+Math.sin(angle)*spread*.48*spark-(n%4+1)*14*spark+27*spark*spark;
    const a=alpha*(1-t)*(.5+(n%3)*.2),size=(n%3===0?2.1:1.25)*(1-.35*t),color=p.rank===5?prism[n%5]:n%3===0?p.accent:p.color;
    g.fillStyle(color,a).fillCircle(xx,yy,size);
    if(n%4===0)g.lineStyle(1,color,a*.8).lineBetween(xx-3,yy,xx+3,yy).lineBetween(xx,yy-3,xx,yy+3);
   }
   for(let n=0;n<p.rays;n++){
    const angle=n*Math.PI*2/p.rays+seed,inner=10+spark*20,outer=inner+12*(1-t);
    g.lineStyle(1.4,p.rank===5?prism[n%5]:p.accent,alpha*(1-t)*.35).lineBetween(Math.cos(angle)*inner,Math.sin(angle)*inner*.5-15,Math.cos(angle)*outer,Math.sin(angle)*outer*.5-15);
   }
   const flare=Math.exp(-age/135)*alpha;
   g.fillStyle(p.accent,flare*.5).fillCircle(0,-9,10+p.rank*1.3).fillStyle(p.color,flare*.15).fillCircle(0,-9,23+p.rank*3);
  }
 }
}
