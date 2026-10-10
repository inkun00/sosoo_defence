import test from 'node:test';
import assert from 'node:assert/strict';
import {createDuel,joinDuel,applyDuel,advanceDuel,activeDuelHeroEffects,activeDuelTowerHeroEffects,DUEL_PREPARATION_SECONDS,type DuelState,type DuelEnemy,type DuelTower} from '../src/multiplayer/duel';
import {HEROES,heroEffectStats,type HeroEffect} from '../src/multiplayer/heroes';

const ROOM_NOW=100000,START=ROOM_NOW+DUEL_PREPARATION_SECONDS*1000;
function state(){
 const s=createDuel('a','왼쪽',12,ROOM_NOW);joinDuel(s,'b','오른쪽',ROOM_NOW);applyDuel(s,0,{type:'ready'},ROOM_NOW,'a');applyDuel(s,1,{type:'ready'},ROOM_NOW,'b');
 s.players.forEach(p=>p!.lastSeen=START);advanceDuel(s,START);s.wave=1000;return s;
}
function tick(s:DuelState,seconds=.1){const now=s.updatedAt+seconds*1000;s.players.forEach(p=>p!.lastSeen=now);advanceDuel(s,now);}
function unit(extra:Partial<DuelEnemy>={}):DuelEnemy{return{id:90,owner:0,target:1,hero:null,level:1,hp:1000,max:1000,x:4,y:3,pathDistance:4,slow:0,stun:999,hits:0,...extra};}
function leader(effect:HeroEffect,high=false,extra:Partial<DuelEnemy>={}):DuelEnemy{
 const list=HEROES.filter(h=>h.effect===effect),h=high?list.at(-1)!:list[0];return unit({id:110+HEROES.indexOf(h),hero:h.id,level:h.level,pathDistance:3,...extra});
}
function tower(extra:Partial<DuelTower>={}):DuelTower{return{id:1,typeId:'basic',x:4,y:2,unit:100,cost:100,enabled:true,cooldown:0,...extra};}

test('능력치는 0.1부터 레벨마다 커지고 반경 2→5, Lv8부터 보호막 2회다',()=>{
 assert.deepEqual(heroEffectStats(1),{amount:.1,radius:2,shieldHits:1});assert.deepEqual(heroEffectStats(10),{amount:.46,radius:5,shieldHits:2});
 for(let level=2;level<=10;level++){const a=heroEffectStats(level-1),b=heroEffectStats(level);assert.ok(b.amount>a.amount);assert.ok(b.radius>=a.radius);assert.equal(b.shieldHits,level>=8?2:1);}
});

test('체력 오라는 최대/현재 체력을 올리고 여러 출처 중 가장 강한 것만 적용한다',()=>{
 const s=state(),e=unit(),weak=leader('vitality'),strong=leader('vitality',true);s.enemies=[e,weak,strong];tick(s);
 const bonus=Math.round(1000*heroEffectStats(strong.level).amount/10)*10;
 assert.equal(e.hp,1000+bonus);assert.equal(e.max,e.hp);assert.equal(e.vitalityBaseMax,1000);assert.equal(e.vitalityBonus,bonus);
 assert.equal(e.hp%10,0);assert.deepEqual(activeDuelHeroEffects(s,e),['vitality']);
 strong.hp=0;tick(s);assert.equal(e.hp,1000+Math.round(1000*heroEffectStats(weak.level).amount/10)*10);
 weak.hp=0;tick(s);assert.equal(e.hp,1000);assert.equal(e.max,1000);assert.equal(e.vitalityBonus,0);
});

