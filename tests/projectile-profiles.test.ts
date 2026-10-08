import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import type Phaser from 'phaser';
import {PROJECTILE_IDS,PROJECTILE_PROFILES,projectileArcHeight,projectileFlightDuration,projectileLifecycle,projectilePath,projectileProfile,projectileRotation,projectileRoundProgress} from '../src/projectile-profiles';
import {clearTowerProjectiles,playTowerProjectile,towerProjectileEffectCount} from '../src/tower-projectiles';
import {TOWERS} from '../src/towers';

test('all twelve tower names map to a unique flight signature and correct atlas row',()=>{
 assert.deepEqual(PROJECTILE_IDS,[...TOWERS.map(t=>t.id)]);
 assert.equal(new Set(PROJECTILE_IDS.map(id=>projectileProfile(id).signature)).size,12);
 for(const tower of TOWERS){const p=projectileProfile(tower.id);assert.equal(p.id,tower.id);assert.equal(p.grade,tower.grade);assert.ok(p.width>0&&p.height>0&&p.duration>0);assert.ok(p.maxTrails<=6&&p.emissions<=9);assert.ok(p.core.x>=0&&p.core.x<=1&&p.core.y>=0&&p.core.y<=1);}
 assert.deepEqual(['basic','double','needle','pebble'].map(id=>[projectileProfile(id).atlas,projectileProfile(id).row]),[0,1,2,3].map(row=>['dungeon-fx-flight-stone-v1',row]));
 assert.deepEqual(['frost','ice','catapult','siege'].map(id=>[projectileProfile(id).atlas,projectileProfile(id).row]),[0,1,2,3].map(row=>['dungeon-fx-flight-element-v1',row]));
 assert.deepEqual(['lightning','crystal','sniper','rune'].map(id=>[projectileProfile(id).atlas,projectileProfile(id).row]),[0,1,2,3].map(row=>['dungeon-fx-flight-magic-v1',row]));
 assert.equal(projectileProfile('__proto__'),PROJECTILE_PROFILES.basic);assert.equal(projectileProfile('unknown'),PROJECTILE_PROFILES.basic);
});

test('flight profiles encode distinct twin rounds, connected beam, fast tracer and richer grades',()=>{
 assert.deepEqual(PROJECTILE_IDS.filter(id=>projectileProfile(id).rounds===2),['double']);
 assert.deepEqual(PROJECTILE_IDS.filter(id=>projectileProfile(id).beam),['lightning']);
 assert.equal(projectileProfile('lightning').trail,'none');assert.equal(projectileProfile('lightning').emissions,0);
 assert.ok(projectileProfile('sniper').duration<projectileProfile('needle').duration);
 assert.ok(projectileProfile('sniper').width/projectileProfile('sniper').height>6);
 assert.ok(projectileProfile('ice').width/projectileProfile('ice').height>2);
 assert.ok(projectileProfile('catapult').arc>projectileProfile('rune').arc);
 assert.ok(projectileProfile('rune').maxTrails>projectileProfile('basic').maxTrails);
 assert.equal(projectileProfile('ice').spin,0);assert.equal(projectileProfile('rune').spin,0);
});

test('double launch timing follows its 65ms sound gap and ends after the last round',()=>{
 const p=projectileProfile('double');assert.equal(p.roundDelay,65);assert.equal(projectileFlightDuration(p),325);
 assert.equal(projectileRoundProgress(p,0,0),0);assert.equal(projectileRoundProgress(p,0,1),null);assert.equal(projectileRoundProgress(p,64,1),null);assert.equal(projectileRoundProgress(p,65,1),0);
 assert.equal(projectileRoundProgress(p,260,0),1);assert.equal(projectileRoundProgress(p,260,1),.75);assert.equal(projectileRoundProgress(p,325,1),1);
 assert.equal(projectileFlightDuration(p,true),165);assert.equal(projectileRoundProgress(p,165,1,true),1);
});

