import {test} from 'node:test';
import assert from 'node:assert/strict';
import {SecretSiege} from '../src/secret-siege-model';
import {REVIVED_WIZARD} from '../src/secret-siege-boss';
import {LEVELS} from '../src/levels';
import {learningValue,numberText} from '../src/math';
import {simulateSecretSiege} from '../tools/simulate-secret-siege';
import type {ArmyId} from '../src/secret-siege-types';

const balanced={name:'최종 결전',guard:3,striker:6,scout:2,order:'guard-first',rally:true} as const;
function recruit(game:SecretSiege,id:ArmyId,count=1){for(let index=0;index<count;index++){assert.ok(game.requestRecruit(id));assert.ok(game.answer(numberText(game.pendingQuestion!.answer,2)));}}
function advance(game:SecretSiege,seconds:number){for(let tick=0;tick<Math.round(seconds*100);tick++)game.step(.01);}
function prepared(){const game=new SecretSiege('standard',10);recruit(game,'guard');recruit(game,'striker');recruit(game,'scout');assert.ok(game.start());assert.ok(game.deploy('guard'));return game;}
function duel(){const game=prepared();for(const target of game.targets)if(target.kind==='tower')target.hp=0;game.units[0].distance=845;game.step(.01);return game;}
function snapshot(game:SecretSiege){return JSON.stringify({elapsed:game.elapsed,targets:game.targets,units:game.units,shots:game.projectiles,boss:game.bossState});}

test('부활한 마법사는 10단계만 등장하며 기존 11단계 보스보다 높은 체력과 직접 공격·마법을 갖는다',()=>{
 for(let stage=1;stage<10;stage++){const game=new SecretSiege('standard',stage);assert.equal(game.boss,undefined);assert.equal(game.bossState,undefined);assert.equal(game.targets.length,5);}
 const game=new SecretSiege('standard',10),boss=game.boss!;
 assert.equal(boss.id,'revived-wizard');assert.equal(boss.kind,'boss');assert.equal(boss.name,'부활한 저주 마법사');
 assert.equal(boss.maxHp,119900);assert.ok(boss.maxHp>LEVELS[10].boss!.hp);assert.equal(LEVELS[10].boss!.hp,99900);
 assert.equal(boss.hp,boss.maxHp);assert.equal(boss.attack,260);assert.ok(boss.range>0&&boss.cooldown>0);
 assert.deepEqual(game.targets.map(target=>target.kind),['tower','tower','tower','tower','boss','castle']);
 assert.equal(game.bossState!.phase,'dormant');assert.equal(game.bossState!.spell,undefined);assert.equal(game.money,9900);assert.equal(game.ralliesLeft,3);
});

test('네 타워가 남아 있는 동안 마법사는 대기하고 성은 보호막을 유지한다',()=>{
 const game=prepared();game.units[0].distance=885;advance(game,3);
 assert.equal(game.bossState!.phase,'dormant');assert.equal(game.boss!.hp,REVIVED_WIZARD.hp);
 assert.equal(game.boss!.lastShot,-999);assert.equal(game.targets.find(target=>target.kind==='castle')!.lastShot,-999);
 assert.equal(game.events.some(event=>event.type==='hit'&&event.friendly&&event.targetId==='wizard-castle'),false);
 for(const target of game.targets)if(target.kind==='tower')target.hp=0;game.step(.01);
 assert.equal(game.bossState!.phase,'dueling');assert.ok(game.bossState!.nextSpellAt>game.elapsed);
});

test('기본 마력탄은 기존보다 20% 빠른 0.5/1.2초 뒤 명중하고 보스가 죽으면 남은 탄도 취소된다',()=>{
 const game=duel(),unit=game.units[0],shot=game.projectiles.find(shot=>shot.sourceId===game.boss!.id)!;
 assert.ok(shot);assert.equal(shot.damage,260);assert.equal(shot.duration,.5/1.2);const before=unit.hp;advance(game,.41);assert.equal(unit.hp,before);advance(game,.01);assert.equal(unit.hp,before-260);
 game.boss!.reload=0;game.step(.01);assert.ok(game.projectiles.some(shot=>shot.sourceId===game.boss!.id));
 const current=unit.hp;game.boss!.hp=0;game.targets.find(target=>target.kind==='castle')!.hp=0;advance(game,.6);assert.equal(unit.hp,current);assert.equal(game.bossState!.phase,'defeated');
 assert.equal(game.projectiles.some(shot=>shot.sourceId==='revived-wizard'),false);
});

