import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createDuel,joinDuel,applyDuel,advanceDuel,duelEnemyPosition,DUEL_PREPARATION_SECONDS,DUEL_START_MONEY,DuelState} from '../src/multiplayer/duel';
import {HEROES,heroSpec} from '../src/multiplayer/heroes';
import {validIdentity} from '../src/multiplayer/peer';
import {duelMap} from '../src/multiplayer/duel-maps';

const ROOM_NOW=100000,START=ROOM_NOW+DUEL_PREPARATION_SECONDS*1000;
function room(){const s=createDuel('a','가',17,ROOM_NOW,1,{rewardHeroes:['hero-1-0','hero-10-1'],rewardHero:'hero-1-0'});joinDuel(s,'b','나',ROOM_NOW,1,{rewardHeroes:['hero-8-2'],rewardHero:'hero-8-2'});return s;}
function ready(s:DuelState){assert.ok(applyDuel(s,0,{type:'ready'},ROOM_NOW,'a').ok);assert.ok(applyDuel(s,1,{type:'ready'},ROOM_NOW,'b').ok);assert.equal(s.status,'preparing');}
function connectedAdvance(s:DuelState,now:number){s.players.forEach(p=>p!.lastSeen=now);advanceDuel(s,now);}
function startCombat(s:DuelState){assert.equal(s.status,'preparing');connectedAdvance(s,START);assert.equal(s.status,'playing');assert.equal(s.elapsed,0);}

test('게임 시작은 선택과 준비를 원자 처리하고 보유하지 않은 영웅과 빈 선택은 거부한다',()=>{
 const s=room(),before=structuredClone(s.players[0]);
 for(const heroId of ['hero-9-0','unknown',null]){
  assert.equal(applyDuel(s,0,{type:'ready',heroId},ROOM_NOW,'invalid').ok,false);
  assert.deepEqual(s.players[0],before);assert.equal(s.status,'waiting');assert.equal(s.enemies.length,0);
 }
 assert.ok(applyDuel(s,0,{type:'ready',heroId:'hero-10-1'},ROOM_NOW,'ready').ok);
 assert.equal(s.players[0].rewardHero,'hero-10-1');assert.equal(s.players[0].ready,true);assert.equal(s.enemies.length,0);
 const readyPlayer=structuredClone(s.players[0]);
 assert.equal(applyDuel(s,0,{type:'ready',heroId:'hero-1-0'},ROOM_NOW,'repeat').ok,false);
 assert.deepEqual(s.players[0],readyPlayer);
 assert.equal(applyDuel(s,0,{type:'select-reward',heroId:'hero-1-0'},ROOM_NOW,'change').ok,false);
});

test('양쪽 시작 준비가 끝나는 즉시 선택한 영웅이 각각 한 번 자동 출전한다',()=>{
 const s=room();ready(s);
 assert.equal(s.enemies.length,2);assert.equal(s.preparationStartedAt,ROOM_NOW);assert.equal(s.preparationElapsed,0);
 for(const side of [0,1] as const){
  const p=s.players[side]!,e=s.enemies.find(e=>e.owner===side)!;
  assert.equal(e.hero,p.rewardHero);assert.equal(e.target,1-side);assert.equal(e.rewardSummon,true);assert.equal(e.hp,heroSpec(p.rewardHero!)!.hp);
  assert.equal(e.pathDistance,side===0?1:duelMap(s.mapId).length-1);assert.equal(p.rewardUsed,true);
  assert.equal(p.money,DUEL_START_MONEY);assert.equal(p.egg,0);assert.equal(p.solved,0);
  assert.equal(applyDuel(s,side,{type:'ready',heroId:p.rewardHero},ROOM_NOW,'repeat').ok,false);
  assert.equal(applyDuel(s,side,{type:'summon-reward'},ROOM_NOW,'preparation').ok,false);
 }
 startCombat(s);
 for(const side of [0,1] as const)assert.equal(applyDuel(s,side,{type:'summon-reward'},START,'duplicate').ok,false);
 assert.equal(s.enemies.length,2);assert.ok(s.players.every(p=>p?.rewardUsed));
 assert.equal(JSON.parse(JSON.stringify(s)).enemies[0].rewardSummon,true);
 assert.equal(room().players[0].rewardUsed,false);
});

test('영웅 출전 연출 중인 준비 60초에는 이동·피해·발사·코인 변화가 없다',()=>{
 const s=room();ready(s);const enemies=structuredClone(s.enemies),flames=s.players.map(p=>p!.flame);
 connectedAdvance(s,ROOM_NOW+59999);
 assert.equal(s.status,'preparing');assert.equal(s.preparationElapsed,59.999);assert.equal(s.elapsed,0);assert.equal(s.wave,0);
 assert.deepEqual(s.enemies,enemies);assert.deepEqual(s.players.map(p=>p!.flame),flames);assert.equal(s.shots.length,0);
 assert.ok(s.players.every(p=>p?.money===DUEL_START_MONEY));
 for(const e of s.enemies)assert.deepEqual(duelEnemyPosition(s,e,5),duelEnemyPosition(s,e));
 startCombat(s);assert.deepEqual(s.enemies,enemies);assert.equal(s.wave,0);assert.ok(s.players.every(p=>p?.money===0));
 connectedAdvance(s,START+100);
 assert.ok(s.enemies.every(e=>e.pathDistance!==enemies.find(o=>o.id===e.id)!.pathDistance));
 assert.ok(s.enemies.every(e=>e.hp===enemies.find(o=>o.id===e.id)!.hp));assert.equal(s.shots.length,0);
});