test('체력 추가분을 먼저 소모하며 재진입/더 강한 영웅으로 이미 소모된 체력을 재충전하지 않는다',()=>{
 const s=state(),e=unit(),source=leader('vitality'),t=tower();s.enemies=[e,source];s.players[1]!.towers=[t];tick(s);
 assert.equal(e.max,1140);assert.equal(e.hp,1040);assert.equal(e.vitalityBonus,40);assert.equal(e.vitalitySpent,100);
 source.pathDistance=20;tick(s);assert.equal(e.hp,1000);assert.equal(e.max,1000);
 source.pathDistance=3;tick(s);assert.equal(e.hp,1040);assert.equal(e.vitalityBonus,40);
 t.cooldown=0;tick(s);assert.equal(e.hp,940);assert.equal(e.vitalitySpent,140);assert.equal(e.vitalityBonus,0);assert.deepEqual(activeDuelHeroEffects(s,e),[]);
 source.pathDistance=20;tick(s);source.pathDistance=3;tick(s);assert.equal(e.hp,940,'빈 추가 체력 풀이 다시 채워지지 않는다');
 const strong=leader('vitality',true);source.hp=0;s.enemies.push(strong);tick(s);assert.equal(e.hp,940+460-140);
 assert.equal(e.vitalitySpent,140,'더 강한 버프로 변경되어도 사용 내역은 유지된다');
});

test('범위 밖에서 깎인 기본 체력은 체력 오라로 돌아와도 회복되지 않는다',()=>{
 const s=state(),e=unit(),source=leader('vitality'),t=tower();s.enemies=[e,source];tick(s);source.pathDistance=20;s.players[1]!.towers=[t];tick(s);
 assert.equal(e.hp,900);assert.equal(e.vitalitySpent??0,0);source.pathDistance=3;tick(s);assert.equal(e.hp,1040);
 source.pathDistance=20;tick(s);assert.equal(e.hp,900);source.pathDistance=3;tick(s);assert.equal(e.hp,1040,'반복 진입해도 원래 1000 체력으로 치유하지 않는다');
});

test('낮은 레벨 보호막은 공격 한 번만 막고 체력·감속·스턴을 바꾸지 않는다',()=>{
 const s=state(),e=unit({stun:0}),source=leader('shield'),t=tower({typeId:'frost',unit:150});s.enemies=[e,source];s.players[1]!.towers=[t];tick(s);
 assert.equal(e.hp,1000);assert.equal(e.hits,0);assert.equal(e.shieldSpent,1);assert.equal(e.slow,0);assert.equal(e.stun,0);
 assert.equal(s.shots[0].shielded,true);assert.equal(s.shots[0].before,s.shots[0].after);assert.deepEqual(activeDuelHeroEffects(s,e),[]);
 t.cooldown=0;tick(s);assert.equal(e.hp,850);assert.equal(e.hits,1);assert.equal(e.slow,3);assert.equal(s.shots.at(-1)!.shielded,undefined);
});

test('높은 레벨 보호막도 동일 틱의 공격 중 두 번만 막고 다른 영웅과 범위 재진입으로 충전하지 않는다',()=>{
 const s=state(),e=unit(),source=leader('shield',true);s.enemies=[e,source,leader('shield',true,{id:999})];s.players[1]!.towers=[tower(),tower({id:2}),tower({id:3})];tick(s);
 assert.equal(e.shieldSpent,2);assert.equal(e.hp,900);assert.equal(e.hits,1);assert.deepEqual(s.shots.map(shot=>!!shot.shielded),[true,true,false]);
 s.enemies=s.enemies.filter(o=>o===e||o===source);source.pathDistance=20;tick(s);source.pathDistance=3;s.players[1]!.towers=[tower()];tick(s);
 assert.equal(e.hp,800);assert.equal(e.shieldSpent,2);assert.equal(s.shots.at(-1)!.shielded,undefined);
});

test('보호막 바깥 공격은 막지 않고 사망한 출처는 아이콘과 방어를 즉시 중단한다',()=>{
 const s=state(),e=unit(),source=leader('shield',false,{pathDistance:7});s.enemies=[e,source];s.players[1]!.towers=[tower()];tick(s);
 assert.equal(e.hp,900);assert.equal(e.shieldSpent,undefined);source.pathDistance=3;source.hp=0;s.players[1]!.towers[0].cooldown=0;tick(s);
 assert.equal(e.hp,800);assert.deepEqual(activeDuelHeroEffects(s,e),[]);
});

