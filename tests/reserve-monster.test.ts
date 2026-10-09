import {test} from 'node:test';import assert from 'node:assert/strict';
import {createDuel,joinDuel,applyDuel,DuelState} from '../src/multiplayer/duel';import {HEROES} from '../src/multiplayer/heroes';import {validIdentity} from '../src/multiplayer/peer';
const now=100000;
function room(){const s=createDuel('a','가',17,now,1,{rewardHeroes:['hero-1-0','hero-10-1'],rewardHero:'hero-1-0'});joinDuel(s,'b','나',now,1,{rewardHeroes:['hero-8-2'],rewardHero:'hero-8-2'});return s;}
function start(s:DuelState){applyDuel(s,0,{type:'ready'},now,'a');applyDuel(s,1,{type:'ready'},now,'b');}

test('수집 영웅 소환만 연출 표식을 남기며 군집 병사와 일반 부화에는 붙이지 않는다',()=>{
 const s=room();applyDuel(s,0,{type:'select-reward',heroId:'hero-10-1'},now,'select');start(s);
 assert.ok(applyDuel(s,0,{type:'summon-reward'},now,'reward').ok);
 assert.equal(s.enemies[0].hero,'hero-10-1');assert.equal(s.enemies[0].rewardSummon,true);
 assert.ok(s.enemies.slice(1).every(e=>!e.hero&&e.rewardSummon===undefined));
 const before=s.enemies.length;s.players[0].egg=10;
 assert.ok(applyDuel(s,0,{type:'hatch',heroId:'hero-10-1'},now,'egg').ok);
 assert.equal(s.enemies[before].hero,'hero-10-1');assert.ok(s.enemies.slice(before).every(e=>e.rewardSummon===undefined));
 assert.equal(JSON.parse(JSON.stringify(s)).enemies[0].rewardSummon,true);
});
test('대전 전에는 보유한 영웅만 선택하며 준비 후·대전 중 변경은 거부한다',()=>{const s=room();assert.equal(applyDuel(s,0,{type:'select-reward',heroId:'hero-9-0'},now,'x').ok,false);assert.ok(applyDuel(s,0,{type:'select-reward',heroId:'hero-10-1'},now,'y').ok);assert.equal(applyDuel(s,0,{type:'summon-reward'},now,'z').ok,false);applyDuel(s,0,{type:'ready'},now,'r');assert.equal(applyDuel(s,0,{type:'select-reward',heroId:'hero-1-0'},now,'a').ok,false);applyDuel(s,1,{type:'ready'},now,'b');assert.equal(applyDuel(s,1,{type:'select-reward',heroId:null},now,'c').ok,false);});
test('양쪽 선택 몬스터를 원하는 때 각각 한 번 소환하며 알·코인에는 영향이 없다',()=>{const s=room();start(s);s.players[0].egg=5;const money=s.players[0].money;assert.ok(applyDuel(s,0,{type:'summon-reward'},now,'a').ok);assert.equal(s.enemies[0].hero,'hero-1-0');assert.equal(s.enemies[0].target,1);assert.equal(s.players[0].egg,5);assert.equal(s.players[0].money,money);assert.equal(s.players[0].rewardUsed,true);assert.equal(s.players[1]!.rewardUsed,false);assert.equal(applyDuel(s,0,{type:'summon-reward'},now,'replay').ok,false);assert.ok(applyDuel(s,1,{type:'summon-reward'},now,'b').ok);assert.equal(s.enemies[1].hero,'hero-8-2');assert.equal(s.enemies[1].target,0);s.status='finished';assert.equal(applyDuel(s,1,{type:'summon-reward'},now,'c').ok,false);assert.equal(room().players[0].rewardUsed,false);});
test('군집 효과와 30종의 체력은 기존 영웅과 같고 공간 부족은 사용 횟수를 쓰지 않는다',()=>{const s=room();applyDuel(s,0,{type:'select-reward',heroId:'hero-10-1'},now,'s');start(s);assert.ok(applyDuel(s,0,{type:'summon-reward'},now,'h').ok);assert.equal(s.enemies.length,5);assert.equal(s.enemies[0].hp,HEROES.find(h=>h.id==='hero-10-1')!.hp);assert.ok(s.enemies.every(e=>e.hp<10000));const t=room();start(t);t.enemies=Array.from({length:100},(_,i)=>({...s.enemies[0],id:i}));assert.equal(applyDuel(t,0,{type:'summon-reward'},now,'full').ok,false);assert.equal(t.players[0].rewardUsed,false);t.enemies=[];assert.ok(applyDuel(t,0,{type:'summon-reward'},now,'again').ok);});
test('초대 신원은 30종 중 중복 없는 보유 목록과 목록에 포함된 선택만 허용한다',()=>{const base={uid:'a',name:'가',accountLevel:1};assert.ok(validIdentity(base));assert.ok(validIdentity({...base,rewardHeroes:['hero-1-0'],rewardHero:'hero-1-0'}));assert.equal(validIdentity({...base,rewardHeroes:['hero-1-0'],rewardHero:'hero-10-2'}),false);assert.equal(validIdentity({...base,rewardHeroes:['hero-1-0','hero-1-0']}),false);assert.equal(validIdentity({...base,rewardHeroes:['unknown']}),false);const s=createDuel('a','가',17,now,1,{rewardHeroes:[],rewardHero:'hero-10-0'});joinDuel(s,'b','나',now);start(s);assert.equal(s.players[0].rewardHero,null);assert.equal(applyDuel(s,0,{type:'summon-reward'},now,'x').ok,false);});
