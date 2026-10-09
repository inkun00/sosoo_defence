import test from 'node:test';
import assert from 'node:assert/strict';
import type Phaser from 'phaser';
import {createDuel,joinDuel,applyDuel,type DuelState,type Side} from '../src/multiplayer/duel';
import {HeroSummonStream,type HeroSummonEvent} from '../src/multiplayer/hero-summon-stream';
import {HeroSummonEffects,heroSummonPose} from '../src/multiplayer/hero-summon-effects';
import {heroSummonStyle} from '../src/hero-summon-style';
import {duelPathDistance} from '../src/multiplayer/duel-maps';

const now=100000;
function state():DuelState{
 const s=createDuel('left','나',17,now,10,{rewardHeroes:['hero-1-0','hero-10-1'],rewardHero:'hero-1-0'});
 joinDuel(s,'right','친구',now,10,{rewardHeroes:['hero-10-1'],rewardHero:'hero-10-1'});
 applyDuel(s,0,{type:'ready'},now,'l');applyDuel(s,1,{type:'ready'},now,'r');return s;
}
function summon(s:DuelState,owner:Side=0):void{assert.equal(applyDuel(s,owner,{type:'summon-reward'},now,'reserve').ok,true);s.revision++;}

test('grade palettes and spectacle budgets grow at each two-level rank boundary',()=>{
 const expected=['일반','고급','희귀','전설','신화'];
 for(let level=1;level<=10;level++){
  const p=heroSummonStyle(level);assert.equal(p.rank,Math.ceil(level/2));assert.equal(p.label,expected[p.rank-1]);
  assert.match(p.cssColor,/^#[a-f0-9]{6}$/);assert.match(p.cssAccent,/^#[a-f0-9]{6}$/);
  if(level>2&&level%2){const before=heroSummonStyle(level-1);for(const key of ['rings','particles','duration','columnHeight'] as const)assert.ok(p[key]>before[key]);}
 }
 assert.equal(heroSummonStyle(NaN).rank,1);assert.equal(heroSummonStyle(1000).rank,5);assert.equal(heroSummonStyle(-2).rank,1);
});

test('host mutable state and remote snapshots emit each collected hero once for both owners',()=>{
 const s=state(),host=new HeroSummonStream(),guest=new HeroSummonStream();
 assert.deepEqual(host.take('room',s),[]);assert.deepEqual(guest.take('room',structuredClone(s)),[]);
 summon(s);const a=host.take('room',s),b=guest.take('room',structuredClone(s));assert.deepEqual(a,b);assert.equal(a.length,1);assert.equal(a[0].owner,0);assert.equal(a[0].heroId,'hero-1-0');
 assert.deepEqual(host.take('room',s),[]);assert.deepEqual(guest.take('room',structuredClone(s)),[]);
 summon(s,1);const events=host.take('room',s);assert.equal(events.length,1);assert.equal(events[0].owner,1);assert.equal(events[0].level,10);assert.deepEqual(guest.take('room',structuredClone(s)),events);
});

test('ordinary hatching and escorts are excluded even when the hero matches the reserve',()=>{
 const s=state(),stream=new HeroSummonStream();stream.take('room',s);s.players[0].egg=1;
 assert.equal(applyDuel(s,0,{type:'hatch',heroId:'hero-1-0'},now,'egg').ok,true);s.revision++;
 assert.deepEqual(stream.take('room',s),[]);const ordinary=s.enemies[0].id;
 // A second ordinary hatch and the reserve can arrive in one remote snapshot.
 s.players[0].egg=1;applyDuel(s,0,{type:'hatch',heroId:'hero-1-0'},now,'egg2');summon(s);
 const selected=stream.take('room',s);assert.equal(selected.length,1);assert.notEqual(selected[0].enemyId,ordinary);assert.equal(selected[0].enemyId,s.enemies.find(e=>e.rewardSummon)?.id);
 summon(s,1);const right=stream.take('room',s);assert.equal(right.length,1);assert.equal(right[0].heroId,'hero-10-1');assert.ok(s.enemies.filter(e=>e.owner===1&&!e.hero).length>0);
});

test('baseline, reconnect, stale revisions, expired gaps and room reset do not replay a summon',()=>{
 const s=state(),stream=new HeroSummonStream();summon(s);assert.deepEqual(stream.take('room',s),[]);
 assert.deepEqual(stream.take('room',structuredClone(s)),[]);assert.deepEqual(stream.take('room',null),[]);assert.deepEqual(stream.take('room',s),[]);
 const fresh=state();stream.take('another',fresh);const old=structuredClone(fresh);summon(fresh);assert.equal(stream.take('another',fresh).length,1);
 assert.deepEqual(stream.take('another',old),[]);fresh.revision++;assert.deepEqual(stream.take('another',fresh),[]);
 const late=state();stream.take('late',late);summon(late);late.elapsed=3;assert.deepEqual(stream.take('late',late),[]);late.revision++;assert.deepEqual(stream.take('late',late),[]);
 const retired=state();stream.take('finished',retired);summon(retired);retired.status='finished';assert.deepEqual(stream.take('finished',retired),[]);
});

test('old host snapshots without the marker still emit one valid reserve transition',()=>{
 const s=state(),stream=new HeroSummonStream();stream.take('legacy',s);summon(s);for(const enemy of s.enemies)delete enemy.rewardSummon;
 assert.equal(stream.take('legacy',s).length,1);assert.deepEqual(stream.take('legacy',s),[]);
});

test('reserve entrance uses the curved road position for both host and guest snapshots',()=>{
 const s=state();s.mapId='storm-step';const host=new HeroSummonStream(),guest=new HeroSummonStream();host.take('curve',s);guest.take('curve',structuredClone(s));
 summon(s);const enemy=s.enemies.find(e=>e.rewardSummon)!;enemy.pathDistance=duelPathDistance(s.mapId,2,1);enemy.x=2;enemy.y=1;
 const events=host.take('curve',s);assert.equal(events.length,1);assert.equal(events[0].x,2);assert.equal(events[0].y,1);assert.deepEqual(guest.take('curve',structuredClone(s)),events);
});

test('visual entrance settles with no changes to the authoritative position or reduced motion',()=>{
 const first=heroSummonPose(0);assert.ok(Math.abs(first.scale-.6)<1e-10);assert.equal(first.alpha,0);assert.equal(first.lift,0);
 assert.ok(heroSummonPose(250).scale>1);assert.ok(heroSummonPose(250).lift>0);
 assert.deepEqual(heroSummonPose(520),{scale:1,alpha:1,lift:0});assert.deepEqual(heroSummonPose(250,true),{scale:1,alpha:1,lift:0});
});

function fakeScene(){
 const objects:{destroyed:boolean;commands:string[];[key:string]:unknown}[]=[],mask={destroyed:false,destroy(){this.destroyed=true;}};
 const make=()=>{
  const object={destroyed:false,commands:[] as string[],destroy(){this.destroyed=true;},createGeometryMask(){return mask;}};
  const proxy=new Proxy(object,{get(target,key){if(key in target)return Reflect.get(target,key);return (..._args:unknown[])=>{target.commands.push(String(key));return proxy;};}});
  objects.push(proxy);return proxy;
 };
 const scene={time:{now:0},add:{graphics:make,text:make},make:{graphics:make}};
 return {scene:scene as unknown as Phaser.Scene,clock:scene.time,objects,mask};
}
const event=(enemyId:number,level=10):HeroSummonEvent=>({enemyId,owner:0,heroId:'hero-'+level+'-0',level,name:'소환 영웅',x:1});

test('summoning effects are bounded, expire, and destroy their mask on shutdown',()=>{
 const f=fakeScene(),effects=new HeroSummonEffects(f.scene,{left:0,right:912,top:0,bottom:266},false);
 effects.play(event(1),58,130);effects.play(event(1),58,130);assert.equal(effects.count,1);
 effects.play(event(2),800,130);effects.play(event(3),58,130);assert.equal(effects.count,2);assert.equal(f.objects.filter(o=>!o.destroyed).length,5);
 f.clock.now=100;effects.update();assert.ok(f.objects.some(o=>o.commands.includes('fillTriangle')));assert.ok(effects.pose(3));
 f.clock.now=5000;effects.update();assert.equal(effects.count,0);assert.equal(f.objects.filter(o=>!o.destroyed).length,1);
 effects.destroy();assert.ok(f.mask.destroyed);assert.ok(f.objects.every(o=>o.destroyed));
});

test('reduced motion shows a brief static ring and badge without a light column or bounce',()=>{
 const f=fakeScene(),effects=new HeroSummonEffects(f.scene,{left:0,right:912,top:0,bottom:266},true);
 effects.play(event(1),58,130);f.clock.now=200;effects.update();assert.equal(effects.pose(1),undefined);
 assert.ok(f.objects.some(o=>o.commands.includes('strokeEllipse')));assert.ok(f.objects.every(o=>!o.commands.includes('fillTriangle')&&!o.commands.includes('fillCircle')));
 f.clock.now=651;effects.update();assert.equal(effects.count,0);effects.destroy();
});