test('파동은 2.8초간 고정된 범위를 예고하고 명중 때만 한 번 피해를 준다',()=>{
 const game=duel();game.projectiles.length=0;game.bossState!.nextSpellAt=0;game.step(.01);
 const spell=game.bossState!.spell!,unit=game.units[0],before=unit.hp;
 assert.equal(spell.kind,'shadow-wave');assert.equal(spell.phase,'warning');assert.ok(Math.abs(spell.resolvesAt-spell.startedAt-2.8)<1e-9);
 const center=spell.centerDistance;advance(game,2.79);assert.equal(unit.hp,before);assert.equal(game.bossState!.spell!.centerDistance,center);
 advance(game,.01);assert.equal(unit.hp,before-REVIVED_WIZARD.waveDamage);assert.equal(game.bossState!.spell!.phase,'active');assert.equal(game.bossState!.spellCount,1);
 const after=unit.hp;advance(game,1);assert.equal(unit.hp,after,'한 번의 광역마법을 매 프레임 중복 적용하지 않는다');
 assert.equal(game.projectiles.some(shot=>shot.sourceId==='revived-wizard'),false,'마법을 시전하는 동안 기본탄을 쏘지 않는다');
});

test('예고된 범위를 벗어난 후발 병력은 파동을 맞지 않으며 새 목표로 범위가 따라가지 않는다',()=>{
 const game=duel();game.projectiles.length=0;game.bossState!.nextSpellAt=0;game.step(.01);
 const spell=game.bossState!.spell!,center=spell.centerDistance;game.units[0].distance=0;const hp=game.units[0].hp;
 advance(game,2.8);assert.equal(game.units[0].hp,hp);assert.equal(spell.centerDistance,center);assert.equal(game.bossState!.spellCount,1);
});

test('속박은 체력을 깎고 공격 간격을 늦추지만 일정 시간이 지나면 저절로 풀린다',()=>{
 const game=duel();game.projectiles.length=0;game.bossState!.spellCount=1;game.bossState!.nextSpellAt=0;game.step(.01);
 assert.equal(game.bossState!.spell!.kind,'soul-chain');const unit=game.units[0],before=unit.hp;
 advance(game,2.8);assert.equal(unit.hp,before-REVIVED_WIZARD.chainDamage);assert.ok(unit.hexUntil!>game.elapsed);
 unit.reload=0;game.step(.01);assert.ok(Math.abs(unit.reload-1.5*REVIVED_WIZARD.hexReloadScale)<1e-9);
 advance(game,3.5);assert.ok(unit.hexUntil!<=game.elapsed);unit.reload=0;game.step(.01);assert.equal(unit.reload,1.5);
});

test('체력이 40% 이하가 되면 한 번 격노해 실제 표시 공격력과 발사 피해가 함께 증가한다',()=>{
 const game=duel();game.projectiles.length=0;game.boss!.hp=game.boss!.maxHp*.4;game.boss!.reload=0;game.step(.01);
 assert.equal(game.bossState!.phase,'enraged');assert.equal(game.boss!.attack,REVIVED_WIZARD.enragedAttack);const at=game.bossState!.enragedAt;
 assert.equal(game.projectiles.find(shot=>shot.sourceId==='revived-wizard')!.damage,340);assert.ok(game.boss!.reload<game.boss!.cooldown);
 advance(game,.3);assert.equal(game.bossState!.enragedAt,at);
});

test('마법의 예고·진행·속박·탄은 일시 정지와 학습 문제를 푸는 동안 모두 멈춘다',()=>{
 const game=duel();game.bossState!.nextSpellAt=0;game.step(.01);assert.equal(game.bossState!.spell!.phase,'warning');
 game.togglePause();let before=snapshot(game);advance(game,6);assert.equal(snapshot(game),before);game.togglePause();
 game.units[0].hp-=600;assert.ok(game.requestRally());before=snapshot(game);advance(game,6);assert.equal(snapshot(game),before);
 assert.equal(game.answer('0'),false);advance(game,6);assert.equal(snapshot(game),before);
 const question=game.pendingQuestion!;assert.ok([question.a,question.b,question.answer].every(learningValue));assert.ok(game.answer(numberText(question.answer,2)));
 advance(game,2.8);assert.equal(game.bossState!.spell!.phase,'active');assert.ok(game.requestRally());before=snapshot(game);advance(game,6);assert.equal(snapshot(game),before);game.cancelQuestion();
});

test('성을 0으로 바꾸더라도 살아 있는 보스를 건너뛰어 승리할 수 없다',()=>{
 const game=duel(),castle=game.targets.find(target=>target.kind==='castle')!;castle.hp=0;advance(game,1);
 assert.equal(game.phase,'playing');assert.equal(game.events.some(event=>event.type==='won'),false);assert.ok(game.boss!.hp>0);
 game.boss!.hp=10;game.units[0].hp=0;advance(game,.7);assert.ok(game.deploy('scout'));game.units.at(-1)!.distance=790;
 advance(game,.5);assert.equal(game.boss!.hp,0);assert.equal(game.phase,'won');assert.equal(game.events.filter(event=>event.type==='won').length,1);advance(game,1);assert.equal(game.events.filter(event=>event.type==='won').length,1);
});

