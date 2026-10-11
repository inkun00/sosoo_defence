import {test} from 'node:test';
import assert from 'node:assert/strict';
import {decimalBoard,decimalQuestion,decimalTriples,learningDescription,learningLevel,normalizedAccountLevel,HERO_ADDITION_STAGES} from '../src/multiplayer/decimal-boards';
import {createDuel,joinDuel,applyDuel,advanceDuel,duelHeroLearningLevel,DUEL_PREPARATION_SECONDS,DuelState,DuelPlayer,Side} from '../src/multiplayer/duel';
import {emptyProgress,progressAfter,MatchRecord} from '../src/multiplayer/records';
import {numberText} from '../src/math';
const NOW=100000;
const START=NOW+DUEL_PREPARATION_SECONDS*1000;
function startPreparation(s:DuelState){
 applyDuel(s,0,{type:'ready'},NOW,'r0');applyDuel(s,1,{type:'ready'},NOW,'r1');
 assert.equal(s.status,'preparing');
}
function addition(p:Pick<DuelPlayer,'heroQuestion'|'board'>,correct=true){
 const answer=p.heroQuestion.a+p.heroQuestion.b,index=p.board.findIndex(value=>(value===answer)===correct);
 if(index<0)throw Error('No answer candidate');return [index];
}
function carry(a:number,b:number){
 const hundredths=Math.floor(a/10)%10+Math.floor(b/10)%10>=10;
 return hundredths||Math.floor(a/100)%10+Math.floor(b/100)%10+(hundredths?1:0)>=10;
}
function assertStage(question:{a:number;b:number},board:number[],stage:number){
 const {a,b}=question,answer=a+b,precision=(stage-1)%4+1;
 assert.ok([a,b,answer,...board].every(n=>Number.isSafeInteger(n)&&n%10===0&&n>0&&n<10000));
 assert.ok([a,b,answer,...board].every(n=>(numberText(n).split('.')[1]?.length??0)===(precision<=2?1:2)));
 assert.equal(board.length,16);assert.equal(new Set(board).size,16);assert.equal(board.filter(value=>value===answer).length,1);
 assert.equal(carry(a,b),precision===2||precision===4);
 assert.ok([a,b].every(n=>stage<=4?n<1000:n>=1000),'초반에는 두 수 모두 1 미만이고 후반에는 두 수 모두 정수 부분이 있다');
}
function personalBoard(s:DuelState,side:Side){
 const p=s.players[side]!,stage=duelHeroLearningLevel(p);
 assert.deepEqual(p.heroQuestion,decimalQuestion(s.seed,p.round,stage));assert.deepEqual(p.board,decimalBoard(s.seed,p.round,stage));assertStage(p.heroQuestion,p.board,stage);
}
function solve(s:DuelState,side:Side,nonce:string){
 const p=s.players[side]!;
 assert.equal(applyDuel(s,side,{type:'fuse',operation:'+',round:p.round,slots:addition(p)},NOW,nonce).ok,true);
}

test('여덟 단계의 고정 덧셈과 16개 후보는 정확한 소수 단위이며 정답이 정확히 한 개다',()=>{
 for(let stage=1;stage<=HERO_ADDITION_STAGES;stage++)for(let seed=0;seed<30;seed++)for(let round=0;round<8;round++){
  const triples=decimalTriples(seed,round,stage),board=decimalBoard(seed,round,stage);
  assert.equal(triples.length,5);assert.equal(board.length,16);assert.deepEqual(board,decimalBoard(seed,round,stage));
  for(const [a,b,c]of triples){assert.equal(a+b,c);assert.ok(c<10000);assert.ok([a,b].every(n=>stage<=4?n<1000:n>=1000));}
  assert.deepEqual(decimalQuestion(seed,round,stage),{a:triples[0][0],b:triples[0][1]});assertStage(decimalQuestion(seed,round,stage),board,stage);
 }
});

