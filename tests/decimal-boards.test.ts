import {test} from 'node:test';
import assert from 'node:assert/strict';
import {decimalBoard,decimalTriples,learningLevel} from '../src/multiplayer/decimal-boards';
import {createDuel,joinDuel,applyDuel,advanceDuel,DUEL_PREPARATION_SECONDS,DuelState,Side} from '../src/multiplayer/duel';
import {emptyProgress,progressAfter,MatchRecord} from '../src/multiplayer/records';
import {numberText} from '../src/math';
const NOW=100000;
const START=NOW+DUEL_PREPARATION_SECONDS*1000;
function startPreparation(s:DuelState){
 applyDuel(s,0,{type:'ready'},NOW,'r0');applyDuel(s,1,{type:'ready'},NOW,'r1');
 assert.equal(s.status,'preparing');
}
function recipes(board:number[]){
 const involved=new Set<number>();
 for(let a=0;a<16;a++)for(let b=0;b<16;b++)for(let c=0;c<16;c++)if(a!==b&&a!==c&&b!==c&&board[a]+board[b]===board[c]){involved.add(a);involved.add(b);involved.add(c);}
 return involved;
}
function addition(board:number[],correct=true){
 for(let a=0;a<16;a++)for(let b=a+1;b<16;b++)for(let c=0;c<16;c++)if(a!==c&&b!==c&&board[a]+board[b]<10000&&(board[a]+board[b]===board[c])===correct)return[a,b,c];
 throw Error('No suitable addition in the generated board');
}
function personalBoard(s:DuelState,side:Side){
 const p=s.players[side]!;assert.deepEqual(p.board,decimalBoard(s.seed,p.round,learningLevel(p.accountLevel)));
 assert.ok(p.board.every(n=>Number.isSafeInteger(n)&&n%10===0&&n>0&&n<10000));
 assert.ok(p.board.every(n=>(numberText(n).split('.')[1]?.length??0)<=2));
}
test('각 난이도·순서에서 5개의 삼중 세트를 만들고 16개 블럭 모두 덧셈에 참여한다',()=>{
 for(let lv=1;lv<=10;lv++)for(let seed=0;seed<30;seed++)for(let round=0;round<8;round++){
  const triples=decimalTriples(seed,round,lv),board=decimalBoard(seed,round,lv);
  assert.equal(triples.length,5);assert.equal(board.length,16);assert.deepEqual(board,decimalBoard(seed,round,lv));
  assert.ok(board.every(n=>n>0&&n<10000&&Number.isSafeInteger(n)&&n%10===0));
  for(const [a,b,c]of triples)assert.equal(a+b,c);
  const remaining=[...board];for(const n of triples.flat()){const i=remaining.indexOf(n);assert.ok(i>=0);remaining.splice(i,1);}
  assert.equal(remaining.length,1);assert.ok(triples.flat().includes(remaining[0]));
  assert.equal(recipes(board).size,16);
 }
});
test('낮은 레벨은 한 자리 소수, 중간은 두 자리 소수와 연속 받아올림, 높은 레벨은 0이 생기는 덧셈이다',()=>{
 for(let seed=0;seed<100;seed++)for(let round=0;round<5;round++)for(let lv=1;lv<=10;lv++)for(const [a,b,c]of decimalTriples(seed,round,lv)){
  if(lv<=2){assert.ok(c<1000);assert.ok([a,b,c].every(n=>n%100===0));if(lv===1)assert.ok(a<=400&&b<=400);}
  if(lv===3){assert.ok(c>=1000);assert.ok([a,b,c].every(n=>n%100===0));}
  if(lv===4){assert.ok(a%100+b%100<100);assert.ok(a+b<1000);assert.ok(a%100!==0&&b%100!==0);}
  if(lv===5){assert.ok(a%100+b%100>=100);assert.ok(c<1000);}
  if(lv===6||lv===8){assert.ok(a%100+b%100>=100);assert.ok(a%1000+b%1000>=1000);if(lv===8)assert.ok(a>=1000);}
  if(lv===7){assert.equal(a%100,0);assert.notEqual(b%100,0);assert.ok(a%1000+b%1000>=1000);}
  if(lv>=9){assert.ok(c>=2000&&c<10000);if(lv===10)assert.equal(c%1000,0);assert.equal(Math.floor(c%1000/100),0);assert.ok(c%100<a%100);assert.ok(a%1000>=220);}
 }
});
test('풀이가 100판 진행되어도 초급 계정의 소수 자릿수가 갑자기 늘어나지 않는다',()=>{
 for(let round=0;round<100;round++)assert.ok(decimalBoard(918,round,1).every(n=>n%100===0&&n<1000));
 assert.equal(learningLevel(NaN),1);assert.equal(learningLevel(-1),1);assert.equal(learningLevel(2.5),1);assert.equal(learningLevel(99),10);
});
test('Lv.1과 Lv.8은 방장 순서와 상관없이 자신의 덧셈 판을 유지하고 타워 준비 레벨만 공유한다',()=>{
 for(const levels of [[1,8],[8,1]]){
  const s=createDuel('host','방장',17,NOW,levels[0]),before=[...s.players[0].board];
  joinDuel(s,'guest','참가자',NOW,levels[1]);assert.equal(s.learningLevel,1);assert.deepEqual(s.players[0].board,before);
  for(const side of [0,1] as Side[])personalBoard(s,side);
  assert.notDeepEqual(s.players[0].board,s.players[1]!.board);
  const low=s.players.find(p=>p?.accountLevel===1)!;assert.ok(low.board.every(n=>n<1000&&n%100===0));
  const high=s.players.find(p=>p?.accountLevel===8)!;assert.ok(high.board.some(n=>n>=1000));assert.ok(high.board.some(n=>n%100!==0));
  startPreparation(s);s.players.forEach(p=>p!.lastSeen=START+90000);advanceDuel(s,START+90000);assert.equal(s.status,'playing');assert.equal(s.learningLevel,1);
  for(const side of [0,1] as Side[])personalBoard(s,side);
 }
});
test('합성 순서가 달라도 각자의 판은 계정 레벨에 맞으며 준비 부화·오래된 요청을 거부한다',()=>{
 for(const levels of [[1,8],[8,1]]){
  const s=createDuel('host','방장',918,NOW,levels[0]);joinDuel(s,'guest','참가자',NOW,levels[1]);startPreparation(s);
  for(let turn=0;turn<7;turn++)for(const side of (turn%2?[1,0]:[0,1]) as Side[]){
   const p=s.players[side]!,other=s.players[(1-side) as Side]!,before=structuredClone(p),otherBefore=structuredClone(other),slots=addition(p.board);
   if(p.round>0){assert.equal(applyDuel(s,side,{type:'fuse',operation:'+',round:p.round-1,slots},NOW,`stale-${side}-${turn}`).ok,false);assert.deepEqual(p,before);}
   assert.equal(applyDuel(s,side,{type:'fuse',operation:'+',round:p.round,slots:[slots[0],slots[0],slots[2]]},NOW,`invalid-${side}-${turn}`).ok,false);assert.deepEqual(p,before);
   assert.equal(applyDuel(s,side,{type:'fuse',operation:'+',round:p.round,slots},NOW,`valid-${side}-${turn}`).ok,true);
   assert.equal(p.round,before.round+1);assert.equal(p.egg,before.egg+1);assert.deepEqual(other,otherBefore);personalBoard(s,side);personalBoard(s,(1-side) as Side);
   if(p.egg===3){const beforeHatch=structuredClone(s);assert.equal(applyDuel(s,side,{type:'hatch',heroId:'hero-3-0'},NOW,`hatch-${side}-${turn}`).ok,false);assert.deepEqual(s,beforeHatch);personalBoard(s,side);}
  }
  assert.equal(s.players[0].solved,7);assert.equal(s.players[1]!.solved,7);assert.equal(s.players[0].egg,7);assert.equal(s.players[1]!.egg,7);
  s.players.forEach(p=>p!.lastSeen=START);advanceDuel(s,START);
  for(const side of [0,1] as Side[]){const p=s.players[side]!,board=[...p.board],round=p.round;assert.equal(applyDuel(s,side,{type:'hatch',heroId:'hero-3-0'},START,`combat-${side}`).ok,true);assert.equal(p.egg,4);assert.equal(p.round,round);assert.deepEqual(p.board,board);personalBoard(s,side);}
 }
});
test('같은 계정 레벨은 같은 순서에서 동일한 판이며 10을 넘는 계정의 덧셈은 10단계·두 자리 소수로 제한된다',()=>{
 for(const level of [1,8,10,99]){
  const s=createDuel('host','방장',912,NOW,level);joinDuel(s,'guest','참가자',NOW,level);startPreparation(s);
  for(let round=0;round<5;round++){
   assert.deepEqual(s.players[0].board,s.players[1]!.board);
   for(const side of [0,1] as Side[]){const p=s.players[side]!;personalBoard(s,side);assert.equal(applyDuel(s,side,{type:'fuse',operation:'+',round:p.round,slots:addition(p.board)},NOW,`same-${side}-${round}`).ok,true);}
  }
  assert.equal(s.players[0].accountLevel,level);assert.equal(s.learningLevel,learningLevel(level));
 }
});
test('연속 승리 경험치로 계정 레벨이 오르면 다음 경기의 계산도 어려워진다',()=>{
 let p=emptyProgress();const r:MatchRecord={version:1,matchId:'00000000-0000-4000-8000-000000000000',hostUid:'a',guestUid:'b',side:0,outcome:'win',endedAt:Date.now(),duration:120,solved:0,purchases:0,wrongQuestions:[]};
 for(let i=0;i<6;i++)p=progressAfter(p,r);assert.equal(p.wins,6);assert.equal(p.level,4);
 const s=createDuel('a','가',18,NOW,p.level);joinDuel(s,'b','나',NOW,p.level);assert.equal(s.learningLevel,4);assert.ok(s.players[0].board.some(n=>n%100!==0));
});
test('합성 오답에는 낮은 공용 타워 레벨이 아닌 자신의 실제 문항 난이도를 기록한다',()=>{
 for(const levels of [[1,8],[8,1],[99,1]]){
  const s=createDuel('host','방장',17,NOW,levels[0]);joinDuel(s,'guest','참가자',NOW,levels[1]);startPreparation(s);assert.equal(s.learningLevel,1);
  for(const side of [0,1] as Side[]){
   const p=s.players[side]!,board=[...p.board],slots=addition(board,false);
   assert.equal(applyDuel(s,side,{type:'fuse',operation:'+',round:0,slots},NOW,`wrong-${side}`).ok,false);
   assert.equal(p.wrongQuestions[0].level,learningLevel(levels[side]));assert.equal(p.wrongQuestions[0].submitted,numberText(board[slots[2]]));
   assert.equal(p.wrongQuestions[0].operation,'+');assert.equal(p.egg,0);assert.equal(p.round,0);assert.deepEqual(p.board,board);
  }
 }
});
