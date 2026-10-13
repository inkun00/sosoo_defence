import test from 'node:test';
import assert from 'node:assert/strict';
import {Defense,FIRST_SPAWN_DELAY,type Phase} from '../src/model';
import {LEVELS} from '../src/levels';
import {numberText} from '../src/math';
import {COLS,ROWS,type Cell} from '../src/path';
function towerCell(m:Defense):Cell{
 for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++)if(m.candidate({x,y}))return {x,y};
 throw Error('No tower cell');
}
const wallCell=(m:Defense)=>m.path()!.slice(2,-2).find(c=>m.candidate(c,true))!;
const resources=(m:Defense)=>JSON.stringify({money:m.money,towers:m.towers,walls:m.walls,inventory:m.inventory,blocks:[...m.blocks],placements:m.wallPlacements});
function prepare(m:Defense){assert.ok(m.requestPurchase(towerCell(m),'basic'));const q=m.pendingPurchase!;assert.ok(m.answerPurchase(numberText(q.before-q.cost)));}

test('every story stage locks walls at the first real spawn and cancels its pending preview',()=>{
 for(const level of LEVELS){
  const m=new Defense(level,{bricks:[],walls:3});prepare(m);assert.ok(m.placeWall(wallCell(m)));assert.ok(m.start());
  for(let i=0;i<FIRST_SPAWN_DELAY*10-1;i++)m.step(.1);
  assert.equal(m.spawned,0);assert.ok(m.canPlaceWall);m.togglePause();assert.ok(m.requestWall(wallCell(m)));assert.ok(m.confirmWall());m.togglePause();
  const c=wallCell(m);assert.ok(m.requestWall(c));m.step(.1);
  assert.equal(m.spawned,1);assert.equal(m.canPlaceWall,false);assert.equal(m.pendingWall,null);
  const before=resources(m);assert.equal(m.placeWall(c),false);assert.equal(m.previewWall(c).valid,false);assert.equal(m.requestWall(c),false);assert.equal(m.confirmWall(),false);assert.equal(resources(m),before);
 }
});

test('pause, clearing all live enemies and recovered walls never reopen construction',()=>{
 const m=new Defense(LEVELS[5],{bricks:[],walls:2});prepare(m);const placed=wallCell(m);assert.ok(m.placeWall(placed));m.spawn();m.phase='paused';
 assert.ok(m.recoverWall(placed));m.enemies=[];const before=resources(m);
 for(const phase of ['playing','paused','ready','won','review','lost'] as Phase[]){
  m.phase=phase;assert.equal(m.canBuild,false);assert.equal(m.canPlaceWall,false);
  assert.equal(m.requestPurchase(towerCell(m),'basic'),false);assert.equal(m.placeWall(wallCell(m)),false);
  assert.equal(resources(m),before);
 }
});

test('a boss spawning first also invalidates old purchase answers and wall previews without spending resources',()=>{
 const m=new Defense(LEVELS[10],{bricks:[],walls:1});assert.ok(m.requestPurchase(towerCell(m),'basic'));const q=m.pendingPurchase!;
 const c=wallCell(m);assert.ok(m.requestWall(c));const before=resources(m);assert.ok(m.spawnBoss());assert.equal(m.spawned,0);
 assert.equal(m.pendingPurchase,null);assert.equal(m.pendingWall,null);assert.equal(m.canBuild,false);assert.equal(m.canPlaceWall,false);
 m.pendingPurchase=q;assert.equal(m.answerPurchase(numberText(q.before-q.cost)),false);assert.equal(m.placeWall(c),false);assert.equal(resources(m),before);
});

test('combat fusion and recovery bank walls for the next preparation without installing any',()=>{
 const m=new Defense(LEVELS[5],{bricks:[100,200,300],walls:1});const c=wallCell(m);assert.ok(m.placeWall(c));m.walls[0].durability=2;m.spawn();m.phase='paused';
 assert.ok(m.fuse(m.bricks.map(b=>b.id)));assert.equal(m.walls.length,1);assert.equal(m.wallStock,1);assert.equal(m.placeWall(wallCell(m)),false);
 assert.ok(m.recoverWall(c));assert.equal(m.wallStock,2);assert.equal(m.wallPlacements,1);
 const next=new Defense(LEVELS[5],m.inventory);assert.ok(next.placeWall(wallCell(next)));assert.ok(next.placeWall(wallCell(next)));
 assert.deepEqual(next.walls.map(w=>w.durability),[3,2]);assert.equal(next.wallStock,0);
});
