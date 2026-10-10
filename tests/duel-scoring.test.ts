import {test} from 'node:test';
import assert from 'node:assert/strict';
import {advanceDuel,applyDuel,createDuel,duelKillScore,duelQuestionScore,duelScore,joinDuel,DUEL_PREPARATION_SECONDS,DUEL_SECONDS,DUEL_TOTAL_SECONDS,type DuelEnemy,type DuelState,type Side} from '../src/multiplayer/duel';
import {numberText,recipe} from '../src/math';

const NOW=100000,START=NOW+DUEL_PREPARATION_SECONDS*1000,END=NOW+DUEL_TOTAL_SECONDS*1000;
function preparing(){
 const s=createDuel('a','왼쪽',17,NOW);joinDuel(s,'b','오른쪽',NOW);
 assert.ok(applyDuel(s,0,{type:'ready'},NOW,'r1').ok);assert.ok(applyDuel(s,1,{type:'ready'},NOW,'r2').ok);return s;
}
function connectedAdvance(s:DuelState,now:number){s.players.forEach(p=>{if(p)p.lastSeen=now;});advanceDuel(s,now);}
function playing(){const s=preparing();connectedAdvance(s,START);s.wave=10000;return s;}
function quote(s:DuelState,nonce='q',side:Side=0){assert.ok(applyDuel(s,side,{type:'prepare-quote',typeId:'basic'},NOW,nonce).ok);return s.players[side]!.quote!;}
function correctTower(s:DuelState,side:Side=0,now=NOW){const q=s.players[side]!.quote!;return applyDuel(s,side,{type:'answer',nonce:q.nonce,answer:numberText(q.before-q.cost)},now,'correct');}
function fuseSlots(s:DuelState,side:Side=0){
 const board=s.players[side]!.board;
 for(let a=0;a<16;a++)for(let b=0;b<16;b++)for(let c=0;c<16;c++)if(a!==b&&a!==c&&b!==c&&recipe(board[a],board[b],board[c],'+'))return [a,b,c];
 throw Error('No addition answer');
}
function fuse(s:DuelState,side:Side=0,now=s.updatedAt,slots=fuseSlots(s,side)){return applyDuel(s,side,{type:'fuse',round:s.players[side]!.round,slots,operation:'+'},now,'fuse');}
function enemy(extra:Partial<DuelEnemy>={}):DuelEnemy{return {id:90,owner:1,target:0,hero:null,level:1,hp:100,max:100,x:3,y:3,pathDistance:3,slow:0,stun:0,hits:0,...extra};}
function tower(s:DuelState,typeId='basic',side:Side=0){s.players[side]!.stock[typeId]=1;assert.ok(applyDuel(s,side,{type:'build',typeId,x:side===0?3:20,y:2},START,'build').ok);}

test('대전 총 시간은 준비 120초와 전투 180초이며 점수는 정수로 타격·오답 효율을 보상한다',()=>{
 assert.equal(DUEL_PREPARATION_SECONDS,120);assert.equal(DUEL_SECONDS,180);assert.equal(DUEL_TOTAL_SECONDS,300);
 assert.deepEqual([1,2,3,4,5].map(duelKillScore),[200,150,133,125,120]);
 assert.deepEqual([0,1,2,3,4].map(duelQuestionScore),[25,12,8,6,5]);
 assert.equal(duelKillScore(1000),100);assert.equal(duelQuestionScore(1000),0);
 assert.equal(duelKillScore(0),200);assert.equal(duelQuestionScore(-1),25);
});

test('양쪽 점수와 통계는 0에서 시작하고 이전 상태의 누락 점수도 0으로 읽는다',()=>{
 const s=preparing();
 for(const p of s.players){assert.equal(duelScore(p),0);assert.equal(p!.combatScore,0);assert.equal(p!.questionScore,0);assert.equal(p!.kills,0);assert.equal(p!.answeredQuestions,0);}
 assert.equal(duelScore({}),0);assert.equal(duelScore(null),0);assert.equal(duelScore(undefined),0);
 assert.equal(duelScore({combatScore:125,questionScore:33}),158);
});

test('문제풀이가 포함된 5분 경계 직전에는 진행 중이고 정확한 경계에 점수로 끝난다',()=>{
 const s=preparing();s.wave=10000;connectedAdvance(s,START-1);assert.equal(s.status,'preparing');
 connectedAdvance(s,START);s.wave=10000;assert.equal(s.status,'playing');assert.equal(s.elapsed,0);
 connectedAdvance(s,END-1);assert.equal(s.status,'playing');assert.ok(Math.abs(s.elapsed-(DUEL_SECONDS-.001))<1e-6);
 connectedAdvance(s,END);assert.equal(s.status,'finished');assert.equal(s.elapsed,DUEL_SECONDS);assert.equal(s.winner,null);assert.match(s.reason,/5분 종료.*점수 0 : 0.*무승부/);
});

