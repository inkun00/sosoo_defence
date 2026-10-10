import {test} from 'node:test';
import assert from 'node:assert/strict';
import {activeDuelHeroEffects,activeDuelTowerHeroEffects,advanceDuel,applyDuel,createDuel,duelEnemyPosition,joinDuel,DUEL_PREPARATION_SECONDS,type DuelEnemy,type DuelState,type DuelTower} from '../src/multiplayer/duel';
import {HEROES,heroEffectStats,type HeroEffect} from '../src/multiplayer/heroes';
import {duelPathDistance,duelMapSpeedScale} from '../src/multiplayer/duel-maps';

const ROOM_NOW=100000,NOW=ROOM_NOW+DUEL_PREPARATION_SECONDS*1000;
function match(mapId?:string):DuelState{
 const s=createDuel('a','왼쪽',17,ROOM_NOW,1,{},mapId);joinDuel(s,'b','오른쪽',ROOM_NOW);
 assert.ok(applyDuel(s,0,{type:'ready'},ROOM_NOW,'r1').ok);assert.ok(applyDuel(s,1,{type:'ready'},ROOM_NOW,'r2').ok);
 s.players.forEach(p=>p!.lastSeen=NOW);advanceDuel(s,NOW);s.wave=1000;return s;
}
function enemy(extra:Partial<DuelEnemy>={}):DuelEnemy{
 return {id:90,owner:0,target:1,hero:null,level:1,hp:1000,max:1000,x:4,y:3,pathDistance:4,slow:0,stun:0,hits:0,...extra};
}
function hero(effect:HeroEffect,high=false,extra:Partial<DuelEnemy>={}):DuelEnemy{
 const choices=HEROES.filter(h=>h.effect===effect),spec=high?choices.at(-1)!:choices[0];
 return enemy({id:100+HEROES.indexOf(spec),hero:spec.id,level:spec.level,pathDistance:3,...extra});
}

test('가속 아이콘은 낮은 레벨 반경 2칸 경계와 살아 있는 같은 편 영웅만 판정한다',()=>{
 const s=match(),unit=enemy(),leader=hero('haste',false,{pathDistance:6});s.enemies=[unit,leader];
 const before=JSON.stringify(s);assert.deepEqual(activeDuelHeroEffects(s,unit),['haste']);assert.equal(JSON.stringify(s),before);
 leader.pathDistance=6.0001;assert.deepEqual(activeDuelHeroEffects(s,unit),[]);
 leader.pathDistance=6;leader.owner=1;assert.deepEqual(activeDuelHeroEffects(s,unit),[]);
 leader.owner=0;leader.hp=0;assert.deepEqual(activeDuelHeroEffects(s,unit),[]);
 leader.hp=500;leader.hero='unknown';assert.deepEqual(activeDuelHeroEffects(s,unit),[]);
 leader.hero='hero-1-0';unit.hp=0;assert.deepEqual(activeDuelHeroEffects(s,unit),[]);
});

test('굽은 길의 효과는 경로거리나 오래된 좌표 대신 실제 2D 위치를 사용한다',()=>{
 const s=match('ember-bend'),unit=enemy({pathDistance:7,x:22,y:6}),leader=hero('haste',false,{pathDistance:11,x:0,y:0});s.enemies=[unit,leader];
 assert.deepEqual(activeDuelHeroEffects(s,unit),[]);
 leader.pathDistance=duelPathDistance(s.mapId,7,1);assert.deepEqual(activeDuelHeroEffects(s,unit),['haste']);
 leader.pathDistance=11;leader.hero=hero('haste',true).hero;leader.level=hero('haste',true).level;
 assert.deepEqual(activeDuelHeroEffects(s,unit),['haste'],'높은 레벨 반경은 같은 굽이를 감싼다');
 const t:DuelTower={id:1,typeId:'basic',x:9,y:2,unit:100,cost:100,enabled:true,cooldown:0};
 leader.hero=hero('tower-haste',false).hero;leader.level=1;
 assert.deepEqual(activeDuelTowerHeroEffects(s,0,t),['tower-haste']);
 t.x=13;assert.deepEqual(activeDuelTowerHeroEffects(s,0,t),[]);
});

