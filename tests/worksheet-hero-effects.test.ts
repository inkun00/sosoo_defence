import {test} from 'node:test';
import assert from 'node:assert/strict';
import {activeDuelHeroEffects,activeDuelTowerHeroEffects,advanceDuel,applyDuel,createDuel,duelEnemyPosition,joinDuel,DUEL_PREPARATION_SECONDS,type DuelEnemy,type DuelState,type DuelTower} from '../src/multiplayer/duel';
import {HEROES,WORKSHEET_HEROES,heroEffectStats,heroSpec,heroesAtLevel,worksheetHeroSpec,type HeroEffect} from '../src/multiplayer/heroes';

const ROOM_NOW=100000,NOW=ROOM_NOW+DUEL_PREPARATION_SECONDS*1000;
const triples:readonly (readonly HeroEffect[])[]=[['haste','vitality','tower-haste'],['vitality','shield','enemy-slow'],['haste','shield','enemy-slow']];
function match(rewardHero='hero-1-0'):DuelState{
 const s=createDuel('a','왼쪽',17,ROOM_NOW,1,{rewardHeroes:[rewardHero],rewardHero});joinDuel(s,'b','오른쪽',ROOM_NOW);
 applyDuel(s,0,{type:'ready'},ROOM_NOW,'left');applyDuel(s,1,{type:'ready'},ROOM_NOW,'right');s.players.forEach(p=>p!.lastSeen=NOW);advanceDuel(s,NOW);s.wave=1000;return s;
}
function enemy(extra:Partial<DuelEnemy>={}):DuelEnemy{return {id:90,owner:0,target:1,hero:null,level:1,hp:1000,max:1000,x:4,y:3,pathDistance:4,slow:0,stun:0,hits:0,...extra};}
function collected(level:number,variant:number,extra:Partial<DuelEnemy>={}):DuelEnemy{
 const hero=worksheetHeroSpec(`hero-${level}-${variant}`)!;return enemy({id:100+level*3+variant,hero:hero.id,level,hp:hero.hp,max:hero.hp,rewardSummon:true,pathDistance:3,...extra});
}
function tower(extra:Partial<DuelTower>={}):DuelTower{return {id:50,typeId:'basic',x:4,y:2,unit:100,cost:0,enabled:true,cooldown:1,...extra};}

test('학습지 영웅은 기존 30개 ID와 기본 체력을 유지하며 이름·시트·세 효과를 별도로 가진다',()=>{
 assert.equal(WORKSHEET_HEROES.length,30);assert.equal(new Set(WORKSHEET_HEROES.map(h=>h.name)).size,30);assert.deepEqual(WORKSHEET_HEROES.map(h=>h.id),HEROES.map(h=>h.id));
 for(const reward of WORKSHEET_HEROES){
  const base=heroSpec(reward.id)!;assert.notEqual(reward,base);assert.notEqual(reward.name,base.name);assert.equal(reward.hp,base.hp);assert.equal(reward.level,base.level);
  assert.equal(reward.sheet,'worksheet-heroes-v1');assert.equal(reward.row,reward.variant);assert.deepEqual(reward.effects,triples[reward.variant]);assert.equal(reward.effect,reward.effects![0]);
  assert.equal(base.effects,undefined);assert.equal(base.sheet,`heroes-level-${base.level}-v1`);assert.ok(heroesAtLevel(base.level).includes(base));
  assert.match(reward.name,[/별빛.*마도사/,/달빛.*기사/,/새벽.*불사조/][reward.variant]);
  for(const effect of reward.effects!){
   const detail={'haste':'이동 속도','vitality':'최대 체력','shield':'소진 후 재충전 없음','enemy-slow':'상대 포탑 공격 속도','tower-haste':'내 포탑 공격 속도'}[effect];assert.ok(reward.description.includes(detail));
  }
 }
 assert.equal(worksheetHeroSpec('unknown'),undefined);assert.equal(heroSpec('unknown'),undefined);
});

