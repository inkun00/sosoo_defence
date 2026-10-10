import {test} from 'node:test';
import assert from 'node:assert/strict';
import {advanceDuel,applyDuel,canPurchaseDuelTower,canUseDuelTower,createDuel,duelBuildCost,duelTowerLevel,joinDuel,DUEL_PREPARATION_SECONDS,DUEL_START_MONEY,DuelState} from '../src/multiplayer/duel';
import {numberText,recipe} from '../src/math';
import {TOWERS,towerPrice} from '../src/towers';

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
function fuse(s:DuelState,now=NOW){
 const p=s.players[0];
 for(let a=0;a<16;a++)for(let b=0;b<16;b++)for(let c=0;c<16;c++)if(a!==b&&a!==c&&b!==c&&recipe(p.board[a],p.board[b],p.board[c],'+'))return applyDuel(s,0,{type:'fuse',round:p.round,slots:[a,b,c],operation:'+'},now,'fusion');
 throw Error('No addition recipe');
}

test('준비 중 타워 문제를 열어 둔 채 영웅 문제와 부화를 선택하고 같은 영웅을 여러 개 모은다',()=>{
 const s=preparing(),p=s.players[0];
 assert.equal(applyDuel(s,0,{type:'prepare-quote',typeId:'basic'},NOW,'tower').ok,true);const quote=p.quote!;
 assert.equal(fuse(s).ok,true);assert.equal(p.egg,1);assert.equal(p.quote,quote);
 assert.equal(applyDuel(s,0,{type:'hatch',heroId:'hero-1-0'},NOW,'hero-1').ok,true);assert.equal(p.egg,0);assert.equal(s.enemies.length,0);
 assert.equal(fuse(s).ok,true);assert.equal(applyDuel(s,0,{type:'hatch',heroId:'hero-1-0'},NOW,'hero-2').ok,true);
 assert.equal(p.heroStock?.['hero-1-0'],2);assert.equal(p.quote,quote);
 assert.equal(applyDuel(s,0,{type:'answer',nonce:quote.nonce,answer:numberText(quote.before-quote.cost)},NOW,'tower-answer').ok,true);
 assert.equal(p.stock.basic,1);assert.equal(p.heroStock?.['hero-1-0'],2);assert.equal(p.answeredQuestions,3);
 assert.equal(applyDuel(s,0,{type:'summon',heroId:'hero-1-0'},NOW,'early').ok,false);assert.equal(p.heroStock?.['hero-1-0'],2);
 connectedAdvance(s,START);assert.equal(s.enemies.length,0);
 assert.equal(fuse(s,START).ok,false);assert.equal(p.egg,0);assert.equal(p.heroStock?.['hero-1-0'],2);
 for(let remaining=1;remaining>=0;remaining--){
  assert.equal(applyDuel(s,0,{type:'summon',heroId:'hero-1-0'},START,`summon-${remaining}`).ok,true);
  assert.equal(p.heroStock?.['hero-1-0'],remaining);assert.equal(s.enemies.length,2-remaining);
 }
 assert.equal(applyDuel(s,0,{type:'summon',heroId:'hero-1-0'},START,'empty').ok,false);assert.equal(s.enemies.length,2);
 assert.ok(s.enemies.every(e=>e.owner===0&&e.target===1&&e.pathDistance===1));
});

test('120초 경계에서는 덧셈을 거부하고 남은 알은 전투에서 선택해 소환한다',()=>{
 const s=preparing(),p=s.players[0];assert.equal(fuse(s).ok,true);assert.equal(p.egg,1);
 s.players.forEach(player=>player!.lastSeen=START);
 assert.equal(fuse(s,START).ok,false);assert.equal(s.status,'playing');assert.equal(p.egg,1);assert.equal(p.solved,1);
 assert.equal(applyDuel(s,0,{type:'hatch',heroId:'hero-1-2'},START,'last-egg').ok,true);assert.equal(p.egg,0);assert.equal(s.enemies.length,1);assert.equal(s.enemies[0].hero,'hero-1-2');assert.equal(s.enemies[0].pathDistance,1);
 assert.deepEqual(p.heroStock,{});assert.equal(applyDuel(s,0,{type:'hatch',heroId:'hero-1-2'},START,'duplicate').ok,false);
});

test('영웅 재고가 없는 이전 상태와 길이 가득 찬 상태는 영웅 소환 자원을 소모하지 않는다',()=>{
 const s=playing(),p=s.players[0];delete p.heroStock;
 assert.equal(applyDuel(s,0,{type:'summon',heroId:'hero-1-0'},START,'legacy').ok,false);assert.equal(p.heroStock,undefined);
 p.heroStock={'hero-1-0':1};p.egg=1;s.enemies=Array.from({length:100},(_,id)=>({id:1000+id,owner:0,target:1,hero:null,level:1,hp:500,max:500,x:1,y:3,pathDistance:1,slow:0,stun:0,hits:0}));
 assert.equal(applyDuel(s,0,{type:'summon',heroId:'hero-1-0'},START,'crowded').ok,false);assert.equal(p.heroStock['hero-1-0'],1);
 assert.equal(applyDuel(s,0,{type:'hatch',heroId:'hero-1-0'},START,'crowded-egg').ok,false);assert.equal(p.egg,1);assert.equal(s.enemies.length,100);
});

