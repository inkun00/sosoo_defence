import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DUEL_MAPS,DEFAULT_DUEL_MAP_ID,duelMap,duelPathDistance,duelPathPosition,duelRoadCell,isDuelMapId} from '../src/multiplayer/duel-maps';
import {advanceDuel,applyDuel,createDuel,duelEnemyPosition,joinDuel,validDuelCell,DUEL_PREPARATION_SECONDS,DuelEnemy,DuelState} from '../src/multiplayer/duel';
const ROOM_NOW=100000,NOW=ROOM_NOW+DUEL_PREPARATION_SECONDS*1000;
function match(mapId?:string){
 const s=createDuel('left','왼쪽',17,ROOM_NOW,1,{},mapId);joinDuel(s,'right','오른쪽',ROOM_NOW);
 assert.ok(applyDuel(s,0,{type:'ready'},ROOM_NOW,'a').ok);assert.ok(applyDuel(s,1,{type:'ready'},ROOM_NOW,'b').ok);assert.equal(s.status,'preparing');
 s.players.forEach(p=>p!.lastSeen=NOW);advanceDuel(s,NOW);assert.equal(s.status,'playing');assert.equal(s.elapsed,0);return s;
}
function enemy(s:DuelState,x:number,y:number,extra:Partial<DuelEnemy>={}):DuelEnemy{return{id:90,owner:1,target:0,hero:null,level:1,hp:500,max:500,x,y,pathDistance:duelPathDistance(s.mapId,x,y),slow:0,stun:0,hits:0,...extra};}
function keepConnected(s:DuelState,now:number){s.players.forEach(p=>p!.lastSeen=now);advanceDuel(s,now);}

test('10개 선택 맵은 서로 다르고 좌우 대칭이며 이어진 굽잇길과 충분한 설치 공간을 가진다',()=>{
 assert.equal(DUEL_MAPS.length,10);assert.equal(new Set(DUEL_MAPS.map(map=>map.id)).size,10);assert.equal(new Set(DUEL_MAPS.map(map=>JSON.stringify(map.points))).size,10);assert.equal(DEFAULT_DUEL_MAP_ID,DUEL_MAPS[0].id);
 for(const map of DUEL_MAPS){
  assert.deepEqual(map.points[0],{x:0,y:3});assert.deepEqual(map.points.at(-1),{x:23,y:3});
  const roads=new Set(map.roadCells.map(cell=>`${cell.x},${cell.y}`));assert.equal(roads.size,map.roadCells.length,`${map.id}: 길이 자기 자신과 교차하지 않는다`);
  assert.ok(map.length>23);assert.ok(map.points.some(point=>point.y!==3));
  for(let i=0;i<map.roadCells.length;i++){
   const a=map.roadCells[i],b=map.roadCells.at(-1-i)!;assert.equal(a.x,23-b.x);assert.equal(a.y,b.y);assert.ok(a.x>=0&&a.x<=23&&a.y>=0&&a.y<=6);
   const neighbors=[[1,0],[-1,0],[0,1],[0,-1]].filter(([dx,dy])=>roads.has(`${a.x+dx},${a.y+dy}`)).length;
   assert.equal(neighbors,i===0||i===map.roadCells.length-1?1:2,`${map.id}: 서로 닿아 지름길처럼 보이는 길이 없다`);
   if(i)assert.equal(Math.abs(a.x-map.roadCells[i-1].x)+Math.abs(a.y-map.roadCells[i-1].y),1,`${map.id}: 이어진 길`);
  }
  const s=match(map.id);let slots=0;
  for(let x=1;x<=10;x++)for(let y=0;y<7;y++){const allowed=validDuelCell(s,0,x,y);assert.equal(allowed,validDuelCell(s,1,23-x,y));assert.equal(allowed,!roads.has(`${x},${y}`));if(allowed)slots++;}
  assert.ok(slots>=14,`${map.id}: 전체 14타워를 선택할 공간`);
 }
});

