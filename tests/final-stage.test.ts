import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Defense,Tower,Inventory,FIRST_SPAWN_DELAY,SPAWN_INTERVAL} from '../src/model';
import {LEVELS,FINAL_STAGE} from '../src/levels';
import {loadSave,writeSave} from '../src/save';
import {numberText,purchaseCoins} from '../src/math';
import {stageMonsterKinds} from '../src/monsters';
import {playLevel} from '../tools/simulate';

test('최종 11단계에 일반 몬스터 12마리와 별도로 체력 99.9인 마법사가 한 번 등장한다',()=>{
 const m=new Defense(LEVELS[FINAL_STAGE-1]);assert.equal(FINAL_STAGE,11);assert.equal(m.enemyCount,13);
 assert.equal(m.level.boss!.hp,99900);assert.ok(m.level.hp.every(hp=>hp<10000));
 assert.ok(stageMonsterKinds(m.level).includes('wizard'));m.phase='playing';
 for(let i=0;i<159;i++)m.step(.1);assert.equal(m.bossSpawned,false);m.step(.1);
 assert.equal(m.spawned,1);assert.equal(m.bossSpawned,true);const boss=m.enemies.find(e=>e.kind==='wizard')!;
 assert.equal(boss.hp,99900);assert.equal(m.spawnBoss(),false);m.step(.1);
 for(let i=0;i<5;i++)m.step(.1);assert.equal(m.spawned,2,'기존 8.4초 간격 웨이브를 보스가 대체하지 않는다');
 assert.equal(m.enemies.filter(e=>e.kind==='wizard').length,1);
 assert.equal(FIRST_SPAWN_DELAY,8);assert.equal(SPAWN_INTERVAL,8.4);
});

test('마법사는 정지 중 등장하지 않고 일반 몬스터만 처리하면 최종 목표가 완료되지 않는다',()=>{
 const m=new Defense(LEVELS.at(-1)!);m.phase='paused';m.step(.1);assert.equal(m.elapsed,0);assert.equal(m.bossSpawned,false);
 for(let i=0;i<12;i++)m.spawn();const t={effect:'basic'} as Tower;
 for(const e of m.enemies){t.unit=e.hp;m.damage(e,t);}m.usedUnits.add(10);m.usedUnits.add(100);
 assert.equal(m.goals.at(-1)!.done,false);assert.equal(m.bossDefeated,false);
 m.phase='playing';m.elapsed=119.95;m.step(.1);assert.equal(m.phase,'playing');assert.equal(m.bossSpawned,true);
 assert.ok(m.enemies.some(e=>e.kind==='wizard'&&e.hp===99900));
});

test('99.9를 정확한 정수 소수 연산으로 처치하고 초과 공격은 무효이며 보상 상한을 지킨다',()=>{
 const m=new Defense(LEVELS.at(-1)!);m.spawnBoss();const boss=m.enemies[0],t={unit:2350,effect:'range'} as Tower;
 for(let i=0;i<42;i++)m.damage(boss,t);assert.equal(boss.hp,1200);assert.equal(boss.hits,42);
 m.damage(boss,t);assert.equal(boss.hp,1200);assert.equal(boss.hits,42);assert.equal(m.bossDefeated,false);
 t.unit=1200;m.kills=3;m.damage(boss,t);assert.equal(boss.hp,0);assert.equal(boss.hits,43);
 assert.equal(m.bossDefeated,true);assert.equal(m.goals.at(-1)!.done,true);
 assert.ok(m.events.some(e=>e.type==='hit'&&e.message==='99.9 − 2.35 = 97.55'));
 assert.equal(m.money-m.level.budget,9000,'한 마리당 최대 9코인');
});

test('마법사가 통과하면 성 체력은 한 개만 줄고 최종 목표 실패로 엔딩을 열지 않는다',()=>{
 const m=new Defense(LEVELS.at(-1)!);m.spawned=12;m.kills=12;m.usedUnits.add(100);m.usedUnits.add(10);m.spawnBoss();
 m.enemies[0].next=m.enemies[0].path.length;m.phase='playing';m.elapsed=119.95;m.step(.1);
 assert.equal(m.castle,4);assert.equal(m.leaks,1);assert.equal(m.phase,'review');assert.equal(m.bossDefeated,false);assert.equal(m.stars,0);
});