test('시작을 누른 양쪽이 준비되면 공동 120초 문제풀이가 시작된다',()=>{
 const s=createDuel('a','왼쪽',17,NOW);joinDuel(s,'b','오른쪽',NOW);
 assert.equal(canPurchaseDuelTower(s),false);
 applyDuel(s,0,{type:'ready'},NOW,'r1');assert.equal(s.status,'waiting');
 assert.equal(applyDuel(s,0,{type:'prepare-quote',typeId:'basic'},NOW,'early').ok,false);
 applyDuel(s,1,{type:'ready'},NOW+2500,'r2');
 assert.equal(s.status,'preparing');assert.equal(s.preparationStartedAt,NOW+2500);assert.equal(s.preparationElapsed,0);assert.equal(s.startedAt,0);
 assert.equal(canPurchaseDuelTower(s),true);assert.ok(s.players.every(p=>p?.money===DUEL_START_MONEY));
});

test('수집 영웅은 준비와 전투 전환 때 대기하고 전투에서 선택한 때 출전한다',()=>{
 const s=createDuel('a','왼쪽',17,NOW,1,{rewardHeroes:['hero-1-0','hero-3-2']});joinDuel(s,'b','오른쪽',NOW,1);
 assert.equal(applyDuel(s,0,{type:'ready',heroId:'hero-3-2'},NOW,'hero-ready').ok,true);
 assert.equal(applyDuel(s,1,{type:'ready'},NOW,'other-ready').ok,true);
 assert.equal(s.status,'preparing');assert.equal(s.enemies.length,0);assert.equal(s.players[0].rewardUsed,false);
 assert.equal(applyDuel(s,0,{type:'summon-reward'},NOW,'early-reward').ok,false);
 const q=reserve(s),budget=DUEL_START_MONEY-q.cost;
 connectedAdvance(s,NOW+30000);assert.equal(s.players[0].money,budget);assert.equal(s.players[0].stock.basic,1);assert.equal(s.enemies.length,0);
 connectedAdvance(s,START);assert.equal(s.status,'playing');assert.equal(s.startedAt,START);assert.equal(s.elapsed,0);
 assert.equal(s.players[0].money,0);assert.equal(s.players[0].stock.basic,1);assert.equal(s.enemies.length,0);
 assert.equal(applyDuel(s,0,{type:'summon-reward'},START,'reward').ok,true);assert.equal(s.enemies.length,1);assert.equal(s.enemies[0].hero,'hero-3-2');assert.equal(s.players[0].rewardUsed,true);
 assert.equal(applyDuel(s,0,{type:'summon-reward'},START,'duplicate').ok,false);
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
 assert.equal(applyDuel(s,0,{type:'hatch',heroId:'hero-1-0'},NOW,'hatch').ok,true);assert.equal(s.players[0].heroStock?.['hero-1-0'],1);
 connectedAdvance(s,NOW+119999);
 assert.equal(s.status,'preparing');assert.equal(s.preparationElapsed,119.999);assert.equal(s.elapsed,0);assert.equal(s.wave,0);
 assert.equal(s.enemies.length,0);assert.equal(s.shots.length,0);assert.equal(s.players[0].towers.length,0);assert.equal(s.players[0].stock.basic,1);
});

test('120초가 끝나면 양쪽 코인과 열린 견적을 비우고 전투 시간 0부터 시작한다',()=>{
 const s=preparing();reserve(s);
 assert.equal(applyDuel(s,1,{type:'prepare-quote',typeId:'double'},NOW+55000,'open').ok,true);
 s.players[0].escrow=777;s.players[1]!.escrow=333;
 connectedAdvance(s,START);
 assert.equal(s.status,'playing');assert.equal(s.preparationElapsed,120);assert.equal(s.startedAt,START);assert.equal(s.elapsed,0);assert.equal(s.wave,0);
 assert.ok(s.players.every(p=>p?.money===0&&p.escrow===0&&p.quote===null));
 assert.equal(s.players[0].stock.basic,1);assert.deepEqual(s.players[1]!.stock,{});assert.equal(s.enemies.length,0);
});

test('호스트 틱이 늦게 도착해도 120초 경계 이후 시간만 전투에 반영한다',()=>{
 const s=preparing();connectedAdvance(s,START+2000);
 assert.equal(s.status,'playing');assert.equal(s.startedAt,START);assert.ok(Math.abs(s.elapsed-2)<1e-8);assert.equal(s.wave,0);
 connectedAdvance(s,START+8000);assert.equal(s.enemies.length,2);assert.equal(s.wave,1);
});