test('보호막이 스턴 포탑의 실제 공격도 막아 피해와 스턴을 함께 방지한다',()=>{
 const s=state(),e=unit({stun:0}),source=leader('shield');s.enemies=[e,source];s.players[1]!.towers=[tower({typeId:'lightning',unit:350})];tick(s);
 assert.equal(e.hp,1000);assert.equal(e.stun,0);assert.equal(e.hits,0);assert.equal(s.shots[0].shielded,true);
});

test('보호막은 체력 추가분도 소모하지 않고 소진 다음 공격에서만 추가 체력을 깎는다',()=>{
 const s=state(),e=unit(),t=tower();s.enemies=[e,leader('shield'),leader('vitality')];s.players[1]!.towers=[t];tick(s);
 assert.equal(e.hp,1140);assert.equal(e.vitalityBonus,140);assert.equal(e.vitalitySpent??0,0);
 t.cooldown=0;tick(s);assert.equal(e.hp,1040);assert.equal(e.vitalityBonus,40);assert.equal(e.vitalitySpent,100);
});

test('상대 포탑 감속과 내 포탑 가속은 실제 공격 빈도를 감소/증가시킨다',()=>{
 function count(effect:HeroEffect|null){
  const s=state(),e=unit({owner:1,target:0,hp:20000,max:20000}),t=tower();s.enemies=[e];s.players[0].towers=[t];
  if(effect)s.enemies.push(leader(effect,true,{owner:effect==='enemy-slow'?1:0,target:effect==='enemy-slow'?0:1,hp:10000,max:10000}));
  tick(s,10);return e.hits;
 }
 const normal=count(null),fast=count('tower-haste'),slow=count('enemy-slow');
 assert.ok(fast>normal,`${fast} > ${normal}`);assert.ok(slow<normal,`${slow} < ${normal}`);
});

test('포탑 공격속도는 동일효과 최강만 적용하고 가속과 감속을 함께 계산한다',()=>{
 const s=state(),t=tower({cooldown:2}),buff=leader('tower-haste',true),weak=leader('tower-haste'),debuff=leader('enemy-slow',true,{owner:1,target:0});
 s.players[0].towers=[t];s.enemies=[unit({owner:1,target:0,hp:10000,max:10000}),buff,weak,debuff];
 assert.deepEqual(activeDuelTowerHeroEffects(s,0,t),['enemy-slow','tower-haste']);tick(s,1);
 const rate=(1+heroEffectStats(buff.level).amount)*(1-heroEffectStats(debuff.level).amount);assert.ok(Math.abs(t.cooldown-(2-rate))<1e-10);
 buff.hp=weak.hp=debuff.hp=0;tick(s,.1);assert.ok(Math.abs(t.cooldown-(2-rate-.1))<1e-10);assert.deepEqual(activeDuelTowerHeroEffects(s,0,t),[]);
});

test('체력 오라 영웅은 120초 준비 후 수동 소환 때 초기화되고 전투 전환에 중복 적용되지 않는다',()=>{
 const h=HEROES.find(hero=>hero.effect==='vitality')!,s=createDuel('a','왼쪽',12,ROOM_NOW,1,{rewardHeroes:[h.id],rewardHero:h.id});joinDuel(s,'b','오른쪽',ROOM_NOW);
 applyDuel(s,0,{type:'ready'},ROOM_NOW,'a');applyDuel(s,1,{type:'ready'},ROOM_NOW,'b');
 assert.equal(s.enemies.length,0);
 for(let i=0;i<5;i++){tick(s,20);assert.equal(s.status,'preparing');assert.equal(s.enemies.length,0);}
 tick(s,20);assert.equal(s.status,'playing');assert.equal(s.enemies.length,0);
 assert.ok(applyDuel(s,0,{type:'summon-reward'},START,'summon').ok);
 const e=s.enemies[0];assert.ok(e.hp>h.hp);assert.equal(e.max,e.hp);const hp=e.hp;
 tick(s,.1);assert.equal(e.hp,hp,'동일 체력 오라를 다시 더하지 않는다');
});