test('같은 효과는 최강 하나만 사용하고 레벨이 높은 영웅은 가속 수치와 범위가 커진다',()=>{
 const s=match(),unit=enemy(),weak=hero('haste',false,{pathDistance:5}),strong=hero('haste',true,{pathDistance:8});s.enemies=[unit,weak,strong];
 const amount=heroEffectStats(strong.level).amount,base=.24+.009;
 assert.deepEqual(activeDuelHeroEffects(s,unit),['haste']);assert.deepEqual(activeDuelHeroEffects(s,strong),['haste']);
 assert.ok(Math.abs(duelEnemyPosition(s,unit,1).x-(4+base*(1+amount)))<1e-12);
 advanceDuel(s,NOW+100);assert.ok(Math.abs(unit.pathDistance!-(4+base*(1+amount)*.1))<1e-12);
 strong.hp=0;assert.ok(Math.abs(duelEnemyPosition(s,unit,1).x-(unit.pathDistance!+base*1.1))<1e-12);
 unit.slow=3;assert.ok(Math.abs(duelEnemyPosition(s,unit,1).x-(unit.pathDistance!+base*1.1*.6))<1e-12,'기존 개인 감속 저항은 사라진다');
});

test('다른 영웅의 세 몬스터 효과는 함께 표시되고 적 포탑/내 포탑 효과는 몬스터에 표시하지 않는다',()=>{
 const s=match(),unit=enemy();s.enemies=[unit,...(['haste','vitality','shield','enemy-slow','tower-haste'] as HeroEffect[]).map(effect=>hero(effect))];
 assert.deepEqual(activeDuelHeroEffects(s,unit),['haste','vitality','shield']);
 unit.shieldSpent=1;assert.deepEqual(activeDuelHeroEffects(s,unit),['haste','vitality']);
 unit.vitalitySpent=1000;assert.deepEqual(activeDuelHeroEffects(s,unit),['haste']);
});

test('포탑 아이콘도 올바른 편, 거리, 죽은 출처를 판정하며 동일 효과를 중첩하지 않는다',()=>{
 const s=match(),t:DuelTower={id:1,typeId:'basic',x:4,y:2,unit:100,cost:100,enabled:true,cooldown:0},buff=hero('tower-haste'),debuff=hero('enemy-slow',false,{owner:1,target:0});
 s.enemies=[buff,debuff,hero('tower-haste',true),hero('enemy-slow',true,{owner:1,target:0})];
 const before=JSON.stringify(s);assert.deepEqual(activeDuelTowerHeroEffects(s,0,t),['enemy-slow','tower-haste']);assert.equal(JSON.stringify(s),before);
 s.enemies=[buff,debuff];buff.owner=1;debuff.owner=0;assert.deepEqual(activeDuelTowerHeroEffects(s,0,t),[]);
 buff.owner=0;debuff.owner=1;buff.hp=debuff.hp=0;assert.deepEqual(activeDuelTowerHeroEffects(s,0,t),[]);
 buff.hp=1000;buff.pathDistance=20;assert.deepEqual(activeDuelTowerHeroEffects(s,0,t),[]);
});

