import {test} from 'node:test';
import assert from 'node:assert/strict';
import {advanceDuel,applyDuel,canPurchaseDuelTower,canUseDuelTower,createDuel,duelBuildCost,duelTowerLevel,joinDuel,DUEL_PREPARATION_SECONDS,DUEL_START_MONEY,DuelState} from '../src/multiplayer/duel';
import {numberText} from '../src/math';
import {TOWERS,towerPrice,towerType} from '../src/towers';

const NOW=100000,START=NOW+DUEL_PREPARATION_SECONDS*1000;
function preparing(level=1){
 const s=createDuel('a','왼쪽',17,NOW,level);joinDuel(s,'b','오른쪽',NOW,level);
 applyDuel(s,0,{type:'ready'},NOW,'r1');applyDuel(s,1,{type:'ready'},NOW,'r2');return s;
}
function connectedAdvance(s:DuelState,now:number){s.players.forEach(p=>{if(p)p.lastSeen=now;});advanceDuel(s,now);}
function reserve(s:DuelState,typeId='basic',nonce='q',now=NOW){
 const result=applyDuel(s,0,{type:'prepare-quote',typeId},now,nonce);assert.equal(result.ok,true,result.message);
 const q=s.players[0].quote!;const answer=applyDuel(s,0,{type:'answer',nonce:q.nonce,answer:numberText(q.before-q.cost)},now,'answer');assert.equal(answer.ok,true,answer.message);return q;
}
function playing(){const s=preparing();reserve(s);connectedAdvance(s,START);return s;}

test('시작을 누른 양쪽이 준비되면 공동 60초 문제풀이가 시작된다',()=>{
 const s=createDuel('a','왼쪽',17,NOW);joinDuel(s,'b','오른쪽',NOW);
 assert.equal(canPurchaseDuelTower(s),false);
 applyDuel(s,0,{type:'ready'},NOW,'r1');assert.equal(s.status,'waiting');
 assert.equal(applyDuel(s,0,{type:'prepare-quote',typeId:'basic'},NOW,'early').ok,false);
 applyDuel(s,1,{type:'ready'},NOW+2500,'r2');
 assert.equal(s.status,'preparing');assert.equal(s.preparationStartedAt,NOW+2500);assert.equal(s.preparationElapsed,0);assert.equal(s.startedAt,0);
 assert.equal(canPurchaseDuelTower(s),true);assert.ok(s.players.every(p=>p?.money===DUEL_START_MONEY));
});

test('수집 영웅 자동 출전은 준비 예산·타워 비축·60초 전투 전환을 바꾸지 않는다',()=>{
 const s=createDuel('a','왼쪽',17,NOW,1,{rewardHeroes:['hero-1-0','hero-3-2']});joinDuel(s,'b','오른쪽',NOW,1);
 assert.equal(applyDuel(s,0,{type:'ready',heroId:'hero-3-2'},NOW,'hero-ready').ok,true);
 assert.equal(applyDuel(s,1,{type:'ready'},NOW,'other-ready').ok,true);
 assert.equal(s.status,'preparing');assert.equal(s.enemies.length,1);assert.equal(s.enemies[0].hero,'hero-3-2');
 const hero=structuredClone(s.enemies[0]),q=reserve(s),budget=DUEL_START_MONEY-q.cost;
 connectedAdvance(s,NOW+30000);assert.equal(s.players[0].money,budget);assert.equal(s.players[0].stock.basic,1);assert.deepEqual(s.enemies[0],hero);
 connectedAdvance(s,START);assert.equal(s.status,'playing');assert.equal(s.startedAt,START);assert.equal(s.elapsed,0);
 assert.equal(s.players[0].money,0);assert.equal(s.players[0].stock.basic,1);assert.deepEqual(s.enemies[0],hero);
 assert.equal(applyDuel(s,0,{type:'build',typeId:'basic',x:3,y:2},START,'stock').ok,true);
 assert.equal(s.players[0].money,0);assert.equal(s.players[0].stock.basic,0);assert.equal(s.players[0].quote,null);
});

