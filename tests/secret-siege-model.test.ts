import {test} from 'node:test';
import assert from 'node:assert/strict';
import {SecretSiege} from '../src/secret-siege-model';
import {ARMY,SIEGE_DURATION,type ArmyId} from '../src/secret-siege-types';
import {learningValue,numberText} from '../src/math';
import {simulateSecretSiege} from '../tools/simulate-secret-siege';

function recruit(game:SecretSiege,id:ArmyId,count=1){
 for(let index=0;index<count;index++){
  assert.ok(game.requestRecruit(id),`${id} recruitment must be legal`);
  assert.ok(game.answer(numberText(game.pendingQuestion!.answer,2)));
 }
}
function prepared(){const game=new SecretSiege('standard');recruit(game,'guard');recruit(game,'striker');recruit(game,'scout');assert.ok(game.start());return game;}
function advance(game:SecretSiege,seconds:number){for(let tick=0;tick<Math.ceil(seconds*10);tick++)game.step(.1);}
function until(game:SecretSiege,predicate:()=>boolean,seconds=180){for(let tick=0;tick<seconds*10&&!predicate()&&game.phase==='playing';tick++)game.step(.1);assert.ok(predicate(),'the reachable condition must occur');}
function deploySequence(game:SecretSiege,ids:ArmyId[]){for(const id of ids){assert.ok(game.deploy(id));advance(game,.7);}}
function combatSnapshot(game:SecretSiege){return JSON.stringify({elapsed:game.elapsed,units:game.units,targets:game.targets,projectiles:game.projectiles,money:game.money,reserve:game.reserve});}

test('비밀 공격전은 기존 게임과 분리된 9.90 코인·180초·네 공격 타워와 성으로 시작한다',()=>{
 const game=new SecretSiege('standard');assert.equal(game.phase,'ready');assert.equal(game.money,9900);assert.equal(game.castle,9990);
 assert.equal(game.armyCount,0);assert.equal(game.stars,0);assert.equal(SIEGE_DURATION,180);assert.equal(game.ralliesLeft,3);
 assert.deepEqual(game.targets.map(target=>[target.kind,target.hp,target.attack]),[['tower',2400,100],['tower',3600,150],['tower',4500,200],['tower',5400,250],['castle',9990,300]]);
 assert.deepEqual(game.targets.map(target=>target.distance),[240,430,620,800,950]);
 assert.deepEqual(game.targets.filter(target=>target.kind==='tower').map(target=>target.towerKind),['arcane','venom','arcane','venom']);
 assert.ok(game.targets.filter(target=>target.kind==='tower').every(target=>target.placement&&Math.abs(target.placement.y)>0&&target.lastShot===-999));
 assert.ok([...ARMY.flatMap(army=>[army.cost,army.hp,army.attack]),...game.targets.flatMap(target=>[target.hp,target.attack])].every(learningValue));
});

test('모집은 실제 잔액에서 비용을 정확히 빼야 하며 오답은 자원과 모집 수를 변경하지 않는다',()=>{
 const game=new SecretSiege('standard');assert.ok(game.requestRecruit('guard'));
 const question=game.pendingQuestion!;assert.deepEqual([question.a,question.b,question.operation,question.answer],[9900,1200,'-',8700]);
 for(const wrong of ['8.69','8.701','-8.70','NaN','8,70',''])assert.equal(game.answer(wrong),false);
 assert.equal(game.money,9900);assert.equal(game.reserve.guard,0);assert.equal(game.recruited,0);assert.equal(game.correctAnswers,0);assert.equal(game.wrongAnswers,6);
 assert.equal(game.pendingQuestion,question);assert.ok(game.answer('8.70'));assert.equal(game.money,8700);assert.equal(game.reserve.guard,1);
 assert.equal(game.recruited,1);assert.equal(game.correctAnswers,1);assert.equal(game.pendingQuestion,undefined);
 assert.equal(game.answer('8.70'),false);assert.equal(game.money,8700);assert.equal(game.recruited,1,'중복 제출로 이중 차감하지 않는다');
});