test('고정 문제의 자릿수·받아올림과 중복 없는 정답 후보를 seed와 회차 전체에서 보장한다',()=>{
 for(let stage=1;stage<=HERO_ADDITION_STAGES;stage++){
  const variants=new Set<string>();
  for(let seed=0;seed<100;seed++)for(let round=0;round<8;round++){
   const board=decimalBoard(seed,round,stage);assertStage(decimalQuestion(seed,round,stage),board,stage);
   variants.add(JSON.stringify(decimalQuestion(seed,round,stage))+':'+[...board].sort((a,b)=>a-b).join(','));
  }
  assert.ok(variants.size>=(stage===1?10:20),`단계 ${stage}에도 다양한 수 조합이 있어야 한다`);
 }
});

test('덧셈 단계만 여덟 단계로 정규화하고 계정·타워 레벨의 기존 범위는 유지한다',()=>{
 for(const invalid of [NaN,Infinity,-1,0,2.5]){
  assert.deepEqual(decimalBoard(918,0,invalid),decimalBoard(918,0,1));
  assert.deepEqual(decimalTriples(918,0,invalid),decimalTriples(918,0,1));
  assert.equal(learningDescription(invalid),'한 자리 소수 · 받아올림 없음 · 1보다 작은 수');
 }
 assert.deepEqual(decimalBoard(918,0,99),decimalBoard(918,0,8));
 for(const [stage,text]of [[1,'한 자리 소수 · 받아올림 없음'],[2,'한 자리 소수 · 받아올림 있음'],[3,'두 자리 소수 · 받아올림 없음'],[4,'두 자리 소수 · 받아올림 있음']] as const){
  assert.equal(learningDescription(stage),text+' · 1보다 작은 수');assert.equal(learningDescription(stage+4),text+' · 정수 부분 포함');
 }
 assert.equal(learningDescription(99),learningDescription(8));
 assert.equal(learningLevel(NaN),1);assert.equal(learningLevel(-1),1);assert.equal(learningLevel(2.5),1);assert.equal(learningLevel(99),10);
 assert.equal(normalizedAccountLevel(99),99);assert.equal(normalizedAccountLevel(1000001),1000000);
 for(const [solved,expected]of [[0,1],[4,1],[5,2],[9,2],[10,3],[14,3],[15,4],[19,4],[20,5],[24,5],[25,6],[29,6],[30,7],[34,7],[35,8],[100,8],[NaN,1],[-1,1],[2.5,1]])assert.equal(duelHeroLearningLevel({solved}),expected);
});

test('계정 레벨과 방장 순서가 달라도 첫 덧셈은 같은 1단계이고 타워 준비 레벨만 공유한다',()=>{
 for(const levels of [[1,8],[8,1],[99,8]]){
  const s=createDuel('host','방장',17,NOW,levels[0]),before=[...s.players[0].board];
  joinDuel(s,'guest','참가자',NOW,levels[1]);assert.equal(s.learningLevel,Math.min(10,...levels));assert.deepEqual(s.players[0].board,before);
  assert.deepEqual(s.players[0].board,s.players[1]!.board);
  for(const side of [0,1] as Side[]){assert.equal(duelHeroLearningLevel(s.players[side]!),1);personalBoard(s,side);}
  startPreparation(s);s.players.forEach(p=>p!.lastSeen=START);advanceDuel(s,START);assert.equal(s.status,'playing');
  for(const side of [0,1] as Side[])personalBoard(s,side);
 }
});