test('타워 선택 후 가격 뺄셈 정답마다 설치 대신 비축이 한 개 늘어난다',()=>{
 const s=preparing(),p=s.players[0];
 assert.equal(applyDuel(s,0,{type:'prepare-quote',typeId:'basic'},NOW,'basic').ok,true);
 const q=p.quote!;assert.equal(q.x,-1);assert.equal(q.y,-1);assert.equal(q.purpose,'preparation');assert.equal(q.expires,START);
 const before=structuredClone(p);
 assert.equal(applyDuel(s,0,{type:'answer',nonce:q.nonce,answer:'0'},NOW,'wrong').ok,false);
 assert.equal(p.money,before.money);assert.deepEqual(p.stock,before.stock);assert.equal(p.towers.length,0);assert.equal(p.wrongQuestions.length,1);
 assert.equal(applyDuel(s,0,{type:'answer',nonce:q.nonce,answer:numberText(q.before-q.cost)},NOW,'answer').ok,true);
 assert.equal(p.money,q.wallet-q.cost);assert.equal(p.stock.basic,1);assert.equal(p.towers.length,0);assert.equal(p.quote,null);
 reserve(s,'basic','basic-2');reserve(s,'double','double');
 assert.equal(p.stock.basic,2);assert.equal(p.stock.double,1);assert.equal(p.purchases,3);
 assert.deepEqual(s.players[1]!.stock,{});assert.equal(s.players[1]!.money,DUEL_START_MONEY);
 assert.equal(applyDuel(s,0,{type:'answer',nonce:q.nonce,answer:numberText(q.before-q.cost)},NOW,'repeat').ok,false);
});

test('준비 중에는 설치와 전투가 멈추고 타워 선택에는 좌표가 필요 없다',()=>{
 const s=preparing();reserve(s);
 assert.equal(applyDuel(s,0,{type:'build',typeId:'basic',x:3,y:2},NOW,'build').ok,false);
 s.players[0].egg=1;
 assert.equal(applyDuel(s,0,{type:'hatch',heroId:'hero-1-0'},NOW,'hatch').ok,false);
 connectedAdvance(s,NOW+59999);
 assert.equal(s.status,'preparing');assert.equal(s.preparationElapsed,59.999);assert.equal(s.elapsed,0);assert.equal(s.wave,0);
 assert.equal(s.enemies.length,0);assert.equal(s.shots.length,0);assert.equal(s.players[0].towers.length,0);assert.equal(s.players[0].stock.basic,1);
});

test('60초가 끝나면 양쪽 코인과 열린 견적을 비우고 전투 시간 0부터 시작한다',()=>{
 const s=preparing();reserve(s);
 assert.equal(applyDuel(s,1,{type:'prepare-quote',typeId:'double'},NOW+55000,'open').ok,true);
 s.players[0].escrow=777;s.players[1]!.escrow=333;
 connectedAdvance(s,START);
 assert.equal(s.status,'playing');assert.equal(s.preparationElapsed,60);assert.equal(s.startedAt,START);assert.equal(s.elapsed,0);assert.equal(s.wave,0);
 assert.ok(s.players.every(p=>p?.money===0&&p.escrow===0&&p.quote===null));
 assert.equal(s.players[0].stock.basic,1);assert.deepEqual(s.players[1]!.stock,{});assert.equal(s.enemies.length,0);
});

test('호스트 틱이 늦게 도착해도 60초 경계 이후 시간만 전투에 반영한다',()=>{
 const s=preparing();connectedAdvance(s,START+2000);
 assert.equal(s.status,'playing');assert.equal(s.startedAt,START);assert.ok(Math.abs(s.elapsed-2)<1e-8);assert.equal(s.wave,0);
 connectedAdvance(s,START+8000);assert.equal(s.enemies.length,2);assert.equal(s.wave,1);
});

test('60초 경계에 도착한 정답은 비축을 추가하지 않는다',()=>{
 const s=preparing();applyDuel(s,0,{type:'prepare-quote',typeId:'basic'},NOW,'late');const q=s.players[0].quote!;
 s.players.forEach(p=>p!.lastSeen=START);
 const result=applyDuel(s,0,{type:'answer',nonce:q.nonce,answer:numberText(q.before-q.cost)},START,'late-answer');
 assert.equal(result.ok,false);assert.equal(s.status,'playing');assert.equal(s.players[0].money,0);assert.deepEqual(s.players[0].stock,{});assert.equal(s.players[0].quote,null);
});

test('전투 중 비축 타워는 코인 없이 즉시 설치하고 재고부터 소비한다',()=>{
 const s=playing(),p=s.players[0];p.money=555;
 assert.equal(duelBuildCost(s,0,'basic'),0);
 assert.equal(applyDuel(s,0,{type:'build',typeId:'basic',x:3,y:2},START,'stock').ok,true);
 assert.equal(p.stock.basic,0);assert.equal(p.money,555);assert.equal(p.quote,null);assert.equal(p.towers.length,1);
 assert.equal(p.towers[0].cost,0);assert.equal(p.towers[0].prepared,true);
 const cost=duelBuildCost(s,0,'basic');assert.ok(cost>0);
 assert.equal(applyDuel(s,0,{type:'build',typeId:'basic',x:4,y:2},START,'cash').ok,true);
 assert.equal(p.money,555-cost);assert.equal(p.towers.length,2);assert.equal(p.towers[1].prepared,undefined);assert.equal(p.quote,null);
 assert.equal(applyDuel(s,0,{type:'prepare-quote',typeId:'basic'},START,'problem').ok,false);
 assert.equal(applyDuel(s,0,{type:'quote',typeId:'basic',x:5,y:2},START,'legacy-problem').ok,false);
});