test('군집 수집 영웅의 호위는 함께 출전하며 일반 알 부화에는 수집 소환 표식이 없다',()=>{
 const s=room();assert.ok(applyDuel(s,0,{type:'ready',heroId:'hero-10-1'},ROOM_NOW,'left').ok);assert.ok(applyDuel(s,1,{type:'ready'},ROOM_NOW,'right').ok);
 const left=s.enemies.filter(e=>e.owner===0);assert.equal(left.length,5);assert.equal(left[0].hero,'hero-10-1');assert.equal(left[0].rewardSummon,true);
 assert.ok(left.slice(1).every(e=>!e.hero&&e.rewardSummon===undefined&&e.sourceHeroId==='hero-10-1'));
 startCombat(s);const before=s.enemies.length;s.players[0].egg=10;const money=s.players[0].money;
 assert.ok(applyDuel(s,0,{type:'hatch',heroId:'hero-10-1'},START,'egg').ok);
 assert.equal(s.enemies[before].hero,'hero-10-1');assert.ok(s.enemies.slice(before).every(e=>e.rewardSummon===undefined));
 assert.equal(s.players[0].egg,0);assert.equal(s.players[0].money,money);assert.equal(s.players[0].rewardUsed,true);
});

test('선택을 생략하면 이전 선택을 유지하며 없을 때 첫 보유 영웅을 출전시킨다',()=>{
 const s=room();assert.ok(applyDuel(s,0,{type:'select-reward',heroId:'hero-10-1'},ROOM_NOW,'selection').ok);ready(s);
 assert.equal(s.enemies.find(e=>e.owner===0&&e.hero)!.hero,'hero-10-1');
 const t=createDuel('a','가',17,ROOM_NOW,1,{rewardHeroes:['hero-2-0','hero-10-1']});joinDuel(t,'b','나',ROOM_NOW);ready(t);
 assert.equal(t.players[0].rewardHero,'hero-2-0');assert.equal(t.enemies[0].hero,'hero-2-0');assert.equal(t.players[0].rewardUsed,true);
 assert.equal(t.players[1]!.rewardHero,null);assert.equal(t.players[1]!.rewardUsed,false);
});

test('영웅이 없는 플레이어는 선택 없이 시작하며 자동 출전과 중복 소환이 없다',()=>{
 const s=createDuel('a','가',17,ROOM_NOW,1,{rewardHeroes:[],rewardHero:'hero-10-0'});joinDuel(s,'b','나',ROOM_NOW);
 assert.equal(applyDuel(s,0,{type:'ready',heroId:'hero-1-0'},ROOM_NOW,'invalid').ok,false);
 assert.ok(applyDuel(s,0,{type:'ready',heroId:null},ROOM_NOW,'none').ok);assert.ok(applyDuel(s,1,{type:'ready'},ROOM_NOW,'other').ok);
 assert.equal(s.enemies.length,0);assert.ok(s.players.every(p=>p?.rewardHero===null&&!p.rewardUsed));
 startCombat(s);assert.equal(applyDuel(s,0,{type:'summon-reward'},START,'manual').ok,false);
});

test('30종의 자동 출전 영웅은 기존 체력과 군집 수를 그대로 사용한다',()=>{
 for(const hero of HEROES){
  const s=createDuel('a','가',17,ROOM_NOW,1,{rewardHeroes:[hero.id]});joinDuel(s,'b','나',ROOM_NOW);ready(s);
  const deployed=s.enemies.find(e=>e.hero)!;assert.equal(deployed.hero,hero.id);assert.equal(deployed.hp,hero.hp);assert.equal(deployed.max,hero.hp);
  assert.equal(s.enemies.length,1+(hero.effect==='brood'?1+Math.floor(hero.level/3):0));assert.ok(s.enemies.every(e=>e.hp<10000));
 }
});

test('길이 이미 가득한 방에서는 선택과 시작 준비를 함께 거부한다',()=>{
 const s=room();assert.ok(applyDuel(s,1,{type:'ready'},ROOM_NOW,'right').ok);
 s.enemies=Array.from({length:100},(_,id)=>({id,owner:0 as const,target:1 as const,hero:null,level:1,hp:800,max:800,x:1,pathDistance:1,slow:0,stun:0,hits:0}));
 const before=structuredClone(s.players[0]);
 assert.equal(applyDuel(s,0,{type:'ready',heroId:'hero-10-1'},ROOM_NOW,'full').ok,false);assert.deepEqual(s.players[0],before);assert.equal(s.status,'waiting');
 s.enemies=[];assert.ok(applyDuel(s,0,{type:'ready',heroId:'hero-10-1'},ROOM_NOW,'again').ok);assert.equal(s.status,'preparing');assert.equal(s.enemies.length,6);
});

test('초대 신원은 30종 중 중복 없는 보유 목록과 목록에 포함된 선택만 허용한다',()=>{
 const base={uid:'a',name:'가',accountLevel:1};assert.ok(validIdentity(base));assert.ok(validIdentity({...base,rewardHeroes:['hero-1-0'],rewardHero:'hero-1-0'}));
 assert.equal(validIdentity({...base,rewardHeroes:['hero-1-0'],rewardHero:'hero-10-2'}),false);assert.equal(validIdentity({...base,rewardHeroes:['hero-1-0','hero-1-0']}),false);assert.equal(validIdentity({...base,rewardHeroes:['unknown']}),false);
});
