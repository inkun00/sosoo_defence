import {test} from 'node:test';
import assert from 'node:assert/strict';
import {advanceDuel,applyDuel,createDuel,duelBuildCost,joinDuel,DUEL_PREPARATION_SECONDS,DUEL_START_MONEY,type DuelState,type Side} from '../src/multiplayer/duel';
import {learningValue,numberText,purchaseCoins} from '../src/math';
import {TOWERS,towerPrice} from '../src/towers';

const NOW=100000,START=NOW+DUEL_PREPARATION_SECONDS*1000;
function preparing(level=1){const s=createDuel('one','첫째',99,NOW,level);joinDuel(s,'two','둘째',NOW,level);assert.ok(applyDuel(s,0,{type:'ready'},NOW,'r0').ok);assert.ok(applyDuel(s,1,{type:'ready'},NOW,'r1').ok);return s;}
function quote(s:DuelState,side:Side,typeId:string,nonce='q'){const cost=duelBuildCost(s,side,typeId);assert.ok(applyDuel(s,side,{type:'prepare-quote',typeId},NOW,nonce).ok);assert.equal(s.players[side]!.quote!.cost,cost);return s.players[side]!.quote!;}
function answer(s:DuelState,side:Side){const q=s.players[side]!.quote!;return applyDuel(s,side,{type:'answer',nonce:q.nonce,answer:numberText(q.before-q.cost)},NOW,'a');}
function start(s:DuelState){s.players.forEach(p=>p!.lastSeen=START);advanceDuel(s,START);assert.equal(s.status,'playing');}

test('양쪽 진영의 모든 타워는 취소·오답·다른 타워 선택 뒤에도 같은 잔액이면 같은 견적이다',()=>{
 for(const level of [1,2,10])for(const side of [0,1] as const)for(const type of TOWERS){
  const s=preparing(level),p=s.players[side]!,other=structuredClone(s.players[(1-side) as Side]),initialCost=duelBuildCost(s,side,type.id);
  for(let round=0;round<3;round++){
   const q=quote(s,side,type.id,`q-${round}`);assert.equal(q.cost,initialCost);assert.equal(duelBuildCost(s,side,type.id),q.cost);
   assert.equal(applyDuel(s,side,{type:'answer',nonce:q.nonce,answer:'999.99'},NOW,'bad').ok,false);
   assert.equal(p.money,DUEL_START_MONEY);assert.equal(p.purchaseVariation,undefined);assert.equal(p.quote,q);
   assert.ok(applyDuel(s,side,{type:'cancel'},NOW,'c').ok);assert.equal(p.money,DUEL_START_MONEY);assert.deepEqual(p.stock,{});
   const alternative=TOWERS.find(t=>t.id!==type.id)!;
   const altQuote=quote(s,side,alternative.id,`alternative-${round}`);assert.equal(altQuote.cost,towerPrice(alternative,p.money,level));
   assert.ok(applyDuel(s,side,{type:'cancel'},NOW,'alt-cancel').ok);assert.equal(p.purchaseVariation,undefined);
  }
  assert.equal(p.towerWrongAttempts,3);assert.deepEqual(s.players[(1-side) as Side],other);
 }
});

test('연습 가격은 실제 구매 성공에만 진행하고 같은 견적은 표시·문제·차감에서 일치한다',()=>{
 const s=preparing(5),p=s.players[0];
 for(let round=1;round<=10;round++){
  const before=p.money,q=quote(s,0,'basic',`q-${round}`);
  const quoted=duelBuildCost(s,0,'basic');assert.equal(quoted,q.cost);assert.equal(p.purchaseVariation?.round??0,round-1);
  for(let wrong=0;wrong<2;wrong++)assert.equal(applyDuel(s,0,{type:'answer',nonce:q.nonce,answer:'0'},NOW,'bad').ok,false);
  assert.equal(duelBuildCost(s,0,'basic'),quoted);assert.equal(p.money,before);
  assert.ok(answer(s,0).ok);assert.equal(p.money,before-quoted);assert.equal(p.stock.basic,round);assert.equal(p.purchases,round);
  assert.equal(p.purchaseVariation?.round,round);assert.equal(p.towerWrongAttempts,0);
  assert.equal(p.answeredQuestions,round);assert.equal(p.questionScore,8*round);
  const paid=p.money;assert.equal(applyDuel(s,0,{type:'answer',nonce:q.nonce,answer:numberText(q.before-q.cost)},NOW,'replay').ok,false);assert.equal(p.money,paid);assert.equal(p.purchaseVariation?.round,round);
 }
});