test('전투 처치 코인은 즉시 지급되고 그 코인으로 문제 없이 추가 설치한다',()=>{
 const s=playing(),p=s.players[0];applyDuel(s,0,{type:'build',typeId:'basic',x:3,y:2},START,'first');
 s.enemies=[{id:900,owner:1,target:0,hero:null,level:1,hp:100,max:100,x:3,y:3,slow:0,stun:0,hits:0}];
 connectedAdvance(s,START+100);
 assert.equal(s.enemies.length,0);assert.ok(p.money>0);assert.equal(p.escrow,0);assert.equal(p.quote,null);
 const earned=p.money,cost=duelBuildCost(s,0,'basic');assert.ok(earned>=cost);
 assert.equal(applyDuel(s,0,{type:'build',typeId:'basic',x:4,y:2},START+100,'earned').ok,true);
 assert.equal(p.money,earned-cost);assert.equal(p.quote,null);assert.equal(p.towers.length,2);
});

test('잘못된 설치 칸과 부족한 코인은 재고와 코인을 소모하지 않는다',()=>{
 const s=playing(),p=s.players[0];
 for(const [x,y] of [[13,2],[3,3],[3.5,2],[3,-1]])assert.equal(applyDuel(s,0,{type:'build',typeId:'basic',x,y},START,'invalid').ok,false);
 assert.equal(p.stock.basic,1);assert.equal(p.money,0);assert.equal(p.towers.length,0);
 assert.equal(applyDuel(s,0,{type:'build',typeId:'double',x:4,y:2},START,'poor').ok,false);
 assert.equal(applyDuel(s,0,{type:'build',typeId:'basic',x:3,y:2},START,'valid').ok,true);
 p.stock.basic=1;assert.equal(applyDuel(s,0,{type:'build',typeId:'basic',x:3,y:2},START,'occupied').ok,false);assert.equal(p.stock.basic,1);
});

test('비축 타워 회수는 코인을 만들지 않고 재고를 복구한다',()=>{
 const s=playing(),p=s.players[0];
 for(let i=0;i<5;i++){
  assert.equal(applyDuel(s,0,{type:'build',typeId:'basic',x:3,y:2},START,`build-${i}`).ok,true);
  assert.equal(applyDuel(s,0,{type:'sell',towerId:p.towers[0].id},START,`sell-${i}`).ok,true);
  assert.equal(p.stock.basic,1);assert.equal(p.money,0);assert.equal(p.towers.length,0);
 }
 p.stock.basic=0;p.money=500;
 const cost=duelBuildCost(s,0,'basic');applyDuel(s,0,{type:'build',typeId:'basic',x:3,y:2},START,'cash');assert.equal(p.money,500-cost);
 applyDuel(s,0,{type:'sell',towerId:p.towers[0].id},START,'cash-sell');assert.equal(p.money,500);assert.equal(p.stock.basic,0);
});

test('비축은 배치 제한보다 더 모을 수 있지만 전투 타워 14개와 바늘탑 3개 제한은 유지된다',()=>{
 const s=preparing(2),p=s.players[0];
 for(let i=0;i<4;i++)reserve(s,'needle',`needle-${i}`);
 assert.equal(p.stock.needle,4);assert.equal(p.towers.length,0);connectedAdvance(s,START);
 for(let i=0;i<3;i++)assert.equal(applyDuel(s,0,{type:'build',typeId:'needle',x:3+i,y:2},START,`needle-build-${i}`).ok,true);
 assert.equal(applyDuel(s,0,{type:'build',typeId:'needle',x:6,y:2},START,'fourth').ok,false);assert.equal(p.stock.needle,1);
 p.stock.basic=20;
 for(const [x,y] of [[1,0],[2,0],[3,0],[4,0],[5,0],[6,0],[7,0],[8,0],[9,0],[10,0],[1,1]])assert.equal(applyDuel(s,0,{type:'build',typeId:'basic',x,y},START,'basic').ok,true);
 assert.equal(p.towers.length,14);assert.equal(p.stock.basic,9);
 assert.equal(applyDuel(s,0,{type:'build',typeId:'basic',x:2,y:1},START,'fifteenth').ok,false);assert.equal(p.stock.basic,9);
});

