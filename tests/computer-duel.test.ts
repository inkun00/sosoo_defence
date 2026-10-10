import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ComputerPeer,additionSlots,strategicDuelCells} from '../src/multiplayer/computer-peer';
import {COMPUTER_OPPONENTS,computerOpponent} from '../src/multiplayer/computer-opponents';
import {DUEL_START_MONEY,DUEL_PREPARATION_SECONDS,DUEL_SECONDS,DUEL_TOTAL_SECONDS,FLAME_MAX,duelBuildCost,applyDuel,createDuel,joinDuel,advanceDuel,canPurchaseDuelTower,validDuelCell} from '../src/multiplayer/duel';
import {DUEL_MAPS,duelRoadCell} from '../src/multiplayer/duel-maps';
import {decimalBoard} from '../src/multiplayer/decimal-boards';
import {numberText,recipe} from '../src/math';
import {simulateComputerDuel} from '../tools/computer-duel-simulation';
import {simulateDuelDifficulty,DUEL_AUDIT_POLICIES} from '../tools/audit-duel-difficulty';

function local(level=1,accountLevel=1){let now=100000;const peer=new ComputerPeer({uid:'student',name:'수호자',accountLevel},level,{seed:912,clock:()=>now,autoTick:false});return {peer,get now(){return now;},advance(ms:number){now+=ms;peer.step(now);},run(ms:number){for(let passed=0;passed<ms;){const dt=Math.min(100,ms-passed);passed+=dt;now+=dt;peer.step(now);}}};}
function stockTotal(stock:Record<string,number>){return Object.values(stock).reduce((n,count)=>n+count,0);}
async function prepareTower(peer:ComputerPeer,typeId='basic'){
 assert.ok((await peer.send({type:'prepare-quote',typeId})).ok);const quote=peer.state.players[0].quote!;
 assert.ok((await peer.send({type:'answer',nonce:quote.nonce,answer:numberText(quote.before-quote.cost)})).ok);
}

test('컴퓨터 상대 10명은 동일한 시작 예산·불꽃을 받고 자신의 레벨로 덧셈을 푼다',()=>{
 assert.equal(DUEL_START_MONEY,8800*2,'온라인과 CPU 양쪽의 준비 예산은 기존의 두 배다');
 assert.equal(COMPUTER_OPPONENTS.length,10);assert.equal(new Set(COMPUTER_OPPONENTS.map(o=>o.id)).size,10);
 for(let level=1;level<=10;level++){
  const {peer}=local(level),s=peer.state;
  assert.equal(peer.definition.level,level);assert.equal(s.learningLevel,level);assert.equal(s.status,'waiting');assert.equal(s.players[1]!.ready,true);
  assert.equal(s.players[0].accountLevel,1);assert.equal(s.players[1]!.accountLevel,level);
  assert.deepEqual(s.players[0].board,decimalBoard(912,0,1));assert.deepEqual(s.players[1]!.board,decimalBoard(912,0,level));assert.ok(s.players.every(p=>p!.money===DUEL_START_MONEY&&p!.flame===FLAME_MAX&&stockTotal(p!.stock)===0));
  const slots=additionSlots(s.players[1]!.board)!;assert.ok(slots);assert.equal(new Set(slots).size,3);assert.ok(recipe(...slots.map(i=>s.players[1]!.board[i]) as [number,number,number],'+'));
  assert.ok(s.players[0].board.every(n=>n%10===0));peer.dispose();
 }
 assert.equal(computerOpponent(-10).level,1);assert.equal(computerOpponent(99).level,10);
});

