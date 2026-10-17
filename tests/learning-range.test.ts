import {test} from 'node:test';
import assert from 'node:assert/strict';
import {LEVELS} from '../src/levels';
import {TOWERS,towerPrice} from '../src/towers';
import {Defense} from '../src/model';
import {HEROES} from '../src/multiplayer/heroes';
import {createDuel,joinDuel,applyDuel,advanceDuel,DUEL_PREPARATION_SECONDS,DuelState} from '../src/multiplayer/duel';
import {learningValue,numberText,recipe,creditMessage,purchaseCoins} from '../src/math';
function preparation(now:number,level=1){const s=createDuel('a','가',17,now,level);joinDuel(s,'b','나',now,level);assert.ok(applyDuel(s,0,{type:'ready'},now,'r0').ok);assert.ok(applyDuel(s,1,{type:'ready'},now,'r1').ok);assert.equal(s.status,'preparing');return s;}
function startCombat(s:DuelState,preparationStartedAt:number){const now=preparationStartedAt+DUEL_PREPARATION_SECONDS*1000;s.players.forEach(p=>p!.lastSeen=now);advanceDuel(s,now);assert.equal(s.status,'playing');assert.equal(s.elapsed,0);return now;}

test('보스 체력과 스토리 전체 지갑 구매를 제외한 일반 몬스터·영웅·포탄·재료·타워 가격은 10 미만이다',()=>{
 for(const l of LEVELS){
  assert.ok([purchaseCoins(l.budget),...l.hp,...l.bricks,...(l.extraBricks??[])].every(learningValue));
  if(l.boss)assert.equal(l.boss.hp,99900);else assert.ok(learningValue(l.budget));
  for(const t of TOWERS)for(const wallet of [l.budget,10000,90000,987654])assert.ok(learningValue(towerPrice(t,wallet,l.id)));
 }
 assert.ok(TOWERS.every(t=>learningValue(t.unit)&&learningValue(t.cost)));
 assert.ok(HEROES.every(h=>learningValue(h.hp)));
 assert.equal(recipe(9000,1000,10000),false);
 assert.equal(recipe(10000,1000,9000,'-'),false);
});

test('스토리의 누적 보유금은 구매 수식에 전액 표시되고 정답·실제 잔액·회수액이 일치한다',()=>{
 for(const l of LEVELS){const m=new Defense(l);m.money=98760;
  assert.ok(m.requestPurchase({x:1,y:3},'basic'));const q=m.pendingPurchase!;
  assert.equal(q.wallet,98760);assert.equal(q.before,98760);assert.ok(learningValue(q.cost));assert.equal(q.before%10,0);assert.equal((q.before-q.cost)%10,0);
  assert.ok(m.answerPurchase(numberText(q.before-q.cost)));assert.equal(m.money,98760-q.cost);assert.equal(m.money,q.before-q.cost);
  m.sellTower(m.towers[0].id);assert.equal(m.money,98760);
  assert.ok(!m.events.at(-1)!.message.includes(' = '));
 }
 assert.equal(creditMessage(9500,1000,'보상'),'1.0 코인 · 보상');
 assert.equal(creditMessage(8200,500,'보상'),'8.2 + 0.5 = 8.7 · 보상');
});

test('대전 준비의 큰 지갑·계산 중 별도 적립·취소에서도 한 자리 문항과 실제 잔액을 따로 보존한다',()=>{
 const now=100000,s=preparation(now);
 s.players[0].money=12500;
 assert.ok(applyDuel(s,0,{type:'prepare-quote',typeId:'basic'},now,'q').ok);const q=s.players[0].quote!;
 assert.ok([q.before,q.cost,q.before-q.cost].every(learningValue));s.players[0].escrow=200;
 assert.ok(applyDuel(s,0,{type:'answer',nonce:'q',answer:numberText(q.before-q.cost)},now,'a').ok);
 assert.equal(s.players[0].money,12700-q.cost);assert.equal(s.players[0].stock.basic,1);assert.equal(s.players[0].towers.length,0);
 assert.ok(applyDuel(s,0,{type:'prepare-quote',typeId:'double'},now,'q2').ok);const before=s.players[0].money;s.players[0].escrow=300;
 applyDuel(s,0,{type:'cancel'},now,'c');assert.equal(s.players[0].money,before+300);
 startCombat(s,now);assert.equal(s.players[0].money,0);assert.equal(s.players[0].escrow,0);assert.equal(s.players[0].stock.basic,1);
});

test('대전에서 합이 10 이상인 오답 조합은 재료·알을 유지하고 범위 밖 복습 문항을 만들지 않는다',()=>{
 const preparationStartedAt=100000,s=preparation(preparationStartedAt,10);
 s.players[0].heroQuestion={a:9000,b:8000};s.players[0].board=[7000,...Array(15).fill(100)];
 assert.equal(applyDuel(s,0,{type:'fuse',round:0,slots:[0],operation:'+'},preparationStartedAt,'w').ok,false);
 assert.equal(s.players[0].wrongQuestions.length,0);assert.equal(s.players[0].egg,0);assert.equal(s.players[0].round,0);
 assert.equal(s.players[0].solved,0);const now=startCombat(s,preparationStartedAt);
 for(let tick=1;tick<=300;tick++){const time=now+tick*1000;s.players.forEach(p=>p!.lastSeen=time);advanceDuel(s,time);assert.ok(s.enemies.every(e=>learningValue(e.hp)&&learningValue(e.max)));}
});
