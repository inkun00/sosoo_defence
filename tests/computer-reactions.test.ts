import {test} from 'node:test';
import assert from 'node:assert/strict';
import {COMPUTER_DIALOGUE,ComputerDialogue,ComputerDialogueEvent} from '../src/multiplayer/computer-dialogue';
import {ComputerPeer} from '../src/multiplayer/computer-peer';
import {DUEL_PREPARATION_SECONDS,Side} from '../src/multiplayer/duel';
import {duelMap,duelPathPosition} from '../src/multiplayer/duel-maps';

async function battle(level=4){
 let now=100000;
 const peer=new ComputerPeer({uid:'reaction-player',name:'수호자'},level,{seed:712,autoTick:false,clock:()=>now});
 assert.ok((await peer.send({type:'ready'})).ok);
 now+=DUEL_PREPARATION_SECONDS*1000;peer.step(now);assert.equal(peer.state.status,'playing');
 return {peer,advance(ms:number){now+=ms;peer.step(now);},hit(target:Side){
  const s=peer.state,pathDistance=target===0?.01:duelMap(s.mapId).length-.01,{x,y}=duelPathPosition(s.mapId,pathDistance,target);
  s.enemies.push({id:s.nextId++,owner:(1-target) as Side,target,hero:null,level:1,hp:100,max:100,x,y,pathDistance,slow:0,stun:0,hits:0});
 }};
}

test('짧은 상황별 대사 180개가 모두 다르고 각 풀을 소진하기 전에는 반복하지 않는다',()=>{
 const entries=Object.entries(COMPUTER_DIALOGUE) as [ComputerDialogueEvent,readonly string[]][];
 const all=entries.flatMap(([,lines])=>lines);assert.equal(all.length,180);assert.equal(new Set(all).size,all.length);
 for(const [event,lines]of entries){
  assert.ok(lines.length>=12,event);assert.ok(lines.every(line=>line.length<25),`${event}: 중앙 띠에 맞는 짧은 대사`);
  const dialogue=new ComputerDialogue(91),previous:string[]=[];
  for(let cycle=0;cycle<4;cycle++){
   const heard=Array.from({length:lines.length},()=>dialogue.next(event));
   assert.equal(new Set(heard).size,lines.length,`${event}: ${cycle}번째 대사 순회`);
   assert.deepEqual([...heard].sort(),[...lines].sort());
   for(const phrase of heard){assert.ok(!previous.slice(-6).includes(phrase),`${event}: 최근 대사 반복`);previous.push(phrase);}
  }
 }
});

test('대사 섞기는 시드에 따라 재현되며 컴퓨터의 게임 진행 상태를 바꾸지 않는다',()=>{
 const first=new ComputerDialogue(123),same=new ComputerDialogue(123),other=new ComputerDialogue(456);
 const events:Array<ComputerDialogueEvent>=['aggressive','hurt','celebrate','build','summon','aggressive'];
 const sample=Array.from({length:60},(_,i)=>events[i%events.length]);
 const a=sample.map(event=>first.next(event)),b=sample.map(event=>same.next(event)),c=sample.map(event=>other.next(event));
 assert.deepEqual(a,b);assert.notDeepEqual(a,c);
 const peer=new ComputerPeer({uid:'a',name:'수호자'},5,{seed:123,clock:()=>100000,autoTick:false}),before=structuredClone(peer.state);
 for(let i=0;i<100;i++)peer.opponent;
 assert.deepEqual(peer.state,before);peer.dispose();
});

test('컴퓨터 성 피격은 hurt, 플레이어 성 피격은 짧은 victory이며 평시 공격으로 복귀한다',async()=>{
 for(const target of [0,1] as const){
  const f=await battle(),peer=f.peer;
  try{
   assert.equal(peer.opponent.mood,'idle');assert.ok(COMPUTER_DIALOGUE.aggressive.includes(peer.opponent.phrase as never));
   f.hit(target);f.advance(100);assert.equal(peer.state.players[target]!.flame,8000);
   assert.equal(peer.opponent.mood,target===0?'victory':'hurt');
   assert.ok(COMPUTER_DIALOGUE[target===0?'celebrate':'hurt'].includes(peer.opponent.phrase as never));
   const reaction=peer.opponent;f.advance(1000);assert.deepEqual(peer.opponent,reaction,'반응 중에는 표정과 대사를 유지한다');
   f.advance(1500);assert.equal(peer.opponent.mood,'idle');assert.ok(COMPUTER_DIALOGUE.aggressive.includes(peer.opponent.phrase as never));
  }finally{peer.dispose();}
 }
});