test('최종 준비금은 19.978이지만 구매 문항과 정답은 한 자리 자연수이며 실제 잔액을 보존한다',()=>{
 const m=new Defense(LEVELS.at(-1)!);assert.equal(m.money,19978);assert.equal(purchaseCoins(m.money),9978);
 assert.ok(m.requestPurchase({x:1,y:3},'rune'));const q=m.pendingPurchase!;
 assert.ok([q.before,q.cost,q.before-q.cost].every(n=>n>=0&&n<10000));assert.equal(m.answerPurchase('99.9'),false);
 assert.ok(m.answerPurchase(numberText(q.before-q.cost)));assert.equal(m.money,19978-q.cost);
 m.sellTower(m.towers[0].id);assert.equal(m.money,19978);
});

test('기존 10단계 완료 기록은 별·벽돌·내구도를 유지하며 11단계를 해금하고 새 엔딩은 미완료로 둔다',()=>{
 const previous=Object.getOwnPropertyDescriptor(globalThis,'localStorage'),data=new Map<string,string>();
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>data.set(k,v)}});
 try{
  data.set('decimal-castle-v1',JSON.stringify({version:1,level:10,resumeStage:10,stars:Array(10).fill(2),campaignCompleted:true,inventory:{bricks:[300,500,800],walls:1,wallDurabilities:[2]}}));
  const s=loadSave();assert.equal(s.level,11);assert.equal(s.resumeStage,11);assert.equal(s.campaignCompleted,false);
  assert.deepEqual(s.stars,[...Array(10).fill(2),0]);assert.deepEqual(s.inventory,{bricks:[300,500,800],walls:1,wallDurabilities:[2]});
  assert.ok(writeSave(s));assert.deepEqual(loadSave(),s);s.campaignCompleted=true;s.stars[10]=3;assert.ok(writeSave(s));assert.equal(loadSave().campaignCompleted,true);
 }finally{if(previous)Object.defineProperty(globalThis,'localStorage',previous);else Reflect.deleteProperty(globalThis,'localStorage');}
});

test('최종 표준 난이도는 혼합 타워의 분산 배치로 클리어하고 밀집 배치나 기본 타워만으로는 실패한다',()=>{
 const spread=playLevel(FINAL_STAGE,'standard',undefined,3);
 assert.equal(spread.phase,'won');assert.ok(spread.bossDefeated&&spread.castle>0);
 for(const m of [playLevel(FINAL_STAGE,'standard',undefined,-1),playLevel(FINAL_STAGE,'standard',undefined,0,Array(14).fill('basic'))]){
  assert.equal(m.phase,'lost');assert.equal(m.castle,0);assert.equal(m.bossDefeated,false);
 }
});

for(const difficulty of ['practice','standard','challenge'] as const)test(`${difficulty}: 벽돌·성벽을 이어 가져가며 1~11단계를 연속 클리어한다`,()=>{
 let inventory:Inventory={bricks:[],walls:0};
 for(const l of LEVELS){
  let m=playLevel(l.id,difficulty,undefined,0,undefined,inventory);
  for(let layout=1;layout<10&&m.phase!=='won';layout++)m=playLevel(l.id,difficulty,undefined,layout,undefined,inventory);
  assert.equal(m.phase,'won',`${difficulty} ${l.id}단계`);assert.ok(m.castle>0);assert.ok(m.goals.every(g=>g.done));
  assert.equal(m.purchases,m.formation.length);assert.deepEqual(m.towers.map(t=>({id:t.id,x:t.x,y:t.y,typeId:t.typeId})),m.formation);
  if(l.boss)assert.ok(m.bossSpawned&&m.bossDefeated);inventory=m.inventory;
 }
});