test('every flight path reaches its recorded endpoints and parabolas remain bounded',()=>{
 for(const id of PROJECTILE_IDS){
  const p=projectileProfile(id),from={x:210,y:180},to={x:40,y:260},arc=projectileArcHeight(p,from,to,.75);
  assert.deepEqual(projectilePath(p,from,to,-1,.75),from);assert.deepEqual(projectilePath(p,from,to,2,.75),to);
  for(let i=0;i<=100;i++){const t=i/100,point=projectilePath(p,from,to,t,.75),ground=from.y+(to.y-from.y)*t;
   assert.ok(point.x>=to.x&&point.x<=from.x);assert.ok(point.y<=ground+1e-9);assert.ok(ground-point.y<=arc+1e-9);assert.ok(Number.isFinite(projectileRotation(p,from,to,t,.75)));
  }
  assert.equal(projectilePath(p,from,to,.5,.75).y,(from.y+to.y)/2-arc);
  assert.deepEqual(projectilePath(p,from,from,.5),from);
 }
 const from={x:0,y:0},to={x:10,y:0};assert.ok(projectileArcHeight(projectileProfile('catapult'),from,to)<=4.8);
});

test('completion cleans up and invokes one impact even when cleanup reenters completion',()=>{
 let impacts=0,cleanups=0;
 const life=projectileLifecycle(()=>impacts++,()=>{cleanups++;life.finish();life.cancel();});
 life.finish();life.finish();life.cancel();assert.equal(life.state,'complete');assert.equal(life.active,false);assert.equal(impacts,1);assert.equal(cleanups,1);
});

test('reset cancellation cleans up exactly once and suppresses delayed impacts',()=>{
 let impacts=0,cleanups=0;
 const life=projectileLifecycle(()=>impacts++,()=>{cleanups++;life.finish();});
 life.cancel();life.finish();life.cancel();assert.equal(life.state,'cancelled');assert.equal(impacts,0);assert.equal(cleanups,1);
});

// A minimal scene clock exercises the production renderer without loading a
// browser/WebGL context. Killing a tween matches Phaser's silent removal.
class TestObject extends EventEmitter{
 x=0;y=0;alpha=1;rotation=0;displayWidth=0;displayHeight=0;originX=.5;originY=.5;name='';frame='';texture='';destroyed=false;flightProgress=0;
 constructor(x=0,y=0,texture='',frame=''){super();this.x=x;this.y=y;this.texture=texture;this.frame=frame;}
 setName(v:string){this.name=v;return this;}setOrigin(x:number,y=x){this.originX=x;this.originY=y;return this;}
 setDisplaySize(w:number,h:number){this.displayWidth=w;this.displayHeight=h;return this;}
 setRotation(v:number){this.rotation=v;return this;}setDepth(){return this;}
 setAlpha(v:number){this.alpha=v;return this;}setScale(){return this;}
 setPosition(x:number,y:number){this.x=x;this.y=y;return this;}setFrame(v:string){this.frame=v;return this;}
 fillStyle(){return this;}lineStyle(){return this;}fillCircle(){return this;}fillEllipse(){return this;}
 fillTriangle(){return this;}strokeCircle(){return this;}strokeRect(){return this;}lineBetween(){return this;}clear(){return this;}
 destroy(){if(this.destroyed)return;this.destroyed=true;this.emit('destroy');}
}
function testScene(){
 const objects:TestObject[]=[],tweens:TestTween[]=[],events=new EventEmitter().setMaxListeners(0);
 type Config={targets:TestObject;duration:number;onUpdate?:()=>void;onComplete?:()=>void;[key:string]:unknown};
 class TestTween{
  elapsed=0;removed=false;starts:Record<string,number>={};
  constructor(readonly config:Config){for(const [key,value]of Object.entries(config))if(typeof value==='number'&&key!=='duration')this.starts[key]=Number((config.targets as unknown as Record<string,unknown>)[key]??0);}
  step(ms:number){if(this.removed)return;this.elapsed+=ms;const t=Math.min(1,this.elapsed/this.config.duration),target=this.config.targets as unknown as Record<string,unknown>;
   for(const [key,start]of Object.entries(this.starts))target[key]=start+(Number(this.config[key])-start)*t;
   this.config.onUpdate?.();if(t===1&&!this.removed){this.removed=true;this.config.onComplete?.();}
  }
  remove(){this.removed=true;return this;}
 }
 const clock={timeScale:1,add(config:Config){const tween=new TestTween(config);tweens.push(tween);return tween;},killTweensOf(target:TestObject){for(const tween of tweens)if(tween.config.targets===target)tween.remove();}};
 const raw={events,textures:{exists:()=>true,get:()=>({has:()=>true})},tweens:clock,add:{
  sprite(x:number,y:number,key:string,frame:string){const object=new TestObject(x,y,key,frame);objects.push(object);return object;},
  graphics(){const object=new TestObject();objects.push(object);return object;}
 }};
 return {scene:raw as unknown as Phaser.Scene,objects,tweens,events,clock,tick(ms:number){for(const tween of [...tweens])tween.step(ms*clock.timeScale);}};
}