test('보스의 동시 피격은 체력을 예약하고 네 타워·보스·성이 모두 쓰러져야 승리한다',()=>{
 const game=new SecretSiege('standard',10);for(const id of ['guard','striker','scout'] as const)recruit(game,id,balanced[id]);assert.ok(game.start());
 const order:ArmyId[]=[...Array<ArmyId>(3).fill('guard'),...Array<ArmyId>(6).fill('striker'),...Array<ArmyId>(2).fill('scout')];
 let next=0,lastHeal=-999,total=0;const destroyed:string[]=[];
 for(let tick=0;tick<1800&&game.phase==='playing';tick++){
  if(next<order.length&&game.deploy(order[next]))next++;
  if(game.canRally&&game.bossState!.lastSpellAt>lastHeal){assert.ok(game.requestRally());assert.ok(game.answer(numberText(game.pendingQuestion!.answer,2)));lastHeal=game.elapsed;}
  game.step(.1);
  for(const event of game.events.splice(0)){
   if(event.type==='hit'&&event.friendly){total+=event.damage!;assert.ok([10,200,750].includes(event.damage!));if(event.targetId==='wizard-castle')assert.equal(game.boss!.hp,0);}
   if(event.type==='destroy'&&event.friendly)destroyed.push(event.targetId!);
  }
  assert.ok(game.targets.every(target=>target.hp>=0&&target.hp%10===0));
 }
 assert.equal(game.phase,'won');assert.equal(game.bossState!.phase,'defeated');assert.equal(game.bossState!.spell,undefined);assert.equal(game.projectiles.length,0);
 assert.equal(total,game.targets.reduce((sum,target)=>sum+target.maxHp,0));assert.deepEqual(destroyed,game.targets.map(target=>target.id));
});

for(const difficulty of ['practice','standard','challenge'] as const)test(`${difficulty}: 기본 무회복은 실패하고 마법 후 회복을 아끼면 실제 9.90 편성으로 클리어한다`,()=>{
 const idle=simulateSecretSiege(difficulty,{...balanced,rally:false},10);assert.equal(idle.phase,'lost');assert.equal(idle.alive,0);
 const tooEarly=simulateSecretSiege(difficulty,balanced,10);assert.equal(tooEarly.phase,'lost');assert.equal(tooEarly.rallies,3);
 for(const plan of [{...balanced,deployGap:1},{...balanced,guard:3,striker:5,scout:4,deployGap:.7}])for(const dt of [.1,.05,1/60]){
  const timed=simulateSecretSiege(difficulty,{...plan,rallyTiming:'boss-spell',rallyDelay:.5},10,dt);
  assert.equal(timed.phase,'won',`dt=${dt}`);assert.equal(timed.boss,0);assert.equal(timed.castle,0);assert.equal(timed.rallies,3);assert.equal(timed.towersDestroyed,4);assert.ok(timed.spells>=4);assert.ok(timed.elapsed<150);assert.ok(timed.alive>0);
 }
});

test('1~9단계 균형 편성은 발사체 20% 가속 후에도 모두 승리하고 결정적 전투 결과를 유지한다',()=>{
 const expected={practice:[[40.8,23,4750,11],[37.6,23,4900,11],[40.9,28,7020,11],[38.1,24,6300,11],[40.6,32,9140,10],[37.9,27,7650,11],[45.1,33,9880,10],[45.6,35,11280,10],[42.1,33,10600,10]],standard:[[40.8,31,6150,11],[37.6,30,6570,11],[40.9,36,8920,10],[38.1,31,8260,11],[40.6,42,11040,10],[37.9,34,9650,10],[45.3,43,12670,10],[45.6,45,14160,10],[42.1,41,14080,10]],challenge:[[40.8,37,7450,11],[37.6,37,7750,11],[40.9,43,10620,10],[38.1,41,10110,10],[40.6,51,13930,10],[37.9,44,12050,10],[52.3,62,19800,9],[51.6,64,20150,9],[42.1,52,16610,8]]};
 for(const difficulty of ['practice','standard','challenge'] as const)for(let index=0;index<9;index++){
  const result=simulateSecretSiege(difficulty,balanced,index+1);assert.equal(result.phase,'won');assert.deepEqual([result.elapsed,result.enemyShots,result.armyDamage,result.alive],expected[difficulty][index]);
 }
});