test('취소한 같은 모집 견적은 ID와 비용을 유지하고 다른 모집이 잔액을 바꾸면 새 견적을 낸다',()=>{
 const game=new SecretSiege('standard');game.requestRecruit('guard');const first=game.pendingQuestion!;game.cancelQuestion();
 assert.equal(game.money,9900);assert.ok(game.requestRecruit('guard'));assert.equal(game.pendingQuestion!.id,first.id);
 assert.equal(game.requestRecruit('striker'),false);assert.equal(game.pendingQuestion!.armyId,'guard');game.cancelQuestion();
 recruit(game,'scout');assert.ok(game.requestRecruit('guard'));assert.notEqual(game.pendingQuestion!.id,first.id);
 assert.equal(game.pendingQuestion!.a,9450);assert.equal(game.answer(numberText(first.answer,2)),false);assert.equal(game.money,9450);
});

test('정찰병과 다른 병력이 있어야 출전하고 준비 중 필수 병력의 코인과 자리를 남긴다',()=>{
 const game=new SecretSiege('standard');assert.equal(game.start(),false);recruit(game,'guard');assert.equal(game.start(),false);recruit(game,'scout');
 assert.ok(game.requestRecruit('striker'));assert.equal(game.start(),false);game.cancelQuestion();assert.ok(game.start());assert.equal(game.start(),false);
 const noScout=new SecretSiege('standard');recruit(noScout,'guard',7);assert.equal(noScout.requestRecruit('guard'),false,'다음에 인상될 정찰병 비용까지 남겨야 한다');
 recruit(noScout,'scout');assert.ok(noScout.start());
 const onlyScouts=new SecretSiege('standard');recruit(onlyScouts,'scout',11);assert.equal(onlyScouts.requestRecruit('scout'),false,'다른 병력 자리 하나를 남겨야 한다');
 recruit(onlyScouts,'striker');assert.ok(onlyScouts.start());
});

test('한도는 비축과 생존 병력의 합계 12명이고 돈은 부족해지면 음수가 되지 않는다',()=>{
 const game=new SecretSiege('standard');recruit(game,'guard');recruit(game,'scout',11);
 assert.equal(game.armyCount,12);assert.equal(game.money,3090);assert.equal(game.requestRecruit('scout'),false);assert.ok(game.start());
 assert.ok(game.deploy('guard'));assert.equal(game.armyCount,12);assert.equal(game.reserve.guard,0);assert.equal(game.requestRecruit('scout'),false);
 const spent=new SecretSiege('standard');recruit(spent,'guard',3);recruit(spent,'striker',4);recruit(spent,'scout',2);
 while(spent.canRecruit('scout'))recruit(spent,'scout');const money=spent.money;
 assert.ok(money>=0&&money<spent.recruitCost('scout'));for(const army of ARMY)assert.equal(spent.requestRecruit(army.id),false);assert.equal(spent.money,money);
});

test('출격은 전투 시작 후 실제 비축만 소모하며 전체 병종에 0.65초 간격을 적용한다',()=>{
 const ready=new SecretSiege('standard');recruit(ready,'guard');assert.equal(ready.deploy('guard'),false);
 const game=prepared();assert.ok(game.deploy('guard'));assert.equal(game.deploy('striker'),false);assert.equal(game.reserve.striker,1);
 advance(game,.6);assert.equal(game.deploy('striker'),false);game.step(.05);assert.ok(game.deploy('striker'));
 assert.equal(game.deploy('scout'),false);advance(game,.7);assert.ok(game.deploy('scout'));advance(game,.7);assert.equal(game.deploy('scout'),false);
 assert.equal(game.deployed,3);assert.equal(game.units.length,3);assert.ok(game.units[1].deployedAt-game.units[0].deployedAt>=.65-1e-7);
});

test('모집 문제를 풀 때 전투·비행 중인 발사체·제한 시간이 모두 멈춘다',()=>{
 const game=prepared();deploySequence(game,['guard','striker','scout']);until(game,()=>game.projectiles.length>0);
 assert.ok(game.requestRecruit('scout'));const before=combatSnapshot(game);advance(game,30);assert.equal(combatSnapshot(game),before);
 assert.equal(game.deploy('scout'),false);assert.equal(game.requestRally(),false);assert.equal(game.answer('0.00'),false);
 advance(game,2);assert.equal(combatSnapshot(game),before);game.cancelQuestion();game.step(.1);assert.notEqual(combatSnapshot(game),before);
});

