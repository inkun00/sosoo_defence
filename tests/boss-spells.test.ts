import {test} from 'node:test';
import assert from 'node:assert/strict';
import {BOSS_SPELLS,BOSS_SPELL_WARNING_SECONDS,BOSS_SPELL_ACTIVE_SECONDS,BOSS_SPELL_REST_SECONDS,BOSS_SPELL_CYCLE_SECONDS,bossSpellAt} from '../src/boss-spells';
import {Defense,Enemy,Event,Tower,BOSS_AURA_SPEED,BOSS_AURA_SLOW,BOSS_AURA_STUN} from '../src/model';
import {LEVELS} from '../src/levels';
import {world} from '../src/path';
import {playAutomaticStage} from './adventure-helpers';

function fixture(age=0){
 const m=new Defense(LEVELS[10]);m.phase='playing';m.spawned=m.level.hp.length;m.spawnBoss();
 const boss=m.bossAuraSource!,path=Array.from({length:16},(_,x)=>({x,y:4}));
 Object.assign(boss,world({x:5,y:4}),{path,next:6,age});m.events=[];
 function add(id:number){const e:Enemy={id,kind:'slime',hp:1370,max:1370,...world({x:6,y:4}),path,next:7,hits:0,slow:0,stun:0,hitFlash:0,age:0};m.enemies.push(e);return e;}
 return {m,boss,add};
}
function near(actual:number,expected:number){assert.ok(Math.abs(actual-expected)<1e-9,`${actual} != ${expected}`);}
function spellEvents(m:Defense){return m.events.filter(event=>event.type==='boss-warning'||event.type==='boss-cast');}

test('3종 마법은 서로 다른 대사·설명·색과 3초 예고/5초 발동/4초 휴식을 갖는다',()=>{
 assert.deepEqual(BOSS_SPELLS.map(spell=>spell.id),['haste','frost-ward','iron-will']);
 assert.deepEqual([BOSS_SPELL_WARNING_SECONDS,BOSS_SPELL_ACTIVE_SECONDS,BOSS_SPELL_REST_SECONDS,BOSS_SPELL_CYCLE_SECONDS],[3,5,4,12]);
 for(const field of ['name','taunt','description','color'] as const)assert.equal(new Set(BOSS_SPELLS.map(spell=>spell[field])).size,3);
 for(const spell of BOSS_SPELLS){assert.ok(spell.taunt.length>0);assert.match(spell.description,/3칸/);assert.ok(Number.isInteger(spell.color)&&spell.color>=0&&spell.color<=0xffffff);}
});

test('보스 나이 기준으로 정확한 경계에서 단계와 다음 마법으로 전환한다',()=>{
 const cases=[
  [0,0,'warning',3],[2.5,0,'warning',.5],[3,0,'active',5],[7.5,0,'active',.5],[8,0,'rest',4],[11.5,0,'rest',.5],
  [12,1,'warning',3],[15,1,'active',5],[20,1,'rest',4],[24,2,'warning',3],[27,2,'active',5],[32,2,'rest',4],[36,3,'warning',3],
 ] as const;
 for(const [age,cycle,phase,remaining] of cases){const state=bossSpellAt(age,99);assert.equal(state.sourceId,99);assert.equal(state.cycle,cycle);assert.equal(state.phase,phase);near(state.remaining,remaining);assert.equal(state.spell,BOSS_SPELLS[cycle%3]);}
 for(const age of [-1,NaN,Infinity])assert.deepEqual(bossSpellAt(age,99),bossSpellAt(0,99));
 for(const age of [3-1e-10,8-1e-10,12-1e-10]){const state=bossSpellAt(age,99),edge=bossSpellAt(Math.round(age),99);assert.equal(state.phase,edge.phase);assert.equal(state.cycle,edge.cycle);near(state.remaining,edge.remaining);}
 assert.equal(bossSpellAt(3-1e-6,99).phase,'warning');assert.equal(bossSpellAt(8-1e-6,99).phase,'active');assert.equal(bossSpellAt(12-1e-6,99).phase,'rest');
});

test('웨이브 시간이 끝난 추가 방어에서도 살아 있는 보스 나이로 마법 주기가 계속된다',()=>{
 const {m,boss}=fixture(12);m.elapsed=m.duration;boss.stun=1000;m.step(.1);
 assert.equal(m.elapsed,120);near(boss.age,12.1);assert.equal(m.bossSpellState!.cycle,1);assert.equal(m.bossSpellState!.spell.id,'frost-ward');
 assert.equal(m.bossSpellState!.phase,'warning');near(m.bossSpellState!.remaining,2.9);assert.equal(m.phase,'playing');
});

test('각 발동 단계에는 질주·감속 저항·기절 저항 중 정확히 한 효과만 적용한다',()=>{
 for(const [age,id] of [[3,'haste'],[15,'frost-ward'],[27,'iron-will']] as const){
  const {m,boss,add}=fixture(age),moving=add(90),slowed=add(91),stunned=add(92);slowed.slow=3;stunned.stun=.25;
  const before=new Map(m.enemies.map(e=>[e.id,e.x]));m.step(.1);assert.equal(m.bossSpellState!.spell.id,id);
  const base=m.balance.speed*.1,speed=id==='haste'?BOSS_AURA_SPEED:1,slow=id==='frost-ward'?BOSS_AURA_SLOW:.6;
  near(moving.x-before.get(moving.id)!,base*speed);near(slowed.x-before.get(slowed.id)!,base*speed*slow);
  near(stunned.stun,.25-.1*(id==='iron-will'?BOSS_AURA_STUN:1));near(stunned.x,before.get(stunned.id)!);
  near(boss.x-before.get(boss.id)!,base*.16);assert.equal(m.isBossEmpowered(boss),false);
  for(const e of [moving,slowed,stunned]){assert.equal(m.isBossEmpowered(e),true);assert.equal(e.hp,1370);assert.equal(e.max,1370);}
 }
});