test('기존 군집 동반 병사는 제거되고 수집 소환과 알 부화는 영웅 한 개체씩 생성한다',()=>{
 const s=createDuel('a','왼쪽',17,ROOM_NOW,3,{rewardHeroes:['hero-3-1'],rewardHero:'hero-3-1'});joinDuel(s,'b','오른쪽',ROOM_NOW);
 applyDuel(s,0,{type:'ready'},ROOM_NOW,'a');applyDuel(s,1,{type:'ready'},ROOM_NOW,'b');
 assert.equal(s.enemies.length,0);assert.equal(s.players[0].rewardUsed,false);
 s.players.forEach(p=>p!.lastSeen=NOW);advanceDuel(s,NOW);s.players[1]!.egg=3;
 assert.equal(applyDuel(s,0,{type:'summon-reward'},NOW,'reward').ok,true);assert.equal(s.enemies[0].rewardSummon,true);
 assert.equal(applyDuel(s,1,{type:'hatch',heroId:'hero-3-1'},NOW,'h').ok,true);
 assert.equal(s.enemies.length,2);assert.ok(s.enemies.every(e=>!!e.hero&&!e.sourceHeroId));
 assert.equal(applyDuel(s,0,{type:'summon-reward'},NOW,'duplicate').ok,false);
});

test('성장량으로 같은 일반 영웅을 여러 번 소환해도 단일 효과만 적용되고 수집 소환은 별도 세 효과다',()=>{
 const s=createDuel('a','왼쪽',17,ROOM_NOW,1,{rewardHeroes:['hero-1-0'],rewardHero:'hero-1-0'});joinDuel(s,'b','오른쪽',ROOM_NOW);
 applyDuel(s,0,{type:'ready'},ROOM_NOW,'a');applyDuel(s,1,{type:'ready'},ROOM_NOW,'b');s.players.forEach(p=>p!.lastSeen=NOW);advanceDuel(s,NOW);
 const p=s.players[0],unit=enemy({pathDistance:1.5}),opponent=enemy({id:91,owner:1,target:0,pathDistance:1.5}),t:DuelTower={id:1,typeId:'basic',x:1,y:2,unit:100,cost:0,enabled:true,cooldown:1};s.enemies=[unit,opponent];p.egg=3;
 for(let i=0;i<2;i++)assert.equal(applyDuel(s,0,{type:'hatch',heroId:'hero-1-0'},NOW,`normal-${i}`).ok,true);
 assert.equal(p.egg,1);assert.equal(p.rewardUsed,false);assert.equal(s.enemies.filter(e=>e.hero).length,2);assert.ok(s.enemies.filter(e=>e.hero).every(e=>!e.rewardSummon));
 assert.deepEqual(activeDuelHeroEffects(s,unit),['haste']);assert.deepEqual(activeDuelHeroEffects(s,opponent),[]);assert.deepEqual(activeDuelTowerHeroEffects(s,0,t),[]);assert.equal(unit.hp,1000);assert.equal(unit.max,1000);
 assert.ok(Math.abs(duelEnemyPosition(s,unit,1).x-(1.5+.249*1.1))<1e-12,'동일 가속 두 개가 중첩되지 않는다');
 assert.equal(applyDuel(s,0,{type:'summon-reward'},NOW,'reward').ok,true);assert.equal(p.egg,1);assert.equal(p.rewardUsed,true);
 assert.deepEqual(activeDuelHeroEffects(s,unit),['haste','vitality']);assert.deepEqual(activeDuelTowerHeroEffects(s,0,t),['tower-haste']);assert.deepEqual(activeDuelHeroEffects(s,opponent),[]);assert.equal(unit.hp,1100);assert.equal(unit.max,1100);
 assert.equal(applyDuel(s,0,{type:'summon-reward'},NOW,'reward-again').ok,false);assert.equal(p.egg,1);
});

test('굽은 맵의 실제 이동에도 같은 가속 배율과 맵 길이 보정이 적용된다',()=>{
 const s=match('moon-meander'),unit=enemy({pathDistance:2}),leader=hero('haste',false,{pathDistance:3});s.enemies=[unit,leader];
 const speed=(.24+.009)*1.1*duelMapSpeedScale(s.mapId);
 assert.ok(Math.abs(duelEnemyPosition(s,unit,1).x-(2+speed))<1e-12);
});
