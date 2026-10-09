import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ComputerPeer,additionSlots} from '../src/multiplayer/computer-peer';
import {COMPUTER_OPPONENTS,computerOpponent} from '../src/multiplayer/computer-opponents';
import {DUEL_START_MONEY,FLAME_MAX,duelLevel} from '../src/multiplayer/duel';
import {numberText,recipe} from '../src/math';
import {towerType} from '../src/towers';
import {simulateComputerDuel} from '../tools/computer-duel-simulation';

function local(level=1){let now=100000;const peer=new ComputerPeer({uid:'student',name:'수호자'},level,{seed:912,clock:()=>now,autoTick:false});return {peer,get now(){return now;},advance(ms:number){now+=ms;peer.step(now);}};}
test('컴퓨터 상대 10명은 동일한 시작 코인·불꽃·문제 순서와 선택 레벨을 사용한다',()=>{
 assert.equal(COMPUTER_OPPONENTS.length,10);assert.equal(new Set(COMPUTER_OPPONENTS.map(o=>o.id)).size,10);
 for(let level=1;level<=10;level++){
  const {peer}=local(level),s=peer.state;
  assert.equal(peer.definition.level,level);assert.equal(s.learningLevel,level);assert.equal(s.status,'waiting');assert.equal(s.players[1]!.ready,true);
  assert.deepEqual(s.players[0].board,s.players[1]!.board);assert.ok(s.players.every(p=>p!.money===DUEL_START_MONEY&&p!.flame===FLAME_MAX));
  const slots=additionSlots(s.players[1]!.board)!;assert.ok(slots);assert.equal(new Set(slots).size,3);assert.ok(recipe(...slots.map(i=>s.players[1]!.board[i]) as [number,number,number],'+'));
  assert.ok(s.players[0].board.every(n=>n%10===0));peer.dispose();
 }
 assert.equal(computerOpponent(-10).level,1);assert.equal(computerOpponent(99).level,10);
});
test('10명 모두 같은 규칙으로 구매·합성·부화하고 자동 웨이브와 대전을 끝까지 진행한다',async()=>{
 const reports:{level:number;solved:number;purchases:number;wave:number}[]=[];
 for(let level=1;level<=10;level++){
  const f=local(level),peer=f.peer,s=peer.state;await peer.send({type:'ready'});let iterations=0,seenHero=false;
  while(s.status==='playing'&&iterations++<3200){
   f.advance(100);const p=s.players[1]!;
   assert.ok(p.money>=0&&p.escrow>=0);assert.ok(p.towers.length<=peer.definition.maxTowers);
   assert.ok(p.towers.every(t=>towerType(t.typeId)!.unlock<=duelLevel(s)));assert.ok(p.board.every(n=>n%10===0&&n<10000));
   assert.equal(p.wrongQuestions.length,0);seenHero||=s.enemies.some(e=>e.owner===1&&!!e.hero);
  }
  assert.equal(s.status,'finished');assert.ok(s.wave>=3);assert.ok(s.players[1]!.purchases>=1);assert.ok(s.players[1]!.solved>=1);assert.ok(seenHero);
  assert.ok(['victory','defeat','idle'].includes(peer.opponent.mood));reports.push({level,solved:s.players[1]!.solved,purchases:s.players[1]!.purchases,wave:s.wave});peer.dispose();
 }
 assert.ok(reports[9].solved>reports[0].solved);assert.ok(reports[9].purchases>reports[0].purchases);
});
test('플레이어가 하단 구매 문제를 푸는 동안 전장과 컴퓨터의 턴이 멈추지 않는다',async()=>{
 const f=local(6),peer=f.peer,s=peer.state;await peer.send({type:'ready'});f.advance(10000);
 const q=await peer.send({type:'quote',x:4,y:2,typeId:'basic'});assert.ok(q.ok);const quote=s.players[0].quote!,enemy=s.enemies.find(e=>e.target===0)!,x=enemy.x,purchases=s.players[1]!.purchases;
 f.advance(12000);assert.ok(s.elapsed>=22);assert.ok(enemy.x<x);assert.equal(s.players[0].quote?.nonce,quote.nonce);assert.ok(s.players[1]!.purchases>=purchases);
 assert.equal((await peer.send({type:'answer',nonce:quote.nonce,answer:'0'})).ok,false);assert.equal(s.players[0].quote,quote);
 assert.ok((await peer.send({type:'answer',nonce:quote.nonce,answer:numberText(quote.before-quote.cost)})).ok);assert.equal(s.players[0].quote,null);assert.equal(s.players[0].towers.length,1);
 peer.dispose();const elapsed=s.elapsed;f.advance(30000);assert.equal(s.elapsed,elapsed,'폐기한 로컬 대전은 갱신하지 않는다');
 await assert.rejects(()=>peer.send({type:'ready'}));
});
test('컴퓨터 표정은 계산·시전·불꽃 피격·승패에 맞춰 바뀐다',async()=>{
 const f=local(10),peer=f.peer,s=peer.state;assert.equal(peer.opponent.mood,'idle');f.advance(1800);assert.equal(peer.opponent.mood,'thinking');f.advance(peer.definition.thinkMs);assert.equal(peer.opponent.mood,'cast');
 await peer.send({type:'ready'});s.enemies.push({id:9999,owner:0,target:1,hero:null,level:1,hp:500,max:500,x:22.99,slow:0,stun:0,hits:0});f.advance(100);assert.equal(peer.opponent.mood,'hurt');
 await peer.send({type:'surrender'});assert.equal(s.status,'finished');assert.equal(peer.opponent.mood,'victory');peer.dispose();
});
test('무작위 판의 덧셈 해답 탐색은 같은 값을 가진 서로 다른 블럭을 사용한다',()=>{
 assert.deepEqual(additionSlots([100,100,200]),[0,1,2]);assert.equal(additionSlots([100,200,400]),null);assert.equal(additionSlots([100,200]),null);
});
test('입문 상대는 기준 전략으로 이길 수 있고 최고 상대는 압박하지만 성장·군집 전략으로 이길 수 있다',()=>{
 for(const seed of [17,91,912]){
  assert.equal(simulateComputerDuel(1,seed).winner,0);
  assert.equal(simulateComputerDuel(9,seed).winner,1);
  assert.equal(simulateComputerDuel(10,seed).winner,1);
  assert.equal(simulateComputerDuel(10,seed,'burst').winner,0);
 }
});
test('구매 취소·60초 만료·경기 종료 뒤 갱신에서도 견적과 타이머가 안전하게 정리된다',async()=>{
 const f=local(5),peer=f.peer,s=peer.state;await peer.send({type:'ready'});
 assert.ok((await peer.send({type:'quote',x:4,y:2,typeId:'basic'})).ok);const initial=s.players[0].money;
 assert.ok((await peer.send({type:'cancel'})).ok);assert.equal(s.players[0].quote,null);assert.equal(s.players[0].money,initial);
 assert.ok((await peer.send({type:'quote',x:4,y:2,typeId:'basic'})).ok);f.advance(60100);assert.equal(s.players[0].quote,null);assert.ok(s.elapsed>=60);
 await peer.send({type:'surrender'});let events=0;peer.onState=()=>{events++;};peer.dispose();f.advance(10000);assert.equal(events,0);
});
