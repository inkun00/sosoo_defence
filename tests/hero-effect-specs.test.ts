import {test} from 'node:test';
import assert from 'node:assert/strict';
import {HEROES,HeroEffect,heroEffectStats,heroSpec,heroesAtLevel} from '../src/multiplayer/heroes';

test('기존 영웅 30종의 식별자와 이미지 행을 보존하며 영웅당 효과 하나를 부여한다',()=>{
 const ids=Array.from({length:10},(_,index)=>Array.from({length:3},(_,variant)=>`hero-${index+1}-${variant}`)).flat();
 assert.deepEqual(HEROES.map(hero=>hero.id),ids);assert.equal(new Set(ids).size,30);
 for(let level=1;level<=10;level++){
  const heroes=heroesAtLevel(level);assert.equal(heroes.length,3);
  for(const hero of heroes){
   assert.equal(heroSpec(hero.id),hero);assert.equal(hero.level,level);
   assert.equal(hero.sheet,`heroes-level-${level}-v1`);assert.equal(hero.row,hero.variant);
   assert.equal(typeof hero.effect,'string');assert.ok(hero.hp>0&&hero.hp<10000);
  }
 }
});

test('다섯 효과에는 각각 6명씩 배정하고 낮은 레벨과 높은 레벨 모두 포함한다',()=>{
 const effects:HeroEffect[]=['haste','vitality','shield','enemy-slow','tower-haste'];
 assert.deepEqual([...new Set(HEROES.map(hero=>hero.effect))].sort(),effects.slice().sort());
 for(const effect of effects){
  const heroes=HEROES.filter(hero=>hero.effect===effect);assert.equal(heroes.length,6);
  assert.ok(heroes.some(hero=>hero.level<=2));assert.ok(heroes.some(hero=>hero.level>=9));
 }
});

test('레벨별 효과는 0.1에서 0.46으로 증가하고 반경은 2칸에서 5칸으로 넓어진다',()=>{
 assert.deepEqual(heroEffectStats(1),{amount:.1,radius:2,shieldHits:1});
 assert.deepEqual(heroEffectStats(10),{amount:.46,radius:5,shieldHits:2});
 for(let level=2;level<=10;level++){
  const current=heroEffectStats(level),before=heroEffectStats(level-1);
  assert.equal(current.amount,Number((.1+(level-1)*.04).toFixed(2)));
  assert.ok(current.amount>before.amount);assert.ok(current.radius>=before.radius);
 }
 assert.equal(heroEffectStats(3).radius,2);assert.equal(heroEffectStats(4).radius,3);
 assert.equal(heroEffectStats(7).shieldHits,1);assert.equal(heroEffectStats(8).shieldHits,2);
 assert.deepEqual(heroEffectStats(NaN),heroEffectStats(1));assert.deepEqual(heroEffectStats(-2),heroEffectStats(1));assert.deepEqual(heroEffectStats(100),heroEffectStats(10));
});

test('카드 설명에 실제 효과 강도와 반경 및 쉴드 방어 횟수를 표시한다',()=>{
 for(const hero of HEROES){
  const stats=heroEffectStats(hero.level);assert.ok(hero.description.includes(`반경 ${stats.radius}칸`));
  if(hero.effect==='shield'){
   assert.ok(hero.description.includes(`공격 ${stats.shieldHits}회 방어`));assert.ok(hero.description.includes('재충전 없음'));
  }else assert.ok(hero.description.includes(`${Math.round(stats.amount*100)}%`));
  assert.doesNotMatch(hero.description,/돌 병사|감속 저항/);
 }
});
