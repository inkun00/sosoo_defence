import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createDuel,joinDuel,applyDuel,advanceDuel,DUEL_PREPARATION_SECONDS,DUEL_START_MONEY,DuelState} from '../src/multiplayer/duel';
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
 for(const heroId of ['hero-9-0','unknown',null]){assert.equal(applyDuel(s,0,{type:'ready',heroId},ROOM_NOW,'invalid').ok,false);assert.deepEqual(s.players[0],before);}
 assert.ok(applyDuel(s,0,{type:'ready',heroId:'hero-10-1'},ROOM_NOW,'ready').ok);
 assert.equal(s.players[0].rewardHero,'hero-10-1');assert.equal(s.players[0].ready,true);assert.equal(s.enemies.length,0);
 const beforeRepeat=structuredClone(s.players[0]);
 assert.equal(applyDuel(s,0,{type:'ready',heroId:'hero-1-0'},ROOM_NOW,'repeat').ok,false);
 assert.equal(applyDuel(s,0,{type:'select-reward',heroId:'hero-1-0'},ROOM_NOW,'change').ok,false);assert.deepEqual(s.players[0],beforeRepeat);
});

test('선택한 수집 영웅은 준비 중 대기하고 전투에서 원하는 때 한 번 소환한다',()=>{
 const s=room();ready(s);assert.equal(s.enemies.length,0);assert.equal(s.preparationStartedAt,ROOM_NOW);
 for(const side of [0,1] as const){const p=s.players[side]!;assert.equal(p.rewardUsed,false);assert.equal(p.money,DUEL_START_MONEY);assert.equal(applyDuel(s,side,{type:'summon-reward'},ROOM_NOW,'early').ok,false);}
 connectedAdvance(s,START-1);assert.equal(s.status,'preparing');assert.equal(s.enemies.length,0);assert.equal(s.shots.length,0);assert.equal(s.wave,0);
 startCombat(s);assert.equal(s.enemies.length,0);
 for(const side of [0,1] as const){
  assert.ok(applyDuel(s,side,{type:'summon-reward'},START,`summon-${side}`).ok);
  const p=s.players[side]!,e=s.enemies.find(e=>e.owner===side)!;
  assert.equal(e.hero,p.rewardHero);assert.equal(e.target,1-side);assert.equal(e.rewardSummon,true);assert.equal(e.vitalityBaseMax??e.max,heroSpec(p.rewardHero!)!.hp);assert.equal(e.hp,e.max);
  assert.equal(e.pathDistance,side===0?1:duelMap(s.mapId).length-1);assert.equal(p.rewardUsed,true);assert.equal(p.egg,0);assert.equal(p.money,0);
  assert.equal(applyDuel(s,side,{type:'summon-reward'},START,'duplicate').ok,false);
 }
 assert.equal(s.enemies.length,2);assert.equal(JSON.parse(JSON.stringify(s)).enemies[0].rewardSummon,true);assert.equal(room().players[0].rewardUsed,false);
});

test('수집 소환과 준비 비축 영웅은 각각 한 명만 출전하며 소환 표식을 구별한다',()=>{
 const s=room();assert.ok(applyDuel(s,0,{type:'ready',heroId:'hero-10-1'},ROOM_NOW,'left').ok);assert.ok(applyDuel(s,1,{type:'ready'},ROOM_NOW,'right').ok);
 s.players[0].egg=10;assert.ok(applyDuel(s,0,{type:'hatch',heroId:'hero-10-1'},ROOM_NOW,'reserve').ok);
 assert.equal(s.enemies.length,0);assert.equal(s.players[0].heroStock?.['hero-10-1'],1);startCombat(s);
 assert.ok(applyDuel(s,0,{type:'summon-reward'},START,'reward').ok);const money=s.players[0].money;
 assert.ok(applyDuel(s,0,{type:'summon',heroId:'hero-10-1'},START,'stock').ok);
 assert.equal(s.enemies.length,2);assert.equal(s.enemies[0].rewardSummon,true);assert.equal(s.enemies[1].rewardSummon,undefined);assert.ok(s.enemies.every(e=>e.hero&&!e.sourceHeroId));
 assert.equal(s.players[0].heroStock?.['hero-10-1'],0);assert.equal(s.players[0].money,money);assert.equal(s.players[0].rewardUsed,true);
});