test('일시 정지와 잘못된 dt는 전투 상태를 바꾸지 않는다',()=>{
 const game=prepared();game.deploy('guard');advance(game,1);game.togglePause();assert.equal(game.phase,'paused');const before=combatSnapshot(game);
 advance(game,50);assert.equal(combatSnapshot(game),before);assert.equal(game.deploy('scout'),false);assert.equal(game.requestRecruit('scout'),false);
 game.togglePause();for(const dt of [0,-1,NaN,Infinity])game.step(dt);assert.equal(combatSnapshot(game),before);
 game.step(.1);assert.ok(game.elapsed>1);assert.equal(game.phase,'playing');
});

test('피해는 발사 시점이 아니라 보이는 발사체가 도착한 뒤에만 적용된다',()=>{
 const game=prepared();game.deploy('guard');until(game,()=>game.projectiles.some(shot=>shot.source==='enemy'));
 const shot=game.projectiles.find(shot=>shot.source==='enemy')!,target=game.units.find(unit=>unit.id===shot.targetId)!;
 assert.equal(shot.duration,.5/1.2);assert.equal(shot.age,0);const before=target.hp;advance(game,.4);assert.equal(target.hp,before);
 game.step(shot.duration-.4);assert.equal(target.hp,before-100);assert.ok(game.events.some(event=>event.type==='hit'&&event.damage===100&&!event.friendly));
});

test('방패병·돌격병·정찰병의 탄은 각각 기존 비행 시간의 1/1.2로 이동하고 공격 주기는 유지한다',()=>{
 for(const [id,duration] of [['guard',.5],['striker',.6],['scout',.35]] as const){
  const game=prepared();assert.ok(game.deploy(id));const unit=game.units[0],tower=game.targets[0],army=ARMY.find(army=>army.id===id)!;
  unit.distance=tower.distance-army.range;tower.reload=999;game.step(.001);
  const shot=game.projectiles.find(shot=>shot.sourceId===unit.id)!;
  assert.ok(shot);assert.equal(shot.duration,duration/1.2);assert.equal(unit.reload,army.cooldown);assert.equal(shot.damage,army.attack);
  const hp=tower.hp;while(shot.age<shot.duration-.001)game.step(Math.min(.01,shot.duration-.001-shot.age));
  assert.equal(tower.hp,hp);game.step(.001);assert.equal(tower.hp,hp-army.attack);
 }
});

test('마법사의 네 타워는 각자 사거리에 들어온 병사를 조준하고 발사체 도착 후 자기 공격력만큼 피해를 준다',()=>{
 for(let index=0;index<4;index++){
  const game=prepared();assert.ok(game.deploy('guard'));const tower=game.targets[index],unit=game.units[0];
  for(const other of game.targets)if(other!==tower)other.hp=0;
  unit.distance=tower.distance-tower.range-.1;game.step(.001);
  assert.equal(game.projectiles.length,0,`${tower.name} must not fire outside its range`);assert.equal(tower.lastShot,-999);
  unit.distance=tower.distance-tower.range;game.step(.001);
  const shot=game.projectiles.find(shot=>shot.source==='enemy')!;
  assert.ok(shot,`${tower.name} must independently fire`);assert.equal(shot.sourceId,tower.id);assert.equal(shot.fromDistance,tower.distance);assert.equal(shot.targetId,unit.id);assert.equal(tower.lastShot,game.elapsed);
  assert.equal(shot.damage,tower.attack);assert.equal(shot.age,0);const before=unit.hp;
  advance(game,.4);assert.equal(unit.hp,before);advance(game,.1);assert.equal(unit.hp,before-tower.attack);
 }
});

