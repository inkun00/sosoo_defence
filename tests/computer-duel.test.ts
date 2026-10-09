import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ComputerPeer,additionSlots,strategicDuelCells} from '../src/multiplayer/computer-peer';
import {COMPUTER_OPPONENTS,computerOpponent} from '../src/multiplayer/computer-opponents';
import {DUEL_START_MONEY,DUEL_PREPARATION_SECONDS,FLAME_MAX,duelBuildCost,applyDuel,createDuel,joinDuel,advanceDuel,canPurchaseDuelTower,validDuelCell} from '../src/multiplayer/duel';
import {DUEL_MAPS,duelRoadCell} from '../src/multiplayer/duel-maps';
import {numberText,recipe} from '../src/math';
import {simulateComputerDuel} from '../tools/computer-duel-simulation';

function local(level=1){let now=100000;const peer=new ComputerPeer({uid:'student',name:'수호자'},level,{seed:912,clock:()=>now,autoTick:false});return {peer,get now(){return now;},advance(ms:number){now+=ms;peer.step(now);},run(ms:number){for(let passed=0;passed<ms;){const dt=Math.min(100,ms-passed);passed+=dt;now+=dt;peer.step(now);}}};}
function stockTotal(stock:Record<string,number>){return Object.values(stock).reduce((n,count)=>n+count,0);}
async function prepareTower(peer:ComputerPeer,typeId='basic'){
 assert.ok((await peer.send({type:'prepare-quote',typeId})).ok);const quote=peer.state.players[0].quote!;
 assert.ok((await peer.send({type:'answer',nonce:quote.nonce,answer:numberText(quote.before-quote.cost)})).ok);
}

test('컴퓨터 상대 10명은 동일한 시작 예산·불꽃·문제 순서와 선택 레벨을 사용한다',()=>{
 assert.equal(COMPUTER_OPPONENTS.length,10);assert.equal(new Set(COMPUTER_OPPONENTS.map(o=>o.id)).size,10);
 for(let level=1;level<=10;level++){
  const {peer}=local(level),s=peer.state;
  assert.equal(peer.definition.level,level);assert.equal(s.learningLevel,level);assert.equal(s.status,'waiting');assert.equal(s.players[1]!.ready,true);
  assert.deepEqual(s.players[0].board,s.players[1]!.board);assert.ok(s.players.every(p=>p!.money===DUEL_START_MONEY&&p!.flame===FLAME_MAX&&stockTotal(p!.stock)===0));
  const slots=additionSlots(s.players[1]!.board)!;assert.ok(slots);assert.equal(new Set(slots).size,3);assert.ok(recipe(...slots.map(i=>s.players[1]!.board[i]) as [number,number,number],'+'));
  assert.ok(s.players[0].board.every(n=>n%10===0));peer.dispose();
 }
 assert.equal(computerOpponent(-10).level,1);assert.equal(computerOpponent(99).level,10);
});

test('컴퓨터 대전은 준비 버튼을 누르기 전 구매·문제풀이·선행 설치를 막는다',async()=>{
 for(let level=1;level<=10;level++){
  const f=local(level),s=f.peer.state,boards=s.players.map(p=>[...p!.board]);
  assert.equal(canPurchaseDuelTower(s),false);assert.equal((await f.peer.send({type:'prepare-quote',typeId:'basic'})).ok,false);
  assert.equal(applyDuel(s,1,{type:'build',x:14,y:2,typeId:'basic'},f.now,'cpu-early').ok,false);f.advance(121800);
  assert.equal(s.status,'waiting');assert.equal(s.preparationElapsed,0);assert.equal(s.elapsed,0);assert.equal(s.wave,0);assert.deepEqual(s.players.map(p=>p!.board),boards);
  for(const p of s.players){assert.equal(p!.money,DUEL_START_MONEY);assert.equal(p!.egg,0);assert.equal(p!.purchases,0);assert.equal(p!.quote,null);assert.deepEqual(p!.towers,[]);assert.equal(stockTotal(p!.stock),0);}
  f.peer.dispose();
 }
});

