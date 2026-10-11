import type Phaser from 'phaser';
import atlas from './castle-damage-atlas.json';

export const CASTLE_EFFECT_SHEETS=[
 {kind:'hit',texture:'castle-hit-v1',fps:24,frames:16},
 {kind:'collapse',texture:'castle-collapse-v1',fps:14,frames:16},
] as const;
type CastlePhase='idle'|'hit'|'collapse'|'ruin';
interface CastleVisual{base:Phaser.GameObjects.Sprite;health:number;phase:CastlePhase;frame:number;effect?:Phaser.GameObjects.Sprite;generation:number;}

export type CastleEffectKind=keyof typeof atlas;

/** Measured crops and ground anchors survive the published texture's resize. */
export function scaledCastleDamageAtlas(kind:CastleEffectKind,width:number,height:number){
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<=0||height<=0)throw Error('Invalid castle texture dimensions');
 const spec=atlas[kind],sx=width/spec.sourceWidth,sy=height/spec.sourceHeight;
 const canvasWidth=Math.max(1,Math.round(spec.canvasWidth*sx)),canvasHeight=Math.max(1,Math.round(spec.canvasHeight*sy));
 const frames=spec.frames.map(f=>{
  const x=Math.min(width-1,Math.round(f.x*sx)),y=Math.min(height-1,Math.round(f.y*sy));
  const right=Math.min(width,Math.round((f.x+f.width)*sx)),bottom=Math.min(height,Math.round((f.y+f.height)*sy));
  const frameWidth=Math.max(1,right-x),frameHeight=Math.max(1,bottom-y);
  return {x,y,width:frameWidth,height:frameHeight,
   offsetX:Math.max(0,Math.min(canvasWidth-frameWidth,Math.round(f.offsetX*sx))),
   offsetY:Math.max(0,Math.min(canvasHeight-frameHeight,Math.round(f.offsetY*sy)))};
 });
 return {...spec,sourceWidth:width,sourceHeight:height,canvasWidth,canvasHeight,frames};
}

export function registerCastleDamageFrames(scene:Phaser.Scene){
 for(const spec of CASTLE_EFFECT_SHEETS){
  const key='dungeon-'+spec.texture;if(!scene.textures.exists(key))continue;
  const texture=scene.textures.get(key),source=texture.getSourceImage();
  const measured=scaledCastleDamageAtlas(spec.kind,source.width,source.height);
  measured.frames.forEach((f,i)=>{
   const name=spec.kind+'-'+i;
   if(!texture.has(name))texture.add(name,0,f.x,f.y,f.width,f.height)?.setTrim(measured.canvasWidth,measured.canvasHeight,f.offsetX,f.offsetY,f.width,f.height);
  });
  const animation='castle-'+spec.kind;
  if(!scene.anims.exists(animation))scene.anims.create({key:animation,frames:Array.from({length:spec.frames},(_,i)=>({key,frame:spec.kind+'-'+i})),frameRate:spec.fps,repeat:0});
 }
}

/** Visual feedback follows health; it never changes health, clocks, or the outcome. */
export class CastleDamageEffects{
 private castles=new Map<string,CastleVisual>();
 private waiting=new Set<()=>void>();private paused=false;private disposed=false;
 constructor(private scene:Phaser.Scene,private reducedMotion:boolean){}
 bind(key:string,base:Phaser.GameObjects.Sprite,health:number):void{
  if(this.disposed)return;
  const hp=Math.max(0,health);let entry=this.castles.get(key);
  if(!entry){entry={base,health:hp,phase:hp===0?'ruin':'idle',frame:hp===0?15:0,generation:0};this.castles.set(key,entry);}
  else if(entry.base!==base){this.removeEffect(entry);entry.base=base;}
  if(entry.phase!=='idle'&&!entry.effect)this.show(key,entry);
  this.sync(key,hp);
 }
 sync(key:string,health:number):void{
  const entry=this.castles.get(key);if(!entry||this.disposed)return;
  const hp=Math.max(0,health),previous=entry.health;entry.health=hp;
  if(hp>previous){this.removeEffect(entry);entry.phase='idle';entry.frame=0;entry.base.setVisible(true);this.settle();return;}
  if(hp>=previous)return;
  if(hp===0){
   if(entry.phase==='collapse'||entry.phase==='ruin')return;
   this.removeEffect(entry);entry.phase=this.reducedMotion?'ruin':'collapse';entry.frame=this.reducedMotion?15:0;this.show(key,entry);
  }else if(!this.reducedMotion){this.removeEffect(entry);entry.phase='hit';entry.frame=0;this.show(key,entry);}
 }
 private removeEffect(entry:CastleVisual){entry.generation++;entry.effect?.destroy();entry.effect=undefined;}
 private show(key:string,entry:CastleVisual){
  const kind=entry.phase==='hit'?'hit':'collapse',texture='dungeon-'+(kind==='hit'?'castle-hit-v1':'castle-collapse-v1');
  if(!entry.base.scene||!this.scene.textures.exists(texture)){entry.phase='idle';entry.base.setVisible(true);this.settle();return;}
  const base=entry.base,frame=entry.phase==='ruin'?15:entry.frame,generation=++entry.generation;
  const effect=this.scene.add.sprite(base.x,base.y,texture,kind+'-'+frame)
   .setOrigin(base.originX,base.originY).setDisplaySize(base.displayWidth,base.displayHeight)
   .setTint(base.tintTopLeft,base.tintTopRight,base.tintBottomLeft,base.tintBottomRight)
   .setAlpha(base.alpha).setRotation(base.rotation).setFlip(base.flipX,base.flipY).setDepth(base.depth)
   .setName('castle-effect-'+key).setData('castlePhase',entry.phase);
  const parent=base.parentContainer;if(parent)parent.addAt(effect,parent.getIndex(base)+1);
  entry.effect=effect;base.setVisible(false);
  if(entry.phase==='ruin')return;
  effect.on('animationupdate',(_animation:unknown,current:Phaser.Animations.AnimationFrame)=>{if(entry.generation===generation)entry.frame=Math.max(0,current.index-1);});
  effect.once('animationcomplete',()=>{
   if(entry.generation!==generation||this.disposed)return;
   if(entry.phase==='collapse'){entry.phase='ruin';entry.frame=15;effect.setFrame('collapse-15').setData('castlePhase','ruin');}
   else{entry.phase='idle';entry.frame=0;this.removeEffect(entry);if(base.scene)base.setVisible(true);}
   this.settle();
  });
  effect.play({key:'castle-'+kind,startFrame:frame});if(this.paused)effect.anims.pause();
 }
 setPaused(paused:boolean):void{
  this.paused=paused;
  for(const entry of this.castles.values()){const animation=entry.effect?.anims;if(!animation)continue;if(paused)animation.pause();else if(animation.isPaused)animation.resume();}
 }
 isDestroying(key?:string):boolean{return key?this.castles.get(key)?.phase==='collapse':[...this.castles.values()].some(entry=>entry.phase==='collapse');}
 whenSettled():Promise<void>{if(!this.isDestroying()||this.disposed)return Promise.resolve();return new Promise(resolve=>this.waiting.add(resolve));}
 private settle(){if(this.isDestroying())return;for(const resolve of this.waiting)resolve();this.waiting.clear();}
 clear():void{
  for(const entry of this.castles.values()){this.removeEffect(entry);if(entry.base.scene)entry.base.setVisible(true);}
  this.castles.clear();this.paused=false;this.settle();
 }
 destroy():void{if(this.disposed)return;this.clear();this.disposed=true;}
}
