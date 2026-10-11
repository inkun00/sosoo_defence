import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Defense,Enemy,Tower,BOSS_AURA_RADIUS,BOSS_AURA_SPEED,BOSS_AURA_SLOW,BOSS_AURA_STUN} from '../src/model';
import {LEVELS} from '../src/levels';
import {MONSTERS,MonsterKind} from '../src/monsters';
import {Cell,TILE,world} from '../src/path';

const road:Cell[]=Array.from({length:16},(_,x)=>({x,y:4}));
function enemy(id:number,kind:MonsterKind,x:number,hp=1370):Enemy{
 const point=world({x,y:4});
 return {id,kind,hp,max:hp,...point,path:road,next:Math.floor(x)+1,hits:0,slow:0,stun:0,hitFlash:0,age:0};
}
function fixture(stage=11){
 const m=new Defense(LEVELS[stage-1]);m.phase='playing';m.spawned=m.level.hp.length;
 if(m.level.boss)m.bossSpawned=true;
 const boss=enemy(1,'wizard',5,99900);m.enemies=[boss];
 return {m,boss};
}
function near(actual:number,expected:number){assert.ok(Math.abs(actual-expected)<1e-9,`${actual} != ${expected}`);}
function travel(m:Defense,e:Enemy,dt=.1){return m.balance.speed*MONSTERS[e.kind].speed*dt;}

test('최종 마법사의 3칸 반경은 본인을 제외하고 살아 있는 몬스터에만 적용한다',()=>{
 const {m,boss}=fixture();
 assert.equal(BOSS_AURA_RADIUS,3*TILE);assert.equal(BOSS_AURA_SPEED,1.25);assert.equal(BOSS_AURA_SLOW,.8);assert.equal(BOSS_AURA_STUN,2);
 const inside=enemy(2,'slime',6),edge=enemy(3,'beetle',8),outside=enemy(4,'golem',8),dead=enemy(5,'crystal',6),arrived=enemy(6,'king',6);
 outside.x+=.001;dead.hp=0;arrived.next=arrived.path.length;
 const diagonal=enemy(7,'slime',5);diagonal.x+=BOSS_AURA_RADIUS*.6;diagonal.y+=BOSS_AURA_RADIUS*.8;
 m.enemies.push(inside,edge,outside,dead,arrived,diagonal);
 assert.equal(m.bossAuraSource,boss);assert.equal(m.isBossEmpowered(boss),false);
 for(const e of [inside,edge,diagonal])assert.equal(m.isBossEmpowered(e),true);
 for(const e of [outside,dead,arrived])assert.equal(m.isBossEmpowered(e),false);
});

test('실제 16초 보스 스폰 틱부터 주변 몬스터가 강화되고 보스 자체 속도는 그대로다',()=>{
 const m=new Defense(LEVELS[10]);m.phase='playing';m.elapsed=15.9;m.spawned=m.level.hp.length;
 const p=m.path()!,point=world(m.map.start),e:Enemy={...enemy(90,'slime',0),...point,path:p,next:1};
 m.enemies=[e];m.step(.1);const boss=m.bossAuraSource!;
 assert.ok(boss);assert.equal(m.bossSpawned,true);assert.equal(boss.hp,99900);
 near(Math.hypot(e.x-point.x,e.y-point.y),travel(m,e)*BOSS_AURA_SPEED);
 near(Math.hypot(boss.x-point.x,boss.y-point.y),travel(m,boss));
});

test('반경 안과 정확한 경계에서는 25% 빠르고 반경 밖은 기존 속도를 유지한다',()=>{
 const {m,boss}=fixture(),inside=enemy(2,'slime',6),edge=enemy(3,'beetle',8),outside=enemy(4,'golem',9);
 m.enemies.push(inside,edge,outside);const before=new Map(m.enemies.map(e=>[e.id,e.x]));m.step(.1);
 for(const e of [inside,edge])near(e.x-before.get(e.id)!,travel(m,e)*BOSS_AURA_SPEED);
 near(outside.x-before.get(outside.id)!,travel(m,outside));near(boss.x-before.get(boss.id)!,travel(m,boss));
 assert.equal(m.isBossEmpowered(edge),false,'이동 후 범위를 벗어난 몬스터의 현재 표시도 해제한다');
});

test('강화 범위 스냅샷은 마법사와 몬스터의 배열 순서와 무관하다',()=>{
 function run(reverse:boolean){
  const {m,boss}=fixture(),behind=enemy(2,'slime',2),ahead=enemy(3,'slime',8);ahead.x+=.001;
  m.enemies.push(behind,ahead);if(reverse)m.enemies.reverse();
  const start=new Map(m.enemies.map(e=>[e.id,e.x]));m.step(.1);
  near(behind.x-start.get(behind.id)!,travel(m,behind)*BOSS_AURA_SPEED);
  near(ahead.x-start.get(ahead.id)!,travel(m,ahead));
  return [boss,behind,ahead].map(e=>({id:e.id,x:e.x,y:e.y,stun:e.stun,hp:e.hp}));
 }
 assert.deepEqual(run(false),run(true));
});

test('감속된 강화 몬스터는 0.8 계수를 쓰며 마법사와 범위 밖의 0.6 계수는 유지한다',()=>{
 const {m,boss}=fixture(),inside=enemy(2,'slime',6),outside=enemy(3,'slime',9);
 m.enemies.push(inside,outside);for(const e of m.enemies)e.slow=3;
 const before=new Map(m.enemies.map(e=>[e.id,e.x]));m.step(.1);
 near(inside.x-before.get(inside.id)!,travel(m,inside)*BOSS_AURA_SPEED*BOSS_AURA_SLOW);
 for(const e of [boss,outside])near(e.x-before.get(e.id)!,travel(m,e)*.6);
 for(const e of m.enemies)near(e.slow,2.9);
});