test('네 타워 각각의 비행 중인 공격은 문제와 일시 정지에 멈추며 파괴되면 취소된다',()=>{
 for(let index=0;index<4;index++){
  const game=prepared();game.deploy('guard');const tower=game.targets[index],unit=game.units[0];
  for(const other of game.targets)if(other!==tower)other.hp=0;
  unit.distance=tower.distance-tower.range;game.step(.001);assert.equal(game.projectiles.length,1);
  assert.ok(game.requestRecruit('scout'));const question=combatSnapshot(game);advance(game,2);assert.equal(combatSnapshot(game),question);game.cancelQuestion();
  game.togglePause();const paused=combatSnapshot(game);advance(game,2);assert.equal(combatSnapshot(game),paused);game.togglePause();
  const before=unit.hp;tower.hp=0;advance(game,.6);assert.equal(unit.hp,before);assert.equal(game.projectiles.length,0);
  advance(game,2);assert.equal(game.projectiles.length,0,`${tower.name} must not fire after destruction`);
 }
});

test('다수 아군의 동시 발사는 남은 체력을 예약해 초과 피해 경쟁 없이 정확히 처리한다',()=>{
 const game=new SecretSiege('standard');recruit(game,'guard',3);recruit(game,'striker',4);recruit(game,'scout',2);assert.ok(game.start());
 const order:ArmyId[]=[...Array<ArmyId>(3).fill('guard'),...Array<ArmyId>(4).fill('striker'),...Array<ArmyId>(2).fill('scout')];let next=0,totalDamage=0,hits=0;
 const firingTowers=new Set<number>(),destroyed:string[]=[];
 for(let tick=0;tick<1800&&game.phase==='playing';tick++){
  if(next<order.length&&game.deploy(order[next]))next++;
  game.step(.1);
  for(const shot of game.projectiles)if(shot.source==='enemy')firingTowers.add(shot.fromDistance);
  for(const event of game.events.splice(0)){
   if(event.type==='hit'&&event.friendly&&game.targets.some(target=>target.id===event.targetId)){totalDamage+=event.damage!;hits++;assert.ok([10,200,750].includes(event.damage!));if(event.targetId==='wizard-castle')assert.ok(game.targets.filter(target=>target.kind==='tower').every(target=>target.hp===0),'the castle can only take damage after all four towers fall');}
   if(event.type==='destroy'&&event.friendly&&game.targets.some(target=>target.id===event.targetId))destroyed.push(event.targetId!);
  }
  assert.ok(game.targets.every(target=>target.hp>=0&&target.hp%10===0));
 }
 assert.equal(game.phase,'won');assert.equal(totalDamage,2400+3600+4500+5400+9990);assert.ok(hits>30);
 assert.equal(game.castle,0);assert.equal(game.projectiles.length,0);assert.ok(game.targets.every(target=>target.hp===0));
 assert.deepEqual(destroyed,game.targets.map(target=>target.id));for(const tower of game.targets.filter(target=>target.kind==='tower'))assert.ok(firingTowers.has(tower.distance),`${tower.name} fires during a legal complete battle`);
});

test('파괴된 타워가 이미 발사한 공격도 뒤늦게 아군 체력을 깎지 않는다',()=>{
 const game=new SecretSiege('challenge');recruit(game,'guard',3);recruit(game,'striker',4);recruit(game,'scout',2);game.start();
 const order:ArmyId[]=['guard','guard','guard','striker','striker','striker','striker','scout','scout'];let next=0;
 for(let tick=0;tick<500&&game.targets[0].hp>0;tick++){if(next<order.length&&game.deploy(order[next]))next++;game.step(.1);}
 assert.equal(game.targets[0].hp,0);assert.ok(game.units.every(unit=>unit.distance<300));
 const total=game.units.reduce((sum,unit)=>sum+unit.hp,0);game.events.length=0;advance(game,.6);
 assert.equal(game.units.reduce((sum,unit)=>sum+unit.hp,0),total);
 assert.equal(game.projectiles.some(shot=>shot.source==='enemy'&&shot.fromDistance===240),false);
 assert.equal(game.events.some(event=>event.type==='hit'&&!event.friendly),false);
});

