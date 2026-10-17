import {test} from 'node:test';
import assert from 'node:assert/strict';
import {playLevel} from '../tools/simulate';
import type {Event as BattleEvent} from '../src/model';
import {LEVELS} from '../src/levels';
for(const difficulty of ['practice','standard','challenge'] as const)for(let stage=1;stage<=LEVELS.length;stage++)test(`${difficulty} 단계 ${stage}: 2분 웨이브와 남은 몬스터 방어에서 합법적인 조작으로 학습 목표 달성`,()=>{
 let equations=0;
 const checkEvents=(events:BattleEvent[])=>{
  for(const e of events)if(e.message.includes(' = ')){
   equations++;const equation=e.message.split(' · ')[0],tokens=equation.match(/\d+(?:\.\d+)?/g)!;
   assert.equal(tokens.length,3,e.message);
   const operands=tokens.map(token=>{assert.match(token,/^\d+(?:\.\d{1,2})?$/,e.message);const [whole,fraction='']=token.split('.');return Number(whole)*1000+Number(fraction.padEnd(3,'0'));});
   assert.ok(operands.every(n=>Number.isSafeInteger(n)&&n>=0&&n%10===0),e.message);
   const bossEquation=e.type==='hit'&&(e.data as {kind?:string})?.kind==='wizard';
   const fullWalletPurchase=e.type==='money'&&(e.data as {reason?:string})?.reason==='purchase';
   if(fullWalletPurchase)assert.ok(operands[1]<10000,e.message);
   else assert.ok(operands.every(n=>n<(bossEquation?100000:10000)),e.message);
   assert.ok(equation.includes(' − ')||equation.includes(' + '),e.message);
   assert.equal(equation.includes(' − ')?operands[0]-operands[1]:operands[0]+operands[1],operands[2],e.message);
  }
 };
 // Fixed formations use only stocked walls before the first monster appears.
 // Wall-learning stages start with the required inventory carried from earlier stages.
 const level=LEVELS[stage-1],inventory={bricks:[],walls:level.goal==='wall'||level.goal==='both'?level.requiredFusions??1:0};
 let m=playLevel(stage,difficulty,checkEvents,0,undefined,inventory);
 for(let layout=1;layout<10&&m.phase!=='won';layout++)m=playLevel(stage,difficulty,checkEvents,layout,undefined,inventory);
 assert.deepEqual(m.towers.map(t=>({id:t.id,x:t.x,y:t.y,typeId:t.typeId})),m.formation);assert.equal(m.purchases,m.formation.length);
 assert.ok(equations>0);
 assert.equal(m.phase,'won');assert.ok(m.goals.every(g=>g.done));
 assert.equal(m.wallPlacements,inventory.walls);assert.equal(m.canPlaceWall,false);assert.equal(m.canBuild,false);
 if(m.level.boss){assert.ok(m.bossSpawned&&m.bossDefeated);assert.equal(m.enemies.length,0);}
 assert.equal(m.elapsed,120);assert.ok(m.simulationSeconds>=120&&m.simulationSeconds<=300);assert.ok(m.money>=0);assert.ok(m.castle>0);
 assert.ok(m.towers.length<=m.balance.towerLimit);assert.ok(m.towers.filter(t=>t.unit===10).length<=m.balance.precisionLimit);assert.ok(m.walls.length<=m.balance.wallLimit);
});

test('후반에는 같은 혼합 타워를 한곳에 몰거나 기본 포탑만 채우면 실패하고 분산 배치로 통과한다',()=>{
 const inventory={bricks:[],walls:1};
 const spread=playLevel(10,'standard',undefined,0,undefined,inventory),cluster=playLevel(10,'standard',undefined,-1,undefined,inventory),spam=playLevel(10,'standard',undefined,0,Array(14).fill('basic'),inventory);
 assert.equal(spread.phase,'won');assert.equal(cluster.phase,'lost');assert.equal(spam.phase,'lost');
 assert.deepEqual(cluster.towers.map(t=>t.typeId),spread.towers.map(t=>t.typeId));
 assert.equal(cluster.money,spread.level.budget-cluster.towers.reduce((sum,t)=>sum+t.cost,0));
 assert.ok(spam.towers.length>spread.towers.length,'타워 수만 늘려도 통과하지 못한다');
 assert.ok(cluster.towers.every(t=>cluster.reloadFactor(t)===1),'밀집 배치에서도 타워의 재장전 간격은 늘어나지 않는다');
});