test('개인 정답 5개마다 새 단계가 생성되고 오답과 잘못된 요청은 진도를 바꾸지 않는다',()=>{
 const s=createDuel('host','방장',918,NOW,99);joinDuel(s,'guest','참가자',NOW,1);startPreparation(s);
 const p=s.players[0],otherBefore=structuredClone(s.players[1]);
 for(let count=0;count<40;count++){
  const stage=Math.min(HERO_ADDITION_STAGES,Math.floor(count/5)+1);assert.equal(duelHeroLearningLevel(p),stage);personalBoard(s,0);
  if(count%5===4){
   const before=structuredClone(p),slots=addition(p);
   assert.equal(applyDuel(s,0,{type:'fuse',operation:'+',round:p.round-1,slots},NOW,`stale-${count}`).ok,false);assert.deepEqual(p,before);
   assert.equal(applyDuel(s,0,{type:'fuse',operation:'+',round:p.round,slots:[slots[0],slots[0],slots[2]]},NOW,`duplicate-${count}`).ok,false);assert.deepEqual(p,before);
   assert.equal(applyDuel(s,0,{type:'fuse',operation:'+',round:p.round,slots:[-1,1,2]},NOW,`range-${count}`).ok,false);assert.deepEqual(p,before);
   assert.equal(applyDuel(s,0,{type:'fuse',operation:'-',round:p.round,slots} as never,NOW,`operation-${count}`).ok,false);assert.deepEqual(p,before);
   const wrongSlots=addition(p,false);
   assert.equal(applyDuel(s,0,{type:'fuse',operation:'+',round:p.round,slots:wrongSlots},NOW,`wrong-${count}`).ok,false);
   assert.equal(p.solved,count);assert.equal(p.egg,count);assert.equal(p.round,count);assert.deepEqual(p.board,before.board);assert.equal(duelHeroLearningLevel(p),stage);
   const wrong=p.wrongQuestions.at(-1)!;assert.equal(wrong.level,stage);assert.equal(wrong.submitted,numberText(before.board[wrongSlots[0]]));
  }
  solve(s,0,`correct-${count}`);assert.equal(p.solved,count+1);assert.equal(p.egg,count+1);assert.equal(p.round,count+1);personalBoard(s,0);
  assert.deepEqual(s.players[1],otherBefore);
 }
 assert.equal(duelHeroLearningLevel(p),8);assert.equal(duelHeroLearningLevel(s.players[1]!),1);assert.equal(s.learningLevel,1);
 const next=createDuel('host','방장',918,START,99);joinDuel(next,'guest','참가자',START,1);
 for(const player of next.players){assert.equal(player!.solved,0);assert.equal(duelHeroLearningLevel(player!),1);assert.deepEqual(player!.board,decimalBoard(918,0,1));}
});

test('진행 순서와 계정 레벨에 관계없이 같은 개인 정답 수·회차는 같은 단계의 판이다',()=>{
 for(const levels of [[1,8],[8,1],[99,10]]){
  const s=createDuel('host','방장',912,NOW,levels[0]);joinDuel(s,'guest','참가자',NOW,levels[1]);startPreparation(s);
  for(let turn=0;turn<41;turn++){
   assert.deepEqual(s.players[0].board,s.players[1]!.board);
   for(const side of (turn%2?[1,0]:[0,1]) as Side[]){
    const otherBefore=structuredClone(s.players[(1-side) as Side]);solve(s,side,`same-${side}-${turn}`);
    assert.deepEqual(s.players[(1-side) as Side],otherBefore);personalBoard(s,side);
   }
  }
  assert.deepEqual(s.players.map(p=>p!.accountLevel),levels);assert.equal(s.learningLevel,Math.min(10,...levels));
 }
});

