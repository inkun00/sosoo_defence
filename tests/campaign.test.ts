import {test} from 'node:test';
import assert from 'node:assert/strict';
import {playLevel} from '../tools/simulate';
import type {Event as BattleEvent} from '../src/model';
import {LEVELS} from '../src/levels';
for(const difficulty of ['practice','standard','challenge'] as const)for(let stage=1;stage<=LEVELS.length;stage++)test(`${difficulty} 단계 ${stage}: 2분 웨이브와 남은 몬스터 방어에서 합법적인 조작으로 학습 목표 달성`,()=>{
 let equations=0;
 const checkEvents=(events:BattleEvent[])=>{
  for(const e of events)if(e.message.includes(' = ')){
   equations++;const operands=e.message.split(' · ')[0].match(/\d+(?:\.\d+)?/g)!.map(Number);
   const bossEquation=e.type==='hit'&&(e.data as {kind?:string})?.kind==='wizard';
   assert.ok(operands.every(n=>n>=0&&n<(bossEquation?100:10)),e.message);
  }
 };
 // Fixed formations must succeed without buying, selling or moving mid-wave.
 let m=playLevel(stage,difficulty,checkEvents);
 for(let layout=1;layout<10&&m.phase!=='won';layout++)m=playLevel(stage,difficulty,checkEvents,layout);
 assert.deepEqual(m.towers.map(t=>({id:t.id,x:t.x,y:t.y,typeId:t.typeId})),m.formation);assert.equal(m.purchases,m.formation.length);
 assert.ok(equations>0);
 assert.equal(m.phase,'won');assert.ok(m.goals.every(g=>g.done));
 if(m.level.boss){assert.ok(m.bossSpawned&&m.bossDefeated);assert.equal(m.enemies.length,0);}
 assert.equal(m.elapsed,120);assert.ok(m.simulationSeconds>=120&&m.simulationSeconds<=300);assert.ok(m.money>=0);assert.ok(m.castle>0);
 assert.ok(m.towers.length<=m.balance.towerLimit);assert.ok(m.towers.filter(t=>t.unit===10).length<=m.balance.precisionLimit);assert.ok(m.walls.length<=m.balance.wallLimit);
});

test('후반에는 같은 혼합 타워를 한곳에 몰거나 기본 포탑만 채우면 실패하고 분산 배치로 통과한다',()=>{
 const spread=playLevel(10,'standard'),cluster=playLevel(10,'standard',undefined,-1),spam=playLevel(10,'standard',undefined,0,Array(14).fill('basic'));
 assert.equal(spread.phase,'won');assert.equal(cluster.phase,'lost');assert.equal(spam.phase,'lost');
 assert.deepEqual(cluster.towers.map(t=>t.typeId),spread.towers.map(t=>t.typeId));
 assert.equal(cluster.money,spread.level.budget-cluster.towers.reduce((sum,t)=>sum+t.cost,0));
 assert.ok(spam.towers.length>spread.towers.length,'타워 수만 늘려도 통과하지 못한다');
 assert.ok(cluster.towers.some(t=>cluster.reloadFactor(t)>1));
});