test('illustrated lightning is a connected beam at every animation frame',()=>{
 const mock=testScene(),from={x:35,y:80},to={x:230,y:160};let impacts=0;
 playTowerProjectile(mock.scene,{typeId:'lightning',from,to,onImpact:()=>impacts++});
 const beam=mock.objects.find(o=>o.name==='battle-projectile-lightning')!;
 const endpoint=(sign:number)=>({x:beam.x+sign*Math.cos(beam.rotation)*beam.displayWidth/2,y:beam.y+sign*Math.sin(beam.rotation)*beam.displayWidth/2});
 for(let i=0;i<4;i++){
  const a=endpoint(-1),b=endpoint(1);assert.ok(Math.abs(a.x-from.x)<1e-9&&Math.abs(a.y-from.y)<1e-9);assert.ok(Math.abs(b.x-to.x)<1e-9&&Math.abs(b.y-to.y)<1e-9);
  mock.tick(45);
 }
 assert.notEqual(beam.frame,'lightning-0');assert.equal(impacts,0);mock.tick(100);assert.equal(impacts,1);assert.equal(towerProjectileEffectCount(mock.scene),0);
});

test('double displays one round at launch and two after 65ms, with one final impact',()=>{
 const mock=testScene();let impacts=0;
 playTowerProjectile(mock.scene,{typeId:'double',from:{x:0,y:0},to:{x:140,y:45},onImpact:()=>impacts++});
 const rounds=()=>mock.objects.filter(o=>o.name==='battle-projectile-double');assert.equal(rounds().length,1);
 mock.tick(64);assert.equal(rounds().length,1);mock.tick(1);assert.equal(rounds().length,2);
 assert.notDeepEqual({x:rounds()[0].x,y:rounds()[0].y},{x:rounds()[1].x,y:rounds()[1].y});assert.equal(impacts,0);
 mock.tick(195);assert.equal(impacts,0);assert.equal(rounds()[0].alpha,0);mock.tick(64);assert.equal(impacts,0);
 mock.tick(1);mock.tweens[0].config.onComplete?.();assert.equal(impacts,1);assert.ok(mock.objects.every(o=>o.destroyed));assert.equal(towerProjectileEffectCount(mock.scene),0);
});

test('rotating catapult keeps its illustrated stone core on the parabola',()=>{
 const mock=testScene(),from={x:30,y:100},to={x:230,y:150},profile=projectileProfile('catapult');
 playTowerProjectile(mock.scene,{typeId:'catapult',from,to,onImpact:()=>{}});const stone=mock.objects.find(o=>o.name==='battle-projectile-catapult')!;
 assert.deepEqual({x:stone.originX,y:stone.originY},profile.core);assert.notEqual(stone.originX,.5);
 for(let i=0;i<3;i++){
  mock.tick(105);const point=projectilePath(profile,from,to,(i+1)/4),coreX=(profile.core.x-stone.originX)*stone.displayWidth,coreY=(profile.core.y-stone.originY)*stone.displayHeight;
  const actual={x:stone.x+coreX*Math.cos(stone.rotation)-coreY*Math.sin(stone.rotation),y:stone.y+coreX*Math.sin(stone.rotation)+coreY*Math.cos(stone.rotation)};
  assert.ok(Math.abs(actual.x-point.x)<1e-9&&Math.abs(actual.y-point.y)<1e-9);
 }
 clearTowerProjectiles(mock.scene);
});

