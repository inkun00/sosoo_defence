import type Phaser from 'phaser';
import {projectileFlightDuration,projectileLifecycle,projectilePath,projectileProfile,projectileRotation,projectileRoundProgress,type ProjectilePoint,type TowerProjectileProfile} from './projectile-profiles';

export interface TowerProjectileOptions{
 typeId:string;from:ProjectilePoint;to:ProjectilePoint;scale?:number;reducedMotion?:boolean;
 onImpact:()=>void;track?:(object:Phaser.GameObjects.GameObject)=>void;
}

interface SceneFlights{objects:Set<Phaser.GameObjects.GameObject>;cancel:Set<()=>void>;}
const sceneFlights=new WeakMap<Phaser.Scene,SceneFlights>();
const MAX_SCENE_OBJECTS=120,FRAME_MS=42;
type FlightSprite=Phaser.GameObjects.Sprite&{flightProgress:number};

function flightsFor(scene:Phaser.Scene):SceneFlights{
 let flights=sceneFlights.get(scene);
 if(!flights){flights={objects:new Set(),cancel:new Set()};sceneFlights.set(scene,flights);}
 return flights;
}

export function clearTowerProjectiles(scene:Phaser.Scene):void{
 for(const cancel of [...(sceneFlights.get(scene)?.cancel??[])])cancel();
}

export function towerProjectileEffectCount(scene:Phaser.Scene):number{return sceneFlights.get(scene)?.objects.size??0;}

