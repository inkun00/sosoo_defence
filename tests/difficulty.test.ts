import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Defense,Tower} from '../src/model';
import {LEVELS} from '../src/levels';
import {balanceFor} from '../src/difficulty';
import {loadSave,writeSave} from '../src/save';
import {route,world} from '../src/path';
import {install} from './helpers';

test('표준은 후반까지 속도가 증가하고 연습·표준·도전의 설치 여유가 차별화된다',()=>{
 for(let stage=1;stage<=10;stage++){
  const p=balanceFor(stage,'practice'),s=balanceFor(stage,'standard'),c=balanceFor(stage,'challenge');
  assert.ok(p.speed<=s.speed&&s.speed<c.speed);assert.ok(p.towerLimit>s.towerLimit&&s.towerLimit>c.towerLimit);
  assert.ok(p.precisionLimit>s.precisionLimit&&s.precisionLimit>c.precisionLimit);
  if(stage>1)assert.ok(s.speed>balanceFor(stage-1,'standard').speed);
 }
});
test('0.01 바늘탑의 대량 설치를 막고 실패하면 돈·배치·구매 횟수가 그대로이며 회수 후 재설치된다',()=>{
 const m=new Defense(LEVELS[9]);
 const sites=[{x:1,y:3},{x:3,y:3},{x:1,y:5},{x:1,y:7}];
 for(const c of sites.slice(0,3))assert.ok(install(m,c,10,'basic'));
 const before={money:m.money,purchases:m.purchases,blocks:[...m.blocks]};
 assert.equal(install(m,sites[3],10,'slow'),false);assert.equal(m.towers.length,3);
 assert.deepEqual({money:m.money,purchases:m.purchases,blocks:[...m.blocks]},before);
 m.sellTower(m.towers[0].id);assert.ok(install(m,sites[3],10,'basic'));assert.equal(m.towers.length,3);
});
test('돈이 많아도 전체 타워 제한을 넘지 못하고 회수하면 한 자리가 돌아온다',()=>{
 const m=new Defense(LEVELS[0]);m.money=100000;
 for(const c of [{x:1,y:3},{x:3,y:3},{x:1,y:5}])assert.ok(install(m,c,100,'basic'));
 const before=m.money;assert.equal(install(m,{x:1,y:7},100,'basic'),false);assert.equal(m.money,before);
 m.sellTower(m.towers[0].id);assert.ok(install(m,{x:1,y:7},100,'basic'));
});
test('보유 성벽은 제한 없이 보관하며 설치 제한과 회수는 재고를 소비하거나 복제하지 않는다',()=>{
 const m=new Defense(LEVELS[9],{bricks:[],walls:20},'challenge');
 for(let i=0;i<m.balance.wallLimit;i++){const c=route(m.blocks)!.find(c=>m.candidate(c,true));assert.ok(c);assert.ok(m.placeWall(c));}
 const extra=route(m.blocks)!.find(c=>m.candidate(c,true))!;assert.equal(m.placeWall(extra),false);
 assert.equal(m.inventory.walls,20);assert.equal(m.wallStock,17);
 assert.ok(m.recoverWall(m.walls[0]));assert.ok(m.placeWall(extra));assert.equal(m.inventory.walls,20);
});
test('난이도 변경은 준비 중 빈 배치에서만 허용하며 돈·벽돌·성벽과 학습 목표를 유지한다',()=>{
 const m=new Defense(LEVELS[5],{bricks:[600,700,1300],walls:2});
 const before={money:m.money,inventory:m.inventory,hp:[...m.level.hp],goals:m.goals.map(g=>g.label)};
 assert.ok(m.setDifficulty('challenge'));assert.equal(m.duration,120);
 assert.deepEqual({money:m.money,inventory:m.inventory,hp:[...m.level.hp],goals:m.goals.map(g=>g.label)},before);
 assert.ok(install(m,{x:1,y:3},100,'basic'));assert.equal(m.setDifficulty('practice'),false);
 m.sellTower(m.towers[0].id);assert.ok(m.setDifficulty('practice'));assert.ok(m.placeWall({x:1,y:4}));assert.equal(m.setDifficulty('standard'),false);
 m.recoverWall(m.walls[0]);install(m,{x:1,y:3},100,'basic');m.start();m.togglePause();assert.equal(m.setDifficulty('standard'),false);
});
test('난이도는 실제 이동 속도에 반영되지만 체력·공격력·유효 타격 계산은 같다',()=>{
 const moved:number[]=[];
 for(const difficulty of ['practice','standard','challenge'] as const){
  const m=new Defense(LEVELS[9],undefined,difficulty);m.spawn();const e=m.enemies[0],start=world(e.path[0]);m.phase='playing';m.step(.1);
  moved.push(Math.hypot(e.x-start.x,e.y-start.y));const hp=e.hp;m.damage(e,{unit:1000,effect:'basic'} as Tower);assert.equal(e.hp,hp-1000);
 }
 assert.ok(moved[0]<moved[1]&&moved[1]<moved[2]);
});
test('선택한 난이도 저장·복원, 이전 저장과 손상된 난이도는 표준으로 호환된다',()=>{
 const data=new Map<string,string>();Object.assign(globalThis,{localStorage:{getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>data.set(key,value)}});
 assert.equal(loadSave().difficulty,'standard');const save=loadSave();save.difficulty='challenge';save.level=7;save.inventory={bricks:[420],walls:2};writeSave(save);assert.deepEqual(loadSave(),save);
 data.set('decimal-castle-v1',JSON.stringify({version:1,level:7,stars:[3],inventory:{bricks:[420],walls:2}}));assert.equal(loadSave().difficulty,'standard');assert.equal(loadSave().level,7);
 data.set('decimal-castle-v1',JSON.stringify({version:1,difficulty:'unknown'}));assert.equal(loadSave().difficulty,'standard');
});

