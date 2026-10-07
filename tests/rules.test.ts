import {test} from 'node:test';
import assert from 'node:assert/strict';
import {hit,recipe,reward,numberText,minimumHits} from '../src/math';
import {LEVELS,price} from '../src/levels';
import {Defense,Enemy,Tower} from '../src/model';
import {key,world} from '../src/path';
import {loadSave,writeSave} from '../src/save';
import {install} from './helpers';
import {towersForStage,towerPrice} from '../src/towers';

test('소수는 정수로 정확히 계산하고 큰 공격은 체력을 바꾸지 않는다',()=>{
 assert.deepEqual(hit(600,1000),{hp:600,valid:false,killed:false});
 let hp=600;for(let i=0;i<6;i++)hp=hit(hp,100).hp;assert.equal(hp,0);
 assert.equal(numberText(301,3),'0.301');assert.equal(recipe(420,530,950),true);
 assert.equal(recipe(420,530,960),false);assert.equal(minimumHits(6310,[10,100,1000]),10);
});
test('0.001은 4단계부터 돈에만 있고 모든 체력·벽돌·포탄은 단계 자릿수를 지킨다',()=>{
 for(const l of LEVELS){
  assert.ok(!l.units.includes(1));assert.ok(l.units.every(u=>u>=10));
  assert.ok([...l.hp,...l.bricks].every(n=>n%(l.digits===1?100:10)===0));
  const cost=price(l.units[0],'basic',l.id);assert.ok(cost>=1);
  if(l.id<4){assert.equal(cost%(l.id===1?100:10),0);assert.equal(reward(l.hp[0],10,l.units,l.id)%100,0);}
  else assert.ok(towersForStage(l.id).some(t=>towerPrice(t,l.budget,l.id)%10!==0));
 }
});
test('유효 타격만 횟수에 들어가고 한 마리 돈 보상은 9 이하이다',()=>{
 const m=new Defense(LEVELS[3]);m.spawn();const e=m.enemies[0];e.hp=e.max=600;
 const t={id:90,x:1,y:3,unit:1000,effect:'slow',enabled:true,cooldown:0,cost:901} as Tower;
 m.damage(e,t);assert.equal(e.hp,600);assert.equal(e.hits,0);assert.equal(e.slow,0);
 t.unit=100;for(let i=0;i<6;i++)m.damage(e,t);
 assert.equal(m.successfulHits,6);assert.equal(m.invalidHits,1);assert.equal(m.kills,1);
 assert.ok(reward(1600,7,[100,1000],4)>reward(1600,16,[100,1000],4));
 assert.ok(reward(1000000,1,[1000],10)<=9000);
});
test('감속과 확률 기절은 추가 피해 없이 유효 공격에만 적용된다',()=>{
 const m=new Defense(LEVELS[3]);m.spawn();const e=m.enemies[0];e.hp=100000;
 const t={unit:100,effect:'stun'} as Tower;let stuns=0;
 for(let i=0;i<100;i++){e.stun=0;const before=e.hp;m.damage(e,t);assert.equal(e.hp,before-100);if(e.stun)stuns++;}
 assert.ok(stuns>=15&&stuns<=35,`100번 중 기절 ${stuns}회`);
 t.effect='slow';m.damage(e,t);assert.equal(e.slow,3);assert.equal(e.hp,89900);
});
test('시작 예산과 타워 가격의 자연수 부분은 한 자리이고 세 자리 돈은 4단계부터 사용한다',()=>{
 for(const l of LEVELS){assert.ok(l.budget>0&&l.budget<10000);for(const t of towersForStage(l.id))assert.ok(towerPrice(t,l.budget,l.id)>0&&towerPrice(t,l.budget,l.id)<10000);}
 assert.ok(towerPrice(towersForStage(4).find(t=>t.id==='lightning')!,LEVELS[3].budget,4)%10!==0);
});
test('처치는 돈 또는 벽돌을 하나만 남기고 세 벽돌 합성은 값을 검증하고 소비한다',()=>{
 const m=new Defense(LEVELS[1]);
 for(let i=0;i<4;i++){m.spawn();const e=m.enemies.at(-1)!;e.hp=100;e.max=100;m.events=[];m.damage(e,{unit:100,effect:'basic'} as Tower);const drops=m.events.filter(e=>e.type==='brick'||e.type==='money');assert.equal(drops.length,1);assert.equal(drops[0].type,i<3?'brick':'money');}
 assert.equal(m.bricks.length,3);const ids=m.bricks.map(b=>b.id);
 assert.equal(m.fuse([ids[0],ids[0],ids[2]]),false);
 assert.equal(m.fuse([ids[2],ids[1],ids[0]]),false);
 assert.equal(m.fuse(ids),true);assert.equal(m.bricks.length,0);assert.equal(m.wallStock,1);
});
test('뺄셈 벽돌 조합은 받아내림도 정확히 계산하고 순서·음수·잘못된 답을 거부한다',()=>{
 assert.equal(recipe(1300,700,600,'-'),true);
 assert.equal(recipe(1310,560,750,'-'),true);
 assert.equal(recipe(6300,2750,3550,'-'),true);
 assert.equal(recipe(700,1300,600,'-'),false);
 assert.equal(recipe(1310,560,760,'-'),false);
 assert.equal(recipe(100,100,0,'-'),false);
 assert.equal(recipe(100,200,-100,'-'),false);
 assert.equal(recipe(1300,700,600),false);
});
test('덧셈과 뺄셈 합성을 함께 사용해도 세 재료만 소비하고 성벽과 합성 목표에 반영한다',()=>{
 const m=new Defense(LEVELS[6]);
 m.bricks=[{id:91,value:420},{id:92,value:530},{id:93,value:950},{id:94,value:750},{id:95,value:560},{id:96,value:1310}];
 assert.equal(m.fuse([94,95,96],'-'),false);assert.equal(m.bricks.length,6);assert.equal(m.wallStock,0);
 assert.equal(m.fuse([96,95,95],'-'),false);assert.equal(m.bricks.length,6);
 assert.equal(m.fuse([91,92,93]),true);assert.equal(m.bricks.length,3);
 assert.equal(m.fuse([96,95,94],'-'),true);assert.equal(m.bricks.length,0);
 assert.equal(m.wallStock,2);assert.equal(m.fusions,2);
 assert.match(m.events.at(-1)!.message,/1\.31 − 0\.56 = 0\.75/);
 assert.equal(m.fuse([96,95,94],'-'),false);assert.equal(m.wallStock,2);
 assert.equal(m.placeWall({x:1,y:4}),true);assert.equal(m.goals[1].done,true);
});
test('타워는 길 옆에만, 성벽은 길 위에만 설치되고 우회 경로를 만들지 않는다',()=>{
 const m=new Defense(LEVELS[1]);assert.equal(install(m,{x:1,y:4},100,'basic'),false);
 assert.equal(install(m,{x:1,y:3},100,'basic'),true);assert.ok(m.blocks.has('1,3'));
 m.sellTower(m.towers[0].id);assert.ok(!m.blocks.has('1,3'));
 const walls=new Defense(LEVELS[1],{bricks:[],walls:2}),road=walls.path()!;
 assert.equal(walls.placeWall({x:1,y:3}),false);
 const c=road.find(c=>walls.candidate(c,true))!;assert.ok(c);
 assert.equal(walls.placeWall(c),true);assert.deepEqual(walls.path(),road);assert.ok(!walls.blocks.has(key(c)));
 assert.equal(walls.placeWall(c),false);
});
test('몬스터가 밟고 있는 길 위에는 성벽을 겹쳐 놓지 못한다',()=>{
 const m=new Defense(LEVELS[1]);m.spawn();const c={x:1,y:4};m.enemies[0].x=world(c).x;m.enemies[0].y=world(c).y;
 assert.equal(m.candidate(c,true),null);
});
test('일시정지에서는 시간과 체력이 멈추고 목표 미달이면 진급하지 않는다',()=>{
 const m=new Defense(LEVELS[6]);install(m,{x:1,y:3},100,'basic');m.start();m.togglePause();m.step(.1);assert.equal(m.elapsed,0);
 m.togglePause();m.elapsed=m.duration-.05;m.spawned=m.level.hp.length;m.kills=12;m.step(.1);assert.equal(m.phase,'review');assert.equal(m.castle,5);assert.equal(m.stars,0);
});
test('2분 동안 첫 등장 8초, 이후 8.4초 간격으로 12마리가 등장하며 정지 중에는 예약도 멈춘다',()=>{
 const m=new Defense(LEVELS[0]);install(m,{x:1,y:3},100,'basic');m.start();
 // Keep enemies alive and stationary to isolate the complete wave schedule.
 for(const t of m.towers)t.enabled=false;
 const times:number[]=[];
 for(let i=0;i<1200;i++){
  for(const e of m.enemies)e.stun=1000;
  const count=m.spawned;m.step(.1);
  if(m.spawned>count)times.push(Number(m.elapsed.toFixed(1)));
  if(i===79){m.togglePause();for(let j=0;j<100;j++)m.step(.1);assert.equal(Number(m.elapsed.toFixed(1)),8);assert.equal(m.spawned,1);m.togglePause();}
 }
 assert.deepEqual(times,[8,16.4,24.8,33.2,41.6,50,58.4,66.8,75.2,83.6,92,100.4]);
 // Floating point accumulation can leave the clock just short of the boundary.
 m.step(.1);assert.equal(m.elapsed,120);assert.equal(m.phase,'playing');assert.equal(m.castle,5);assert.equal(m.spawned,12);
});
test('성 체력은 한 마리당 하나씩 줄고 다섯 번째 통과에서만 패배한다',()=>{
 const m=new Defense(LEVELS[0]);m.phase='playing';
 for(let i=1;i<=5;i++){
  m.spawn();const e=m.enemies.at(-1)!;e.next=e.path.length;m.step(.1);
  assert.equal(m.castle,5-i);assert.equal(m.leaks,i);assert.equal(m.phase,i===5?'lost':'playing');
 }
 const elapsed=m.elapsed;m.step(.1);assert.equal(m.elapsed,elapsed);assert.equal(m.leaks,5);
});
test('여러 몬스터가 동시에 통과해도 체력은 0 아래로 내려가지 않고 5번에서 멈춘다',()=>{
 const m=new Defense(LEVELS[0]);for(let i=0;i<8;i++){m.spawn();m.enemies.at(-1)!.next=m.enemies.at(-1)!.path.length;}
 m.phase='playing';m.step(.1);assert.equal(m.castle,0);assert.equal(m.leaks,5);assert.equal(m.phase,'lost');assert.equal(m.kills,0);
});
test('2분 이후 한 마리가 통과해도 계속 방어하고 체력이 남으면 목표 달성으로 승리한다',()=>{
 const m=new Defense(LEVELS[0]);for(let i=0;i<12;i++)m.spawn();m.enemies=m.enemies.slice(-2);m.kills=10;
 m.phase='playing';m.elapsed=m.duration-.05;m.enemies[0].next=m.enemies[0].path.length;m.enemies[1].stun=100;
 m.step(.1);assert.equal(m.castle,4);assert.equal(m.phase,'playing');assert.equal(m.elapsed,120);
 m.damage(m.enemies[0],{unit:m.enemies[0].hp,effect:'basic'} as Tower);m.step(.1);
 assert.equal(m.phase,'won');assert.equal(m.castle,4);assert.equal(m.leaks,1);assert.equal(m.stars,2);
});
test('저장은 레벨·별점·음향과 벽돌·성벽을 유지하며 손상된 저장을 안전하게 복구한다',()=>{
 const map=new Map<string,string>();Object.assign(globalThis,{localStorage:{getItem:(k:string)=>map.get(k)??null,setItem:(k:string,v:string)=>map.set(k,v)}});
 assert.equal(loadSave().level,1);const s=loadSave();s.level=5;s.stars[3]=2;s.sfx=false;s.inventory={bricks:[420,530,950],walls:2};assert.ok(writeSave(s));assert.deepEqual(loadSave(),s);
 map.set('decimal-castle-v1','broken');assert.equal(loadSave().level,1);
 const m=new Defense(LEVELS[4]);assert.equal(m.towers.length,0);assert.equal(m.bricks.length,0);assert.equal(m.money,LEVELS[4].budget);
});
test('설치한 성벽과 남은 벽돌은 다음 단계·재도전에서 재고로 돌아오며 준비 목표에 반영된다',()=>{
 const m=new Defense(LEVELS[5],{bricks:[600,700,1300,420],walls:1});
 assert.equal(m.fuse(m.bricks.slice(0,3).map(b=>b.id)),true);assert.equal(m.wallStock,2);
 assert.equal(m.placeWall({x:1,y:4}),true);assert.equal(m.wallStock,1);
 const inventory=m.inventory;
 for(const level of [LEVELS[5],LEVELS[6]]){
  const next=new Defense(level,inventory);assert.equal(next.wallStock,2);assert.equal(next.walls.length,0);
  assert.deepEqual(next.bricks.map(b=>b.value),[420]);assert.equal(next.fusions,0);
  assert.equal(next.placeWall({x:1,y:4}),true);assert.equal(next.goals[1].done,true);
  assert.equal(next.money,level.budget);assert.equal(next.towers.length,0);
 }
});
test('성벽 회수·재배치는 재고를 늘리지 않고 자연 장애물과 몬스터 경로를 유지한다',()=>{
 const m=new Defense(LEVELS[6],{bricks:[],walls:2});
 assert.equal(m.recoverWall({x:4,y:0}),false);assert.ok(m.blocks.has('4,0'));
 assert.equal(m.placeWall({x:1,y:4}),true);m.spawn();const e=m.enemies[0],before={x:e.x,y:e.y};
 assert.equal(m.recoverWall({x:1,y:4}),true);assert.equal(m.wallStock,2);assert.ok(!m.blocks.has('1,4'));
 assert.deepEqual({x:e.x,y:e.y},before);assert.ok(m.path(m.blocks,e.path[0]));
 assert.equal(m.recoverWall({x:1,y:4}),false);assert.equal(m.wallStock,2);
 const other=m.path()!.slice(4).find(c=>m.candidate(c,true))!;
 assert.equal(m.placeWall(other),true);assert.equal(m.wallStock,1);
 assert.equal(m.recoverWall(other),true);assert.equal(m.wallStock,2);assert.equal(m.inventory.walls,2);
});
test('과거 저장은 빈 재고로 호환되고 손상된 재료·성벽 값만 제거한다',()=>{
 const map=new Map<string,string>();Object.assign(globalThis,{localStorage:{getItem:(k:string)=>map.get(k)??null,setItem:(k:string,v:string)=>map.set(k,v)}});
 map.set('decimal-castle-v1',JSON.stringify({version:1,level:7,stars:[3],sfx:false}));
 assert.equal(loadSave().level,7);assert.deepEqual(loadSave().inventory,{bricks:[],walls:0});
 map.set('decimal-castle-v1',JSON.stringify({version:1,level:7,inventory:{bricks:[420,-100,1,0,530,'950',950],walls:-1}}));
 assert.deepEqual(loadSave().inventory,{bricks:[420,530,950],walls:0});
 const first=new Defense(LEVELS[0],loadSave().inventory);assert.equal(first.fuse(first.bricks.map(b=>b.id)),true);
 assert.match(first.events.at(-1)!.message,/0\.42 \+ 0\.53 = 0\.95/);
});