test('빠른 연속 피격은 대사를 바꾸지 않고, 양쪽 성이 맞으면 자기 성을 걱정한다',async()=>{
 const f=await battle(),peer=f.peer;
 try{
  f.hit(1);f.advance(100);const first=peer.opponent;
  f.hit(1);f.advance(100);assert.equal(peer.state.players[1]!.flame,7000);assert.deepEqual(peer.opponent,first);
  f.hit(0);f.advance(100);assert.equal(peer.state.players[0].flame,8000);assert.deepEqual(peer.opponent,first,'자기 성 피격 반응을 기쁨이 덮지 않는다');
 }finally{peer.dispose();}
 const simultaneous=await battle();
 try{
  simultaneous.hit(0);simultaneous.hit(1);simultaneous.advance(100);
  assert.equal(simultaneous.peer.state.players[0].flame,8000);assert.equal(simultaneous.peer.state.players[1]!.flame,8000);assert.equal(simultaneous.peer.opponent.mood,'hurt');
 }finally{simultaneous.peer.dispose();}
});

test('피격과 기쁨은 동시에 일어나는 타워 설치 및 영웅 출격에 덮이지 않는다',async()=>{
 for(const target of [0,1] as const){
  const f=await battle(10),peer=f.peer,cpu=peer.state.players[1]!;
  try{
   cpu.stock.basic=1;cpu.egg=10;
   f.hit(target);f.advance(1800);
   assert.equal(cpu.towers.length,1);assert.equal(peer.opponent.mood,target===0?'victory':'hurt');
   // Trigger the already scheduled first hero deployment during another impact.
   f.advance(peer.definition.hatchMs-1800-100);f.hit(target);f.advance(100);
   assert.ok(peer.state.enemies.some(enemy=>enemy.owner===1&&enemy.hero));assert.equal(cpu.egg,0);
   assert.equal(peer.opponent.mood,target===0?'victory':'hurt');
  }finally{peer.dispose();}
 }
});

test('종료 승리·패배·무승부는 반응을 즉시 덮고 반복 step에서도 같은 대사를 유지한다',async()=>{
 for(const outcome of ['victory','defeat','draw'] as const){
  const f=await battle(),peer=f.peer;
  try{
   f.hit(1);f.advance(100);assert.equal(peer.opponent.mood,'hurt');
   if(outcome==='victory')assert.ok((await peer.send({type:'surrender'})).ok);
   else{peer.state.players[1]!.flame=0;if(outcome==='draw')peer.state.players[0].flame=0;f.advance(100);}
   assert.equal(peer.state.status,'finished');assert.equal(peer.opponent.mood,outcome==='draw'?'idle':outcome);
   assert.ok(COMPUTER_DIALOGUE[outcome].includes(peer.opponent.phrase as never));const final=peer.opponent;
   f.advance(100);f.advance(9000);assert.deepEqual(peer.opponent,final);
  }finally{peer.dispose();}
 }
});

test('변화 없는 전장에서는 대사를 매 tick 갱신하지 않고 약 7초 뒤 다른 공격 대사를 말한다',async()=>{
 const f=await battle(),peer=f.peer;
 try{
  const first=peer.opponent;
  for(let i=0;i<60;i++)f.advance(100);
  assert.deepEqual(peer.opponent,first);f.advance(1000);
  assert.equal(peer.opponent.mood,'idle');assert.notEqual(peer.opponent.phrase,first.phrase);assert.ok(peer.opponent.moodSince>first.moodSince);
 }finally{peer.dispose();}
});
