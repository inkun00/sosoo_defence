import test from 'node:test';
import assert from 'node:assert/strict';
import {BossFinaleFlow} from '../src/boss-finale-flow';
import {Defense,Enemy,Tower} from '../src/model';
import {LEVELS,FINAL_STAGE} from '../src/levels';

function defeat(m:Defense,e:Enemy){
 const units=[...m.level.units].sort((a,b)=>b-a);
 while(e.hp>0)m.damage(e,{unit:units.find(unit=>unit<=e.hp)!,effect:'basic'} as Tower);
}

test('final result waits even when model wins before the killing projectile impacts',()=>{
 const m=new Defense(LEVELS[FINAL_STAGE-1]),flow=new BossFinaleFlow();
 for(let i=0;i<m.level.hp.length;i++)m.spawn();m.spawnBoss();
 for(const e of m.enemies)defeat(m,e);
 m.phase='playing';m.elapsed=m.duration-.05;m.step(.1);
 assert.equal(m.phase,'won');assert.ok(m.bossDefeated);assert.ok(m.goals.every(g=>g.done));
 assert.equal(flow.hold(m.level.id,m.bossDefeated),true);assert.equal(flow.phase,'waiting');
 // Every event/heartbeat can update the result before that delayed impact.
 for(let i=0;i<4;i++)assert.equal(flow.hold(m.level.id,m.bossDefeated),true);
 assert.equal(flow.begin(),true);assert.equal(flow.phase,'playing');
 assert.equal(flow.hold(m.level.id,m.bossDefeated),true);
 assert.equal(flow.finish(),true);assert.equal(flow.phase,'complete');
 assert.equal(flow.hold(m.level.id,m.bossDefeated),false);assert.equal(m.phase,'won');
});

test('an early wizard defeat resumes the remaining wave instead of ending the adventure',()=>{
 const m=new Defense(LEVELS[FINAL_STAGE-1]),flow=new BossFinaleFlow();
 m.phase='playing';m.elapsed=20;m.spawn();m.spawnBoss();
 defeat(m,m.enemies.find(e=>e.kind==='wizard')!);
 assert.equal(m.phase,'playing');assert.ok(m.enemies.some(e=>e.kind!=='wizard'&&e.hp>0));
 const elapsed=m.elapsed,remaining=m.enemies.find(e=>e.hp>0)!,position={x:remaining.x,y:remaining.y};
 assert.equal(flow.hold(m.level.id,m.bossDefeated),true);assert.equal(flow.begin(),true);
 // The scene skips model.step while held; no wave time or position advances.
 if(!flow.hold(m.level.id,m.bossDefeated))m.step(.1);
 assert.equal(m.elapsed,elapsed);assert.deepEqual({x:remaining.x,y:remaining.y},position);
 assert.equal(flow.finish(),true);assert.equal(flow.hold(m.level.id,m.bossDefeated),false);
 m.step(.1);assert.equal(m.phase,'playing');assert.ok(m.elapsed>elapsed);
 assert.ok(m.enemies.some(e=>e.kind!=='wizard'&&e.hp>0));
});

test('ordinary bosses, a living wizard, and a leaked wizard never start the finale',()=>{
 const flow=new BossFinaleFlow();
 assert.equal(flow.hold(10,true),false);assert.equal(flow.hold(1,true),false);
 const m=new Defense(LEVELS[FINAL_STAGE-1]);m.spawnBoss();
 assert.equal(flow.hold(m.level.id,m.bossDefeated),false);
 m.phase='playing';m.enemies[0].next=m.enemies[0].path.length;m.step(.1);
 assert.equal(m.leaks,1);assert.equal(m.bossDefeated,false);
 assert.equal(flow.hold(m.level.id,m.bossDefeated),false);
 assert.equal(flow.phase,'idle');assert.equal(flow.begin(),false);assert.equal(flow.finish(),false);
});

test('duplicate impacts and completion callbacks can begin and finish only once',()=>{
 const flow=new BossFinaleFlow();let presentations=0,completions=0;
 assert.equal(flow.finish(),false);assert.equal(flow.begin(),false);
 assert.equal(flow.hold(FINAL_STAGE,true),true);
 for(let i=0;i<3;i++)if(flow.begin())presentations++;
 assert.equal(presentations,1);assert.equal(flow.phase,'playing');
 for(let i=0;i<3;i++)if(flow.finish())completions++;
 assert.equal(completions,1);assert.equal(flow.hold(FINAL_STAGE,true),false);
 assert.equal(flow.begin(),false);assert.equal(flow.finish(),false);
 const retry=new BossFinaleFlow();assert.equal(retry.hold(FINAL_STAGE,true),true);
 assert.equal(retry.begin(),true,'a new stage instance may present its own final defeat');
});