test('CPU도 준비 1분 동안 자신의 난이도별 계산 속도로 타워를 모으고 전투는 진행하지 않는다',async()=>{
 const counts:number[]=[];
 for(let level=1;level<=10;level++){
  const f=local(level),s=f.peer.state,p=s.players[1]!;await f.peer.send({type:'ready'});assert.equal(s.status,'preparing');
  f.run(1799);assert.equal(p.quote,null);f.advance(1);assert.ok(p.quote);assert.equal(f.peer.opponent.mood,'thinking');
  f.run(f.peer.definition.thinkMs-1);assert.equal(stockTotal(p.stock),0);f.advance(1);assert.equal(stockTotal(p.stock),1);assert.equal(f.peer.opponent.mood,'cast');
  f.run(59999-(f.now-s.preparationStartedAt));assert.equal(s.status,'preparing');assert.equal(s.elapsed,0);assert.equal(s.wave,0);assert.equal(s.enemies.length,0);assert.equal(p.egg,0);assert.equal(p.solved,0);assert.equal(p.towers.length,0);
  counts.push(stockTotal(p.stock));assert.ok(p.money<DUEL_START_MONEY);assert.ok(p.purchases>0);assert.equal(p.wrongQuestions.length,0);f.peer.dispose();
 }
 assert.ok(counts[9]>counts[0],`상위 CPU가 더 많은 타워를 준비한다: ${counts.join(', ')}`);
});

test('60초 뒤 양쪽 코인은 0이고 모아 둔 타워는 문제 없이 즉시 설치한다',async()=>{
 const f=local(6),s=f.peer.state,p=s.players[0];await f.peer.send({type:'ready'});await prepareTower(f.peer);assert.equal(p.stock.basic,1);assert.equal(p.towers.length,0);
 assert.equal((await f.peer.send({type:'build',typeId:'basic',x:4,y:2})).ok,false);f.run(60000);
 assert.equal(s.status,'playing');assert.equal(s.preparationElapsed,DUEL_PREPARATION_SECONDS);assert.ok(s.players.every(player=>player!.money===0&&player!.escrow===0&&player!.quote===null));
 assert.equal((await f.peer.send({type:'prepare-quote',typeId:'basic'})).ok,false);assert.equal((await f.peer.send({type:'quote',typeId:'basic',x:4,y:2})).ok,false);
 assert.ok((await f.peer.send({type:'build',typeId:'basic',x:4,y:2})).ok);assert.equal(p.towers.length,1);assert.equal(p.stock.basic,0);assert.equal(p.money,0);assert.equal(p.quote,null);
 f.run(1800);assert.equal(s.players[1]!.towers.length,1);assert.equal(s.players[1]!.quote,null);assert.equal(f.peer.opponent.mood,'cast');f.peer.dispose();
});

test('온라인과 컴퓨터 대전 모두 동일한 1분 문제풀이와 0코인 전투 규칙을 사용한다',()=>{
 const now=100000,s=createDuel('online','수호자',17,now);joinDuel(s,'guest','상대',now);
 assert.equal(canPurchaseDuelTower(s),false);applyDuel(s,0,{type:'ready'},now,'ready-a');applyDuel(s,1,{type:'ready'},now,'ready-b');assert.equal(s.status,'preparing');
 assert.ok(applyDuel(s,0,{type:'prepare-quote',typeId:'basic'},now,'online-quote').ok);const q=s.players[0].quote!;
 assert.ok(applyDuel(s,0,{type:'answer',nonce:q.nonce,answer:numberText(q.before-q.cost)},now,'online-answer').ok);assert.equal(s.players[0].stock.basic,1);assert.equal(s.players[0].towers.length,0);
 for(const p of s.players)p!.lastSeen=now+60000;advanceDuel(s,now+60000);assert.equal(s.status,'playing');assert.ok(s.players.every(p=>p!.money===0));
 assert.ok(applyDuel(s,0,{type:'build',typeId:'basic',x:4,y:2},now+60000,'online-build').ok);assert.equal(s.players[0].towers.length,1);
});