test('이전에 획득한 ID로 수집 영웅을 소환하면 가속·체력 강화·아군 타워 가속이 동시에 적용된다',()=>{
 const s=match('hero-1-0'),unit=enemy({pathDistance:1.5,x:1.5}),opponent=enemy({id:91,owner:1,target:0,pathDistance:1.5,x:1.5}),allyTower=tower({x:2}),otherTower=tower({id:51,x:2});
 s.enemies=[unit,opponent];s.players[0].towers=[allyTower];
 const result=applyDuel(s,0,{type:'summon-reward'},NOW,'legacy-reward');assert.equal(result.ok,true);assert.ok(result.message.includes(worksheetHeroSpec('hero-1-0')!.name));
 const leader=s.enemies.find(e=>e.rewardSummon)!;assert.equal(leader.hero,'hero-1-0');assert.equal(leader.vitalityBaseMax,heroSpec('hero-1-0')!.hp);assert.equal(s.players[0].rewardUsed,true);
 assert.deepEqual(activeDuelHeroEffects(s,unit),['haste','vitality']);assert.deepEqual(activeDuelHeroEffects(s,opponent),[]);assert.equal(unit.hp,1100);assert.equal(unit.max,1100);
 assert.deepEqual(activeDuelTowerHeroEffects(s,0,allyTower),['tower-haste']);assert.deepEqual(activeDuelTowerHeroEffects(s,1,otherTower),[]);
 assert.ok(Math.abs(duelEnemyPosition(s,unit,1).x-(1.5+.249*1.1))<1e-12);
 advanceDuel(s,NOW+100);assert.ok(Math.abs(allyTower.cooldown-.89)<1e-12);
 assert.equal(applyDuel(s,0,{type:'summon-reward'},s.updatedAt,'duplicate').ok,false);
});

test('세 가족의 몬스터 효과와 상대 타워 감속은 살아 있는 같은 편 출처와 실제 반경을 따른다',()=>{
 const expected:HeroEffect[][]=[['haste','vitality'],['vitality','shield'],['haste','shield']];
 for(let variant=0;variant<3;variant++){
  const s=match(),unit=enemy({pathDistance:12}),opponent=enemy({id:91,owner:1,target:0,pathDistance:12}),leader=collected(1,variant,{pathDistance:12}),enemyTower=tower({x:13}),allyTower=tower({x:13});s.enemies=[unit,opponent,leader];
  assert.deepEqual(activeDuelHeroEffects(s,unit),expected[variant]);assert.deepEqual(activeDuelHeroEffects(s,opponent),[]);
  assert.deepEqual(activeDuelTowerHeroEffects(s,1,enemyTower),variant===0?[]:['enemy-slow']);assert.deepEqual(activeDuelTowerHeroEffects(s,0,allyTower),variant===0?['tower-haste']:[]);
  leader.pathDistance=20;assert.deepEqual(activeDuelHeroEffects(s,unit),[]);assert.deepEqual(activeDuelTowerHeroEffects(s,1,enemyTower),[]);
  leader.pathDistance=12;leader.hp=0;assert.deepEqual(activeDuelHeroEffects(s,unit),[]);assert.deepEqual(activeDuelTowerHeroEffects(s,1,enemyTower),[]);
 }
});

test('중복 수집 영웅의 같은 효과는 최강 하나만 적용되고 약한 출처가 남으면 그 수치로 줄어든다',()=>{
 const s=match(),unit=enemy(),weak=collected(1,0),strong=collected(10,0),duplicate=collected(10,0,{id:200}),t=tower();s.enemies=[unit,weak,strong,duplicate];s.players[0].towers=[t];
 const amount=heroEffectStats(10).amount;advanceDuel(s,NOW+100);assert.equal(unit.hp,1460);assert.equal(unit.max,1460);assert.ok(Math.abs(t.cooldown-(1-.1*(1+amount)))<1e-12);
 assert.ok(Math.abs(duelEnemyPosition(s,unit,1).x-(unit.pathDistance!+.249*(1+amount)))<1e-12);
 strong.hp=duplicate.hp=0;advanceDuel(s,NOW+200);assert.equal(unit.hp,1100);assert.equal(unit.max,1100);assert.ok(Math.abs(duelEnemyPosition(s,unit,1).x-(unit.pathDistance!+.249*1.1))<1e-12);
});

test('아군 타워 가속과 상대 타워 감속은 서로 곱해 적용하고 편이 바뀌면 적용 타워도 바뀐다',()=>{
 const s=match(),left=collected(10,0,{pathDistance:11}),right=collected(10,1,{id:200,owner:1,target:0,pathDistance:12}),t=tower({x:10});s.enemies=[left,right];s.players[0].towers=[t];
 assert.deepEqual(activeDuelTowerHeroEffects(s,0,t),['enemy-slow','tower-haste']);assert.deepEqual(activeDuelTowerHeroEffects(s,1,t),[]);
 const amount=heroEffectStats(10).amount;advanceDuel(s,NOW+100);assert.ok(Math.abs(t.cooldown-(1-.1*(1+amount)*(1-amount)))<1e-12);
 left.owner=1;left.target=0;right.owner=0;right.target=1;assert.deepEqual(activeDuelTowerHeroEffects(s,0,t),[]);assert.deepEqual(activeDuelTowerHeroEffects(s,1,t),['enemy-slow','tower-haste']);
});

