import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Defense} from '../src/model';
import {LEVELS} from '../src/levels';
import {STAGE_MAPS,stageMap} from '../src/maps';
import {COLS,ROWS,key,naturalBlocks,world} from '../src/path';

test('10개 단계는 서로 다른 바위 배치·경로와 맵 이름을 사용하고 입구에서 불꽃까지 연결된다',()=>{
 assert.equal(STAGE_MAPS.length,10);const layouts=new Set<string>(),paths=new Set<string>();
 for(const level of LEVELS){
  const m=new Defense(level),road=m.path()!;assert.ok(road,`단계 ${level.id} 길`);assert.equal(m.map.id,level.id);
  assert.deepEqual(road[0],m.map.start);assert.deepEqual(road.at(-1),m.map.end);
  assert.ok(road.length>=16&&road.length<=32,`단계 ${level.id} 길이 ${road.length}`);
  for(const p of road){assert.ok(p.x>=0&&p.x<COLS&&p.y>=0&&p.y<ROWS);assert.ok(!m.blocks.has(key(p)));}
  for(let i=1;i<road.length;i++)assert.equal(Math.abs(road[i].x-road[i-1].x)+Math.abs(road[i].y-road[i-1].y),1);
  for(const rock of m.blocks){const [x,y]=rock.split(',').map(Number);assert.ok(x>=0&&x<COLS&&y>=0&&y<ROWS);}
  layouts.add([...m.blocks].sort().join('|'));paths.add(road.map(key).join('|'));
 }
 assert.equal(layouts.size,10);assert.equal(paths.size,10);assert.equal(new Set(STAGE_MAPS.map(m=>m.name)).size,10);
 assert.ok(new Set(STAGE_MAPS.map(m=>key(m.end))).size>=4);
});

test('재도전은 같은 맵을 복원하고 타워·성벽 배치는 다른 단계의 바위를 바꾸지 않는다',()=>{
 for(const level of LEVELS){
  const m=new Defense(level,{bricks:[],walls:1}),original=naturalBlocks(level.id),road=m.path()!;
  const wall=road.find(c=>m.candidate(c,true)&&m.path(m.candidate(c,true)!)!.length>road.length);
  assert.ok(wall,`단계 ${level.id} 우회 성벽`);assert.ok(m.placeWall(wall));assert.ok(m.path()!.length>road.length);
  const retry=new Defense(level);assert.deepEqual(retry.blocks,original);assert.notDeepEqual(m.blocks,retry.blocks);
  assert.ok(m.recoverWall(wall));assert.deepEqual(m.blocks,original);
  assert.deepEqual(new Defense(LEVELS[level.id%10]).blocks,naturalBlocks(level.id%10+1));
 }
 assert.equal(stageMap(0),STAGE_MAPS[0]);assert.deepEqual(naturalBlocks(),naturalBlocks(1));
});

test('단계마다 이동한 불꽃 칸을 예약하고 성벽 설치·회수 후에도 몬스터가 그 불꽃을 향한다',()=>{
 for(const level of LEVELS){
  const m=new Defense(level,{bricks:[],walls:2});
  for(const cell of [m.map.start,m.map.end]){assert.equal(m.candidate(cell),null);assert.equal(m.candidate(cell,true),null);}
  m.spawn();const e=m.enemies[0];assert.deepEqual({x:e.x,y:e.y},world(m.map.start));assert.deepEqual(e.path.at(-1),m.map.end);
  const wall=m.path()!.slice(4,-2).find(c=>m.candidate(c,true));assert.ok(wall);assert.ok(m.placeWall(wall));assert.deepEqual(e.path.at(-1),m.map.end);
  assert.ok(m.recoverWall(wall));assert.deepEqual(e.path.at(-1),m.map.end);
  e.next=e.path.length;m.phase='playing';m.step(.1);assert.equal(m.castle,4);assert.equal(m.leaks,1);assert.equal(m.phase,'playing');
 }
});

test('후반으로 갈수록 기본 이동 경로가 짧아져 발사 기회가 줄어든다',()=>{
 const lengths=LEVELS.map(l=>new Defense(l).path()!.length);
 assert.deepEqual(lengths,[32,31,30,26,24,23,22,21,19,16]);
 for(let i=1;i<lengths.length;i++)assert.ok(lengths[i]<lengths[i-1]);
});
