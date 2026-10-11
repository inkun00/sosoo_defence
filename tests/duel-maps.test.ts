import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DUEL_MAPS,DEFAULT_DUEL_MAP_ID,DUEL_LANE_ROWS,DUEL_LANE_STRIDE,DUEL_BATTLE_ROWS,duelLaneOffset,duelMap,duelPathDistance,duelPathPosition,duelRoadCell,isDuelMapId} from '../src/multiplayer/duel-maps';
import {duelMapPreviewHTML,duelMapPickerHTML,duelMapSummaryHTML} from '../src/multiplayer/map-picker';
import {advanceDuel,applyDuel,createDuel,duelEnemyPosition,joinDuel,validDuelCell,DUEL_PREPARATION_SECONDS,DuelEnemy,DuelState} from '../src/multiplayer/duel';
const ROOM_NOW=100000,NOW=ROOM_NOW+DUEL_PREPARATION_SECONDS*1000;
function match(mapId?:string,rewardHero?:string){
 const loadout=rewardHero?{rewardHeroes:[rewardHero],rewardHero}:{};
 const s=createDuel('left','왼쪽',17,ROOM_NOW,1,loadout,mapId);joinDuel(s,'right','오른쪽',ROOM_NOW,1,loadout);
 assert.ok(applyDuel(s,0,{type:'ready'},ROOM_NOW,'a').ok);assert.ok(applyDuel(s,1,{type:'ready'},ROOM_NOW,'b').ok);assert.equal(s.status,'preparing');
 s.players.forEach(p=>p!.lastSeen=NOW);advanceDuel(s,NOW);assert.equal(s.status,'playing');assert.equal(s.elapsed,0);return s;
}
function enemy(s:DuelState,x:number,localY:number,extra:Partial<DuelEnemy>={}):DuelEnemy{const target=extra.target??0,y=localY+duelLaneOffset(target);return{id:90,owner:1,target,hero:null,level:1,hp:500,max:500,x,y,pathDistance:duelPathDistance(s.mapId,x,y,target),slow:0,stun:0,hits:0,...extra};}
function keepConnected(s:DuelState,now:number){s.players.forEach(p=>p!.lastSeen=now);advanceDuel(s,now);}

test('10개 선택 맵은 기본 경로의 공정한 좌우 대칭을 유지하고 독립 진영 전체에 설치 공간을 가진다',()=>{
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
  for(let x=1;x<=22;x++)for(let y=0;y<7;y++){const allowed=validDuelCell(s,0,x,y);assert.equal(allowed,validDuelCell(s,1,23-x,y+8));assert.equal(allowed,!roads.has(`${x},${y}`));if(allowed)slots++;}
  assert.ok(slots>=14,`${map.id}: 전체 14타워를 선택할 공간`);
 }
});

test('두 lane의 좌표·길 판정·거리 투영은 8칸만 다르고 이동 경로는 모든 맵에서 겹치지 않는다',()=>{
 assert.equal(DUEL_LANE_ROWS,7);assert.equal(DUEL_LANE_STRIDE,8);assert.equal(DUEL_BATTLE_ROWS,15);
 assert.equal(duelLaneOffset(0),0);assert.equal(duelLaneOffset(1),8);
 for(const mapId of [undefined,...DUEL_MAPS.map(map=>map.id)]){
  const map=duelMap(mapId),upper=new Set(map.roadCells.map(p=>`${p.x},${p.y}`)),lower=new Set(map.roadCells.map(p=>`${p.x},${p.y+8}`));
  assert.ok([...upper].every(cell=>!lower.has(cell)),'road cells are disjoint');
  for(let x=0;x<24;x++)for(let y=0;y<15;y++){
   assert.equal(duelRoadCell(mapId,x,y),upper.has(`${x},${y}`),'omitted side keeps the base path');
   assert.equal(duelRoadCell(mapId,x,y,0),upper.has(`${x},${y}`));
   assert.equal(duelRoadCell(mapId,x,y,1),lower.has(`${x},${y}`));
  }
  for(let distance=-1;distance<=map.length+1;distance+=.25){
   const a=duelPathPosition(mapId,distance),b=duelPathPosition(mapId,distance,1);
   assert.deepEqual(a,duelPathPosition(mapId,distance,0));
   assert.equal(a.x,b.x);assert.equal(b.y-a.y,8);assert.equal(a.dx,b.dx);assert.equal(a.dy,b.dy);
   assert.ok(a.y>=0&&a.y<=6&&b.y>=8&&b.y<=14);
   const clamped=Math.max(0,Math.min(map.length,distance));
   assert.ok(Math.abs(duelPathDistance(mapId,a.x,a.y)-clamped)<1e-8);
   assert.ok(Math.abs(duelPathDistance(mapId,b.x,b.y,1)-clamped)<1e-8);
  }
  assert.equal(duelPathDistance(mapId,8.2,2.7),duelPathDistance(mapId,8.2,10.7,1),'off-road projections use lane-local height');
 }
});