/** Visual flight only. The caller owns the single recorded damage/impact event. */
export function playTowerProjectile(scene:Phaser.Scene,options:TowerProjectileOptions):void{
 const {from,to,onImpact}=options,profile=projectileProfile(options.typeId),flights=flightsFor(scene);
 // Skipping art under load must not skip the logical impact or its equation.
 if(flights.objects.size>=MAX_SCENE_OBJECTS||![from.x,from.y,to.x,to.y].every(Number.isFinite)){onImpact();return;}
 const scale=Math.max(.35,Math.min(2,Number.isFinite(options.scale)?options.scale!:1)),reduced=!!options.reducedMotion;
 const duration=projectileFlightDuration(profile,reduced),roundDuration=reduced?100:profile.duration,bearing=Math.atan2(to.y-from.y,to.x-from.x),distance=Math.hypot(to.x-from.x,to.y-from.y);
 const owned=new Set<Phaser.GameObjects.GameObject>(),tweens=new Set<Phaser.Tweens.Tween>(),trails=new Set<Phaser.GameObjects.Graphics>();
 let emitted=0,secondEmitted=0,secondAttempted=false,cleaning=false;
 const lifecycle=projectileLifecycle(onImpact,()=>{
  cleaning=true;flights.cancel.delete(lifecycle.cancel);scene.events.off('shutdown',lifecycle.cancel);scene.events.off('destroy',lifecycle.cancel);
  for(const tween of tweens)tween.remove();tweens.clear();
  for(const object of [...owned]){scene.tweens.killTweensOf(object);object.destroy();}owned.clear();trails.clear();
 });
 const own=<T extends Phaser.GameObjects.GameObject>(object:T):T=>{
  owned.add(object);flights.objects.add(object);
  object.once('destroy',()=>{owned.delete(object);flights.objects.delete(object);});options.track?.(object);return object;
 };
 const room=()=>flights.objects.size<MAX_SCENE_OBJECTS;
 const generated=scene.textures.exists(profile.atlas)&&scene.textures.get(profile.atlas).has(profile.id+'-0');
 const atlas=generated?profile.atlas:'dungeon-fx-utility-v1',fallback=profile.grade>=3?'projectile-range':profile.id==='frost'||profile.id==='ice'?'projectile-slow':'projectile-basic';
 const makeRound=()=>own(scene.add.sprite(from.x,from.y,atlas,generated?profile.id+'-0':fallback).setName('battle-projectile-'+profile.id).setOrigin(generated?profile.core.x:.5,generated?profile.core.y:.5).setDisplaySize(profile.width*scale,profile.height*scale).setRotation(bearing).setDepth(5.1+profile.grade*.05));
 const lead=Object.assign(makeRound(),{flightProgress:0}) as FlightSprite;
 let second:Phaser.GameObjects.Sprite|undefined;
 lead.once('destroy',()=>{if(!cleaning)lifecycle.cancel();});
 flights.cancel.add(lifecycle.cancel);scene.events.once('shutdown',lifecycle.cancel);scene.events.once('destroy',lifecycle.cancel);
 if(profile.beam)lead.setPosition((from.x+to.x)/2,(from.y+to.y)/2).setDisplaySize(Math.max(1,distance),profile.height*scale).setRotation(bearing);

 // These supporting shapes stay behind the illustrated projectile. Their
 // tweens share the scene clock, including pause and battle speed changes.
 const shadow=!reduced&&profile.id==='catapult'&&room()?own(scene.add.graphics().fillStyle(0x16151c,.38).fillEllipse(0,0,27*scale,9*scale).setDepth(3.7)):undefined;
 const launch=!reduced&&(profile.id==='siege'||profile.id==='rune'||profile.id==='lightning')&&room()?own(scene.add.graphics().setPosition(from.x,from.y).setRotation(bearing).setDepth(4.9)):undefined;
 const endGlow=!reduced&&profile.beam&&room()?own(scene.add.graphics().fillStyle(profile.color,.5).fillCircle(0,0,7*scale).setPosition(to.x,to.y).setDepth(5.0)):undefined;

 const addTrail=(x:number,y:number,rotation:number,step:number)=>{
  if(reduced||profile.trail==='none'||trails.size>=profile.maxTrails||!room())return;
  const trail=own(scene.add.graphics().setName('tower-trail-'+profile.id).setPosition(x,y).setRotation(rotation).setDepth(4.7));
  trails.add(trail);trail.once('destroy',()=>trails.delete(trail));drawTrail(trail,profile,scale,step);
  let fade:Phaser.Tweens.Tween;
  fade=scene.tweens.add({targets:trail,alpha:0,x:x-Math.cos(bearing)*(profile.trail==='smoke'?9:3)*scale,y:y-Math.sin(bearing)*5*scale,duration:profile.grade>=3?175:135,onComplete:()=>{tweens.delete(fade);trail.destroy();}});tweens.add(fade);
 };

 const render=(t:number)=>{
  if(!lifecycle.active)return;
  const elapsed=t*duration,firstProgress=projectileRoundProgress(profile,elapsed,0,reduced)!,secondProgress=profile.rounds===2?projectileRoundProgress(profile,elapsed,1,reduced):null;
  // The second stone starts on this same paused scene clock, matching its
  // second shot sound at 65ms without a timer or a second logical impact.
  if(secondProgress!==null&&!secondAttempted){secondAttempted=true;if(room())second=makeRound();}
  const setFrame=(sprite:Phaser.GameObjects.Sprite,progress:number)=>{if(generated)sprite.setFrame(profile.id+'-'+(reduced?0:Math.floor(progress*Math.max(6,roundDuration/FRAME_MS))%6));};
  setFrame(lead,firstProgress);if(second&&secondProgress!==null)setFrame(second,secondProgress);
  if(profile.beam){
   // A single, center-anchored illustrated bolt always spans both endpoints.
   // No traveling pellet, chained target, or additional impact is created.
   lead.setAlpha(reduced?.7:.68+.28*Math.abs(Math.sin(t*Math.PI*11))).setDisplaySize(Math.max(1,distance),profile.height*scale*(reduced?1:.9+.14*Math.sin(t*Math.PI*13)));
   endGlow?.setAlpha(.5+.35*Math.abs(Math.sin(t*Math.PI*9)));
  }else{
   const roundPoint=(progress:number,side:number)=>{
    const p=projectilePath(profile,from,to,reduced?.5:progress,scale),separation=profile.rounds===2?(reduced?9:6*Math.sin(progress*Math.PI))*scale:0;
    return {x:p.x-Math.sin(bearing)*separation*side,y:p.y+Math.cos(bearing)*separation*side};
   };
   const p=roundPoint(firstProgress,1),rotation=reduced?bearing:projectileRotation(profile,from,to,firstProgress,scale);
   lead.setPosition(p.x,p.y).setRotation(rotation).setAlpha(firstProgress>=1&&profile.rounds===2?0:reduced?.85-.3*firstProgress:1);
   if(second&&secondProgress!==null){
    const q=roundPoint(secondProgress,-1);second.setPosition(q.x,q.y).setRotation(reduced?bearing:projectileRotation(profile,from,to,secondProgress,scale)).setAlpha(reduced?.85-.3*secondProgress:1);
    const wanted=Math.min(profile.emissions,Math.floor(secondProgress*(profile.emissions+1)));
    if(wanted>secondEmitted){secondEmitted=wanted;addTrail(q.x,q.y,bearing,secondEmitted);}
   }
   if(shadow){const groundY=from.y+(to.y-from.y)*firstProgress,height=groundY-p.y;shadow.setPosition(p.x,groundY+10*scale).setAlpha(.9-height/(120*scale)).setScale(1-height/(180*scale));}
   const wanted=Math.min(profile.emissions,Math.floor(firstProgress*(profile.emissions+1)));
   if(wanted>emitted){emitted=wanted;addTrail(p.x,p.y,bearing,emitted);}
  }
  if(launch){
   const age=t*duration;launch.clear();
   if(profile.id==='siege'){
    const radius=(5+age*.09)*scale;launch.lineStyle(3*scale,0xffda97,.8).strokeCircle(-Math.min(13,age*.08)*scale,0,radius).fillStyle(0xbaac9b,.55).fillCircle(-age*.05*scale,0,radius*.6);
   }else if(profile.id==='rune'){
    launch.lineStyle(2*scale,profile.color,.7).strokeCircle(0,0,(13+Math.sin(t*Math.PI)*8)*scale).lineBetween(-13*scale,0,13*scale,0).lineBetween(0,-13*scale,0,13*scale);
   }else launch.fillStyle(profile.color,.65).fillCircle(0,0,(5+Math.abs(Math.sin(t*Math.PI*11))*4)*scale);
   launch.setAlpha(Math.max(0,1-age/(profile.id==='lightning'?duration:180)));
  }
 };
 render(0);
 const flight=scene.tweens.add({targets:lead,flightProgress:1,duration,ease:'Linear',onUpdate:()=>render(lead.flightProgress),onComplete:lifecycle.finish,onStop:lifecycle.cancel});tweens.add(flight);
}