test('예고·휴식에는 모든 효과가 없고 발동 경계의 같은 틱부터 전환된다',()=>{
 for(const age of [0,2.8,8,11.8,12,20,24,32]){
  const {m,add}=fixture(age),e=add(90);e.slow=3;e.stun=.25;const x=e.x;
  assert.equal(m.isBossEmpowered(e),false);m.step(.1);assert.equal(m.isBossEmpowered(e),false);near(e.stun,.15);near(e.x,x);
 }
 for(const [age,id] of [[2.95,'haste'],[14.95,'frost-ward'],[26.95,'iron-will']] as const){
  const {m,add}=fixture(age),e=add(90);assert.equal(m.isBossEmpowered(e),false);m.step(.1);
  assert.equal(m.bossSpellState!.phase,'active');assert.equal(m.bossSpellState!.spell.id,id);assert.equal(m.isBossEmpowered(e),true);
 }
 for(const age of [7.95,19.95,31.95]){const {m,add}=fixture(age),e=add(90);e.slow=3;const x=e.x;m.step(.1);assert.equal(m.bossSpellState!.phase,'rest');assert.equal(m.isBossEmpowered(e),false);near(e.x-x,m.balance.speed*.1*.6);}
});

test('매 주기마다 예고를 먼저 한 번만 내보내고 발동도 한 번만 내보낸다',()=>{
 const {m,boss}=fixture();boss.stun=1000;
 const observed:Event[]=[];
 for(let i=0;i<360;i++){m.step(.1);observed.push(...spellEvents(m));m.events=[];}
 assert.deepEqual(observed.map(event=>({type:event.type,...event.data as object})),[
  {type:'boss-warning',bossId:boss.id,spellId:'haste',cycle:0},{type:'boss-cast',bossId:boss.id,spellId:'haste',cycle:0},
  {type:'boss-warning',bossId:boss.id,spellId:'frost-ward',cycle:1},{type:'boss-cast',bossId:boss.id,spellId:'frost-ward',cycle:1},
  {type:'boss-warning',bossId:boss.id,spellId:'iron-will',cycle:2},{type:'boss-cast',bossId:boss.id,spellId:'iron-will',cycle:2},
  {type:'boss-warning',bossId:boss.id,spellId:'haste',cycle:3},
 ]);
 for(const event of observed.filter(event=>event.type==='boss-warning')){const {spellId}=event.data as {spellId:string};assert.equal(event.message,BOSS_SPELLS.find(spell=>spell.id===spellId)!.taunt);}
 for(let i=0;i<5;i++){void m.bossSpellState;void m.bossAuraSource;}assert.equal(spellEvents(m).length,0,'순수 getter는 대사를 새로 내보내지 않는다');
});

test('일시정지·종료·준비 동안 나이/단계/남은 시간/이벤트가 멈추고 재개해도 중복하지 않는다',()=>{
 const {m,boss}=fixture(2.9);boss.stun=1000;m.step(.05);m.events=[];
 for(const phase of ['ready','paused','won','review','lost'] as const){
  m.phase=phase;const before=structuredClone({age:boss.age,state:m.bossSpellState,elapsed:m.elapsed});
  for(let i=0;i<10;i++)m.step(.1);assert.deepEqual({age:boss.age,state:m.bossSpellState,elapsed:m.elapsed},before);assert.equal(spellEvents(m).length,0);
 }
 m.phase='playing';m.step(.05);assert.equal(m.bossSpellState!.phase,'active');assert.deepEqual(spellEvents(m).map(event=>event.type),['boss-cast']);
 m.events=[];m.togglePause();m.step(.1);m.togglePause();m.step(.1);assert.equal(spellEvents(m).length,0);
});

test('살아 있는 보스가 없어지거나 성에 도착하면 예고·발동 상태와 효과가 즉시 끝난다',()=>{
 for(const age of [0,3,8,15,27]){
  const {m,boss,add}=fixture(age),e=add(90);m.damage(boss,{unit:boss.hp,effect:'basic'} as Tower);
  assert.equal(m.bossSpellState,null);assert.equal(m.bossAuraSource,null);assert.equal(m.isBossEmpowered(e),false);m.events=[];m.step(.1);assert.equal(spellEvents(m).length,0);
 }
 const {m,boss,add}=fixture(3),e=add(90);boss.next=boss.path.length;
 assert.equal(m.bossSpellState,null);assert.equal(m.isBossEmpowered(e),false);m.step(.1);assert.equal(spellEvents(m).length,0);
 for(let stage=0;stage<10;stage++){const earlier=new Defense(LEVELS[stage]);earlier.enemies=[{...boss,next:1,hp:99900}];assert.equal(earlier.bossSpellState,null);}
});

for(const difficulty of ['practice','standard','challenge'] as const)test(`${difficulty}: 19.98 코인으로 합법 구매·진짜 자동 공격을 유지하며 최종 마법 패턴을 이긴다`,()=>{
 const independent=playAutomaticStage(11,difficulty,{bricks:[],walls:0});
 assert.equal(independent.level.budget,19980);assert.equal(independent.switches,0);assert.ok(independent.bossDefeated&&independent.castle>0);
 let inventory={bricks:[] as number[],walls:0};
 for(let stage=1;stage<=11;stage++)inventory=playAutomaticStage(stage,difficulty,inventory).inventory;
 assert.ok(inventory.walls>=0);
});
