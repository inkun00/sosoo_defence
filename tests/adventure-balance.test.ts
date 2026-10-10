import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Defense,CASTLE_HEALTH} from '../src/model';
import {LEVELS} from '../src/levels';
import type {Difficulty} from '../src/difficulty';
import {numberText} from '../src/math';

function automatic(stage:number,difficulty:Difficulty,formation:string){
 const m=new Defense(LEVELS[stage-1],undefined,difficulty);
 for(const entry of formation.split(';')){
  const [id,coordinates]=entry.split('@'),[x,y]=coordinates.split(',').map(Number);
  assert.ok(m.requestPurchase({x,y},id));const q=m.pendingPurchase!;
  assert.ok(m.answerPurchase(numberText(q.before-q.cost)));
 }
 const purchases=m.purchases;assert.ok(m.start());
 for(let frame=0;frame<3000&&m.phase==='playing';frame++){m.step(.1);m.events=[];}
 assert.equal(m.switches,0);assert.equal(m.purchases,purchases);assert.ok(m.towers.every(t=>t.enabled));
 return m;
}

test('첫 안내 단계의 한 포탑은 표준에서 여유가 있지만 도전에서는 집중 웨이브를 버티지 못한다',()=>{
 const standard=automatic(1,'standard','basic@10,3'),challenge=automatic(1,'challenge','basic@10,3');
 assert.equal(standard.phase,'won');assert.equal(standard.castle,5);assert.equal(standard.kills,12);
 assert.equal(challenge.phase,'lost');assert.equal(challenge.castle,0);
});
test('2단계 도전은 같은 세 개의 작은 타워만으로 표준의 무손실 방어를 반복하지 못한다',()=>{
 const formation='basic@11,3;pebble@13,3;needle@13,2';
 const standard=automatic(2,'standard',formation),challenge=automatic(2,'challenge',formation);
 assert.equal(standard.phase,'won');assert.equal(standard.castle,5);
 assert.equal(challenge.phase,'lost');assert.equal(challenge.castle,0);
});
test('3단계 표준은 준비금을 남겨도 세 개의 불완전한 타워 구성으로 다음 웨이브를 버티지 못한다',()=>{
 const m=automatic(3,'standard','catapult@1,3;basic@11,5;needle@13,6');
 assert.equal(m.phase,'lost');assert.equal(m.castle,0);assert.ok(m.level.budget-m.towers.reduce((sum,t)=>sum+t.cost,0)>3000);
});
test('4~5단계 표준 혼합 구성은 인접 타워의 정상 재장전으로 성벽 없이 무손실 방어한다',()=>{
 for(const [stage,formation] of [
  [4,'catapult@2,6;catapult@3,6;frost@2,5;basic@13,4;pebble@13,6;needle@13,3'],
  [5,'catapult@2,6;catapult@7,4;crystal@2,5;basic@8,4;pebble@13,3;needle@13,4'],
 ] as const){
  const m=automatic(stage,'standard',formation);
  assert.equal(m.phase,'won');assert.ok(m.goals.every(goal=>goal.done));assert.equal(m.castle,CASTLE_HEALTH);
  assert.equal(m.leaks,0);assert.equal(m.kills,m.enemyCount);assert.equal(m.enemies.length,0);assert.equal(m.wallPlacements,0);
  assert.ok(m.towers.some(t=>m.towers.some(other=>other!==t&&Math.abs(other.x-t.x)<=1&&Math.abs(other.y-t.y)<=1)),'혼합 구성에 바로 이웃한 타워가 포함된다');
  assert.ok(m.towers.every(t=>m.reloadFactor(t)===1),'이웃한 타워도 정상 재장전 간격을 유지한다');
 }
});