test('오래 대기해도 준비와 전투의 CPU 행동 타이머는 각 단계가 시작된 시점부터 센다',async()=>{
 const f=local(10),s=f.peer.state,p=s.players[1]!;f.advance(120000);await f.peer.send({type:'ready'});
 f.advance(1799);assert.equal(p.quote,null);assert.equal(p.egg,0);f.advance(1);assert.ok(p.quote);f.run(58200);assert.equal(s.status,'playing');
 f.advance(1799);assert.equal(p.towers.length,0);assert.equal(p.egg,0);f.advance(1);assert.equal(p.towers.length,1);assert.equal(p.quote,null);f.peer.dispose();
});

test('전투 중 처치한 몬스터의 코인으로 타워를 즉시 사고 전장과 CPU는 계속 움직인다',async()=>{
 const f=local(6),peer=f.peer,s=peer.state,p=s.players[0];await peer.send({type:'ready'});await prepareTower(peer);f.run(60000);
 assert.ok((await peer.send({type:'build',typeId:'basic',x:4,y:2})).ok);
 s.enemies.push({id:9000,owner:1,target:0,hero:null,level:1,hp:100,max:100,x:4,y:3,slow:0,stun:0,hits:0});f.advance(100);assert.ok(p.money>0);
 const cost=duelBuildCost(s,0,'basic');assert.ok(p.money>=cost);const money=p.money;assert.ok((await peer.send({type:'build',typeId:'basic',x:6,y:2})).ok);assert.equal(p.money,money-cost);assert.equal(p.quote,null);
 f.run(10000);const enemy=s.enemies.find(e=>e.target===0)!,x=enemy.x,towers=s.players[1]!.towers.length;f.run(12000);assert.ok(s.elapsed>=22);assert.ok(enemy.x<x);assert.ok(s.players[1]!.towers.length>=towers);assert.equal(s.players[1]!.quote,null);
 peer.dispose();const elapsed=s.elapsed;f.advance(30000);assert.equal(s.elapsed,elapsed);await assert.rejects(()=>peer.send({type:'ready'}));
});

test('컴퓨터 표정은 준비 계산·전투 설치·불꽃 피격·승패에 맞춰 바뀐다',async()=>{
 const f=local(10),peer=f.peer,s=peer.state;assert.equal(peer.opponent.mood,'idle');await peer.send({type:'ready'});f.advance(1800);assert.equal(peer.opponent.mood,'thinking');f.advance(peer.definition.thinkMs);assert.equal(peer.opponent.mood,'cast');
 f.run(60000-(f.now-s.preparationStartedAt));f.advance(1800);assert.equal(peer.opponent.mood,'cast');
 s.enemies.push({id:9999,owner:0,target:1,hero:null,level:1,hp:500,max:500,x:22.99,slow:0,stun:0,hits:0});f.advance(100);assert.equal(peer.opponent.mood,'hurt');
 await peer.send({type:'surrender'});assert.equal(s.status,'finished');assert.equal(peer.opponent.mood,'victory');peer.dispose();
});

test('무작위 판의 덧셈 해답 탐색은 같은 값을 가진 서로 다른 블럭을 사용한다',()=>{
 assert.deepEqual(additionSlots([100,100,200]),[0,1,2]);assert.equal(additionSlots([100,200,400]),null);assert.equal(additionSlots([100,200]),null);
});

test('선택한 10종 맵에서 컴퓨터도 같은 길과 설치 규칙을 사용하고 좌우 배치 전략이 대칭이다',()=>{
 for(const map of DUEL_MAPS){
  const peer=new ComputerPeer({uid:'student',name:'수호자'},6,{seed:912,clock:()=>100000,autoTick:false,mapId:map.id}),s=peer.state;
  assert.equal(s.mapId,map.id);assert.equal(s.status,'waiting');assert.equal(s.players[1]!.towers.length,0);assert.equal(s.players[1]!.quote,null);
  for(const unit of [10,200,2000]){
   const left=strategicDuelCells(s,0,unit),right=strategicDuelCells(s,1,unit);assert.ok(left.length>=6,`${map.id}에는 타워 설치 공간이 충분해야 한다`);
   assert.deepEqual(left.map(c=>({x:23-c.x,y:c.y})),right,`${map.id}: 양쪽은 동일한 경로 배치 전략`);
   for(const [side,cells]of [[0,left],[1,right]]as const)for(const c of cells){assert.ok(validDuelCell(s,side,c.x,c.y));assert.equal(duelRoadCell(map.id,c.x,c.y),false);}
  }
  peer.dispose();
 }
});