function drawTrail(g:Phaser.GameObjects.Graphics,p:TowerProjectileProfile,scale:number,step:number):void{
 const s=scale,color=p.color,turn=step%2?1:-1;
 switch(p.trail){
  case 'smoke':g.fillStyle(color,.35).fillCircle(0,0,(p.id==='siege'?8:4)*s).fillCircle(-5*s,turn*3*s,(p.id==='siege'?5:3)*s);break;
  case 'dust':g.fillStyle(color,.4).fillCircle(-2*s,turn*3*s,3*s).fillCircle(2*s,-turn*2*s,2*s);break;
  case 'needle':g.lineStyle(s,color,.45).lineBetween(-13*s,0,4*s,0);break;
  case 'chips':g.fillStyle(color,.65).fillTriangle(-4*s,-3*s,-s,2*s,-6*s,2*s).fillTriangle(2*s,2*s,6*s,3*s,4*s,6*s);break;
  case 'frost':g.lineStyle(2*s,color,.55).strokeCircle(0,0,8*s).fillStyle(0xe0ffff,.7).fillCircle(turn*6*s,-5*s,2*s).fillCircle(-turn*5*s,6*s,1.5*s);break;
  case 'ice':g.fillStyle(color,.65).fillTriangle(-8*s,turn*4*s,-2*s,0,-5*s,-turn*5*s).fillTriangle(s,0,5*s,3*s,4*s,-3*s);break;
  case 'spark':g.lineStyle(1.5*s,color,.8).lineBetween(-6*s,0,6*s,0).lineBetween(0,-6*s,0,6*s).lineStyle(s,0xffffff,.7).lineBetween(-3*s,-3*s,3*s,3*s);break;
  case 'tracer':g.lineStyle(2*s,color,.7).lineBetween(-45*s,0,10*s,0).lineStyle(s,0xffffff,.9).lineBetween(-24*s,0,10*s,0);break;
  case 'rune':g.lineStyle(1.7*s,color,.85).strokeRect(-4*s,-6*s,8*s,12*s).lineBetween(-4*s,-6*s,4*s,6*s).lineBetween(-8*s,0,8*s,0).lineStyle(s,0xffe3a8,.65).strokeCircle(0,0,11*s);break;
 }
}
