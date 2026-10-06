import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Defense,Tower} from '../src/model';
import {LEVELS} from '../src/levels';
import {TOWERS,towerType,towerPrice,borrowingPlaces,parseMoney,PurchaseVariation} from '../src/towers';
import {numberText,minimumHits} from '../src/math';
import {world} from '../src/path';

test('12종 타워는 각각 고정된 서로 다른 공격력을 가지며 0.001 포탄은 없다',()=>{
 assert.equal(TOWERS.length,12);assert.equal(new Set(TOWERS.map(t=>t.unit)).size,12);
 assert.ok(TOWERS.every(t=>t.unit>=10&&t.unit%10===0));assert.ok(TOWERS.some(t=>t.unit===2350));
 for(const l of LEVELS)assert.deepEqual(l.units,[...new Set(TOWERS.filter(t=>t.unlock<=l.id).map(t=>t.unit))]);
});

test('취소·회수 뒤 같은 보유금과 같은 타워로 문제를 열어도 직전 식을 반복하지 않는다',()=>{
 for(const level of LEVELS)for(const type of TOWERS.filter(t=>t.unlock<=level.id)){
  const m=new Defense(level),formulas=new Set<string>();let previous='';
  for(let i=0;i<18;i++){
   const expected=towerPrice(type,m.money,level.id,m.purchaseVariation);
   assert.ok(m.requestPurchase({x:1,y:3},type.id));const q=m.pendingPurchase!,formula=`${q.before}-${q.cost}`;
   assert.equal(q.cost,expected,'상점 가격과 문제의 가격이 같아야 한다');assert.notEqual(formula,previous,`${level.id} ${type.id}`);formulas.add(formula);previous=formula;
   assert.equal(m.answerPurchase('99'),false);assert.equal(m.pendingPurchase,q,'오답은 식을 바꾸지 않는다');
   assert.equal(m.requestPurchase({x:3,y:3},type.id),false,'열린 문제를 다른 견적으로 덮어쓰지 않는다');
   if(i%2===0)m.cancelPurchase();else {assert.ok(m.answerPurchase(numberText(q.before-q.cost)));m.sellTower(m.towers[0].id);}
   assert.equal(m.money,level.budget);
  }
  assert.ok(formulas.size>=3,`${level.id} ${type.id} 다양성`);
 }
});