test('한 자리 구매 문제의 계산 밖 코인은 정답·취소·오답에서 줄지 않는다',()=>{
 for(const wallet of [10000,DUEL_START_MONEY,26070,999990]){
  const s=preparing(2),p=s.players[0];p.money=wallet;
  const q=quote(s,0,'frost');assert.equal(q.before,purchaseCoins(wallet));assert.ok([q.before,q.cost,q.before-q.cost].every(learningValue));
  const reserved=wallet-q.before;assert.ok(answer(s,0).ok);assert.equal(p.money,reserved+q.before-q.cost);assert.equal(p.money,wallet-q.cost);
  const paid=p.money;quote(s,0,'frost','again');assert.ok(applyDuel(s,0,{type:'cancel'},NOW,'c').ok);assert.equal(p.money,paid);
 }
});

test('열린 견적 이후 바뀐 잔액을 이전 잔액으로 덮어쓰거나 추가 차감하지 않는다',()=>{
 for(const delta of [-1000,1000])for(const escrow of [0,200])for(const side of [0,1] as const){
  const s=preparing(),p=s.players[side]!;const q=quote(s,side,'basic');p.money+=delta;p.escrow=escrow;
  const balance=p.money+p.escrow;assert.equal(duelBuildCost(s,side,'basic'),q.cost);
  const result=answer(s,side);assert.equal(result.ok,false);assert.match(result.message,/보유 코인.*다시 선택/);
  assert.equal(p.money,balance);assert.equal(p.escrow,0);assert.equal(p.quote,null);assert.deepEqual(p.stock,{});
  assert.equal(p.purchases,0);assert.equal(p.questionScore,0);assert.equal(p.answeredQuestions,0);assert.equal(p.purchaseVariation,undefined);
  assert.equal(applyDuel(s,side,{type:'answer',nonce:q.nonce,answer:numberText(q.before-q.cost)},NOW,'replay').ok,false);assert.equal(p.money,balance);
 }
});

test('실제 구매와 별도 보관 적립을 함께 마쳐도 원가만 차감하고 준비 경계는 잔액을 0으로 한다',()=>{
 const s=preparing(),p=s.players[0];const q=quote(s,0,'basic');p.escrow=300;
 assert.ok(answer(s,0).ok);assert.equal(p.money,DUEL_START_MONEY+300-q.cost);assert.equal(p.escrow,0);
 const variation=structuredClone(p.purchaseVariation);quote(s,0,'double','unfinished');start(s);
 assert.equal(p.money,0);assert.equal(p.escrow,0);assert.equal(p.quote,null);assert.deepEqual(p.stock,{basic:1});assert.deepEqual(p.purchaseVariation,variation);
 assert.equal(applyDuel(s,0,{type:'answer',nonce:'unfinished',answer:'0'},START,'late').ok,false);assert.equal(p.money,0);
});

test('양진영·모든 전투 단계에서 비축 배치는 무료이며 직접 구매 회수는 정확한 원가를 반환한다',()=>{
 for(const side of [0,1] as const)for(let level=1;level<=10;level++)for(const type of TOWERS){
  const s=preparing(),p=s.players[side]!;start(s);s.elapsed=(level-1)*18;p.money=DUEL_START_MONEY;p.stock[type.id]=1;
  const y=side===0?2:10,balance=p.money;
  assert.equal(duelBuildCost(s,side,type.id),0);assert.ok(applyDuel(s,side,{type:'build',typeId:type.id,x:2,y},START,'free').ok);
  assert.equal(p.money,balance);assert.equal(p.stock[type.id],0);const prepared=p.towers[0];assert.equal(prepared.cost,0);assert.equal(prepared.prepared,true);
  assert.ok(applyDuel(s,side,{type:'sell',towerId:prepared.id},START,'stock-refund').ok);assert.equal(p.money,balance);assert.equal(p.stock[type.id],1);
  p.stock[type.id]=0;const cost=duelBuildCost(s,side,type.id);
  assert.ok(applyDuel(s,side,{type:'build',typeId:type.id,x:2,y},START,'paid').ok);assert.equal(p.money,balance-cost);assert.equal(p.towers[0].cost,cost);
  const paid=p.money;assert.equal(applyDuel(s,side,{type:'build',typeId:type.id,x:2,y},START,'occupied').ok,false);assert.equal(p.money,paid);
  s.elapsed=179;const id=p.towers[0].id;assert.ok(applyDuel(s,side,{type:'sell',towerId:id},START,'refund').ok);assert.equal(p.money,balance);assert.equal(p.stock[type.id],0);
  assert.equal(applyDuel(s,side,{type:'sell',towerId:id},START,'double-refund').ok,false);assert.equal(p.money,balance);
 }
});