test('길 위의 신규 설치를 막고 예전 방과 잘못된 맵 식별자를 구분한다',()=>{
 assert.equal(isDuelMapId(DEFAULT_DUEL_MAP_ID),true);assert.equal(isDuelMapId('not-a-map'),false);assert.equal(isDuelMapId(undefined),false);
 assert.throws(()=>createDuel('a','가',1,NOW,1,{},'not-a-map'));assert.throws(()=>duelMap('not-a-map'));
 const legacy=match();assert.equal(legacy.mapId,undefined);assert.equal(duelMap().length,23);assert.equal(validDuelCell(legacy,0,7,3),false);assert.equal(validDuelCell(legacy,0,7,1),true);
 const curved=match(DEFAULT_DUEL_MAP_ID);assert.equal(validDuelCell(curved,0,7,1),false);assert.equal(validDuelCell(curved,0,8,3),true);
 curved.players[0].stock.basic=1;
 assert.equal(applyDuel(curved,0,{type:'build',x:7,y:1,typeId:'basic'},NOW,'road').ok,false);assert.equal(curved.players[0].stock.basic,1);
 assert.equal(applyDuel(curved,0,{type:'build',x:8,y:3,typeId:'basic'},NOW,'floor').ok,true);assert.equal(curved.players[0].stock.basic,0);
});

test('경로 샘플은 모서리를 돌아가며 모든 맵의 대응 위치가 정확히 좌우 대칭이다',()=>{
 for(const map of DUEL_MAPS){for(let distance=0;distance<=map.length;distance+=.25){
  const left=duelPathPosition(map.id,distance),right=duelPathPosition(map.id,map.length-distance);
  assert.ok(Math.abs(left.x+right.x-23)<1e-8);assert.ok(Math.abs(left.y-right.y)<1e-8);assert.ok(Math.abs(duelPathDistance(map.id,left.x,left.y)-distance)<1e-8);
 }}
 const s=match(DEFAULT_DUEL_MAP_ID),e=enemy(s,7,1.2,{owner:0,target:1});
 const start=duelEnemyPosition(s,e),predicted=duelEnemyPosition(s,e,1);assert.equal(start.dx,0);assert.equal(start.dy,-1);assert.equal(predicted.y,1);assert.ok(predicted.x>7);
 const turn=duelEnemyPosition(s,enemy(s,7,1));assert.equal(turn.dx,0);assert.equal(turn.dy,1,'왼쪽으로 가는 적도 모서리에서 다음 진행 방향을 바라본다');
 s.enemies=[e];advanceDuel(s,NOW+1000);assert.ok(Math.abs(e.x-predicted.x)<1e-8);assert.ok(Math.abs(e.y-predicted.y)<1e-8);
});

test('모든 선택 맵에서 파동이 중앙에서 출발하고 동일한 시간에 양쪽 불꽃에 도착한다',()=>{
 const arrivals:number[]=[];
 for(const map of DUEL_MAPS){
  const s=match(map.id);keepConnected(s,NOW+8000);assert.equal(s.enemies.length,2);assert.equal(s.enemies[0].target,0);assert.equal(s.enemies[1].target,1);
  const [a,b]=s.enemies;assert.ok(Math.abs(a.x+b.x-23)<1e-8);assert.ok(Math.abs(a.y-b.y)<1e-8);
  let first=-1;
  for(let second=9;second<=65;second++){
   keepConnected(s,NOW+second*1000);assert.equal(s.players[0].flame,s.players[1]!.flame,`${map.id}: 공정한 도착 판정`);
   if(first<0&&s.players[0].flame<9000){first=second;break;}
  }
  assert.ok(first>8,`${map.id}: 실제 불꽃 도착`);arrivals.push(first);
 }
 assert.equal(new Set(arrivals).size,1,'길이가 길어도 주어진 방어 시간은 같아야 한다');
});

