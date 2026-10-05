import {test} from 'node:test';
import assert from 'node:assert/strict';
import {LEVELS} from '../src/levels';
import {TOWERS,towerPrice} from '../src/towers';
import {Defense} from '../src/model';
import {HEROES} from '../src/multiplayer/heroes';
import {createDuel,joinDuel,applyDuel,advanceDuel} from '../src/multiplayer/duel';
import {learningValue,numberText,recipe,creditMessage} from '../src/math';

test('모든 스테이지·영웅의 체력·포탄·재료·초기 코인·가격은 10 미만이다',()=>{
 for(const l of LEVELS){
  assert.ok([l.budget,...l.hp,...l.bricks,...(l.extraBricks??[])].every(learningValue));
  for(const t of TOWERS)for(const wallet of [l.budget,10000,90000,987654])assert.ok(learningValue(towerPrice(t,wallet,l.id)));
 }
 assert.ok(TOWERS.every(t=>learningValue(t.unit)&&learningValue(t.cost)));
 assert.ok(HEROES.every(h=>learningValue(h.hp)));
 assert.equal(recipe(9000,1000,10000),false);
 assert.equal(recipe(10000,1000,9000,'-'),false);
});

test('누적 보유금이 커져도 구매 수식은 10 미만이고 나머지 코인과 회수액은 보존한다',()=>{
 for(const l of LEVELS){const m=new Defense(l);m.money=98759;
  assert.ok(m.requestPurchase({x:1,y:3},'basic'));const q=m.pendingPurchase!;
  assert.equal(q.wallet,98759);assert.ok([q.before,q.cost,q.before-q.cost].every(learningValue));
  assert.ok(m.answerPurchase(numberText(q.before-q.cost)));assert.equal(m.money,98759-q.cost);
  m.sellTower(m.towers[0].id);assert.equal(m.money,98759);
  assert.ok(!m.events.at(-1)!.message.includes(' = '));
 }
 assert.equal(creditMessage(9500,1000,'보상'),'1.0 코인 · 보상');
 assert.equal(creditMessage(8200,500,'보상'),'8.2 + 0.5 = 8.7 · 보상');
});

test('대전의 큰 지갑·계산 중 보상·취소에서도 한 자리 문항과 실제 잔액을 따로 보존한다',()=>{
 const now=100000,s=createDuel('a','가',17,now);joinDuel(s,'b','나',now);
 s.players[0].money=12500;
 assert.ok(applyDuel(s,0,{type:'quote',x:3,y:2,typeId:'basic'},now,'q').ok);const q=s.players[0].quote!;
 assert.ok([q.before,q.cost,q.before-q.cost].every(learningValue));s.players[0].escrow=200;
 assert.ok(applyDuel(s,0,{type:'answer',nonce:'q',answer:numberText(q.before-q.cost)},now,'a').ok);
 assert.equal(s.players[0].money,12700-q.cost);
 assert.ok(applyDuel(s,0,{type:'quote',x:5,y:2,typeId:'double'},now,'q2').ok);const before=s.players[0].money;s.players[0].escrow=300;
 applyDuel(s,0,{type:'cancel'},now,'c');assert.equal(s.players[0].money,before+300);
});

test('대전에서 합이 10 이상인 오답 조합은 재료·알을 유지하고 범위 밖 복습 문항을 만들지 않는다',()=>{
 const now=100000,s=createDuel('a','가',17,now,10);joinDuel(s,'b','나',now,10);
 applyDuel(s,0,{type:'ready'},now,'r0');applyDuel(s,1,{type:'ready'},now,'r1');
 s.players[0].board=[9000,8000,7000,...Array(13).fill(100)];
 assert.equal(applyDuel(s,0,{type:'fuse',round:0,slots:[0,1,2],operation:'+'},now,'w').ok,false);
 assert.equal(s.players[0].wrongQuestions.length,0);assert.equal(s.players[0].egg,0);assert.equal(s.players[0].round,0);
 for(let tick=1;tick<=300;tick++){const time=now+tick*1000;s.players.forEach(p=>p!.lastSeen=time);advanceDuel(s,time);assert.ok(s.enemies.every(e=>learningValue(e.hp)&&learningValue(e.max)));}
});
