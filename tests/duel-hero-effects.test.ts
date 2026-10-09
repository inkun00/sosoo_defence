import {test} from 'node:test';
import assert from 'node:assert/strict';
import {activeDuelHeroEffects,advanceDuel,applyDuel,createDuel,duelEnemyPosition,joinDuel,DUEL_PREPARATION_SECONDS,DuelEnemy,DuelState} from '../src/multiplayer/duel';

const ROOM_NOW=100000,NOW=ROOM_NOW+DUEL_PREPARATION_SECONDS*1000;
function match(mapId?:string):DuelState{
 const s=createDuel('a','왼쪽',17,ROOM_NOW,1,{rewardHeroes:['hero-3-1'],rewardHero:'hero-3-1'},mapId);
 joinDuel(s,'b','오른쪽',ROOM_NOW);
 assert.ok(applyDuel(s,0,{type:'ready'},ROOM_NOW,'r1').ok);assert.ok(applyDuel(s,1,{type:'ready'},ROOM_NOW,'r2').ok);assert.equal(s.status,'preparing');
 s.players.forEach(p=>p!.lastSeen=NOW);advanceDuel(s,NOW);assert.equal(s.status,'playing');assert.equal(s.elapsed,0);
 return s;
}
function enemy(extra:Partial<DuelEnemy>={}):DuelEnemy{
 return {id:90,owner:0,target:1,hero:null,level:1,hp:500,max:500,x:4,y:3,pathDistance:4,slow:0,stun:0,hits:0,...extra};
}

test('가속 아이콘은 살아 있는 같은 편 영웅의 실제 반경 3 경계까지 표시된다',()=>{
 const s=match(),unit=enemy(),leader=enemy({id:91,hero:'hero-1-0',pathDistance:7});
 s.enemies=[unit,leader];
 const before=JSON.stringify(s);
 assert.deepEqual(activeDuelHeroEffects(s,unit),['haste']);
 assert.equal(JSON.stringify(s),before,'표시 판정은 대전 상태를 변경하지 않는다');
 leader.pathDistance=7.0001;assert.deepEqual(activeDuelHeroEffects(s,unit),[]);
 leader.pathDistance=7;leader.owner=1;assert.deepEqual(activeDuelHeroEffects(s,unit),[]);
 leader.owner=0;leader.hp=0;assert.deepEqual(activeDuelHeroEffects(s,unit),[]);
 leader.hp=500;leader.hero='unknown';assert.deepEqual(activeDuelHeroEffects(s,unit),[]);
 leader.hero='hero-1-0';unit.hp=0;assert.deepEqual(activeDuelHeroEffects(s,unit),[]);
});

test('굽은 길의 가속 범위는 화면에 보이는 위치를 기준으로 판정한다',()=>{
 const s=match('ember-bend'),unit=enemy({pathDistance:7,x:22,y:6}),leader=enemy({id:91,hero:'hero-1-0',pathDistance:11,x:0,y:0});
 s.enemies=[unit,leader];
 // These path positions are (7,3) and (9,1): four road cells apart, within radius three.
 assert.deepEqual(activeDuelHeroEffects(s,unit),['haste']);
 unit.pathDistance=4;assert.deepEqual(activeDuelHeroEffects(s,unit),[]);
});

