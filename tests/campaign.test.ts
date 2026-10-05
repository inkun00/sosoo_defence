import {test} from 'node:test';
import assert from 'node:assert/strict';
import {playLevel} from '../tools/simulate';
for(const difficulty of ['practice','standard','challenge'] as const)for(let stage=1;stage<=10;stage++)test(`${difficulty} 단계 ${stage}: 합법적인 구매·회수·배치·발사 조절로 2분 안에 방어와 학습 목표 달성`,()=>{
 const m=playLevel(stage,difficulty);
 assert.equal(m.phase,'won');assert.ok(m.goals.every(g=>g.done));
 assert.equal(m.elapsed,120);assert.ok(m.money>=0);assert.ok(m.castle>0);
 assert.ok(m.towers.length<=m.balance.towerLimit);assert.ok(m.towers.filter(t=>t.unit===10).length<=m.balance.precisionLimit);assert.ok(m.walls.length<=m.balance.wallLimit);
});