test('준비 견적 취소와 오답은 다른 플레이어의 문제와 예산을 바꾸지 않는다',()=>{
 const s=preparing();applyDuel(s,0,{type:'prepare-quote',typeId:'basic'},NOW,'left');applyDuel(s,1,{type:'prepare-quote',typeId:'double'},NOW,'right');
 const right=structuredClone(s.players[1]);applyDuel(s,0,{type:'answer',nonce:'left',answer:'0'},NOW,'wrong');applyDuel(s,0,{type:'cancel'},NOW,'cancel');
 assert.equal(s.players[0].money,DUEL_START_MONEY);assert.deepEqual(s.players[0].stock,{});assert.deepEqual(s.players[1],right);
});

test('준비는 12종을 모두 선택하고 문제 난도와 가격은 공동 학습 레벨을 따른다',()=>{
 for(const learningLevel of [1,6]){
  const s=preparing(learningLevel);assert.equal(duelTowerLevel(s),learningLevel);
  for(const type of TOWERS){
   assert.equal(canUseDuelTower(s,0,type.id),true);
   const cost=towerPrice(type,s.players[0].money,learningLevel,s.players[0].purchaseVariation);
   assert.equal(duelBuildCost(s,0,type.id),cost);
   assert.equal(applyDuel(s,0,{type:'prepare-quote',typeId:type.id},NOW,`type-${type.id}`).ok,true);
   assert.equal(s.players[0].quote!.cost,cost);assert.equal(s.players[0].quote!.digits,learningLevel===1?1:2);
   applyDuel(s,0,{type:'cancel'},NOW,'cancel');
  }
 }
});

test('상위 비축 타워는 전투 레벨과 관계없이 배치하고 이후 코인 구매는 전투 해금을 따른다',()=>{
 const s=preparing(10),p=s.players[0];reserve(s,'rune','rune');connectedAdvance(s,START);
 assert.equal(duelTowerLevel(s),1);assert.equal(canUseDuelTower(s,0,'rune'),true);assert.equal(duelBuildCost(s,0,'rune'),0);
 assert.equal(applyDuel(s,0,{type:'build',typeId:'rune',x:3,y:2},START,'prepared-rune').ok,true);
 assert.equal(p.stock.rune,0);p.money=99999;
 assert.equal(canUseDuelTower(s,0,'rune'),false);
 assert.equal(applyDuel(s,0,{type:'build',typeId:'rune',x:4,y:2},START,'locked-rune').ok,false);
 assert.equal(p.money,99999);assert.equal(canUseDuelTower(s,0,'basic'),true);
 s.elapsed=210;assert.equal(canUseDuelTower(s,0,'rune'),true);
 assert.equal(applyDuel(s,0,{type:'build',typeId:'rune',x:4,y:2},START,'unlocked-rune').ok,true);
 assert.equal(p.money,99999-duelBuildCost(s,0,towerType('rune')!.id));
});

test('준비 중 다시 시작하거나 취소를 반복해도 60초 마감과 예산은 늘어나지 않는다',()=>{
 const s=preparing(),p=s.players[0];
 for(let i=0;i<10;i++){
  assert.equal(applyDuel(s,0,{type:'ready'},NOW+i*100,'ready-again').ok,false);
  assert.equal(applyDuel(s,0,{type:'prepare-quote',typeId:'basic'},NOW+i*100,`quote-${i}`).ok,true);
  assert.equal(p.quote!.expires,START);applyDuel(s,0,{type:'cancel'},NOW+i*100,'cancel');
 }
 assert.equal(s.preparationStartedAt,NOW);assert.equal(p.money,DUEL_START_MONEY);assert.deepEqual(p.stock,{});
 connectedAdvance(s,NOW+30000);advanceDuel(s,NOW+20000);
 assert.equal(s.preparationElapsed,30);assert.equal(s.updatedAt,NOW+30000);
 connectedAdvance(s,START);assert.equal(s.status,'playing');assert.equal(s.startedAt,START);assert.equal(p.money,0);
});

test('전투 레벨이 오른 뒤 코인으로 산 타워를 회수해도 지불한 원가만 반환한다',()=>{
 const s=playing(),p=s.players[0];p.stock.basic=0;p.money=1000;
 const original=duelBuildCost(s,0,'basic');assert.equal(applyDuel(s,0,{type:'build',typeId:'basic',x:3,y:2},START,'cash').ok,true);
 const tower=p.towers[0];s.elapsed=210;assert.ok(duelBuildCost(s,0,'basic')>original);
 assert.equal(applyDuel(s,0,{type:'sell',towerId:tower.id},START,'later-sell').ok,true);
 assert.equal(p.money,1000);assert.equal(p.stock.basic,0);assert.equal(p.towers.length,0);
});
