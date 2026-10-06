import {test} from 'node:test';
import assert from 'node:assert/strict';
import {playLevel} from '../tools/simulate';
import type {Event as BattleEvent} from '../src/model';
for(const difficulty of ['practice','standard','challenge'] as const)for(let stage=1;stage<=10;stage++)test(`${difficulty} 단계 ${stage}: 2분 웨이브와 남은 몬스터 방어에서 합법적인 조작으로 학습 목표 달성`,()=>{
 let equations=0;
 const checkEvents=(events:BattleEvent[])=>{
  for(const e of events)if(e.message.includes(' = ')){
   equations++;const operands=e.message.split(' · ')[0].match(/\d+(?:\.\d+)?/g)!.map(Number);
   assert.ok(operands.every(n=>n>=0&&n<10),e.message);
  }
 };
 // Wider spacing supports both a distributed midfield layout and entrance
 // control. Verify a legal winning strategy rather than one greedy layout.
 let m=playLevel(stage,difficulty,checkEvents);
 if(m.phase!=='won'||!m.goals.every(g=>g.done))m=playLevel(stage,difficulty,checkEvents,9);
 assert.ok(equations>0);
 assert.equal(m.phase,'won');assert.ok(m.goals.every(g=>g.done));
 assert.equal(m.elapsed,120);assert.ok(m.simulationSeconds>=120&&m.simulationSeconds<=300);assert.ok(m.money>=0);assert.ok(m.castle>0);
 assert.ok(m.towers.length<=m.balance.towerLimit);assert.ok(m.towers.filter(t=>t.unit===10).length<=m.balance.precisionLimit);assert.ok(m.walls.length<=m.balance.wallLimit);
});