test('pausing before the second launch freezes the double shot sound gap clock',()=>{
 const mock=testScene();let impacts=0;
 playTowerProjectile(mock.scene,{typeId:'double',from:{x:0,y:0},to:{x:200,y:0},onImpact:()=>impacts++});mock.tick(50);
 mock.clock.timeScale=0;mock.tick(1000);assert.equal(mock.objects.filter(o=>o.name==='battle-projectile-double').length,1);assert.equal(impacts,0);
 mock.clock.timeScale=1;mock.tick(15);assert.equal(mock.objects.filter(o=>o.name==='battle-projectile-double').length,2);
 mock.tick(260);assert.equal(impacts,1);assert.equal(towerProjectileEffectCount(mock.scene),0);
});

test('the scene tween clock pauses frames, paths and trails together',()=>{
 const mock=testScene();let impacts=0;
 playTowerProjectile(mock.scene,{typeId:'rune',from:{x:0,y:0},to:{x:150,y:0},onImpact:()=>impacts++});mock.tick(80);
 const snapshot=mock.objects.map(o=>[o.x,o.y,o.frame,o.alpha]),count=towerProjectileEffectCount(mock.scene);
 mock.clock.timeScale=0;mock.tick(1000);assert.deepEqual(mock.objects.map(o=>[o.x,o.y,o.frame,o.alpha]),snapshot);assert.equal(towerProjectileEffectCount(mock.scene),count);assert.equal(impacts,0);
 mock.clock.timeScale=1;mock.tick(300);assert.equal(impacts,1);assert.equal(towerProjectileEffectCount(mock.scene),0);
});

test('destroying a tracked lead or clearing a scene cancels all delayed impacts',()=>{
 const mock=testScene(),tracked:TestObject[]=[];let impacts=0;
 playTowerProjectile(mock.scene,{typeId:'siege',from:{x:0,y:0},to:{x:200,y:0},track:o=>tracked.push(o as unknown as TestObject),onImpact:()=>impacts++});mock.tick(100);
 tracked.find(o=>o.name==='battle-projectile-siege')!.destroy();mock.tick(1000);assert.equal(impacts,0);assert.equal(towerProjectileEffectCount(mock.scene),0);assert.ok(tracked.every(o=>o.destroyed));
 playTowerProjectile(mock.scene,{typeId:'lightning',from:{x:0,y:0},to:{x:200,y:0},onImpact:()=>impacts++});
 clearTowerProjectiles(mock.scene);clearTowerProjectiles(mock.scene);mock.tick(1000);assert.equal(impacts,0);assert.equal(towerProjectileEffectCount(mock.scene),0);
 playTowerProjectile(mock.scene,{typeId:'basic',from:{x:0,y:0},to:{x:200,y:0},onImpact:()=>impacts++});mock.events.emit('shutdown');mock.tick(1000);assert.equal(impacts,0);assert.equal(towerProjectileEffectCount(mock.scene),0);
});

test('reduced motion preserves each signature without trails or missed impacts',()=>{
 const mock=testScene();let impacts=0;
 for(const typeId of PROJECTILE_IDS)playTowerProjectile(mock.scene,{typeId,from:{x:0,y:0},to:{x:200,y:0},reducedMotion:true,onImpact:()=>impacts++});
 assert.equal(new Set(mock.objects.map(o=>o.name)).size,12);assert.equal(mock.objects.length,12);assert.ok(mock.objects.every(o=>o.name.startsWith('battle-projectile-')));
 const snapshot=mock.objects.map(o=>[o.x,o.y,o.frame,o.rotation]);mock.tick(50);assert.deepEqual(mock.objects.map(o=>[o.x,o.y,o.frame,o.rotation]),snapshot);
 mock.tick(15);assert.equal(mock.objects.length,13);mock.tick(35);assert.equal(impacts,11);mock.tick(65);assert.equal(impacts,12);assert.equal(towerProjectileEffectCount(mock.scene),0);
});

test('effect saturation skips visual allocation while retaining one impact per shot',()=>{
 const mock=testScene();let impacts=0;
 for(let i=0;i<150;i++)playTowerProjectile(mock.scene,{typeId:'basic',from:{x:0,y:0},to:{x:200,y:0},reducedMotion:true,onImpact:()=>impacts++});
 assert.equal(towerProjectileEffectCount(mock.scene),120);assert.equal(impacts,30);mock.tick(100);assert.equal(impacts,150);assert.equal(towerProjectileEffectCount(mock.scene),0);
});