test('가속 표시는 중첩되지 않고 이동에는 가장 강한 영웅의 기존 배율이 적용된다',()=>{
 const s=match(),unit=enemy(),weak=enemy({id:91,hero:'hero-1-0',level:1,pathDistance:5}),strong=enemy({id:92,hero:'hero-10-0',level:10,pathDistance:6});
 s.enemies=[unit,weak,strong];
 assert.deepEqual(activeDuelHeroEffects(s,unit),['haste']);
 assert.deepEqual(activeDuelHeroEffects(s,strong),['haste'],'가속 영웅 자신도 기존 가속 효과를 받는다');
 const distance=(.24+.009)*(1.12+10*.025);
 assert.ok(Math.abs(duelEnemyPosition(s,unit,1).x-(4+distance))<1e-12);
 advanceDuel(s,NOW+100);
 assert.ok(Math.abs(unit.pathDistance!-(4+distance*.1))<1e-12,'호스트 이동도 같은 효과 배율을 사용한다');
 strong.hp=0;
 assert.ok(Math.abs(duelEnemyPosition(s,unit,1).x-(unit.pathDistance!+(.24+.009)*(1.12+.025)))<1e-12);
 s.enemies=[unit];assert.deepEqual(activeDuelHeroEffects(s,unit),[]);
 assert.ok(Math.abs(duelEnemyPosition(s,unit,1).x-(unit.pathDistance!+.24+.009))<1e-12);
});

test('감속 저항은 수호 영웅 자신에게만 표시되고 주변 몬스터에 전파되지 않는다',()=>{
 const s=match(),unit=enemy(),guardian=enemy({id:91,hero:'hero-10-2',level:10,slow:3}),leader=enemy({id:92,hero:'hero-1-0',pathDistance:5});
 s.enemies=[unit,guardian];
 assert.deepEqual(activeDuelHeroEffects(s,unit),[]);
 assert.deepEqual(activeDuelHeroEffects(s,guardian),['steadfast']);
 const speed=(.24+10*.009)*(.6+.4*.8);
 assert.ok(Math.abs(duelEnemyPosition(s,guardian,1).x-(4+speed))<1e-12);
 s.enemies.push(leader);assert.deepEqual(activeDuelHeroEffects(s,guardian),['haste','steadfast']);
});

test('군집 효과는 부화한 영웅의 동반 돌 병사에만 기록되고 일반 몬스터와 구분된다',()=>{
 const s=match();s.players[1]!.egg=3;
 assert.ok(applyDuel(s,1,{type:'hatch',heroId:'hero-3-1'},NOW,'h').ok);
 const hero=s.enemies.find(e=>e.hero)!,escorts=s.enemies.filter(e=>!e.hero);
 assert.equal(escorts.length,2);
 assert.deepEqual(activeDuelHeroEffects(s,hero),[],'군집은 주변 아군에 적용하는 오라가 아니다');
 for(const soldier of escorts){assert.equal(soldier.sourceHeroId,'hero-3-1');assert.deepEqual(activeDuelHeroEffects(s,soldier),['brood']);}
 const ordinary=enemy({owner:1,target:0,pathDistance:escorts[0].pathDistance});
 assert.deepEqual(activeDuelHeroEffects(s,ordinary),[],'과거 상태의 출처 없는 일반 몬스터에는 군집 표시를 추측하지 않는다');
 assert.deepEqual(activeDuelHeroEffects(s,enemy({sourceHeroId:'hero-1-0'})),[]);
 assert.deepEqual(activeDuelHeroEffects(s,enemy({sourceHeroId:'unknown'})),[]);
 s.enemies=escorts;assert.deepEqual(activeDuelHeroEffects(s,escorts[0]),['brood'],'영웅 처치 뒤에도 소환된 병사는 병사로 남는다');
});

test('학습지 보상 영웅의 동반 병사도 군집 아이콘을 받고 가속과 동시에 표시된다',()=>{
 const s=match();assert.ok(applyDuel(s,0,{type:'summon-reward'},NOW,'reward').ok);
 const escorts=s.enemies.filter(e=>!e.hero);
 assert.equal(escorts.length,2);assert.ok(s.enemies.find(e=>e.hero)?.rewardSummon);
 for(const soldier of escorts){assert.equal(soldier.sourceHeroId,'hero-3-1');assert.deepEqual(activeDuelHeroEffects(s,soldier),['brood']);}
 s.enemies.push(enemy({id:99,hero:'hero-1-0',pathDistance:escorts[0].pathDistance}));
 assert.deepEqual(activeDuelHeroEffects(s,escorts[0]),['haste','brood']);
});