test('초급 대 고급 CPU와 고급 대 초급 CPU 모두 각자의 학습 레벨로 성장량을 모으고 전투에서 레벨 비용을 쓴다',async()=>{
 for(const [humanLevel,cpuLevel]of [[1,8],[8,1],[27,8]]){
  const f=local(cpuLevel,humanLevel),peer=f.peer,s=peer.state,p=s.players[0],cpu=s.players[1]!;
  assert.equal(peer.identity.accountLevel,humanLevel);assert.equal(p.accountLevel,humanLevel);assert.equal(cpu.accountLevel,cpuLevel);
  assert.equal(s.learningLevel,cpuLevel,'타워 준비 난이도는 선택한 CPU 레벨을 유지한다');
  assert.deepEqual(p.board,decimalBoard(912,0,humanLevel));assert.deepEqual(cpu.board,decimalBoard(912,0,cpuLevel));assert.notDeepEqual(p.board,cpu.board);
  await peer.send({type:'ready'});assert.equal(s.status,'preparing');
  for(let round=0;round<4;round++){
   const cpuBefore=structuredClone(cpu),board=[...p.board],slots=additionSlots(board)!;assert.ok(slots);
   assert.equal((await peer.send({type:'fuse',operation:'+',round:p.round,slots})).ok,true);
   assert.equal(p.round,round+1);assert.deepEqual(p.board,decimalBoard(912,p.round,humanLevel));assert.ok(p.board.every(n=>n%10===0));assert.deepEqual(cpu,cpuBefore);
   if(round===1){const before=[...p.board];assert.equal((await peer.send({type:'hatch',heroId:'hero-2-0'})).ok,false);assert.equal(p.egg,2);assert.deepEqual(p.board,before);assert.equal(stockTotal(p.heroStock??{}),0);assert.equal(s.enemies.length,0);}
  }
  assert.equal(p.accountLevel,humanLevel);f.run(peer.definition.fusionMs+100);assert.ok(cpu.solved>=1);
  assert.deepEqual(cpu.board,decimalBoard(912,cpu.round,cpuLevel));assert.deepEqual(p.board,decimalBoard(912,p.round,humanLevel));
  f.run(DUEL_PREPARATION_SECONDS*1000-(f.now-s.preparationStartedAt));assert.equal(p.egg,4);assert.equal(stockTotal(p.heroStock??{}),0);
  assert.ok((await peer.send({type:'hatch',heroId:'hero-2-0'})).ok);assert.equal(p.egg,2);
  assert.ok((await peer.send({type:'hatch',heroId:'hero-2-1'})).ok);assert.equal(p.egg,0);assert.equal(s.enemies.filter(e=>e.owner===0&&e.hero).length,2);peer.dispose();
 }
 const peer=new ComputerPeer({uid:'student',name:'수호자'},8,{seed:912,clock:()=>100000,autoTick:false});
 assert.equal(peer.identity.accountLevel,undefined);assert.equal(peer.state.players[0].accountLevel,1);assert.deepEqual(peer.state.players[0].board,decimalBoard(912,0,1));peer.dispose();
});

test('컴퓨터 대전은 준비 버튼을 누르기 전 구매·문제풀이·선행 설치를 막는다',async()=>{
 for(let level=1;level<=10;level++){
  const f=local(level),s=f.peer.state,boards=s.players.map(p=>[...p!.board]);
  assert.equal(canPurchaseDuelTower(s),false);assert.equal((await f.peer.send({type:'prepare-quote',typeId:'basic'})).ok,false);
  assert.equal(applyDuel(s,1,{type:'build',x:14,y:2,typeId:'basic'},f.now,'cpu-early').ok,false);f.advance(DUEL_PREPARATION_SECONDS*1000+1800);
  assert.equal(s.status,'waiting');assert.equal(s.preparationElapsed,0);assert.equal(s.elapsed,0);assert.equal(s.wave,0);assert.deepEqual(s.players.map(p=>p!.board),boards);
  for(const p of s.players){assert.equal(p!.money,DUEL_START_MONEY);assert.equal(p!.egg,0);assert.equal(p!.purchases,0);assert.equal(p!.quote,null);assert.deepEqual(p!.towers,[]);assert.equal(stockTotal(p!.stock),0);}
  f.peer.dispose();
 }
});