test('변형 가격도 차시별 소수 자리·한 자리 자연수·등급별 가격과 받아내림 난도를 지킨다',()=>{
 for(const level of LEVELS)for(const type of TOWERS.filter(t=>t.unlock<=level.id)){
  let variation:PurchaseVariation={round:1};
  for(let i=0;i<25;i++){
   const cost=towerPrice(type,level.budget,level.id,variation),places=borrowingPlaces(level.budget,cost).filter(p=>p<1000);
   assert.ok(cost>0&&cost<=level.budget&&cost<10000);assert.ok(level.budget-cost<10000);
   assert.equal(cost%(level.id===1?100:level.id<4?10:1),0);
   if(type.grade===1){assert.ok(cost<=1000);assert.equal(places.length,0);}
   else {assert.ok(cost>(type.grade-1)*1000&&cost<type.grade*1000);assert.ok(places.length>=(type.grade===2?1:2),`${level.id} ${type.id}: ${cost}`);}
   variation={round:variation.round+1,lastBefore:level.budget,lastCost:cost};
  }
 }
 const m=new Defense(LEVELS[0]);const before=m.purchaseVariation;m.money=50;
 assert.equal(m.requestPurchase({x:1,y:3},'basic'),false);assert.equal(m.purchaseVariation,before);
});
test('타워는 구매 문제의 정답 이후에만 설치되고 오답·취소는 돈·배치·횟수를 보존한다',()=>{
 const m=new Defense(LEVELS[0]),before=m.money;
 assert.ok(m.requestPurchase({x:1,y:3},'basic'));assert.equal(m.towers.length,0);assert.equal(m.money,before);
 assert.equal(m.answerPurchase('99'),false);assert.equal(m.money,before);assert.equal(m.purchases,0);assert.equal(m.towers.length,0);
 const q=m.pendingPurchase!;assert.equal(m.answerPurchase(numberText(q.before-q.cost)),true);
 assert.equal(m.money,before-q.cost);assert.equal(m.towers[0].typeId,'basic');assert.equal(m.towers[0].unit,100);assert.equal(m.purchaseAnswers,1);
 assert.equal(m.answerPurchase(numberText(q.before-q.cost)),false);assert.equal(m.towers.length,1);
 const money=m.money;assert.ok(m.requestPurchase({x:5,y:3},'double'));m.cancelPurchase();assert.equal(m.money,money);assert.equal(m.towers.length,1);
});
test('기본 등급은 소수 자리의 받아내림을 피하고 상위 가격은 가능한 받아내림을 우선한다',()=>{
 for(const before of [12800,10400,9000,56758,94759,12999]){
  const price=towerPrice(towerType('basic')!,before,10);assert.ok(!borrowingPlaces(before,price).some(p=>p<1000));
 }
 assert.ok(borrowingPlaces(18750,towerPrice(towerType('frost')!,18750,2)).some(p=>p<1000));
 const high=towerPrice(towerType('rune')!,94759,10);assert.ok(high>3000&&high<10000);assert.ok(borrowingPlaces(94759,high).filter(p=>p<1000).length>=2);
});
test('타워 잠금·길 위 설치·돈 부족은 문제를 만들거나 돈을 차감하지 않는다',()=>{
 const m=new Defense(LEVELS[0]),money=m.money;
 assert.equal(m.requestPurchase({x:1,y:3},'rune'),false);assert.equal(m.requestPurchase({x:1,y:4},'basic'),false);assert.equal(m.money,money);assert.equal(m.pendingPurchase,null);
 m.money=50;assert.equal(m.requestPurchase({x:1,y:3},'basic'),false);assert.equal(m.money,50);
});
test('문제를 연 뒤 돈이나 설치 조건이 바뀌면 오래된 정답으로 설치할 수 없다',()=>{
 const m=new Defense(LEVELS[3]);m.requestPurchase({x:1,y:3},'lightning');const q=m.pendingPurchase!;m.money++;
 assert.equal(m.answerPurchase(numberText(q.before-q.cost)),false);assert.equal(m.towers.length,0);assert.equal(m.money,q.before+1);assert.equal(m.pendingPurchase,null);
 m.requestPurchase({x:1,y:3},'basic');const next=m.pendingPurchase!;m.blocks.add('1,3');assert.equal(m.answerPurchase(numberText(next.before-next.cost)),false);assert.equal(m.money,next.before);
});
test('소수 입력을 반올림 없이 정수로 해석하며 잘못된 형식은 차감하지 않는다',()=>{
 assert.equal(parseMoney('10.7'),10700);assert.equal(parseMoney('027.855'),27855);assert.equal(parseMoney(' 0.010 '),10);
 for(const s of ['','-1','1e3','NaN','Infinity','2.3456','2..3','1,23','abc'])assert.equal(parseMoney(s),null);
 const m=new Defense(LEVELS[3]);m.requestPurchase({x:1,y:3},'basic');const before=m.money;assert.equal(m.answerPurchase('abc'),false);assert.equal(m.money,before);assert.ok(m.pendingPurchase);
});
test('회수는 실제 지불한 가격을 반환하며 재설치에도 새 뺄셈 정답이 필요하다',()=>{
 const m=new Defense(LEVELS[3]);m.requestPurchase({x:1,y:3},'lightning');const q=m.pendingPurchase!;m.answerPurchase(numberText(q.before-q.cost));const t=m.towers[0];
 m.sellTower(t.id);assert.equal(m.money,q.before);assert.equal(m.towers.length,0);assert.ok(m.requestPurchase({x:2,y:3},'lightning'));assert.equal(m.towers.length,0);
});
test('다양한 포탄의 최소 타격은 탐욕식이 아니라 실제 최적 조합으로 계산한다',()=>{
 assert.equal(minimumHits(300,[200,150,10]),2);assert.equal(minimumHits(500,[350,250,10]),2);
 assert.equal(minimumHits(2350,[1200,750,200,50,10]),4);assert.equal(minimumHits(15,[10,50]),Infinity);
});
test('타워 고유 공격력이 실제 피해에 적용되고 남은 체력보다 크면 무효다',()=>{
 const m=new Defense(LEVELS[9]);m.spawn();const e=m.enemies[0];e.hp=e.max=1550;
 m.damage(e,{unit:1200,effect:'basic'} as Tower);assert.equal(e.hp,350);
 m.damage(e,{unit:750,effect:'slow'} as Tower);assert.equal(e.hp,350);assert.equal(e.slow,0);
 m.damage(e,{unit:350,effect:'stun'} as Tower);assert.equal(e.hp,0);assert.equal(m.kills,1);
});