test('기절은 강화 몬스터만 두 배로 회복하고 남은 시간이 0이 된 틱부터 이동한다',()=>{
 const {m,boss}=fixture(),inside=enemy(2,'slime',6),outside=enemy(3,'slime',9);
 m.enemies.push(inside,outside);for(const e of m.enemies)e.stun=.25;
 const before=new Map(m.enemies.map(e=>[e.id,e.x]));m.step(.1);
 near(inside.stun,.05);for(const e of [boss,outside])near(e.stun,.15);
 for(const e of m.enemies)near(e.x,before.get(e.id)!);
 m.step(.1);assert.equal(inside.stun,0);near(inside.x-before.get(inside.id)!,travel(m,inside)*BOSS_AURA_SPEED);
 for(const e of [boss,outside]){near(e.stun,.05);near(e.x,before.get(e.id)!);}
});

test('마법사를 정확히 처치하면 즉시 강화가 해제되고 감속·기절 회복도 원래대로 돌아온다',()=>{
 const {m,boss}=fixture(),e=enemy(2,'slime',6);e.slow=3;e.stun=.15;m.enemies.push(e);
 assert.equal(m.isBossEmpowered(e),true);m.damage(boss,{unit:99900,effect:'basic'} as Tower);
 assert.equal(m.bossDefeated,true);assert.equal(m.bossAuraSource,null);assert.equal(m.isBossEmpowered(e),false);
 const x=e.x;m.step(.1);near(e.stun,.05);near(e.x,x);
 m.step(.1);near(e.x-x,travel(m,e)*.6);assert.equal(e.hp,1370);assert.equal(e.max,1370);
});

test('성에 이미 도착한 마법사는 같은 틱에도 강화하지 않고 통과 직후 aura가 없어진다',()=>{
 const {m,boss}=fixture(),e=enemy(2,'slime',6);m.enemies.push(e);boss.next=boss.path.length;
 assert.equal(m.bossAuraSource,null);assert.equal(m.isBossEmpowered(e),false);
 const x=e.x;m.step(.1);near(e.x-x,travel(m,e));assert.equal(m.castle,4);assert.equal(m.leaks,1);assert.equal(m.bossAuraSource,null);

 const crossing=fixture(),nearCastle=enemy(2,'slime',13);crossing.m.enemies.push(nearCastle);
 crossing.boss.next=road.length-1;Object.assign(crossing.boss,world(road.at(-1)!));crossing.boss.x-=.1;
 assert.equal(crossing.m.isBossEmpowered(nearCastle),true);crossing.m.step(.1);
 assert.equal(crossing.boss.hp,0);assert.equal(crossing.m.bossAuraSource,null);assert.equal(crossing.m.isBossEmpowered(nearCastle),false);
 const after=nearCastle.x;crossing.m.step(.1);near(nearCastle.x-after,travel(crossing.m,nearCastle));
});

test('강화는 현재·최대 체력과 정확한 소수 뺄셈을 바꾸거나 재생시키지 않는다',()=>{
 const {m,boss}=fixture(),e=enemy(2,'slime',6,1240);m.enemies.push(e);
 for(let i=0;i<10;i++)m.step(.1);assert.equal(e.hp,1240);assert.equal(e.max,1240);assert.equal(boss.hp,99900);assert.equal(boss.max,99900);
 e.x=boss.x+TILE;assert.equal(m.isBossEmpowered(e),true);
 m.damage(e,{unit:250,effect:'slow'} as Tower);assert.equal(e.hp,990);assert.equal(e.max,1240);assert.equal(e.hits,1);assert.equal(e.slow,3);
 assert.ok(m.events.some(event=>event.type==='hit'&&event.message==='1.24 − 0.25 = 0.99'));
 m.damage(e,{unit:1000,effect:'stun'} as Tower);assert.equal(e.hp,990);assert.equal(e.hits,1);assert.equal(e.stun,0);
 m.step(.1);assert.equal(e.hp,990);assert.equal(e.max,1240);
 m.damage(e,{unit:990,effect:'basic'} as Tower);assert.equal(e.hp,0);assert.equal(m.isBossEmpowered(e),false);
});

test('1~10단계와 최종 마법사가 없는 단계에는 속도·감속·기절 강화가 없다',()=>{
 for(let stage=1;stage<=10;stage++){
  const {m}=fixture(stage),e=enemy(2,'slime',6);m.enemies.push(e);e.slow=3;e.stun=.15;
  assert.equal(m.bossAuraSource,null);assert.equal(m.isBossEmpowered(e),false);
  const x=e.x;m.step(.1);near(e.stun,.05);near(e.x,x);m.step(.1);near(e.x-x,travel(m,e)*.6);
 }
 const noBoss=new Defense({...LEVELS[10],boss:undefined});noBoss.enemies=[enemy(1,'wizard',5,99900),enemy(2,'slime',6)];
 assert.equal(noBoss.bossAuraSource,null);assert.equal(noBoss.isBossEmpowered(noBoss.enemies[1]),false);
});

test('준비·일시정지·종료 상태에서는 강화 몬스터의 이동과 상태 시간이 모두 멈춘다',()=>{
 for(const phase of ['ready','paused','won','review','lost'] as const){
  const {m,boss}=fixture(),e=enemy(2,'slime',6);e.slow=3;e.stun=.25;m.enemies.push(e);m.phase=phase;
  const before=structuredClone({enemies:m.enemies,elapsed:m.elapsed,castle:m.castle});m.step(.1);
  assert.deepEqual({enemies:m.enemies,elapsed:m.elapsed,castle:m.castle},before);assert.equal(m.bossAuraSource,boss);
 }
});