test('10종 맵 × CPU 10레벨의 100대전이 60초 준비·재고 배치·처치 코인·합성을 거쳐 끝난다',()=>{
 const reports=DUEL_MAPS.flatMap(map=>Array.from({length:10},(_,i)=>simulateComputerDuel(i+1,912,'baseline',map.id)));assert.equal(reports.length,100);
 for(const r of reports){
  const label=`${r.mapId} / Lv.${r.level}`;assert.equal(r.status,'finished',label);assert.equal(r.preparationSeconds,60);assert.ok(r.seconds>0&&r.seconds<=300);assert.ok(r.totalSeconds>60&&r.totalSeconds<=360);assert.ok(r.zeroCombatCoins,label);assert.ok(r.legalEconomy,`${label}: 코인·재고·설치 제한·전투 문제 없음`);
  assert.ok(r.playerPrepared>=1&&r.computerPrepared>=1,label);assert.ok(r.playerStockPlaced>=1&&r.computerStockPlaced>=1,`${label}: 양쪽 모두 재고 배치`);assert.ok(r.playerEarned>0&&r.computerEarned>0,`${label}: 처치 보상`);
  assert.ok(r.computerSolved>=1);assert.ok(r.computerHatched);assert.ok(r.traversedBend);assert.ok(r.waves>=3);assert.ok(r.playerFlame>=0&&r.playerFlame<=FLAME_MAX);assert.ok(r.computerFlame>=0&&r.computerFlame<=FLAME_MAX);
 }
 assert.ok(reports.some(r=>r.playerCashBuilt>0));assert.ok(reports.some(r=>r.computerCashBuilt>0));
 for(let level=1;level<=10;level++){const r=reports.find(r=>r.level===level)!;assert.ok(r.computerPrepared<=COMPUTER_OPPONENTS[level-1].maxTowers);}
 assert.ok(reports.find(r=>r.level===10)!.computerPrepared>reports.find(r=>r.level===1)!.computerPrepared);
});

test('다섯 영웅 효과를 적용한 준비 경제의 기준 전략과 CPU 난이도별 차이를 기록한다',()=>{
 for(const seed of [17,91,912]){
  const levels=[1,4,5,9,10],matches=levels.map(level=>simulateComputerDuel(level,seed));
  assert.deepEqual(matches.map(m=>m.winner),[0,0,null,null,1]);
  assert.ok(matches.every(m=>m.status==='finished'&&m.legalEconomy&&m.zeroCombatCoins));
  assert.ok(matches[4].computerSolved>matches[0].computerSolved);assert.ok(matches[4].computerPurchased>matches[0].computerPurchased);
  const burst=simulateComputerDuel(10,seed,'burst');assert.equal(burst.winner,null);assert.ok(burst.playerPrepared>matches[4].playerPrepared);assert.ok(burst.playerCashBuilt>matches[4].playerCashBuilt);
 }
});

test('준비 문제 취소·1분 만료·경기 종료 뒤 갱신에서 견적과 타이머가 정리된다',async()=>{
 const f=local(5),peer=f.peer,s=peer.state;await peer.send({type:'ready'});assert.ok((await peer.send({type:'prepare-quote',typeId:'basic'})).ok);const initial=s.players[0].money;
 assert.ok((await peer.send({type:'cancel'})).ok);assert.equal(s.players[0].quote,null);assert.equal(s.players[0].money,initial);
 assert.ok((await peer.send({type:'prepare-quote',typeId:'basic'})).ok);const nonce=s.players[0].quote!.nonce;f.run(60100);assert.equal(s.players[0].quote,null);assert.equal(s.players[0].money,0);assert.equal(stockTotal(s.players[0].stock),0);
 assert.equal((await peer.send({type:'answer',nonce,answer:'8.7'})).ok,false);await peer.send({type:'surrender'});let events=0;peer.onState=()=>{events++;};peer.dispose();f.advance(10000);assert.equal(events,0);
});