test('타워 문제는 정답에만 점수를 주고 누적 오답에 따라 보상이 줄어든다',()=>{
 const s=preparing(),p=s.players[0];quote(s);
 for(let i=0;i<2;i++){assert.equal(applyDuel(s,0,{type:'answer',nonce:'q',answer:'0'},NOW,`wrong-${i}`).ok,false);assert.equal(duelScore(p),0);}
 assert.equal(p.quote!.wrongAttempts,2);assert.equal(p.towerWrongAttempts,2);assert.equal(p.wrongQuestions[0].attempts,2);
 assert.ok(correctTower(s).ok);assert.equal(p.questionScore,8);assert.equal(p.answeredQuestions,1);assert.equal(p.towerWrongAttempts,0);
 quote(s,'q2');assert.ok(correctTower(s).ok);assert.equal(p.questionScore,33);assert.equal(p.answeredQuestions,2);
 assert.equal(correctTowerSafeReplay(s,'q2').ok,false);assert.equal(p.questionScore,33);assert.equal(duelScore(s.players[1]),0);
});
function correctTowerSafeReplay(s:DuelState,nonce:string){return applyDuel(s,0,{type:'answer',nonce,answer:'0'},NOW,'replay');}

test('타워 문제를 취소하거나 다른 문제로 바꿔도 이전 오답 점수 불이익을 지울 수 없다',()=>{
 const s=preparing(),p=s.players[0];quote(s,'abandoned');
 applyDuel(s,0,{type:'answer',nonce:'abandoned',answer:'0'},NOW,'wrong');
 assert.ok(applyDuel(s,0,{type:'cancel'},NOW,'cancel').ok);assert.equal(duelScore(p),0);assert.equal(p.answeredQuestions,0);assert.equal(p.towerWrongAttempts,1);
 quote(s,'replacement');assert.equal(p.quote!.wrongAttempts,1);assert.ok(correctTower(s).ok);assert.equal(p.questionScore,12);assert.equal(p.towerWrongAttempts,0);
 quote(s,'clean');assert.ok(correctTower(s).ok);assert.equal(p.questionScore,37);
});

test('구조가 잘못된 요청이나 취소한 문제에는 점수가 없고 종료된 준비 문제도 점수가 없다',()=>{
 const s=preparing(),p=s.players[0];quote(s,'open');
 assert.equal(applyDuel(s,0,{type:'answer',nonce:'other',answer:'0'},NOW,'bad-nonce').ok,false);
 assert.equal(applyDuel(s,0,{type:'answer',nonce:'open',answer:'0'.repeat(13)},NOW,'too-long').ok,false);
 assert.equal(p.towerWrongAttempts,0);assert.equal(duelScore(p),0);
 s.players.forEach(a=>a!.lastSeen=START);assert.equal(correctTower(s,0,START).ok,false);
 assert.equal(s.status,'playing');assert.equal(duelScore(p),0);assert.equal(p.answeredQuestions,0);assert.deepEqual(p.stock,{});
});

test('영웅 덧셈은 같은 판에서 다른 식을 선택해도 오답을 합산하고 다음 판부터 새로 채점한다',()=>{
 const s=preparing(),p=s.players[0];p.board=[100,200,400,300,500,600,700,800,900,1000,1100,1200,1300,1400,1500,1600];
 assert.equal(fuse(s,0,NOW,[0,1,2]).ok,false);assert.equal(fuse(s,0,NOW,[1,3,2]).ok,false);
 assert.equal(p.fusionWrongAttempts,2);assert.equal(p.round,0);assert.equal(duelScore(p),0);
 assert.ok(fuse(s,0,NOW,[0,1,3]).ok);assert.equal(p.questionScore,8);assert.equal(p.answeredQuestions,1);assert.equal(p.fusionWrongAttempts,0);assert.equal(p.round,1);
 assert.ok(fuse(s).ok);assert.equal(p.questionScore,33);assert.equal(p.answeredQuestions,2);assert.equal(duelScore(s.players[1]),0);
});

test('같은 영웅 문제의 재전송과 유효하지 않은 블럭은 점수나 오답 수를 바꾸지 않는다',()=>{
 const s=preparing(),p=s.players[0],round=p.round,slots=fuseSlots(s);
 assert.equal(fuse(s,0,NOW,[0,0,1]).ok,false);assert.equal(p.fusionWrongAttempts,0);
 assert.ok(fuse(s,0,NOW,slots).ok);const before=structuredClone(p);
 assert.equal(applyDuel(s,0,{type:'fuse',round,slots,operation:'+'},NOW,'duplicate').ok,false);assert.deepEqual(p,before);
});