test('타워는 실제 높이의 사거리를 사용하며 발사 기록에도 굽잇길의 목표 높이가 남는다',()=>{
 const s=match('ruin-switchback');s.players[0].towers.push({id:1,typeId:'basic',x:8,y:3,unit:100,cost:100,enabled:true,cooldown:0});s.enemies=[enemy(s,9,0,{hp:100,max:100})];
 assert.equal(validDuelCell(s,0,8,1),true);advanceDuel(s,NOW+100);assert.equal(s.shots.length,0,'수평 좌표만 가까워도 3칸 밖의 적을 공격하면 안 된다');
 s.players[0].towers.push({id:2,typeId:'basic',x:8,y:1,unit:100,cost:100,enabled:true,cooldown:0});advanceDuel(s,NOW+200);
 assert.equal(s.enemies.length,0);assert.equal(s.shots.length,1);assert.equal(s.shots[0].towerId,2);assert.equal(s.shots[0].y,0);
});

test('되돌아오는 회랑에서도 좌표 대신 불꽃까지 남은 경로로 공격 우선순위를 정한다',()=>{
 const s=match('ruin-switchback');s.players[0].towers.push({id:1,typeId:'basic',x:5,y:1,unit:100,cost:100,enabled:true,cooldown:0});
 s.enemies=[enemy(s,4,2,{id:1,hp:100,max:100}),enemy(s,6,0,{id:99,hp:100,max:100})];advanceDuel(s,NOW+100);
 assert.equal(s.shots[0].enemyId,99,'가로 좌표가 더 커도 실제 불꽃에 더 가까운 적부터 공격');
});

test('가속 영웅의 범위는 서로 다른 높이의 아군을 구별한다',()=>{
 const alone=match('crystal-twin'),far=match('crystal-twin'),near=match('crystal-twin');
 for(const s of [alone,far,near])s.enemies=[enemy(s,4,1,{id:1,owner:0,target:1})];
 far.enemies.push(enemy(far,4,5,{id:2,owner:0,target:1,hero:'hero-10-0',level:10,hp:36750,max:36750}));
 near.enemies.push(enemy(near,4,3,{id:2,owner:0,target:1,hero:'hero-10-0',level:10,hp:36750,max:36750}));
 for(const s of [alone,far,near])advanceDuel(s,NOW+100);
 assert.ok(Math.abs(alone.enemies[0].pathDistance!-far.enemies[0].pathDistance!)<1e-8);assert.ok(near.enemies[0].pathDistance!>alone.enemies[0].pathDistance!);
});

test('부화와 학습지 영웅의 호위는 양쪽 곡선 길에 좌우 대칭으로 배치된다',()=>{
 for(const map of DUEL_MAPS){
  const s=match(map.id);for(const side of [0,1] as const){s.players[side]!.egg=10;assert.ok(applyDuel(s,side,{type:'hatch',heroId:'hero-10-1'},NOW,`h-${side}`).ok);}
  const a=s.enemies.filter(e=>e.owner===0),b=s.enemies.filter(e=>e.owner===1);assert.equal(a.length,5);assert.equal(b.length,5);
  for(let i=0;i<a.length;i++){assert.ok(Math.abs(a[i].x+b[i].x-23)<1e-8);assert.equal(a[i].y,b[i].y);assert.ok(Math.abs(a[i].pathDistance!+b[i].pathDistance!-map.length)<1e-8);}
  const reward=match(map.id);for(const side of [0,1] as const){const p=reward.players[side]!;p.rewardRoster=['hero-10-1'];p.rewardHero='hero-10-1';assert.ok(applyDuel(reward,side,{type:'summon-reward'},NOW,`reward-${side}`).ok);}
  assert.equal(reward.enemies.filter(e=>e.rewardSummon).length,2);assert.ok(reward.enemies.every(e=>duelRoadCell(map.id,Math.round(e.x),Math.round(e.y!))));
 }
});
