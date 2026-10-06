import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Defense} from '../src/model';
import {LEVELS} from '../src/levels';
import {key,COLS,ROWS} from '../src/path';

const snapshot=(m:Defense)=>JSON.stringify({blocks:[...m.blocks],walls:m.walls,stock:m.wallStock,inventory:m.inventory,enemies:m.enemies,events:m.events,money:m.money,phase:m.phase});
const detour=(m:Defense)=>m.path()!.slice(3,-2).find(c=>{const p=m.previewWall(c);return p.valid&&p.extraSteps>0;})!;

test('全10段階: preview is pure and confirmed entrance/enemy routes exactly match the preview',()=>{
 for(const level of LEVELS){
  const m=new Defense(level,{bricks:[100,200,300],walls:2});m.spawn();m.phase='paused';
  const c=detour(m);assert.ok(c,`stage ${level.id} detour`);const before=snapshot(m),p=m.previewWall(c);
  assert.equal(snapshot(m),before);assert.ok(p.valid);assert.ok(p.extraSteps>0);
  assert.deepEqual(p.after!.at(-1),m.map.end);assert.ok(!p.after!.some(x=>key(x)===key(c)));
  assert.ok(m.requestWall(c));assert.equal(snapshot(m),before);
  assert.ok(m.confirmWall());assert.equal(m.pendingWall,null);assert.equal(m.wallStock,1);
  assert.deepEqual(m.path(),p.after);assert.deepEqual(m.walls,[c]);assert.equal(m.phase,'paused');
  for(const expected of p.enemyRoutes){const e=m.enemies.find(e=>e.id===expected.id)!;assert.deepEqual(e.path,expected.path);assert.equal(e.next,0);assert.deepEqual({x:e.x,y:e.y},expected.from);}
  assert.equal(m.confirmWall(),false);assert.equal(m.wallStock,1);
 }
});

test('choosing a different cell and cancelling never consumes a wall or changes the terrain',()=>{
 const m=new Defense(LEVELS[0],{bricks:[],walls:1}),before=snapshot(m),c=detour(m);
 assert.ok(m.requestWall(c));m.requestWall(m.map.end);assert.equal(m.pendingWall!.valid,false);
 assert.equal(snapshot(m),before);m.cancelWall();assert.equal(m.pendingWall,null);assert.equal(snapshot(m),before);
});

test('preview rejects occupied/reserved cells, no stock, limits, finished stages and a fully blocked path',()=>{
 const m=new Defense(LEVELS[0],{bricks:[],walls:12});m.spawn();
 const rock=[...m.blocks][0].split(',').map(Number);
 for(const c of [m.map.start,m.map.end,{x:rock[0],y:rock[1]},{x:-1,y:0},{x:COLS,y:ROWS}]){
  const before=snapshot(m);assert.equal(m.requestWall(c),false);assert.equal(m.pendingWall!.after,null);assert.equal(m.confirmWall(),false);assert.deepEqual([...m.blocks],JSON.parse(before).blocks);assert.equal(m.wallStock,12);
 }
 const empty=new Defense(LEVELS[0]);assert.equal(empty.previewWall({x:1,y:4}).valid,false);
 const finished=new Defense(LEVELS[0],{bricks:[],walls:1});finished.phase='won';assert.equal(finished.previewWall({x:1,y:4}).valid,false);
 const full=new Defense(LEVELS[0],{bricks:[],walls:12});full.walls=Array.from({length:full.balance.wallLimit},(_,x)=>({x,y:0}));assert.equal(full.previewWall({x:1,y:4}).valid,false);
 const blocked=new Defense(LEVELS[0],{bricks:[],walls:1});for(let y=0;y<ROWS-1;y++)blocked.blocks.add(key({x:1,y}));assert.ok(blocked.path());assert.equal(blocked.requestWall({x:1,y:ROWS-1}),false);assert.equal(blocked.confirmWall(),false);assert.equal(blocked.walls.length,0);
});

test('changed monster position requires a fresh confirmation instead of installing a stale preview',()=>{
 const m=new Defense(LEVELS[0],{bricks:[],walls:1});m.spawn();const c=detour(m);m.requestWall(c);
 m.enemies[0].x+=1;assert.equal(m.confirmWall(),false);assert.equal(m.wallStock,1);assert.equal(m.walls.length,0);
 assert.equal(m.pendingWall!.enemyRoutes[0].from.x,m.enemies[0].x);assert.ok(m.confirmWall());assert.equal(m.wallStock,0);
});

test('recovered walls can preview a new position; cancelling keeps them in stock',()=>{
 const m=new Defense(LEVELS[0],{bricks:[],walls:1}),c=detour(m);assert.ok(m.requestWall(c));assert.ok(m.confirmWall());assert.ok(m.recoverWall(c));
 assert.equal(m.wallStock,1);assert.ok(m.requestWall(c));m.cancelWall();assert.equal(m.wallStock,1);assert.equal(m.walls.length,0);
});