test('덧셈 합이 학습 범위를 넘어간 오답도 다음 유효한 정답의 보상을 낮춘다',()=>{
 const s=preparing(),p=s.players[0];p.board=[6000,7000,100,200,300,400,500,600,700,800,900,1000,1100,1200,1300,1400];
 assert.equal(fuse(s,0,NOW,[0,1,2]).ok,false);assert.equal(p.fusionWrongAttempts,1);assert.equal(p.wrongQuestions.length,0);assert.equal(duelScore(p),0);
 assert.ok(fuse(s,0,NOW,[2,3,4]).ok);assert.equal(p.questionScore,12);assert.equal(p.fusionWrongAttempts,0);
});

test('준비 오답과 영웅 합성 오답은 서로 다른 문제의 채점에 섞이지 않는다',()=>{
 const s=preparing(),p=s.players[0];quote(s,'expired');applyDuel(s,0,{type:'answer',nonce:'expired',answer:'0'},NOW,'wrong');
 assert.ok(fuse(s).ok);assert.equal(p.questionScore,25);assert.equal(p.answeredQuestions,1);
 connectedAdvance(s,START);assert.equal(p.questionScore,25);assert.equal(fuse(s).ok,false);
});

test('실제로 적을 제거한 마지막 타격에만 점수를 주고 더 적은 타격의 처치 점수가 높다',()=>{
 const one=playing(),two=playing();tower(one,'double');tower(two,'basic');
 one.enemies=[enemy({hp:200,max:200})];two.enemies=[enemy({hp:200,max:200})];
 connectedAdvance(one,START+100);connectedAdvance(two,START+100);
 assert.equal(one.players[0].combatScore,200);assert.equal(one.players[0].kills,1);assert.equal(two.players[0].combatScore,0);assert.equal(two.players[0].kills,0);assert.equal(two.enemies[0].hits,1);
 connectedAdvance(two,START+2200);assert.equal(two.players[0].combatScore,150);assert.equal(two.players[0].kills,1);
 connectedAdvance(one,START+3000);assert.equal(one.players[0].combatScore,200);assert.equal(one.players[0].kills,1);
});

test('보호막으로 막힌 공격도 처치 타격 수에 포함하여 점수를 계산한다',()=>{
 for(const [heroId,level,blocks] of [['hero-1-1',1,1],['hero-8-0',8,2]] as const){
  const s=playing();tower(s);const target=enemy(),leader=enemy({id:91,hero:heroId,level,hp:8000,max:8000,x:4,pathDistance:4});s.enemies=[target,leader];
  connectedAdvance(s,START+100);assert.equal(target.shieldSpent,1);assert.equal(target.hits,0);assert.equal(s.players[0].combatScore,0);
  connectedAdvance(s,START+(blocks*2+.2)*1000);
  assert.equal(target.hp,0);assert.equal(target.hits,1);assert.equal(target.shieldSpent,blocks);assert.equal(s.players[0].combatScore,duelKillScore(blocks+1));assert.equal(s.players[0].kills,1);
 }
});

test('초과 공격과 성까지 도착한 적은 처치 점수가 없으며 다른 플레이어에게 넘기지 않는다',()=>{
 const invalid=playing();tower(invalid,'double');invalid.enemies=[enemy()];connectedAdvance(invalid,START+100);
 assert.equal(invalid.enemies[0].hp,100);assert.equal(invalid.enemies[0].hits,0);assert.equal(invalid.players[0].combatScore,0);
 const leak=playing();tower(leak);leak.enemies=[enemy({x:.001,pathDistance:.001})];connectedAdvance(leak,START+100);
 assert.equal(leak.enemies.length,0);assert.equal(leak.players[0].flame,8000);assert.equal(leak.players[0].kills,0);assert.equal(duelScore(leak.players[0]),0);assert.equal(duelScore(leak.players[1]),0);
});

test('오른쪽 방어 타워가 제거한 적의 점수는 오른쪽에만 반영한다',()=>{
 const s=playing();tower(s,'basic',1);s.enemies=[enemy({owner:0,target:1,x:20,pathDistance:20})];connectedAdvance(s,START+100);
 assert.equal(s.players[1]!.combatScore,200);assert.equal(s.players[1]!.kills,1);assert.equal(duelScore(s.players[0]),0);
});