test('CPU도 준비 3분 내내 타워와 제한 없는 성장량을 모으고 부화나 전투는 진행하지 않는다',async()=>{
 const counts:number[]=[];
 for(let level=1;level<=10;level++){
  const f=local(level),s=f.peer.state,p=s.players[1]!;await f.peer.send({type:'ready'});assert.equal(s.status,'preparing');
  f.run(1799);assert.equal(p.quote,null);f.advance(1);assert.ok(p.quote);assert.equal(f.peer.opponent.mood,'thinking');
  f.run(f.peer.definition.thinkMs-1);assert.equal(stockTotal(p.stock),0);f.advance(1);assert.equal(stockTotal(p.stock),1);assert.equal(f.peer.opponent.mood,'cast');
  f.run(120000-(f.now-s.preparationStartedAt));const growthAtTwoMinutes=p.egg;assert.equal(s.status,'preparing');assert.equal(s.preparationElapsed,120);assert.equal(s.elapsed,0);assert.equal(s.enemies.length,0);
  f.run(DUEL_PREPARATION_SECONDS*1000-1-(f.now-s.preparationStartedAt));assert.equal(s.status,'preparing');assert.equal(s.elapsed,0);assert.equal(s.wave,0);assert.equal(s.enemies.length,0);assert.ok(p.solved>0);assert.equal(p.egg,p.solved);assert.ok(p.egg>growthAtTwoMinutes,'추가 준비 1분 동안 성장량을 더 모은다');assert.equal(stockTotal(p.heroStock??{}),0);assert.equal(p.towers.length,0);
  assert.equal(p.solved,Math.floor((DUEL_PREPARATION_SECONDS*1000-1)/f.peer.definition.fusionMs),'목표 영웅 레벨을 넘어서도 준비가 끝날 때까지 계산한다');
  if(level>=8)assert.ok(p.egg>10,'성장량을 레벨 10에서 제한하지 않는다');
  counts.push(stockTotal(p.stock));assert.ok(p.money<DUEL_START_MONEY);assert.ok(p.purchases>0);assert.equal(p.wrongQuestions.length,0);f.peer.dispose();
 }
 assert.ok(counts[9]>counts[0],`상위 CPU가 더 많은 타워를 준비한다: ${counts.join(', ')}`);
});

test('180초 뒤 양쪽 코인은 0이고 모아 둔 타워는 문제 없이 즉시 설치한다',async()=>{
 const f=local(6),s=f.peer.state,p=s.players[0];await f.peer.send({type:'ready'});await prepareTower(f.peer);assert.equal(p.stock.basic,1);assert.equal(p.towers.length,0);
 assert.equal((await f.peer.send({type:'build',typeId:'basic',x:4,y:2})).ok,false);f.run(DUEL_PREPARATION_SECONDS*1000);
 assert.equal(s.status,'playing');assert.equal(s.preparationElapsed,DUEL_PREPARATION_SECONDS);assert.ok(s.players.every(player=>player!.money===0&&player!.escrow===0&&player!.quote===null));
 assert.equal((await f.peer.send({type:'prepare-quote',typeId:'basic'})).ok,false);assert.equal((await f.peer.send({type:'quote',typeId:'basic',x:4,y:2})).ok,false);
 assert.ok((await f.peer.send({type:'build',typeId:'basic',x:4,y:2})).ok);assert.equal(p.towers.length,1);assert.equal(p.stock.basic,0);assert.equal(p.money,0);assert.equal(p.quote,null);
 f.run(1800);assert.equal(s.players[1]!.towers.length,1);assert.equal(s.players[1]!.quote,null);assert.equal(f.peer.opponent.mood,'cast');f.peer.dispose();
});

test('온라인과 컴퓨터 대전 모두 동일한 3분 문제풀이와 0코인 전투 규칙을 사용한다',()=>{
 const now=100000,s=createDuel('online','수호자',17,now);joinDuel(s,'guest','상대',now);
 assert.equal(canPurchaseDuelTower(s),false);applyDuel(s,0,{type:'ready'},now,'ready-a');applyDuel(s,1,{type:'ready'},now,'ready-b');assert.equal(s.status,'preparing');
 assert.ok(applyDuel(s,0,{type:'prepare-quote',typeId:'basic'},now,'online-quote').ok);const q=s.players[0].quote!;
 assert.ok(applyDuel(s,0,{type:'answer',nonce:q.nonce,answer:numberText(q.before-q.cost)},now,'online-answer').ok);assert.equal(s.players[0].stock.basic,1);assert.equal(s.players[0].towers.length,0);
 for(const p of s.players)p!.lastSeen=now+DUEL_PREPARATION_SECONDS*1000;advanceDuel(s,now+DUEL_PREPARATION_SECONDS*1000);assert.equal(s.status,'playing');assert.ok(s.players.every(p=>p!.money===0));
 assert.ok(applyDuel(s,0,{type:'build',typeId:'basic',x:4,y:2},now+DUEL_PREPARATION_SECONDS*1000,'online-build').ok);assert.equal(s.players[0].towers.length,1);
});