test('타워 구매와 성장량·비축·학습지 영웅 소환은 덧셈 진도를 올리지 않는다',()=>{
 const s=createDuel('host','방장',17,NOW,1,{rewardHeroes:['hero-1-0'],rewardHero:'hero-1-0'});joinDuel(s,'guest','참가자',NOW,99);startPreparation(s);
 const p=s.players[0];
 assert.equal(applyDuel(s,0,{type:'prepare-quote',typeId:'basic'},NOW,'quote').ok,true);const q=p.quote!;
 for(let i=0;i<5;i++)solve(s,0,`growth-${i}`);
 const board=[...p.board];
 assert.equal(applyDuel(s,0,{type:'answer',nonce:'quote',answer:numberText(q.before-q.cost)},NOW,'buy').ok,true);
 assert.equal(p.purchases,1);assert.equal(p.solved,5);assert.equal(duelHeroLearningLevel(p),2);assert.deepEqual(p.board,board);
 for(const action of [{type:'hatch',heroId:'hero-2-0'},{type:'summon',heroId:'hero-2-0'}] as const){
  const before=structuredClone(s);assert.equal(applyDuel(s,0,action,NOW,`early-${action.type}`).ok,false);assert.deepEqual(s,before);
 }
 s.players.forEach(player=>player!.lastSeen=START);advanceDuel(s,START);assert.equal(s.status,'playing');
 const check=()=>{assert.equal(p.solved,5);assert.equal(p.round,5);assert.equal(duelHeroLearningLevel(p),2);assert.deepEqual(p.board,board);};
 assert.equal(applyDuel(s,0,{type:'hatch',heroId:'hero-2-0'},START,'hatch').ok,true);assert.equal(p.egg,3);check();
 p.heroStock={'hero-1-0':1};assert.equal(applyDuel(s,0,{type:'summon',heroId:'hero-1-0'},START,'legacy').ok,true);assert.equal(p.egg,3);assert.equal(p.heroStock['hero-1-0'],0);check();
 assert.equal(applyDuel(s,0,{type:'summon',heroId:'hero-1-0'},START,'growth-summon').ok,true);assert.equal(p.egg,2);check();
 assert.equal(applyDuel(s,0,{type:'summon-reward'},START,'reward').ok,true);assert.equal(p.rewardUsed,true);assert.equal(p.egg,2);check();
 assert.equal(applyDuel(s,0,{type:'fuse',operation:'+',round:p.round,slots:addition(p)},START,'combat-fuse').ok,false);check();
});

test('계정 승리 경험치는 다음 대전 타워 난이도에만 반영하고 덧셈은 다시 0정답부터 시작한다',()=>{
 let p=emptyProgress();const record:MatchRecord={version:1,matchId:'00000000-0000-4000-8000-000000000000',hostUid:'a',guestUid:'b',side:0,outcome:'win',endedAt:Date.now(),duration:120,solved:0,purchases:0,wrongQuestions:[]};
 for(let i=0;i<6;i++)p=progressAfter(p,record);assert.equal(p.wins,6);assert.equal(p.level,4);
 const s=createDuel('a','가',18,NOW,p.level);joinDuel(s,'b','나',NOW,p.level);assert.equal(s.learningLevel,4);
 for(const player of s.players){assert.equal(player!.solved,0);assert.equal(duelHeroLearningLevel(player!),1);assertStage(player!.heroQuestion,player!.board,1);}
});

test('덧셈 오답에는 계정·타워 레벨 대신 당시의 개인 문제 단계를 기록한다',()=>{
 const s=createDuel('host','방장',17,NOW,99);joinDuel(s,'guest','참가자',NOW,1);startPreparation(s);
 const p=s.players[0];
 for(let stage=1;stage<=HERO_ADDITION_STAGES;stage++){
  while(p.solved<(stage-1)*5)solve(s,0,`progress-${p.solved}`);
  const board=[...p.board],slots=addition(p,false),growth=p.egg;
  assert.equal(applyDuel(s,0,{type:'fuse',operation:'+',round:p.round,slots},NOW,`wrong-stage-${stage}`).ok,false);
  const wrong=p.wrongQuestions.at(-1)!;assert.equal(wrong.level,stage);assert.equal(wrong.submitted,numberText(board[slots[0]]));assert.equal(wrong.operation,'+');
  assert.equal(p.solved,(stage-1)*5);assert.equal(p.egg,growth);assert.equal(p.round,(stage-1)*5);assert.deepEqual(p.board,board);personalBoard(s,0);
 }
 assert.deepEqual(p.wrongQuestions.map(q=>q.level),[1,2,3,4,5,6,7,8]);assert.equal(duelHeroLearningLevel(s.players[1]!),1);assert.equal(s.learningLevel,1);
});
