import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Defense,Tower} from '../src/model';
import {LEVELS} from '../src/levels';
import {MONSTERS,monsterSize} from '../src/monsters';

test('10단계 최강 몬스터의 체력과 크기가 단계마다 커지고 최종 보스를 포함한 6종이 등장한다',()=>{
 let hp=0,size=0;const kinds=new Set<string>();
 for(const l of LEVELS){
  const m=new Defense(l);for(let i=0;i<l.hp.length;i++)m.spawn();
  const strongest=m.enemies.reduce((a,b)=>a.max>b.max?a:b);
  assert.ok(strongest.max>hp);hp=strongest.max;
  const nextSize=monsterSize(strongest.kind,l.id);assert.ok(nextSize>=size);size=nextSize;
  m.enemies.forEach(e=>kinds.add(e.kind));
  assert.equal(m.enemies.length,12);m.spawn();assert.equal(m.enemies.length,12);
 }
 assert.equal(kinds.size,6);assert.ok(size>MONSTERS.slime.size*2.5);
});
test('거대 보스도 큰 공격을 거부하며 실제 유효 타격으로만 정확히 0이 된다',()=>{
 const m=new Defense(LEVELS[9]);for(let i=0;i<12;i++)m.spawn();
 const boss=m.enemies[11];assert.equal(boss.kind,'warden');assert.ok(boss.max>9000&&boss.max<10000);
 const t={unit:1000,effect:'basic'} as Tower;
 while(boss.hp>=1000)m.damage(boss,t);
 const tail=boss.hp,hits=boss.hits;m.damage(boss,t);
 assert.equal(boss.hp,tail);assert.equal(boss.hits,hits);
 t.unit=100;while(boss.hp>=100)m.damage(boss,t);
 t.unit=10;while(boss.hp>0)m.damage(boss,t);
 assert.equal(boss.hp,0);assert.equal(m.kills,1);
 assert.ok(m.events.some(e=>e.type==='kill'));
});