test('오래 대기해도 준비와 전투의 CPU 행동 타이머는 각 단계가 시작된 시점부터 센다',async()=>{
 const f=local(10),s=f.peer.state,p=s.players[1]!;f.advance(120000);await f.peer.send({type:'ready'});
 f.advance(1799);assert.equal(p.quote,null);assert.equal(p.egg,0);f.advance(1);assert.ok(p.quote);f.run(DUEL_PREPARATION_SECONDS*1000-1800);assert.equal(s.status,'playing');
 const solved=p.solved,growth=p.egg;assert.ok(solved>0&&growth===solved);assert.equal(stockTotal(p.heroStock??{}),0);f.advance(1799);assert.equal(p.towers.length,0);assert.equal(s.enemies.some(e=>e.hero),false);f.advance(1);assert.equal(p.towers.length,1);assert.equal(p.quote,null);assert.equal(p.solved,solved);assert.equal(p.egg,growth);f.peer.dispose();
});

test('전투 중 처치는 점수를 주며 새 타워를 사지 못하고 비축 타워의 회수·재설치는 가능하다',async()=>{
 const f=local(6),peer=f.peer,s=peer.state,p=s.players[0];await peer.send({type:'ready'});await prepareTower(peer);f.run(DUEL_PREPARATION_SECONDS*1000);
 assert.ok((await peer.send({type:'build',typeId:'basic',x:4,y:2})).ok);
 s.enemies.push({id:9000,owner:1,target:0,hero:null,level:1,hp:100,max:100,x:4,y:3,slow:0,stun:0,hits:0});f.advance(100);assert.ok((p.combatScore??0)>0);assert.equal(p.money,0);
 p.money=DUEL_START_MONEY;const money=p.money;assert.equal(duelBuildCost(s,0,'basic'),Infinity);assert.equal((await peer.send({type:'build',typeId:'basic',x:6,y:2})).ok,false);assert.equal(p.money,money);assert.equal(p.quote,null);
 assert.ok((await peer.send({type:'sell',towerId:p.towers[0].id})).ok);assert.equal(p.stock.basic,1);assert.ok((await peer.send({type:'build',typeId:'basic',x:6,y:2})).ok);assert.equal(p.money,money);
 f.run(10000);const enemy=s.enemies.find(e=>e.target===0)!,x=enemy.x,towers=s.players[1]!.towers.length,solved=s.players[1]!.solved;f.run(12000);assert.ok(s.elapsed>=22);assert.ok(enemy.x<x);assert.ok(s.players[1]!.towers.length>=towers);assert.equal(s.players[1]!.quote,null);assert.equal(s.players[1]!.solved,solved);assert.ok(s.players[1]!.towers.every(t=>t.prepared&&t.cost===0));
 peer.dispose();const elapsed=s.elapsed;f.advance(30000);assert.equal(s.elapsed,elapsed);await assert.rejects(()=>peer.send({type:'ready'}));
});

