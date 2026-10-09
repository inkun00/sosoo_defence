import test from 'node:test';
import assert from 'node:assert/strict';
import type Phaser from 'phaser';
import {createDuel,joinDuel,applyDuel,advanceDuel,DUEL_PREPARATION_SECONDS,type DuelState} from '../src/multiplayer/duel';
import {HeroSummonStream,type HeroSummonEvent} from '../src/multiplayer/hero-summon-stream';
import {HeroSummonEffects,heroSummonPose} from '../src/multiplayer/hero-summon-effects';
import {heroSummonStyle} from '../src/hero-summon-style';
import {duelPathDistance} from '../src/multiplayer/duel-maps';

const ROOM_NOW=100000,now=ROOM_NOW+DUEL_PREPARATION_SECONDS*1000;
function state():DuelState{
 const s=createDuel('left','나',17,ROOM_NOW,10,{rewardHeroes:['hero-1-0','hero-10-1'],rewardHero:'hero-1-0'});
 joinDuel(s,'right','친구',ROOM_NOW,10,{rewardHeroes:['hero-10-1'],rewardHero:'hero-10-1'});
 return s;
}
function prepare(s:DuelState):void{
 assert.ok(applyDuel(s,0,{type:'ready'},ROOM_NOW,'l').ok);assert.ok(applyDuel(s,1,{type:'ready'},ROOM_NOW,'r').ok);assert.equal(s.status,'preparing');
 s.revision++;
}
function play(s:DuelState):void{s.players.forEach(p=>p!.lastSeen=now);advanceDuel(s,now);assert.equal(s.status,'playing');assert.equal(s.elapsed,0);}

test('grade palettes and spectacle budgets grow at each two-level rank boundary',()=>{
 const expected=['일반','고급','희귀','전설','신화'];
 for(let level=1;level<=10;level++){
  const p=heroSummonStyle(level);assert.equal(p.rank,Math.ceil(level/2));assert.equal(p.label,expected[p.rank-1]);
  assert.match(p.cssColor,/^#[a-f0-9]{6}$/);assert.match(p.cssAccent,/^#[a-f0-9]{6}$/);
  if(level>2&&level%2){const before=heroSummonStyle(level-1);for(const key of ['rings','particles','duration','columnHeight'] as const)assert.ok(p[key]>before[key]);}
 }
 assert.equal(heroSummonStyle(NaN).rank,1);assert.equal(heroSummonStyle(1000).rank,5);assert.equal(heroSummonStyle(-2).rank,1);
});

test('waiting to preparation emits the two selected collected heroes once in host and guest snapshots',()=>{
 const s=state(),host=new HeroSummonStream(),guest=new HeroSummonStream();
 assert.deepEqual(host.take('room',s),[]);assert.deepEqual(guest.take('room',structuredClone(s)),[]);
 prepare(s);const a=host.take('room',s),b=guest.take('room',structuredClone(s));assert.deepEqual(a,b);assert.equal(a.length,2);assert.equal(a[0].owner,0);assert.equal(a[0].heroId,'hero-1-0');
 assert.equal(a[1].owner,1);assert.equal(a[1].level,10);
 assert.deepEqual(host.take('room',s),[]);assert.deepEqual(guest.take('room',structuredClone(s)),[]);
 play(s);assert.deepEqual(host.take('room',s),[]);assert.deepEqual(guest.take('room',structuredClone(s)),[]);
});

test('ordinary hatching is excluded even when the hero matches the reserve, without extra escorts',()=>{
 const s=state(),stream=new HeroSummonStream();stream.take('room',s);prepare(s);assert.equal(stream.take('room',s).length,2);play(s);stream.take('room',s);s.players[0].egg=1;
 assert.equal(applyDuel(s,0,{type:'hatch',heroId:'hero-1-0'},now,'egg').ok,true);s.revision++;
 assert.deepEqual(stream.take('room',s),[]);
 s.players[0].egg=1;applyDuel(s,0,{type:'hatch',heroId:'hero-1-0'},now,'egg2');s.revision++;
 assert.deepEqual(stream.take('room',s),[]);assert.equal(s.enemies.filter(e=>e.owner===0&&e.hero==='hero-1-0').length,3);
 assert.equal(s.enemies.filter(e=>e.owner===1&&!e.hero).length,0);assert.equal(s.enemies.filter(e=>e.owner===1).length,1);
 assert.equal(applyDuel(s,0,{type:'summon-reward'},now,'duplicate').ok,false);
});

test('baseline, reconnect, stale revisions, expired gaps and room reset do not replay a summon',()=>{
 const s=state(),stream=new HeroSummonStream();prepare(s);assert.deepEqual(stream.take('room',s),[]);
 assert.deepEqual(stream.take('room',structuredClone(s)),[]);assert.deepEqual(stream.take('room',null),[]);assert.deepEqual(stream.take('room',s),[]);
 const fresh=state();stream.take('another',fresh);const old=structuredClone(fresh);prepare(fresh);assert.equal(stream.take('another',fresh).length,2);
 assert.deepEqual(stream.take('another',old),[]);fresh.revision++;assert.deepEqual(stream.take('another',fresh),[]);
 const late=state();stream.take('late',late);prepare(late);late.preparationElapsed=3;assert.deepEqual(stream.take('late',late),[]);late.revision++;assert.deepEqual(stream.take('late',late),[]);
 play(late);assert.deepEqual(stream.take('late',late),[],'battle transition cannot replay a consumed preparation entrance');
 const skipped=state();stream.take('skipped',skipped);prepare(skipped);play(skipped);assert.deepEqual(stream.take('skipped',skipped),[],'a missing full preparation minute is not a recent entrance');
 const retired=state();stream.take('finished',retired);prepare(retired);retired.status='finished';assert.deepEqual(stream.take('finished',retired),[]);
});

test('a preparation snapshot without optional enemy markers still identifies both selected heroes',()=>{
 const s=state(),stream=new HeroSummonStream();stream.take('legacy',s);prepare(s);for(const enemy of s.enemies)delete enemy.rewardSummon;
 assert.equal(stream.take('legacy',s).length,2);assert.deepEqual(stream.take('legacy',s),[]);
});

test('reserve entrance uses the curved road position for both host and guest snapshots',()=>{
 const s=state();s.mapId='storm-step';const host=new HeroSummonStream(),guest=new HeroSummonStream();host.take('curve',s);guest.take('curve',structuredClone(s));
 prepare(s);const enemy=s.enemies.find(e=>e.rewardSummon&&e.owner===0)!;enemy.pathDistance=duelPathDistance(s.mapId,2,1);enemy.x=2;enemy.y=1;
 const events=host.take('curve',s);assert.equal(events.length,2);assert.equal(events[0].x,2);assert.equal(events[0].y,1);assert.deepEqual(guest.take('curve',structuredClone(s)),events);
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
