import test from 'node:test';
import assert from 'node:assert/strict';
import {BossIntroFlow} from '../src/boss-intro-flow';
import {bossIntroFrame,BossIntroClock,BOSS_INTRO_DURATION,BOSS_INTRO_STORY,BOSS_INTRO_MECHANICS} from '../src/boss-intro-story';
import {Defense} from '../src/model';
import {FINAL_STAGE,LEVELS} from '../src/levels';

test('stage eleven entry holds preparation for resume, next, selection and every retry',()=>{
 const flow=new BossIntroFlow();
 for(const entry of ['resume','next','selection','retry','retry']){
  const model=new Defense(LEVELS[FINAL_STAGE-1],{bricks:[100,200,300],walls:2}),token=flow.enter(model.level.id)!;
  const before={elapsed:model.elapsed,money:model.money,phase:model.phase,inventory:JSON.stringify(model.inventory)};
  assert.equal(flow.held,true,entry);assert.equal(flow.begin(token),true,entry);
  for(let i=0;i<30;i++)if(!flow.held)model.step(.1);
  assert.deepEqual({elapsed:model.elapsed,money:model.money,phase:model.phase,inventory:JSON.stringify(model.inventory)},before);
  assert.equal(model.towers.length,0);assert.equal(model.pendingPurchase,null);
  assert.equal(flow.finish(token),true);assert.equal(flow.held,false);assert.equal(model.phase,'ready');
  assert.equal(flow.begin(token),false);assert.equal(flow.finish(token),false);
 }
});

test('other stages and tutorial do not hold, and obsolete callbacks cannot release a new visit',()=>{
 const flow=new BossIntroFlow();
 for(let stage=1;stage<FINAL_STAGE;stage++){assert.equal(flow.enter(stage),null);assert.equal(flow.held,false);}
 assert.equal(flow.enter(FINAL_STAGE,true),null);assert.equal(flow.held,false);
 const old=flow.enter(FINAL_STAGE)!;assert.ok(flow.begin(old));flow.cancel();
 const current=flow.enter(FINAL_STAGE)!;assert.ok(flow.begin(current));
 assert.equal(flow.finish(old),false);assert.equal(flow.held,true);assert.equal(flow.phase,'playing');
 assert.ok(flow.finish(current));assert.equal(flow.held,false);
 const pending=flow.enter(FINAL_STAGE)!;flow.enter(10);
 assert.equal(flow.begin(pending),false);assert.equal(flow.finish(pending),false);assert.equal(flow.held,false);
});

test('three dialogue beats cover fourteen seconds and share exact transition boundaries',()=>{
 assert.equal(BOSS_INTRO_STORY.length,3);assert.equal(BOSS_INTRO_DURATION,14);
 let time=0;
 for(let index=0;index<BOSS_INTRO_STORY.length;index++){
  const frame=bossIntroFrame(time);assert.equal(frame.index,index);assert.ok(Math.abs(frame.local)<1e-8);assert.equal(frame.complete,false);
  time+=BOSS_INTRO_STORY[index].duration;
 }
 const final=bossIntroFrame(time+100);assert.equal(final.index,2);assert.equal(final.progress,1);assert.equal(final.complete,true);assert.equal(final.dialogue,BOSS_INTRO_STORY[2].line);
 for(const invalid of [-3,NaN,Infinity])assert.equal(bossIntroFrame(invalid).time,0);
 assert.match(BOSS_INTRO_STORY.map(beat=>beat.line).join(' '),/감속과 기절/);
 assert.deepEqual(BOSS_INTRO_MECHANICS,['저주 범위 3칸','이동 속도 +25%','감속 중 속도 60% → 80%','기절에서 2배 빠르게 회복']);
});

test('reduced motion exposes the complete dialogue immediately without the speaking pulse',()=>{
 for(const seconds of [0,3.8,9.8]){
  const frame=bossIntroFrame(seconds,true);assert.equal(frame.dialogue,frame.beat.line);assert.equal(frame.speaking,false);
 }
 assert.equal(bossIntroFrame(0).dialogue,'');assert.ok(bossIntroFrame(.7).dialogue.length>0);assert.equal(bossIntroFrame(.7).speaking,true);
});

test('pause, hidden tabs and reset baselines do not advance or catch up presentation time',()=>{
 const clock=new BossIntroClock();clock.tick(1000,false);assert.equal(clock.tick(1100,false),.1);
 clock.tick(1110,true);clock.tick(50000,true);assert.equal(clock.elapsed,.1);
 clock.tick(50100,false);assert.equal(clock.elapsed,.1);clock.tick(50200,false);assert.equal(clock.elapsed,.2);
 clock.resetBaseline();clock.tick(90000,false);assert.equal(clock.elapsed,.2);
 clock.tick(90100,false);assert.ok(Math.abs(clock.elapsed-.3)<1e-8);
 clock.tick(90050,false);assert.ok(Math.abs(clock.elapsed-.3)<1e-8);
 for(let time=90200;!bossIntroFrame(clock.elapsed).complete;time+=100)clock.tick(time,false);
 assert.equal(clock.elapsed,BOSS_INTRO_DURATION);
});