test('시간제한에서는 남은 성 체력보다 합산 점수가 우선하고 동일 점수는 무승부다',()=>{
 const s=playing();s.players[0].flame=1000;s.players[1]!.flame=9000;s.players[0].combatScore=50;s.players[0].questionScore=100;s.players[1]!.questionScore=149;
 connectedAdvance(s,END);assert.equal(s.status,'finished');assert.equal(s.winner,0);assert.match(s.reason,/점수 150 : 149/);
 const tied=playing();tied.players[0].flame=1000;tied.players[0].combatScore=150;tied.players[1]!.questionScore=150;
 connectedAdvance(tied,END);assert.equal(tied.winner,null);assert.match(tied.reason,/무승부/);
});

test('마지막 제한 시간 안의 실제 처치 점수까지 합산하고 종료 후에는 다시 적립하지 않는다',()=>{
 const s=playing();tower(s);s.elapsed=DUEL_SECONDS-.05;s.updatedAt=END-50;s.enemies=[enemy()];
 connectedAdvance(s,END);assert.equal(s.status,'finished');assert.equal(s.players[0].combatScore,200);assert.equal(s.players[0].kills,1);assert.equal(s.winner,0);assert.match(s.reason,/점수 200 : 0/);
 connectedAdvance(s,END+10000);assert.equal(s.players[0].combatScore,200);assert.equal(s.players[0].kills,1);
});

test('정확한 5분 경계 이후 직접 도착한 합성·설치 요청도 점수나 게임 상태를 바꿀 수 없다',()=>{
 for(const late of [0,1,60000]){
  const s=playing(),p=s.players[0];p.questionScore=100;p.money=10000;s.players.forEach(a=>a!.lastSeen=END+late);
  assert.equal(fuse(s,0,END+late).ok,false);assert.equal(s.status,'finished');assert.equal(p.questionScore,100);assert.equal(p.answeredQuestions,0);assert.equal(s.winner,0);assert.equal(s.elapsed,DUEL_SECONDS);
  const before=structuredClone(s);assert.equal(applyDuel(s,0,{type:'build',typeId:'basic',x:3,y:2},END+late,'late-build').ok,false);assert.deepEqual(s,before);
 }
});

test('성 파괴·기권·연결 종료는 5분 전에도 기존 승리 조건으로 끝난다',()=>{
 const destroyed=playing();destroyed.players[0].questionScore=1000;destroyed.players[0].flame=1000;destroyed.enemies=[enemy({pathDistance:.001,x:.001})];connectedAdvance(destroyed,START+100);
 assert.equal(destroyed.winner,1);assert.match(destroyed.reason,/불꽃이 파괴/);
 const quit=playing();quit.players[0].questionScore=1000;applyDuel(quit,0,{type:'surrender'},START,'quit');assert.equal(quit.winner,1);
 const disconnected=playing();disconnected.players[0].questionScore=1000;disconnected.players[1]!.lastSeen=START+45001;advanceDuel(disconnected,START+45001);assert.equal(disconnected.winner,1);
});

test('유한하지 않은 시간 요청은 점수와 상태를 바꾸지 않고 같은 시뮬레이션은 같은 점수를 낸다',()=>{
 const a=preparing(),b=preparing();for(const s of [a,b]){assert.ok(fuse(s).ok);connectedAdvance(s,START);s.wave=10000;tower(s,'basic');s.enemies=[enemy({hp:200,max:200})];connectedAdvance(s,START+2200);}
 assert.deepEqual(a,b);assert.equal(duelScore(a.players[0]),175);
 const before=structuredClone(a);for(const now of [NaN,Infinity,-Infinity])assert.equal(fuse(a,0,now).ok,false);assert.deepEqual(a,before);
});

// Excessive mistakes still allow learning progress, but cannot farm a minimum score.
test('반복 오답은 정답 점수까지 감소시키고 처치와 문제 점수의 비중을 구분한다',()=>{
 assert.equal(duelQuestionScore(24),1);assert.equal(duelQuestionScore(25),0);
 assert.ok(duelKillScore(2)>duelKillScore(3));assert.ok(duelQuestionScore(1)>duelQuestionScore(2));
 const s=preparing(),p=s.players[0];quote(s);
 for(let i=0;i<25;i++)assert.equal(applyDuel(s,0,{type:'answer',nonce:'q',answer:'0'},NOW,`many-wrong-${i}`).ok,false);
 assert.ok(correctTower(s).ok);assert.equal(p.questionScore,0);assert.equal(p.answeredQuestions,1);assert.equal(p.stock.basic,1);
 assert.ok(30*duelKillScore(3)>85*duelQuestionScore(0));
});