test('수집 영웅 보호막과 체력 완충은 이탈·재진입·동급 출처 교체로 재충전되지 않는다',()=>{
 const s=match(),unit=enemy({pathDistance:12.5}),leader=collected(1,1,{pathDistance:12}),t=tower({x:13,cooldown:0});s.enemies=[unit,leader];s.players[1]!.towers=[t];
 advanceDuel(s,NOW+100);assert.equal(unit.shieldSpent,1);assert.equal(unit.hp,1100);assert.equal(s.shots[0].shielded,true);
 leader.pathDistance=4;t.cooldown=1;advanceDuel(s,NOW+200);assert.equal(unit.hp,1000);assert.deepEqual(activeDuelHeroEffects(s,unit),[]);
 leader.pathDistance=12;advanceDuel(s,NOW+300);assert.equal(unit.hp,1100);assert.deepEqual(activeDuelHeroEffects(s,unit),['vitality']);
 t.cooldown=0;advanceDuel(s,NOW+400);assert.equal(unit.hp,1000);assert.equal(unit.vitalitySpent,100);assert.equal(unit.shieldSpent,1);assert.equal(s.shots.at(-1)!.shielded,undefined);
 leader.hp=0;t.cooldown=1;advanceDuel(s,NOW+500);s.enemies.push(collected(1,1,{id:300,pathDistance:12}));advanceDuel(s,NOW+600);
 assert.equal(unit.hp,1000);assert.equal(unit.shieldSpent,1);assert.equal(unit.vitalitySpent,100);assert.deepEqual(activeDuelHeroEffects(s,unit),[]);
});

test('상위 학습지 영웅의 보호막은 두 번만 막고 새 동급 출처가 와도 소진 상태를 유지한다',()=>{
 const s=match(),unit=enemy({pathDistance:12.5}),leader=collected(10,2,{pathDistance:12}),t=tower({x:13,cooldown:0});s.enemies=[unit,leader];s.players[1]!.towers=[t];
 assert.equal(heroEffectStats(10).shieldHits,2);
 for(let hit=1;hit<=2;hit++){t.cooldown=0;advanceDuel(s,NOW+hit*100);assert.equal(unit.shieldSpent,hit);assert.equal(unit.hp,1000);assert.equal(s.shots.at(-1)!.shielded,true);}
 assert.deepEqual(activeDuelHeroEffects(s,unit),['haste']);t.cooldown=0;advanceDuel(s,NOW+300);assert.equal(unit.hp,900);assert.equal(s.shots.at(-1)!.shielded,undefined);
 leader.hp=0;s.enemies.push(collected(10,2,{id:300,pathDistance:12}));t.cooldown=0;advanceDuel(s,NOW+400);
 assert.equal(unit.shieldSpent,2);assert.equal(unit.hp,800);assert.equal(s.shots.at(-1)!.shielded,undefined);assert.deepEqual(activeDuelHeroEffects(s,unit),['haste']);
});

test('일반 부화·비축 소환은 수집 영웅과 같은 ID라도 기존 단일 효과를 유지한다',()=>{
 for(const marker of [undefined,false] as const){
  const s=match(),unit=enemy(),leader=collected(1,0,{rewardSummon:marker}),t=tower();s.enemies=[unit,leader];
  assert.deepEqual(activeDuelHeroEffects(s,unit),['haste']);assert.deepEqual(activeDuelTowerHeroEffects(s,0,t),[]);advanceDuel(s,NOW+100);assert.equal(unit.hp,1000);assert.equal(unit.max,1000);
 }
 const s=match('hero-1-0');s.players[0].heroStock={'hero-1-0':1};assert.equal(applyDuel(s,0,{type:'summon',heroId:'hero-1-0'},NOW,'ordinary').ok,true);
 const normal=s.enemies[0];assert.equal(normal.rewardSummon,undefined);assert.equal(normal.hp,heroSpec('hero-1-0')!.hp);assert.deepEqual(activeDuelHeroEffects(s,normal),['haste']);
});