test('설치는 각 진영 x1~22 전체에서 가능하고 성·분리줄·상대 lane에는 불가능하다',()=>{
 for(const map of DUEL_MAPS){
  const s=match(map.id);
  for(const side of [0,1] as const)for(let x=0;x<24;x++)for(let y=0;y<15;y++){
   const offset=duelLaneOffset(side),expected=x>=1&&x<=22&&y>=offset&&y<offset+7&&!duelRoadCell(map.id,x,y,side);
   assert.equal(validDuelCell(s,side,x,y),expected,`${map.id}: side${side} (${x},${y})`);
  }
  for(const side of [0,1] as const){
   const y=duelLaneOffset(side)+6;s.players[side]!.stock.basic=1;
   assert.equal(applyDuel(s,side,{type:'build',x:11,y:7,typeId:'basic'},NOW,`divider-${side}`).ok,false);
   assert.equal(applyDuel(s,side,{type:'build',x:11,y:duelLaneOffset(side===0?1:0)+6,typeId:'basic'},NOW,`other-${side}`).ok,false);
   assert.equal(s.players[side]!.stock.basic,1,'rejected cross-lane placement preserves prepared stock');
   assert.equal(applyDuel(s,side,{type:'build',x:11,y,typeId:'basic'},NOW,`whole-${side}`).ok,true,'center columns now belong to the entire lane');
   assert.equal(s.players[side]!.stock.basic,0);
  }
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
 const start=duelEnemyPosition(s,e),predicted=duelEnemyPosition(s,e,1);assert.equal(start.dx,0);assert.equal(start.dy,-1);assert.equal(predicted.y,9);assert.ok(predicted.x>7);
 const turn=duelEnemyPosition(s,enemy(s,7,1));assert.equal(turn.dx,0);assert.equal(turn.dy,1,'왼쪽으로 가는 적도 모서리에서 다음 진행 방향을 바라본다');
 s.enemies=[e];advanceDuel(s,NOW+1000);assert.ok(Math.abs(e.x-predicted.x)<1e-8);assert.ok(Math.abs(e.y-predicted.y)<1e-8);
});

test('모든 선택 맵에서 파동은 각 target lane으로 출발하고 같은 시간에 상대 불꽃에 도착한다',()=>{
 const arrivals:number[]=[];
 for(const map of DUEL_MAPS){
  const s=match(map.id);keepConnected(s,NOW+8000);assert.equal(s.enemies.length,2);assert.equal(s.enemies[0].target,0);assert.equal(s.enemies[1].target,1);
  const [a,b]=s.enemies;assert.ok(Math.abs(a.x+b.x-23)<1e-8);assert.ok(Math.abs(b.y!-a.y!-8)<1e-8);assert.ok(a.y!>=0&&a.y!<=6&&b.y!>=8&&b.y!<=14);
  assert.equal(a.owner,1);assert.equal(b.owner,0);assert.ok(a.pathDistance!>map.length-1.1);assert.ok(b.pathDistance!<1.1);
  let first=-1;
  for(let second=9;second<=120;second++){
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
 far.enemies.push(enemy(far,4,5,{id:2,owner:0,target:1,hero:'hero-1-0',level:1,hp:800,max:800}));
 near.enemies.push(enemy(near,4,3,{id:2,owner:0,target:1,hero:'hero-1-0',level:1,hp:800,max:800}));
 for(const s of [alone,far,near])advanceDuel(s,NOW+100);
 assert.ok(Math.abs(alone.enemies[0].pathDistance!-far.enemies[0].pathDistance!)<1e-8);assert.ok(near.enemies[0].pathDistance!>alone.enemies[0].pathDistance!);
});

test('부화와 학습지 영웅은 동반 병사 없이 서로 겹치지 않는 target lane에 배치된다',()=>{
 for(const map of DUEL_MAPS){
  const s=match(map.id);for(const side of [0,1] as const){s.players[side]!.egg=10;assert.ok(applyDuel(s,side,{type:'hatch',heroId:'hero-10-1'},NOW,`h-${side}`).ok);}
  const a=s.enemies.filter(e=>e.owner===0),b=s.enemies.filter(e=>e.owner===1);assert.equal(a.length,1);assert.equal(b.length,1);assert.ok(s.enemies.every(e=>e.hero));
  for(let i=0;i<a.length;i++){assert.ok(Math.abs(a[i].x+b[i].x-23)<1e-8);assert.equal(a[i].y!-b[i].y!,8);assert.ok(Math.abs(a[i].pathDistance!+b[i].pathDistance!-map.length)<1e-8);}
  const reward=match(map.id,'hero-10-1');for(const side of [0,1] as const){assert.equal(reward.players[side]!.rewardUsed,false);assert.ok(applyDuel(reward,side,{type:'summon-reward'},NOW,`summon-${side}`).ok);assert.equal(reward.players[side]!.rewardUsed,true);assert.equal(applyDuel(reward,side,{type:'summon-reward'},NOW,`duplicate-${side}`).ok,false);}
  assert.equal(reward.enemies.filter(e=>e.rewardSummon).length,2);assert.ok(reward.enemies.every(e=>duelRoadCell(map.id,Math.round(e.x),Math.round(e.y!),e.target)));
  const left=reward.enemies.filter(e=>e.owner===0),right=reward.enemies.filter(e=>e.owner===1);
  assert.equal(left.length,1);assert.equal(right.length,1);assert.ok(reward.enemies.every(e=>e.hero));
  for(let i=0;i<left.length;i++){assert.ok(Math.abs(left[i].x+right[i].x-23)<1e-8);assert.equal(left[i].y!-right[i].y!,8);assert.ok(Math.abs(left[i].pathDistance!+right[i].pathDistance!-map.length)<1e-8);}
 }
});

test('실제 웨이브·성장 영웅·학습지 영웅은 상단 성에서 왼쪽으로, 하단 성에서 오른쪽으로 경로를 진행한다',()=>{
 for(const mapId of [undefined,...DUEL_MAPS.map(map=>map.id)])for(const kind of ['wave','growth','reward'] as const){
  const s=match(mapId,kind==='reward'?'hero-1-1':undefined),map=duelMap(mapId);
  if(kind==='wave')keepConnected(s,NOW+8000);
  else for(const side of [0,1] as const){
   if(kind==='growth')s.players[side]!.egg=1;
   const action=kind==='growth'?{type:'hatch' as const,heroId:'hero-1-1'}:{type:'summon-reward' as const};
   assert.ok(applyDuel(s,side,action,NOW,`${kind}-${side}`).ok);
  }
  const upper=s.enemies.find(e=>e.target===0)!,lower=s.enemies.find(e=>e.target===1)!;
  assert.equal(s.enemies.length,2);assert.equal(upper.owner,1);assert.equal(lower.owner,0);
  assert.ok(upper.pathDistance!>map.length-1.1&&lower.pathDistance!<1.1);
  assert.ok(Math.abs(upper.x+lower.x-23)<1e-8);assert.ok(Math.abs(lower.y!-upper.y!-8)<1e-8);
  const before=[upper.pathDistance!,lower.pathDistance!],tickAt=s.updatedAt+100;
  keepConnected(s,tickAt);assert.ok(upper.pathDistance!<before[0],`${mapId}/${kind}: 상단은 오른쪽 성에서 왼쪽 성으로`);assert.ok(lower.pathDistance!>before[1],`${mapId}/${kind}: 하단은 왼쪽 성에서 오른쪽 성으로`);
  assert.ok(Math.abs(upper.pathDistance!+lower.pathDistance!-map.length)<1e-8);
  assert.ok(upper.y!>=0&&upper.y!<=6&&lower.y!>=8&&lower.y!<=14);
 }
});

test('모든 굽은 경로의 직선과 모서리에서 표시 방향·예측 좌표·실제 틱은 진영별 진행 순서와 일치한다',()=>{
 for(const mapId of [undefined,...DUEL_MAPS.map(map=>map.id)]){
  const s=match(mapId),{points}=duelMap(mapId);s.wave=1000;let traveled=0;
  for(let i=0;i<points.length-1;i++){
   const a=points[i],b=points[i+1],length=Math.hypot(b.x-a.x,b.y-a.y);
   const samples=[{distance:traveled+length/2,segment:i},...(i?[{distance:traveled,segment:i}]:[])];
   for(const sample of samples){
    const units=([0,1] as const).map(target=>{
     const direction=target===0?-1:1,segment=sample.distance===traveled&&target===0?i-1:sample.segment,from=points[segment],to=points[segment+1],size=Math.hypot(to.x-from.x,to.y-from.y);
     const unit=enemy(s,0,3,{id:100+target,owner:(1-target) as 0|1,target,pathDistance:sample.distance}),position=duelEnemyPosition(s,unit),predicted=duelEnemyPosition(s,unit,.1);
     assert.equal(position.dx,((to.x-from.x)/size)*direction||0,`${mapId}: target${target} segment${i} x 방향`);assert.equal(position.dy,((to.y-from.y)/size)*direction||0,`${mapId}: target${target} segment${i} y 방향`);
     return {unit,predicted,direction};
    });
    s.enemies=units.map(({unit})=>unit);keepConnected(s,s.updatedAt+100);
    for(const {unit,predicted,direction} of units){assert.ok((unit.pathDistance!-sample.distance)*direction>0);assert.ok(Math.abs(unit.x-predicted.x)<1e-8);assert.ok(Math.abs(unit.y!-predicted.y)<1e-8);}
   }
   traveled+=length;
  }
 }
});

test('맵 선택 미리보기는 두 독립 경로와 가운데 분리줄을 표시한다',()=>{
 for(const map of DUEL_MAPS){
  const html=duelMapPreviewHTML(map.id),routes=[...html.matchAll(/<polyline data-lane-route="([01])" points="([^"]+)"/g)];
  assert.equal(routes.length,2);assert.ok(html.includes('viewBox="-1 -1 25 17"'));assert.ok(html.includes('data-lane-divider="true" d="M-.5 7 H23.5"'));
  for(const route of routes){
   const side=Number(route[1]) as 0|1,points=route[2].split(' ').map(pair=>{const [x,y]=pair.split(',').map(Number);return{x,y};});
   assert.deepEqual(points,map.points.map(point=>({x:point.x,y:point.y+duelLaneOffset(side)})));
  }
  assert.ok(duelMapSummaryHTML(map.id).includes('위·아래 독립 경로'));
 }
 const picker=duelMapPickerHTML(DEFAULT_DUEL_MAP_ID);
 assert.equal((picker.match(/data-duel-map=/g)||[]).length,10);assert.equal((picker.match(/data-lane-route=/g)||[]).length,20);
 assert.equal((picker.match(/aria-pressed="true"/g)||[]).length,1);assert.ok(picker.includes('몬스터 동선은 겹치지 않아요.'));
});
