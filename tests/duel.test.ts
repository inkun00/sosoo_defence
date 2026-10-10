import {test} from 'node:test';import assert from 'node:assert/strict';
import {createDuel,joinDuel,duelSide,decimalBoard,applyDuel,advanceDuel,validDuelCell,duelLevel,DUEL_PREPARATION_SECONDS,DUEL_SECONDS,DUEL_START_MONEY,DuelState,DuelEnemy,DuelAction} from '../src/multiplayer/duel';
import {duelMap} from '../src/multiplayer/duel-maps';
import {HEROES} from '../src/multiplayer/heroes';import {recipe,numberText} from '../src/math';
const NOW=220000,PREP_NOW=NOW-DUEL_PREPARATION_SECONDS*1000;
function preparation(){const s=createDuel('a','왼쪽',17,PREP_NOW);joinDuel(s,'b','오른쪽',PREP_NOW);applyDuel(s,0,{type:'ready'},PREP_NOW,'r1');applyDuel(s,1,{type:'ready'},PREP_NOW,'r2');assert.equal(s.status,'preparing');return s;}
function match(){const s=preparation();s.players.forEach(p=>p!.lastSeen=NOW);advanceDuel(s,NOW);assert.equal(s.status,'playing');return s;}
function build(s:DuelState,side:0|1,typeId:string,x:number,y:number){const p=s.players[side]!;p.stock[typeId]=(p.stock[typeId]??0)+1;return applyDuel(s,side,{type:'build',typeId,x,y},s.updatedAt,'build');}
function answer(s:DuelState,side:0|1){const q=s.players[side]!.quote!;return applyDuel(s,side,{type:'answer',nonce:q.nonce,answer:numberText(q.before-q.cost)},s.updatedAt,'a');}
function enemy(o:Partial<DuelEnemy>={}):DuelEnemy{return {id:90,owner:1,target:0,hero:null,level:1,hp:500,max:500,x:3,slow:0,stun:0,hits:0,...o};}
function recipeSlots(board:number[],operation:'+'|'-'){
 for(let a=0;a<16;a++)for(let b=0;b<16;b++)for(let c=0;c<16;c++)if(a!==b&&a!==c&&b!==c&&recipe(board[a],board[b],board[c],operation))return [a,b,c];throw Error('No recipe');
}
function solve(s:DuelState,side:0|1){
 const p=s.players[side]!;return applyDuel(s,side,{type:'fuse',round:p.round,slots:recipeSlots(p.board,'+'),operation:'+'},s.updatedAt,'f');
}
test('영웅 30종은 레벨 1~10 각각 3종이며 4프레임 시트와 증가하는 효과를 가진다',()=>{assert.equal(HEROES.length,30);assert.equal(new Set(HEROES.map(h=>h.id)).size,30);for(let l=1;l<=10;l++)assert.equal(HEROES.filter(h=>h.level===l).length,3);for(let i=3;i<30;i++)assert.ok(HEROES[i].hp>HEROES[i-3].hp);assert.ok(HEROES.every(h=>h.hp%10===0));});
test('블럭 16개는 같은 시드와 문제 순서에서 양쪽에 같고 모든 판에 덧셈 해답이 있다',()=>{
 for(let seed=0;seed<40;seed++)for(let round=0;round<10;round++){const a=decimalBoard(seed,round);assert.equal(a.length,16);assert.deepEqual(a,decimalBoard(seed,round));assert.equal(recipeSlots(a,'+').length,3);assert.ok(a.every(v=>v%100===0));}
});
test('두 계정이 준비해야 시작하고 제삼자·다른 방 참가자는 들어갈 수 없다',()=>{const s=createDuel('a','가',17,NOW);applyDuel(s,0,{type:'ready'},NOW,'a');assert.equal(s.status,'waiting');joinDuel(s,'b','나',NOW);assert.throws(()=>joinDuel(s,'c','다',NOW));assert.throws(()=>duelSide(s,'c'));assert.equal(duelSide(s,'b'),1);applyDuel(s,1,{type:'ready'},NOW,'b');assert.equal(s.status,'preparing');assert.equal(s.startedAt,0);});
test('전투 중 타워는 문제 없이 비축 재고로 설치하고 상대 진영·길·점유 칸은 거부한다',()=>{
 const s=match(),p=s.players[0];p.money=0;p.stock.basic=1;
 assert.equal(applyDuel(s,0,{type:'build',x:13,y:2,typeId:'basic'},NOW,'x').ok,false);assert.equal(validDuelCell(s,0,3,3),false);
 assert.ok(applyDuel(s,0,{type:'build',x:3,y:2,typeId:'basic'},NOW,'q').ok);assert.equal(p.money,0);assert.equal(p.stock.basic,0);assert.equal(p.quote,null);
 assert.equal(validDuelCell(s,0,3,2),false);assert.ok(validDuelCell(s,0,4,2));assert.ok(validDuelCell(s,0,4,1));assert.ok(validDuelCell(s,0,5,2));assert.ok(validDuelCell(s,0,5,0));assert.ok(validDuelCell(s,0,6,2));assert.ok(validDuelCell(s,0,3,5));assert.equal(s.players[1]!.money,0);
 assert.equal(applyDuel(s,0,{type:'answer',nonce:'q',answer:'8.7'},NOW,'repeat').ok,false);
 assert.ok(applyDuel(s,0,{type:'sell',towerId:p.towers[0].id},NOW,'reclaim').ok);assert.equal(p.money,0);assert.equal(p.stock.basic,1);assert.ok(validDuelCell(s,0,3,2));
});
test('준비 문제는 취소할 때도 바뀌고 오답 재시도와 상대의 준비 예산은 유지된다',()=>{
 const s=preparation(),p=s.players[0];let previous='';const formulas=new Set<string>();
 for(let i=0;i<12;i++){
  const nonce=`q-${i}`;assert.ok(applyDuel(s,0,{type:'prepare-quote',typeId:'basic'},PREP_NOW,nonce).ok);
  const q=p.quote!,formula=`${q.before}-${q.cost}`;assert.notEqual(formula,previous);previous=formula;formulas.add(formula);
  assert.equal(applyDuel(s,0,{type:'answer',nonce,answer:'0'},PREP_NOW,`wrong-${i}`).ok,false);assert.equal(p.quote,q);
  applyDuel(s,0,{type:'cancel'},PREP_NOW,`cancel-${i}`);
  assert.equal(p.money,DUEL_START_MONEY);assert.equal(s.players[1]!.purchaseVariation,undefined);assert.equal(p.towers.length,0);
 }
 assert.ok(formulas.size>=3);
});
test('준비 종료 뒤에는 전투 보상을 점수로만 반영하고 설치 문제를 띄우지 않는다',()=>{
 const s=match();assert.ok(build(s,0,'basic',3,2).ok);s.players[0].money=0;s.enemies=[enemy({hp:100,max:100})];advanceDuel(s,NOW+100);
 assert.equal(s.players[0].money,0);assert.ok((s.players[0].combatScore??0)>0);assert.equal(s.players[0].escrow,0);assert.equal(s.enemies.length,0);assert.ok(s.elapsed>0);
 const money=s.players[0].money;assert.equal(applyDuel(s,0,{type:'prepare-quote',typeId:'basic'},s.updatedAt,'forged').ok,false);assert.equal(s.players[0].quote,null);assert.equal(s.players[0].money,money);
});
test('양쪽 풀이 속도가 달라도 같은 번호의 문제판을 받으며 정답만 성장량을 올린다',()=>{
 const s=preparation(),initial=[...s.players[0].board];assert.ok(solve(s,0).ok);assert.equal(s.players[0].egg,1);assert.deepEqual(s.players[1]!.board,initial);assert.ok(solve(s,1).ok);assert.deepEqual(s.players[0].board,s.players[1]!.board);
 for(const p of s.players){assert.equal(p!.egg,1);assert.equal(p!.solved,1);assert.equal(p!.round,1);}
 const before=JSON.stringify(s.players[0]);assert.equal(applyDuel(s,0,{type:'fuse',round:0,slots:[0,1,2],operation:'+'},PREP_NOW,'stale').ok,false);assert.equal(JSON.stringify(s.players[0]),before);
 assert.equal(applyDuel(s,0,{type:'fuse',round:1,slots:[0,0,2],operation:'+'},PREP_NOW,'duplicate').ok,false);
});
test('양쪽의 올바른 뺄셈 합성 요청도 거부하고 모든 플레이어 상태를 유지한다',()=>{
 const s=preparation();
 for(const side of [0,1] as const){
  assert.ok(solve(s,side).ok);
  s.players[side]!.escrow=100*(side+1);
 }
 for(const side of [0,1] as const){
  const p=s.players[side]!,slots=recipeSlots(p.board,'-');
  // A stale or forged client can still send subtraction despite the action type.
  const action={type:'fuse',round:p.round,slots,operation:'-'} as unknown as DuelAction;
  const before=structuredClone(s.players),result=applyDuel(s,side,action,PREP_NOW,`subtract-${side}`);
  assert.equal(result.ok,false);assert.match(result.message,/덧셈/);assert.deepEqual(s.players,before);
 }
});
test('연속 정답 성장량은 10을 넘어 누적되고 12에서 레벨 10 소환 후 남은 2를 다시 쓴다',()=>{
 const s=preparation(),p=s.players[0];for(let i=0;i<12;i++)assert.ok(solve(s,0).ok);assert.equal(p.egg,12);assert.equal(p.solved,12);assert.equal(p.answeredQuestions,12);assert.equal(p.round,12);assert.deepEqual(p.heroStock,{});
 const before=structuredClone(s);assert.equal(applyDuel(s,0,{type:'hatch',heroId:'hero-10-0'},PREP_NOW,'early').ok,false);assert.deepEqual(s,before);
 s.players.forEach(player=>player!.lastSeen=NOW);advanceDuel(s,NOW);assert.equal(p.egg,12);
 assert.ok(applyDuel(s,0,{type:'hatch',heroId:'hero-10-0'},NOW,'high').ok);assert.equal(p.egg,2);assert.equal(s.enemies.length,1);assert.equal(s.enemies[0].target,1);assert.equal(s.enemies[0].hp,HEROES.find(h=>h.id==='hero-10-0')!.hp);
 const lowBefore=structuredClone(s);assert.equal(applyDuel(s,0,{type:'hatch',heroId:'hero-3-0'},NOW,'too-high').ok,false);assert.deepEqual(s,lowBefore);
 assert.ok(applyDuel(s,0,{type:'hatch',heroId:'hero-2-0'},NOW,'remaining').ok);assert.equal(p.egg,0);assert.equal(s.enemies.length,2);assert.deepEqual(p.heroStock,{});
});
test('특수효과 영웅은 선택한 레벨만큼 성장량을 소비하고 동반 병사 없이 한 명만 출전한다',()=>{
 const s=match();s.players[1]!.egg=10;assert.ok(applyDuel(s,1,{type:'hatch',heroId:'hero-10-1'},NOW,'h').ok);assert.equal(s.enemies.filter(e=>e.hero).length,1);assert.equal(s.enemies.length,1);assert.ok(s.enemies.every(e=>e.owner===1&&e.target===0));assert.equal(s.players[1]!.egg,0);
});
test('이동 가속은 같은 편에게 적용되고 기존 영웅별 감속 저항은 제거된다',()=>{
 const a=match(),b=match();a.enemies=[enemy({id:1,owner:0,target:1,x:4}),enemy({id:2,owner:0,target:1,x:4,hero:'hero-1-0',level:1})];b.enemies=[enemy({id:1,owner:0,target:1,x:4}),enemy({id:3,owner:1,target:0,x:4,hero:'hero-1-0',level:1})];advanceDuel(a,NOW+1000);advanceDuel(b,NOW+1000);assert.ok(a.enemies[0].x>b.enemies[0].x);
 const c=match();c.enemies=[enemy({id:4,hero:'hero-10-2',level:10,slow:3}),enemy({id:5,hero:'hero-1-2',level:10,slow:3})];advanceDuel(c,NOW+1000);assert.ok(Math.abs(c.enemies[0].x-c.enemies[1].x)<1e-10);
});
test('기본 웨이브는 8초부터 양쪽 성에서 출발하고 시간에 따라 레벨이 증가한다',()=>{const s=match();advanceDuel(s,NOW+8000);assert.equal(s.enemies.length,2);assert.equal(s.enemies[0].hp,s.enemies[1].hp);assert.equal(s.enemies[0].hp%100,0);for(const e of s.enemies){const start=e.owner===0?1:duelMap(s.mapId).length-1;assert.ok(Math.abs(e.pathDistance!-start)<.04);assert.equal(e.target,1-e.owner);}s.players.forEach(p=>p!.lastSeen=NOW+35000);advanceDuel(s,NOW+35000);assert.ok(s.enemies.some(e=>e.level===2));});
test('길의 100명 제한에서는 웨이브가 양쪽 한 쌍으로만 생기고 누락된 웨이브를 밀어내지 않는다',()=>{
 for(const count of [98,99,100]){
  const s=match();s.elapsed=7.9;s.updatedAt=NOW+7900;
  s.enemies=Array.from({length:count},(_,index)=>enemy({id:1000+index,owner:0,target:1,x:1,y:3,pathDistance:1}));
  advanceDuel(s,NOW+8000);const spawned=s.enemies.filter(e=>e.id<1000);
  assert.equal(s.wave,1);assert.equal(s.enemies.length,count===98?100:count);assert.equal(spawned.length,count===98?2:0);
  if(count===98){assert.deepEqual(spawned.map(e=>[e.owner,e.target]),[[1,0],[0,1]]);assert.equal(spawned[0].max,spawned[1].max);}
  // Opening the road after a skipped wave must wait for the next scheduled pair.
  s.enemies=[];advanceDuel(s,NOW+8100);assert.equal(s.enemies.length,0);assert.equal(s.wave,1);
  advanceDuel(s,NOW+16400);assert.equal(s.enemies.length,2);assert.equal(s.wave,2);assert.deepEqual(s.enemies.map(e=>[e.owner,e.target]),[[1,0],[0,1]]);
 }
});
test('180초 동안 몬스터 등장 간격은 8.4초에서 약 3초로 줄고 레벨은 1에서 10으로 오른다',()=>{
 const s=match(),waves:number[]=[],levels=new Set<number>();s.players.forEach(p=>p!.flame=1000000);
 for(let step=1;step<=DUEL_SECONDS*10;step++){
  const now=NOW+step*100,previous=s.wave;s.players.forEach(p=>p!.lastSeen=now);advanceDuel(s,now);levels.add(duelLevel(s));
  if(s.wave>previous)waves.push(step/10);
 }
 assert.equal(waves[0],8);const gaps=waves.slice(1).map((time,index)=>time-waves[index]);assert.ok(Math.abs(gaps[0]-8.4)<1e-7);assert.ok(gaps.at(-1)!<=3.3);
 for(let i=1;i<gaps.length;i++)assert.ok(gaps[i]<=gaps[i-1]+.100001,`wave ${i}: ${gaps[i-1]} -> ${gaps[i]}`);
 assert.deepEqual([...levels],[1,2,3,4,5,6,7,8,9,10]);assert.equal(s.status,'finished');assert.equal(s.elapsed,180);assert.equal(s.winner,null);
});
test('웨이브 일정과 몬스터 이동은 한 번의 큰 틱과 여러 작은 틱에서 일치한다',()=>{
 const a=match(),b=match(),end=NOW+36000;a.players.forEach(p=>p!.lastSeen=end);advanceDuel(a,end);
 for(let step=1;step<=360;step++){const now=NOW+step*100;b.players.forEach(p=>p!.lastSeen=now);advanceDuel(b,now);}
 assert.equal(a.wave,b.wave);assert.equal(a.enemies.length,b.enemies.length);
 for(let i=0;i<a.enemies.length;i++){assert.equal(a.enemies[i].level,b.enemies[i].level);assert.equal(a.enemies[i].max,b.enemies[i].max);assert.ok(Math.abs(a.enemies[i].pathDistance!-b.enemies[i].pathDistance!)<1e-8);}
});
test('처치된 몬스터의 마지막 체력 뺄셈은 발사 기록에 남고 점수는 유효 타격 효율을 따른다',()=>{
 const a=match(),b=match();for(const s of [a,b]){assert.ok(build(s,0,'basic',3,2).ok);s.enemies=[enemy({hp:100,max:500,hits:s===a?2:10})];}
 advanceDuel(a,NOW+100);advanceDuel(b,NOW+100);assert.equal(a.enemies.length,0);assert.equal(a.shots.length,1);assert.equal(a.shots[0].before,100);assert.equal(a.shots[0].unit,100);assert.equal(a.shots[0].after,0);assert.ok(a.players[0].combatScore!>b.players[0].combatScore!);assert.equal(a.players[0].money,0);assert.equal(b.players[0].money,0);
 advanceDuel(a,NOW+3000);assert.equal(a.shots.length,0);
});
test('타워가 회수되어도 발사 기록은 고유 발사체 종류와 출발 칸을 유지한다',()=>{
 const s=match();assert.ok(build(s,0,'double',3,2).ok);
 s.enemies=[enemy({hp:500,max:500})];advanceDuel(s,NOW+100);
 const shot=s.shots[0];assert.ok(shot);assert.equal(shot.typeId,'double');assert.equal(shot.fromX,3);assert.equal(shot.fromY,2);
 assert.ok(applyDuel(s,0,{type:'sell',towerId:shot.towerId},s.updatedAt,'sold').ok);
 assert.equal(s.players[0].towers.length,0);assert.equal(s.shots[0],shot);assert.equal(shot.fromX,3);
});
test('호스트 판정은 초과 피해를 거부하고 상대 불꽃 파괴·시간제한·연결 종료를 처리한다',()=>{
 const s=match();assert.ok(build(s,0,'double',3,2).ok);s.enemies=[enemy({hp:100,max:100})];advanceDuel(s,NOW+100);assert.equal(s.enemies[0].hp,100);assert.ok(s.log.some(l=>l.includes('공격력이')));
 const win=match();win.players[1]!.flame=1000;win.enemies=[enemy({owner:0,target:1,x:22.99,hero:'hero-1-0'})];advanceDuel(win,NOW+1000);assert.equal(win.status,'finished');assert.equal(win.winner,0);
 const timeout=match();timeout.elapsed=DUEL_SECONDS-.05;advanceDuel(timeout,NOW+100);assert.equal(timeout.status,'finished');assert.equal(timeout.winner,null);
 const offline=match();offline.players[0].lastSeen=NOW+50000;advanceDuel(offline,NOW+50000);assert.equal(offline.winner,0);assert.equal(offline.status,'finished');
});