test('집결은 부상한 생존 병력에만 덧셈 문제를 내고 최대 체력까지만 회복한다',()=>{
 const game=prepared();assert.equal(game.canRally,false);assert.equal(game.requestRally(),false);deploySequence(game,['guard','striker','scout']);
 until(game,()=>game.canRally);const hp=game.units.map(unit=>unit.hp),money=game.money;assert.ok(game.requestRally());const question=game.pendingQuestion!;
 assert.equal(question.operation,'+');assert.ok(learningValue(question.a)&&learningValue(question.b)&&learningValue(question.answer));assert.equal(question.answer,question.a+question.b);
 const snapshot=combatSnapshot(game);advance(game,10);assert.equal(combatSnapshot(game),snapshot);assert.equal(game.answer('0'),false);assert.equal(game.ralliesLeft,3);
 game.cancelQuestion();assert.ok(game.requestRally());assert.equal(game.pendingQuestion!.id,question.id);assert.ok(game.answer(numberText(question.answer,2)));
 assert.equal(game.money,money);assert.equal(game.ralliesLeft,2);assert.deepEqual(game.units.map(unit=>unit.hp),game.units.map((unit,index)=>Math.min(unit.maxHp,hp[index]+600)));
 assert.equal(game.answer(numberText(question.answer,2)),false);assert.equal(game.ralliesLeft,2);
});

test('집결은 최대 세 번만 사용하고 전투가 끝난 뒤 모집과 출격은 잠긴다',()=>{
 const game=prepared();deploySequence(game,['guard','striker','scout']);
 for(let index=0;index<3;index++){until(game,()=>game.canRally);assert.ok(game.requestRally());assert.ok(game.answer(numberText(game.pendingQuestion!.answer,2)));}
 assert.equal(game.ralliesLeft,0);assert.equal(game.canRally,false);assert.equal(game.requestRally(),false);
 advance(game,180);assert.ok(game.phase==='lost'||game.phase==='won');const before=combatSnapshot(game);
 assert.equal(game.requestRecruit('scout'),false);assert.equal(game.deploy('scout'),false);game.step(.1);assert.equal(combatSnapshot(game),before);
});

test('출격하지 않아도 180초가 지나면 패배하고 종료 이벤트는 한 번만 발행한다',()=>{
 const game=prepared();advance(game,181);assert.equal(game.phase,'lost');assert.ok(Math.abs(game.elapsed-180)<1e-6);assert.equal(game.castle,9990);assert.equal(game.stars,0);
 assert.equal(game.events.filter(event=>event.type==='lost').length,1);assert.match(game.events.find(event=>event.type==='lost')!.message,/시간/);advance(game,10);
 assert.equal(game.events.filter(event=>event.type==='lost').length,1);
});

test('난이도는 표시되는 체력과 공격 소수는 유지하면서 적 사격 간격만 바꾼다',()=>{
 const easy=new SecretSiege('practice'),standard=new SecretSiege('standard'),hard=new SecretSiege('challenge');
 for(let index=0;index<standard.targets.length;index++){
  assert.equal(easy.targets[index].hp,hard.targets[index].hp);assert.equal(standard.targets[index].attack,hard.targets[index].attack);
  assert.ok(easy.targets[index].cooldown>standard.targets[index].cooldown&&standard.targets[index].cooldown>hard.targets[index].cooldown);
 }
});

for(const difficulty of ['practice','standard','challenge'] as const)test(`${difficulty}: 합법적인 균형 편성과 정확한 계산만으로 성을 파괴할 수 있다`,()=>{
 const result=simulateSecretSiege(difficulty,{name:'검증',guard:3,striker:4,scout:2,order:'guard-first',rally:false});
 assert.equal(result.phase,'won');assert.equal(result.castle,0);assert.equal(result.remainingMoney,10440);assert.equal(result.earnedCoins,9000);assert.equal(result.deployed,9);assert.equal(result.stars,3);assert.ok(result.elapsed<180);
 assert.equal(result.towersDestroyed,4);assert.equal(result.firingTowers,4);assert.ok(result.enemyShots>10);assert.ok(result.armyDamage>0);
});

test('공격력 0.01 정찰병에 치우친 군대는 도전에서 실패해 병력 역할을 조합해야 한다',()=>{
 const result=simulateSecretSiege('challenge',{name:'정찰 편중',guard:1,striker:0,scout:11,order:'scout-first',rally:true});
 assert.equal(result.phase,'lost');assert.ok(result.castle>0);assert.equal(result.recruited,12);assert.equal(result.deployed,12);assert.equal(result.rallies,3);
});
