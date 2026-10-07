import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Defense,WallImpact} from '../src/model';
import {LEVELS} from '../src/levels';
import {world,TILE} from '../src/path';
import {loadSave,writeSave} from '../src/save';

const snapshot=(m:Defense)=>JSON.stringify({blocks:[...m.blocks],walls:m.walls,stock:m.wallStock,inventory:m.inventory,enemies:m.enemies,money:m.money,phase:m.phase});
const roadCell=(m:Defense)=>m.path()!.slice(1,-1).find(c=>m.candidate(c,true))!;
function collisionSetup(kind:'slime'|'golem'='slime',stage=1){
 const m=new Defense(LEVELS[stage-1],{bricks:[],walls:1}),c=roadCell(m);assert.ok(m.placeWall(c));m.spawn();
 const e=m.enemies[0],wall=m.walls[0],p=world(c);e.kind=kind;e.x=p.x-TILE*.4-.5;e.y=p.y;
 m.phase='playing';m.events=[];return {m,e,wall,c};
}
function untilBreak(m:Defense){for(let i=0;i<300&&m.walls.length;i++)m.step(.02);assert.equal(m.walls.length,0);}

test('모든 단계: 길 위에만 설치하고 기존 길·바위·몬스터 경로는 바꾸지 않는다',()=>{
 for(const level of LEVELS){
  const m=new Defense(level,{bricks:[],walls:2});m.spawn();m.phase='paused';const road=m.path()!,c=road.slice(3,-1).find(c=>m.candidate(c,true))!,before=snapshot(m),p=m.previewWall(c);
  assert.ok(p.valid);assert.equal(snapshot(m),before);assert.ok(m.requestWall(c));assert.equal(snapshot(m),before);
  assert.ok(m.confirmWall());assert.equal(m.pendingWall,null);assert.equal(m.wallStock,1);assert.equal(m.walls[0].durability,3);
  assert.deepEqual(m.path(),road);assert.deepEqual(m.enemies[0].path,road);assert.equal(m.enemies[0].next,1);assert.equal(m.phase,'paused');
  assert.equal(m.confirmWall(),false);assert.equal(m.wallStock,1);
  assert.equal(m.requestWall({x:1,y:3}),false);assert.equal(m.confirmWall(),false);
 }
});

test('입구·불꽃·바위·몬스터가 있는 칸·완료된 단계·재고 없음은 설치 불가, 취소는 소비 없음',()=>{
 const m=new Defense(LEVELS[0],{bricks:[],walls:1});m.spawn();const before=snapshot(m);
 for(const c of [m.map.start,m.map.end,{x:4,y:0},{x:1,y:3},{x:-1,y:0},{x:.5,y:4}]){assert.equal(m.requestWall(c),false);assert.equal(m.confirmWall(),false);}
 assert.equal(snapshot(m),before);const c=roadCell(m);assert.ok(m.requestWall(c));m.cancelWall();assert.equal(snapshot(m),before);
 const p=world(c);m.enemies[0].x=p.x;m.enemies[0].y=p.y;assert.equal(m.requestWall(c),false);
 const empty=new Defense(LEVELS[0]);assert.equal(empty.previewWall(c).valid,false);
 m.phase='won';assert.equal(m.previewWall(c).valid,false);
});

test('한 번의 접촉은 내구도 1만 깎고 반동을 주며 소수 체력과 타격 횟수에는 영향이 없다',()=>{
 const {m,e,wall}=collisionSetup(),hp=e.hp,hits=e.hits;m.step(.02);
 assert.equal(wall.durability,2);assert.equal(e.hp,hp);assert.equal(e.hits,hits);assert.equal(m.successfulHits,0);assert.ok(e.recoil!.vx<0);
 const contactX=e.x;m.step(.02);assert.ok(e.x<contactX);assert.ok(wall.offsetX>0);
 for(let i=0;i<20;i++)m.step(.02);assert.equal(wall.durability,2);assert.equal(m.events.filter(e=>e.type==='wall-impact').length,1);
});

test('세 번째 실제 충돌에만 파괴되고 같은 몬스터가 열린 길을 통과한다',()=>{
 const {m,e,wall,c}=collisionSetup(),road=m.path()!,hp=e.hp;untilBreak(m);
 assert.equal(wall.durability,0);assert.equal(m.inventory.walls,0);assert.equal(m.wallStock,0);
 assert.deepEqual(m.events.filter(e=>e.type==='wall-impact').map(e=>(e.data as WallImpact).durability),[2,1,0]);
 assert.equal(m.events.filter(e=>e.type==='wall-break').length,1);assert.deepEqual(m.path(),road);assert.equal(e.hp,hp);
 for(let i=0;i<100;i++)m.step(.02);assert.ok(e.x>world(c).x);assert.equal(m.events.filter(e=>e.type==='wall-break').length,1);
});

test('세 몬스터가 동시에 부딪혀도 세 접촉만 처리하고 중복 파괴·음수 내구도가 없다',()=>{
 const {m,e,wall}=collisionSetup();m.spawn();m.spawn();for(const enemy of m.enemies){enemy.x=e.x;enemy.y=e.y;}
 m.step(.1);assert.equal(wall.durability,0);assert.equal(m.walls.length,0);assert.equal(m.events.filter(e=>e.type==='wall-impact').length,3);assert.equal(m.events.filter(e=>e.type==='wall-break').length,1);
});

test('무거운 몬스터는 반동이 작고, 정지 중에는 물리 운동과 내구도가 멈춘다',()=>{
 const light=collisionSetup(),heavy=collisionSetup('golem');light.m.step(.04);heavy.m.step(.04);
 assert.ok(Math.abs(light.e.recoil!.vx)>Math.abs(heavy.e.recoil!.vx));
 light.m.togglePause();const state=snapshot(light.m);for(let i=0;i<100;i++)light.m.step(.1);assert.equal(snapshot(light.m),state);
});

test('느린 프레임에서도 충돌을 건너뛰지 않고 파괴 시 학습 목표는 유지된다',()=>{
 for(const dt of [.016,.1]){
  const {m,e,wall}=collisionSetup('slime',6);m.spawned=m.level.hp.length;m.kills=6;
  for(let i=0;i<700&&m.walls.length;i++)m.step(dt);
  assert.equal(wall.durability,0);assert.equal(m.goals[1].done,true);assert.equal(e.hp,e.max);
 }
});

test('회수·재배치·저장·다음 단계에도 남은 내구도가 유지되며 파괴된 성벽은 돌아오지 않는다',()=>{
 const {m,wall,c}=collisionSetup();m.step(.02);assert.equal(wall.durability,2);assert.ok(m.recoverWall(c));assert.equal(m.wallStock,1);
 const target=m.path()!.slice(4).find(c=>m.candidate(c,true))!;assert.ok(m.placeWall(target));assert.equal(m.walls[0].durability,2);
 const data=new Map<string,string>();Object.assign(globalThis,{localStorage:{getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>data.set(k,v)}});
 const save=loadSave();save.inventory=m.inventory;assert.ok(writeSave(save));const next=new Defense(LEVELS[1],loadSave().inventory);
 assert.equal(next.inventory.wallDurabilities![0],2);assert.ok(next.placeWall(roadCell(next)));assert.equal(next.walls[0].durability,2);
 const destroyed=collisionSetup();untilBreak(destroyed.m);save.inventory=destroyed.m.inventory;writeSave(save);assert.equal(loadSave().inventory.walls,0);
});