test('선택 생략은 이전 선택을 유지하며 없을 때 첫 보유 영웅을 대기시킨다',()=>{
 const s=room();assert.ok(applyDuel(s,0,{type:'select-reward',heroId:'hero-10-1'},ROOM_NOW,'selection').ok);ready(s);
 assert.equal(s.players[0].rewardHero,'hero-10-1');assert.equal(s.enemies.length,0);
 const t=createDuel('a','가',17,ROOM_NOW,1,{rewardHeroes:['hero-2-0','hero-10-1']});joinDuel(t,'b','나',ROOM_NOW);ready(t);
 assert.equal(t.players[0].rewardHero,'hero-2-0');assert.equal(t.players[0].rewardUsed,false);assert.equal(t.players[1]!.rewardHero,null);
});

test('영웅이 없는 플레이어도 선택 없이 시작하며 수집 소환은 거부한다',()=>{
 const s=createDuel('a','가',17,ROOM_NOW,1,{rewardHeroes:[],rewardHero:'hero-10-0'});joinDuel(s,'b','나',ROOM_NOW);
 assert.equal(applyDuel(s,0,{type:'ready',heroId:'hero-1-0'},ROOM_NOW,'invalid').ok,false);
 assert.ok(applyDuel(s,0,{type:'ready',heroId:null},ROOM_NOW,'none').ok);assert.ok(applyDuel(s,1,{type:'ready'},ROOM_NOW,'other').ok);
 assert.equal(s.enemies.length,0);assert.ok(s.players.every(p=>p?.rewardHero===null&&!p.rewardUsed));startCombat(s);
 assert.equal(applyDuel(s,0,{type:'summon-reward'},START,'manual').ok,false);
});

test('30종 수집 영웅은 선택한 시점에 기존 체력으로 한 명씩 소환한다',()=>{
 for(const hero of HEROES){
  const s=createDuel('a','가',17,ROOM_NOW,1,{rewardHeroes:[hero.id]});joinDuel(s,'b','나',ROOM_NOW);ready(s);assert.equal(s.enemies.length,0);startCombat(s);
  assert.ok(applyDuel(s,0,{type:'summon-reward'},START,'deploy').ok);
  const deployed=s.enemies[0];assert.equal(deployed.hero,hero.id);assert.equal(deployed.vitalityBaseMax??deployed.max,hero.hp);assert.ok(deployed.max>=hero.hp);assert.equal(deployed.hp,deployed.max);assert.equal(s.enemies.length,1);
 }
});

test('길이 가득하면 수집 소환을 거부하고 사용 횟수를 소모하지 않는다',()=>{
 const s=room();ready(s);startCombat(s);
 s.enemies=Array.from({length:100},(_,id)=>({id,owner:0 as const,target:1 as const,hero:null,level:1,hp:800,max:800,x:1,pathDistance:1,slow:0,stun:0,hits:0}));
 const before=structuredClone(s.players[0]);assert.equal(applyDuel(s,0,{type:'summon-reward'},START,'full').ok,false);assert.deepEqual(s.players[0],before);
 s.enemies=[];assert.ok(applyDuel(s,0,{type:'summon-reward'},START,'again').ok);assert.equal(s.enemies.length,1);
});

test('초대 신원은 30종 중 중복 없는 보유 목록과 목록에 포함된 선택만 허용한다',()=>{
 const base={uid:'a',name:'가',accountLevel:1};assert.ok(validIdentity(base));assert.ok(validIdentity({...base,rewardHeroes:['hero-1-0'],rewardHero:'hero-1-0'}));
 assert.equal(validIdentity({...base,rewardHeroes:['hero-1-0'],rewardHero:'hero-10-2'}),false);assert.equal(validIdentity({...base,rewardHeroes:['hero-1-0','hero-1-0']}),false);assert.equal(validIdentity({...base,rewardHeroes:['unknown']}),false);
});
