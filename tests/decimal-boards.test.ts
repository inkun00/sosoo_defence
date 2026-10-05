import {test} from 'node:test';
import assert from 'node:assert/strict';
import {decimalBoard,decimalTriples,learningLevel} from '../src/multiplayer/decimal-boards';
import {createDuel,joinDuel,applyDuel,advanceDuel} from '../src/multiplayer/duel';
import {emptyProgress,progressAfter,MatchRecord} from '../src/multiplayer/records';
import {numberText} from '../src/math';
const NOW=100000;
function recipes(board:number[],operation:'+'|'-'){
 const involved=new Set<number>();
 for(let a=0;a<16;a++)for(let b=0;b<16;b++)for(let c=0;c<16;c++)if(a!==b&&a!==c&&b!==c&&(operation==='+'?board[a]+board[b]:board[a]-board[b])===board[c]){involved.add(a);involved.add(b);involved.add(c);}
 return involved;
}
test('각 난이도·순서에서 5개의 삼중 세트를 만들고 16개 블럭 모두 덧셈·뺄셈에 참여한다',()=>{
 for(let lv=1;lv<=10;lv++)for(let seed=0;seed<30;seed++)for(let round=0;round<8;round++){
  const triples=decimalTriples(seed,round,lv),board=decimalBoard(seed,round,lv);
  assert.equal(triples.length,5);assert.equal(board.length,16);assert.deepEqual(board,decimalBoard(seed,round,lv));
  assert.ok(board.every(n=>n>0&&n<10000&&Number.isSafeInteger(n)&&n%10===0));
  for(const [a,b,c]of triples){assert.equal(a+b,c);assert.equal(c-a,b);}
  const remaining=[...board];for(const n of triples.flat()){const i=remaining.indexOf(n);assert.ok(i>=0);remaining.splice(i,1);}
  assert.equal(remaining.length,1);assert.ok(triples.flat().includes(remaining[0]));
  assert.equal(recipes(board,'+').size,16);assert.equal(recipes(board,'-').size,16);
 }
});
test('낮은 레벨은 한 자리 소수, 중간은 두 자리 소수와 연속 받아내림, 높은 레벨은 0을 거치는 계산이다',()=>{
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
test('계정 레벨이 다르면 낮은 레벨로 두 사람의 판을 다시 맞추고 경기 내 난이도는 고정한다',()=>{
 const s=createDuel('high','고급',17,NOW,10);assert.equal(s.learningLevel,10);
 joinDuel(s,'low','초급',NOW,1);assert.equal(s.learningLevel,1);assert.deepEqual(s.players[0].board,s.players[1]!.board);assert.ok(s.players[0].board.every(n=>n<1000&&n%100===0));
 applyDuel(s,0,{type:'ready'},NOW,'r0');applyDuel(s,1,{type:'ready'},NOW,'r1');s.players.forEach(p=>p!.lastSeen=NOW+90000);advanceDuel(s,NOW+90000);assert.equal(s.learningLevel,1);
 const high=createDuel('a','가',17,NOW,12);joinDuel(high,'b','나',NOW,9);assert.equal(high.learningLevel,9);assert.deepEqual(high.players[0].board,high.players[1]!.board);
});
test('연속 승리 경험치로 계정 레벨이 오르면 다음 경기의 계산도 어려워진다',()=>{
 let p=emptyProgress();const r:MatchRecord={version:1,matchId:'00000000-0000-4000-8000-000000000000',hostUid:'a',guestUid:'b',side:0,outcome:'win',endedAt:Date.now(),duration:120,solved:0,purchases:0,wrongQuestions:[]};
 for(let i=0;i<6;i++)p=progressAfter(p,r);assert.equal(p.wins,6);assert.equal(p.level,4);
 const s=createDuel('a','가',18,NOW,p.level);joinDuel(s,'b','나',NOW,p.level);assert.equal(s.learningLevel,4);assert.ok(s.players[0].board.some(n=>n%100!==0));
});
test('합성 오답에는 시간에 따른 대전 레벨 대신 실제 문항 난이도를 기록한다',()=>{
 const s=createDuel('a','가',17,NOW,9);joinDuel(s,'b','나',NOW,9);applyDuel(s,0,{type:'ready'},NOW,'r0');applyDuel(s,1,{type:'ready'},NOW,'r1');const board=s.players[0].board;
 let slots:number[]=[];for(let a=0;a<16&&!slots.length;a++)for(let b=0;b<16&&!slots.length;b++)for(let c=0;c<16&&!slots.length;c++)if(a!==b&&a!==c&&b!==c&&board[a]+board[b]<10000&&board[a]+board[b]!==board[c])slots=[a,b,c];
 assert.equal(applyDuel(s,0,{type:'fuse',operation:'+',round:0,slots},NOW,'wrong').ok,false);assert.equal(s.players[0].wrongQuestions[0].level,9);
 assert.equal(s.players[0].wrongQuestions[0].submitted,numberText(board[slots[2]]));assert.equal(s.players[0].egg,0);assert.deepEqual(s.players[0].board,board);
});