test('120초 경계에 도착한 정답은 비축을 추가하지 않는다',()=>{
 const s=preparing();applyDuel(s,0,{type:'prepare-quote',typeId:'basic'},NOW,'late');const q=s.players[0].quote!;
 s.players.forEach(p=>p!.lastSeen=START);
 const result=applyDuel(s,0,{type:'answer',nonce:q.nonce,answer:numberText(q.before-q.cost)},START,'late-answer');
 assert.equal(result.ok,false);assert.equal(s.status,'playing');assert.equal(s.players[0].money,0);assert.deepEqual(s.players[0].stock,{});assert.equal(s.players[0].quote,null);
});

test('전투 중 비축 타워만 코인 없이 즉시 설치하고 재고가 없으면 거부한다',()=>{
 const s=playing(),p=s.players[0];p.money=555;
 assert.equal(duelBuildCost(s,0,'basic'),0);
 assert.equal(applyDuel(s,0,{type:'build',typeId:'basic',x:3,y:2},START,'stock').ok,true);
 assert.equal(p.stock.basic,0);assert.equal(p.money,555);assert.equal(p.quote,null);assert.equal(p.towers.length,1);
 assert.equal(p.towers[0].cost,0);assert.equal(p.towers[0].prepared,true);
 assert.equal(duelBuildCost(s,0,'basic'),Infinity);
 assert.equal(applyDuel(s,0,{type:'build',typeId:'basic',x:4,y:2},START,'cash').ok,false);
 assert.equal(p.money,555);assert.equal(p.towers.length,1);assert.equal(p.quote,null);
 assert.equal(applyDuel(s,0,{type:'prepare-quote',typeId:'basic'},START,'problem').ok,false);
 assert.equal(applyDuel(s,0,{type:'quote',typeId:'basic',x:5,y:2},START,'legacy-problem').ok,false);
});

test('전투 처치는 점수만 올리고 코인이나 구매 기회를 만들지 않는다',()=>{
 const s=playing(),p=s.players[0];applyDuel(s,0,{type:'build',typeId:'basic',x:3,y:2},START,'first');
 s.enemies=[{id:900,owner:1,target:0,hero:null,level:1,hp:100,max:100,x:3,y:3,slow:0,stun:0,hits:0}];
 connectedAdvance(s,START+100);
 assert.equal(s.enemies.length,0);assert.equal(p.money,0);assert.ok((p.combatScore??0)>0);assert.equal(p.escrow,0);assert.equal(p.quote,null);
 assert.equal(applyDuel(s,0,{type:'build',typeId:'basic',x:4,y:2},START+100,'earned').ok,false);
 assert.equal(p.money,0);assert.equal(p.quote,null);assert.equal(p.towers.length,1);
});

test('잘못된 설치 칸과 부족한 재고는 재고와 코인을 소모하지 않는다',()=>{
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
 assert.equal(applyDuel(s,0,{type:'build',typeId:'basic',x:3,y:2},START,'cash').ok,false);assert.equal(p.money,500);assert.equal(p.stock.basic,0);
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

test('상위 비축 타워는 전투 레벨과 관계없이 배치하고 레벨이 올라가도 코인 구매는 거부한다',()=>{
 const s=preparing(10),p=s.players[0];reserve(s,'rune','rune');connectedAdvance(s,START);
 assert.equal(duelTowerLevel(s),1);assert.equal(canUseDuelTower(s,0,'rune'),true);assert.equal(duelBuildCost(s,0,'rune'),0);
 assert.equal(applyDuel(s,0,{type:'build',typeId:'rune',x:3,y:2},START,'prepared-rune').ok,true);
 assert.equal(p.stock.rune,0);p.money=99999;
 assert.equal(canUseDuelTower(s,0,'rune'),false);
 assert.equal(applyDuel(s,0,{type:'build',typeId:'rune',x:4,y:2},START,'locked-rune').ok,false);
 assert.equal(p.money,99999);assert.equal(canUseDuelTower(s,0,'basic'),false);
 s.elapsed=170;assert.equal(canUseDuelTower(s,0,'rune'),false);
 assert.equal(applyDuel(s,0,{type:'build',typeId:'rune',x:4,y:2},START,'unlocked-rune').ok,false);
 assert.equal(p.money,99999);
});

test('준비 중 다시 시작하거나 취소를 반복해도 120초 마감과 예산은 늘어나지 않는다',()=>{
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

test('이전 저장 상태의 타워를 회수해도 코인 대신 재고 한 개만 복구한다',()=>{
 const s=playing(),p=s.players[0];p.stock.basic=0;p.money=1000;
 const tower={id:500,typeId:'basic',x:3,y:2,unit:100,cost:100,enabled:true,cooldown:0};p.towers=[tower];s.elapsed=170;
 assert.equal(applyDuel(s,0,{type:'sell',towerId:tower.id},START,'later-sell').ok,true);
 assert.equal(p.money,1000);assert.equal(p.stock.basic,1);assert.equal(p.towers.length,0);
});