test('단계별 시작 기본 가격은 달라지고 보유금이 달라도 등급 가격이 역전되지 않는다',()=>{
 const basic=towerType('basic')!;
 assert.equal(new Set(LEVELS.map(l=>towerPrice(basic,l.budget,l.id))).size,10);
 for(const t of TOWERS){const open=LEVELS.filter(l=>l.id>=t.unlock);assert.equal(new Set(open.map(l=>towerPrice(t,l.budget,l.id))).size,open.length,t.name);}
 for(const wallet of [0,100000,8800,8842,999999])for(let stage=1;stage<=10;stage++)for(const low of TOWERS)for(const high of TOWERS){
  const cost=towerPrice(low,wallet,stage);assert.ok(cost>0&&cost<10000);
  if(low.grade<high.grade)for(const otherWallet of [0,9999,8759])assert.ok(cost<towerPrice(high,otherWallet,stage));
 }
});

test('타워는 가로·세로·대각선 두 칸을 비우고 회수하면 주변 공간을 다시 사용할 수 있다',()=>{
 const m=new Defense(LEVELS[9]);assert.ok(m.requestPurchase({x:1,y:3},'basic'));let q=m.pendingPurchase!;assert.ok(m.answerPurchase(numberText(q.before-q.cost)));
 const money=m.money,purchases=m.purchases;
 for(let dx=-2;dx<=2;dx++)for(let dy=-2;dy<=2;dy++){
  if(!dx&&!dy)continue;
  const c={x:1+dx,y:3+dy};assert.ok(m.towerTooClose(c));assert.equal(m.candidate(c),null);assert.equal(m.requestPurchase(c,'double'),false);
 }
 assert.equal(m.money,money);assert.equal(m.purchases,purchases);assert.equal(m.pendingPurchase,null);
 assert.match(m.events.at(-1)!.message,/두 칸/);
 for(const c of [{x:4,y:3},{x:1,y:0},{x:4,y:0}])assert.equal(m.towerTooClose(c),false,'세 칸 떨어진 경계는 간격 제한 밖이다');
 assert.ok(m.requestPurchase({x:1,y:0},'double'));q=m.pendingPurchase!;assert.ok(m.answerPurchase(numberText(q.before-q.cost)));
 m.sellTower(m.towers[0].id);assert.ok(m.candidate({x:1,y:3}));assert.ok(m.requestPurchase({x:1,y:3},'basic'));
 // Walls still follow the path rules rather than reserving a tower gap.
 m.cancelPurchase();m.fusions=1;assert.ok(m.placeWall({x:1,y:4}));
});

test('큰 포탄은 사거리 안의 유효한 몬스터를 우선하고 모두 작으면 초과 공격 규칙을 따른다',()=>{
 const m=new Defense(LEVELS[9]);m.spawn();m.spawn();const [front,back]=m.enemies;
 Object.assign(front,world({x:1,y:4}),{hp:100,next:4});Object.assign(back,world({x:2,y:4}),{hp:1000,next:1});
 const t={x:1,y:3,unit:750,effect:'stun'} as Tower;
 assert.equal(m.targetFor(t)?.id,back.id);m.damage(back,t);assert.equal(back.hp,250);
 assert.equal(m.targetFor(t)?.id,front.id);m.damage(front,t);assert.equal(front.hp,100);assert.equal(m.invalidHits,1);
});