test('컴퓨터 표정은 준비 계산·전투 설치·불꽃 피격·승패에 맞춰 바뀐다',async()=>{
 const f=local(10),peer=f.peer,s=peer.state;assert.equal(peer.opponent.mood,'idle');await peer.send({type:'ready'});f.advance(1800);assert.equal(peer.opponent.mood,'thinking');f.advance(peer.definition.thinkMs);assert.equal(peer.opponent.mood,'cast');
 f.run(DUEL_PREPARATION_SECONDS*1000-(f.now-s.preparationStartedAt));f.advance(1800);assert.equal(peer.opponent.mood,'cast');
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

test('10종 맵 × CPU 10레벨의 100대전이 180초 타워·성장량 준비와 180초 재고 전투로 끝난다',()=>{
 const reports=DUEL_MAPS.flatMap(map=>Array.from({length:10},(_,i)=>simulateComputerDuel(i+1,912,'baseline',map.id)));assert.equal(reports.length,100);
 for(const r of reports){
  const label=`${r.mapId} / Lv.${r.level}`;assert.equal(r.status,'finished',label);assert.equal(r.preparationSeconds,DUEL_PREPARATION_SECONDS);assert.ok(r.seconds>0&&r.seconds<=DUEL_SECONDS);assert.ok(r.totalSeconds>DUEL_PREPARATION_SECONDS&&r.totalSeconds<=DUEL_TOTAL_SECONDS);assert.ok(r.zeroCombatCoins,label);assert.ok(r.legalEconomy,`${label}: 코인·재고·설치 제한·전투 문제 없음`);assert.ok(r.noBattleFusion,label);
  assert.ok(r.playerPrepared>=1&&r.computerPrepared>=1,label);assert.ok(r.playerPreparedGrowth>=1&&r.computerPreparedGrowth>=1,label);assert.ok(r.growthConserved,`${label}: 소환 레벨 비용만큼 성장량을 사용한다`);assert.ok(r.playerStockPlaced>=1&&r.computerStockPlaced>=1,`${label}: 양쪽 모두 재고 배치`);assert.equal(r.playerEarned,0,label);assert.equal(r.computerEarned,0,label);
  assert.ok(r.computerSolved>=1);assert.ok(r.computerHatched);assert.ok(r.traversedBend);assert.ok(r.waves>=3);assert.ok(r.playerFlame>=0&&r.playerFlame<=FLAME_MAX);assert.ok(r.computerFlame>=0&&r.computerFlame<=FLAME_MAX);
 }
 assert.ok(reports.every(r=>r.playerCashBuilt===0&&r.computerCashBuilt===0));
 for(let level=1;level<=10;level++){const r=reports.find(r=>r.level===level)!;assert.ok(r.computerPrepared<=COMPUTER_OPPONENTS[level-1].maxTowers);}
 assert.ok(reports.find(r=>r.level===10)!.computerPrepared>reports.find(r=>r.level===1)!.computerPrepared);
});

test('준비 경제의 기준 전략은 입문 CPU를 이기고 최고 CPU의 방어·영웅 압박에 패배한다',()=>{
 for(const seed of [17,91,912]){
  const levels=[1,4,5,9,10],matches=levels.map(level=>simulateComputerDuel(level,seed));
  assert.equal(matches[0].winner,0,'입문 CPU는 기존 느린 기준 전략으로 클리어할 수 있다');
  assert.equal(matches[4].winner,1,'최고 CPU는 적은 방어와 느린 합성의 기준 전략을 압박한다');
  assert.ok(matches.every(m=>m.status==='finished'&&m.legalEconomy&&m.zeroCombatCoins));
  for(const match of matches.filter(m=>m.reason.startsWith('6분 종료'))){
   assert.equal(match.totalSeconds,DUEL_TOTAL_SECONDS);assert.equal(match.seconds,DUEL_SECONDS);
   assert.equal(match.winner,match.playerScore===match.computerScore?null:match.playerScore>match.computerScore?0:1);
   assert.equal(match.playerScore,match.playerCombatScore+match.playerQuestionScore);
   assert.equal(match.computerScore,match.computerCombatScore+match.computerQuestionScore);
  }
  assert.ok(matches[4].computerSolved>matches[0].computerSolved);assert.ok(matches[4].computerPurchased>matches[0].computerPurchased);
  const burst=simulateComputerDuel(10,seed,'burst');assert.ok(burst.status==='finished'&&burst.legalEconomy&&burst.zeroCombatCoins&&burst.noBattleFusion&&burst.growthConserved);assert.ok(burst.playerPrepared>=matches[4].playerPrepared);assert.ok(burst.playerPreparedGrowth>matches[4].playerPreparedGrowth);
 }
});

test('입문 1~3단계는 느린 정상 정답 정책으로 클리어할 수 있다',()=>{
 const weak={...DUEL_AUDIT_POLICIES[0],mistakeRate:0};
 for(const level of [1,2,3])for(const seed of [17,91,912]){
  const result=simulateDuelDifficulty(level,seed,weak);
  assert.equal(result.winner,0,`CPU ${level} / seed ${seed}: 느린 정상 공략의 승리 경로`);
  assert.ok(result.legal&&result.zeroCombatCoins);
 }
});

test('상위 8~10단계는 충분한 성장량을 준비해 고레벨 영웅을 선택하는 빠른 전략으로 클리어할 수 있다',()=>{
 const fast=DUEL_AUDIT_POLICIES[2],minimal={...fast,id:'minimal6-row',maxTowers:6,placement:'row' as const,mistakeRate:0},strong={...fast,id:'strong-defense',upgradeDefense:true,mistakeRate:0};
 for(const level of [8,9,10])for(const seed of [17,91,912]){
  const exploit=simulateDuelDifficulty(level,seed,minimal),good=simulateDuelDifficulty(level,seed,strong);
  assert.equal(exploit.winner,0,`CPU ${level} / seed ${seed}: 6개 방어와 성장량 59의 고레벨 영웅 공략`);
  assert.equal(exploit.preparedGrowth[0],59);assert.equal(exploit.flames[1],0);assert.ok(exploit.battleSeconds<DUEL_SECONDS);
  assert.equal(good.winner,0,`CPU ${level} / seed ${seed}: 준비 예산으로 고급 타워를 확보하는 정상 공략`);
  assert.equal(good.flames[1],0);assert.ok(good.totalSeconds>DUEL_PREPARATION_SECONDS&&good.totalSeconds<=DUEL_TOTAL_SECONDS);assert.ok(good.battleSeconds<=DUEL_SECONDS);
  assert.ok(good.towerTypes[0].includes('sniper')&&good.towerTypes[0].includes('catapult'));
  assert.equal(good.towerTypes[1].length,good.prepared[1],'상위 CPU는 준비한 방어 재고를 전부 배치한다');
  assert.ok(good.towerPositions[1].some(t=>t.type==='sniper'&&t.prepared&&t.cost===0),'장거리 방어도 준비 재고만 사용한다');
  assert.ok(good.cashBuilds.every(n=>n===0)&&good.towerPositions[1].every(t=>t.prepared),'전투 중에는 현금 구매가 없다');
  assert.ok(good.preparedGrowth[1]>=level&&good.hatches[1].includes(level),'상위 CPU는 준비한 성장량으로 목표 레벨 영웅을 전투에서 소환한다');
  assert.ok(good.growthConserved&&exploit.growthConserved,'낮은 레벨의 마지막 소환 후에도 성장량 계산을 보존한다');
  assert.ok([exploit,good].every(r=>r.legal&&r.zeroCombatCoins&&r.noBattleFusion&&r.status==='finished'));
 }
});

test('최고 CPU는 준비 문제 사이의 중복 대기를 줄이고 비축 방어를 초반에 배치한다',async()=>{
 const f=local(10),s=f.peer.state,cpu=s.players[1]!;await f.peer.send({type:'ready'});
 f.run(10000);assert.ok(cpu.purchases>=4,'정답 뒤 전투 설치 간격만큼 다시 기다리지 않는다');
 const budgetBeforeBattle=cpu.money;f.run(DUEL_PREPARATION_SECONDS*1000-1-(f.now-s.preparationStartedAt));assert.ok(DUEL_START_MONEY-cpu.money>8800,'늘어난 예산으로 기존 8.8코인보다 많은 방어를 준비한다');assert.ok(cpu.money<budgetBeforeBattle);f.advance(1);
 const prepared=stockTotal(cpu.stock),solved=cpu.solved;assert.equal(prepared,f.peer.definition.maxTowers);assert.ok(cpu.stock.catapult>0&&cpu.stock.sniper>0);assert.equal(cpu.egg,solved);assert.ok(cpu.egg>10);assert.equal(stockTotal(cpu.heroStock??{}),0);
 f.run(10000);assert.equal(cpu.towers.filter(t=>t.prepared).length,10,'첫 레벨의 배치 수 제한까지 빠르게 설치한다');assert.equal(stockTotal(cpu.stock),prepared-10);
 f.run(10000);assert.equal(cpu.towers.length,12,'두 번째 레벨에서 보관한 타워 두 개를 더 배치한다');
 f.run(20000);assert.equal(cpu.towers.filter(t=>t.prepared).length,prepared,'세 번째 레벨에서 준비한 14개를 모두 배치한다');assert.equal(stockTotal(cpu.stock),0);
 f.run(55000-s.elapsed*1000);assert.ok(s.enemies.some(e=>e.owner===1&&e.hero&&e.level===10));
 assert.equal(cpu.solved,solved);assert.equal(cpu.accountLevel,10);assert.equal(s.players[0].accountLevel,1);f.peer.dispose();
});

test('성장량 10은 낮은 영웅 열 명이나 높은 영웅 한 명으로 쓰고 CPU도 잔여량에 맞춰 소환한다',async()=>{
 for(const level of [1,10]){
  const f=local(10),s=f.peer.state,p=s.players[0];await f.peer.send({type:'ready'});
  for(let i=0;i<10;i++)assert.ok((await f.peer.send({type:'fuse',operation:'+',round:p.round,slots:additionSlots(p.board)!})).ok);
  const money=p.money;assert.equal(p.egg,10);assert.equal(money,DUEL_START_MONEY);assert.equal(stockTotal(p.heroStock??{}),0);f.run(DUEL_PREPARATION_SECONDS*1000);
  for(let count=0;count<10/level;count++){assert.ok((await f.peer.send({type:'hatch',heroId:`hero-${level}-0`})).ok);assert.equal(p.egg,10-(count+1)*level);}
  assert.equal(s.enemies.filter(e=>e.owner===0&&e.hero).length,10/level);assert.equal(p.money,0);assert.equal(p.egg,0);f.peer.dispose();
 }
 const f=local(10),s=f.peer.state,cpu=s.players[1]!;await f.peer.send({type:'ready'});f.run(DUEL_PREPARATION_SECONDS*1000);const growth=cpu.egg,seen=new Map<number,number>();
 assert.equal(growth,34,'최고 CPU는 늘어난 준비 3분 동안 성장량 34를 모은다');
 f.peer.onState=()=>{for(const e of s.enemies)if(e.owner===1&&e.hero)seen.set(e.id,e.level);};f.run(Math.ceil(f.peer.definition.hatchMs/100)*100*4+100);
 assert.deepEqual([...seen.values()],[10,10,10,4]);assert.equal(cpu.egg,0);assert.equal([...seen.values()].reduce((sum,level)=>sum+level,0),growth);f.peer.dispose();
});

test('같은 준비 성장량으로 낮은 영웅을 여러 번 소환하거나 높은 레벨 영웅에 나누어 사용한다',()=>{
 const fast={...DUEL_AUDIT_POLICIES[2],mistakeRate:0},low=simulateDuelDifficulty(10,912,{...fast,id:'growth-low',heroLevel:1}),high=simulateDuelDifficulty(10,912,{...fast,id:'growth-high',heroLevel:10});
 assert.equal(low.preparedGrowth[0],59);assert.equal(high.preparedGrowth[0],low.preparedGrowth[0]);assert.equal(low.spentGrowth[0],59);assert.equal(high.spentGrowth[0],59);
 assert.equal(low.hatches[0].length,59);assert.ok(low.hatches[0].every(level=>level===1));assert.deepEqual(high.hatches[0],[10,10,10,10,10,9]);assert.ok(low.growthConserved&&high.growthConserved);
});

test('10종 굽잇길은 사거리와 준비한 고급 타워를 활용하는 정상 공략으로 최고 CPU를 이길 수 있다',()=>{
 const policy={...DUEL_AUDIT_POLICIES[2],id:'coverage-defense',upgradeDefense:true,placement:'coverage' as const};
 for(const map of DUEL_MAPS){
  const result=simulateDuelDifficulty(10,912,policy,map.id);
  assert.equal(result.winner,0,`${map.id}: 모든 전장에 정상 클리어 경로가 있다`);
  assert.ok(result.flames[0]>0);assert.ok(result.totalSeconds>DUEL_PREPARATION_SECONDS&&result.totalSeconds<=DUEL_TOTAL_SECONDS);
  assert.ok(result.legal&&result.zeroCombatCoins&&result.noBattleFusion&&result.towerPositions[0].some(t=>t.type==='sniper'&&t.prepared&&t.cost===0));
 }
});

test('준비 문제 취소·3분 만료·경기 종료 뒤 갱신에서 견적과 타이머가 정리된다',async()=>{
 const f=local(5),peer=f.peer,s=peer.state;await peer.send({type:'ready'});assert.ok((await peer.send({type:'prepare-quote',typeId:'basic'})).ok);const initial=s.players[0].money;
 assert.ok((await peer.send({type:'cancel'})).ok);assert.equal(s.players[0].quote,null);assert.equal(s.players[0].money,initial);
 assert.ok((await peer.send({type:'prepare-quote',typeId:'basic'})).ok);const nonce=s.players[0].quote!.nonce;f.run(DUEL_PREPARATION_SECONDS*1000+100);assert.equal(s.players[0].quote,null);assert.equal(s.players[0].money,0);assert.equal(stockTotal(s.players[0].stock),0);
 assert.equal((await peer.send({type:'answer',nonce,answer:'8.7'})).ok,false);await peer.send({type:'surrender'});let events=0;peer.onState=()=>{events++;};peer.dispose();f.advance(10000);assert.equal(events,0);
});
