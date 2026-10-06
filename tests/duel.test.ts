import {test} from 'node:test';import assert from 'node:assert/strict';
import {createDuel,joinDuel,duelSide,decimalBoard,applyDuel,advanceDuel,validDuelCell,DuelState,DuelEnemy} from '../src/multiplayer/duel';
import {HEROES} from '../src/multiplayer/heroes';import {recipe,numberText} from '../src/math';
const NOW=100000;
function match(){const s=createDuel('a','왼쪽',17,NOW);joinDuel(s,'b','오른쪽',NOW);applyDuel(s,0,{type:'ready'},NOW,'r1');applyDuel(s,1,{type:'ready'},NOW,'r2');return s;}
function answer(s:DuelState,side:0|1){const q=s.players[side]!.quote!;return applyDuel(s,side,{type:'answer',nonce:q.nonce,answer:numberText(q.before-q.cost)},s.updatedAt,'a');}
function enemy(o:Partial<DuelEnemy>={}):DuelEnemy{return {id:90,owner:1,target:0,hero:null,level:1,hp:500,max:500,x:3,slow:0,stun:0,hits:0,...o};}
function solve(s:DuelState,side:0|1,operation:'+'|'-'='+'){
 const p=s.players[side]!;for(let a=0;a<16;a++)for(let b=0;b<16;b++)for(let c=0;c<16;c++)if(a!==b&&a!==c&&b!==c&&recipe(p.board[a],p.board[b],p.board[c],operation))return applyDuel(s,side,{type:'fuse',round:p.round,slots:[a,b,c],operation},s.updatedAt,'f');throw Error('No recipe');
}
test('영웅 30종은 레벨 1~10 각각 3종이며 4프레임 시트와 증가하는 효과를 가진다',()=>{assert.equal(HEROES.length,30);assert.equal(new Set(HEROES.map(h=>h.id)).size,30);for(let l=1;l<=10;l++)assert.equal(HEROES.filter(h=>h.level===l).length,3);for(let i=3;i<30;i++)assert.ok(HEROES[i].hp>HEROES[i-3].hp);assert.ok(HEROES.every(h=>h.hp%10===0));});
test('블럭 16개는 같은 시드와 문제 순서에서 양쪽에 같고 모든 판에 덧셈·뺄셈 해답이 있다',()=>{
 for(let seed=0;seed<40;seed++)for(let round=0;round<10;round++){const a=decimalBoard(seed,round);assert.equal(a.length,16);assert.deepEqual(a,decimalBoard(seed,round));for(const op of ['+','-'] as const)assert.ok(a.some((v,i)=>a.some((w,j)=>i!==j&&a.some((z,k)=>k!==i&&k!==j&&recipe(v,w,z,op)))));assert.ok(a.every(v=>v%100===0));}
});
test('두 계정이 준비해야 시작하고 제삼자·다른 방 참가자는 들어갈 수 없다',()=>{const s=createDuel('a','가',17,NOW);applyDuel(s,0,{type:'ready'},NOW,'a');assert.equal(s.status,'waiting');joinDuel(s,'b','나',NOW);assert.throws(()=>joinDuel(s,'c','다',NOW));assert.throws(()=>duelSide(s,'c'));assert.equal(duelSide(s,'b'),1);applyDuel(s,1,{type:'ready'},NOW,'b');assert.equal(s.status,'playing');});
test('기존 타워 구매처럼 정답에만 차감·설치하고 상대 진영·길·점유 칸만 거부한다',()=>{
 const s=match();assert.equal(applyDuel(s,0,{type:'quote',x:13,y:2,typeId:'basic'},NOW,'x').ok,false);assert.equal(validDuelCell(s,0,3,3),false);
 assert.ok(applyDuel(s,0,{type:'quote',x:3,y:2,typeId:'basic'},NOW,'q').ok);assert.equal(s.players[0].money,8800);assert.equal(s.players[0].towers.length,0);
 assert.equal(applyDuel(s,0,{type:'answer',nonce:'q',answer:'1'},NOW,'w').ok,false);assert.equal(s.players[0].money,8800);assert.ok(answer(s,0).ok);assert.equal(s.players[0].money,8700);
 assert.equal(validDuelCell(s,0,3,2),false);assert.ok(validDuelCell(s,0,4,2));assert.ok(validDuelCell(s,0,4,1));assert.ok(validDuelCell(s,0,5,2));assert.ok(validDuelCell(s,0,5,0));assert.ok(validDuelCell(s,0,6,2));assert.ok(validDuelCell(s,0,3,5));assert.equal(s.players[1]!.money,8800);
 assert.equal(applyDuel(s,0,{type:'answer',nonce:'q',answer:'8.7'},NOW,'repeat').ok,false);
 assert.ok(applyDuel(s,0,{type:'sell',towerId:s.players[0].towers[0].id},NOW,'reclaim').ok);assert.ok(validDuelCell(s,0,5,2),'회수한 칸은 다시 사용할 수 있다');
});

test('1:1 구매 문제도 취소·회수마다 달라지고 오답 재시도와 상대의 견적은 유지된다',()=>{
 const s=match(),p=s.players[0];let previous='';const formulas=new Set<string>();
 for(let i=0;i<12;i++){
  const nonce=`q-${i}`;assert.ok(applyDuel(s,0,{type:'quote',x:3,y:2,typeId:'basic'},NOW,nonce).ok);
  const q=p.quote!,formula=`${q.before}-${q.cost}`;assert.notEqual(formula,previous);previous=formula;formulas.add(formula);
  assert.equal(applyDuel(s,0,{type:'answer',nonce,answer:'0'},NOW,`wrong-${i}`).ok,false);assert.equal(p.quote,q);
  if(i%2===0)applyDuel(s,0,{type:'cancel'},NOW,`cancel-${i}`);
  else {assert.ok(answer(s,0).ok);assert.ok(applyDuel(s,0,{type:'sell',towerId:p.towers[0].id},NOW,`sell-${i}`).ok);}
  assert.equal(p.money,8800);assert.equal(s.players[1]!.purchaseVariation,undefined);
 }
 assert.ok(formulas.size>=3);
});
test('계산 중 전투가 계속되고 보상은 보관 후 문제 종료에 반영되며 만료도 환급한다',()=>{
 const s=match();applyDuel(s,0,{type:'quote',x:3,y:2,typeId:'basic'},NOW,'a');answer(s,0);applyDuel(s,0,{type:'quote',x:6,y:2,typeId:'double'},NOW,'b');s.enemies=[enemy({hp:100,max:100})];advanceDuel(s,NOW+100);
 assert.equal(s.players[0].money,8700);assert.ok(s.players[0].escrow>0);assert.equal(s.enemies.length,0);assert.ok(s.elapsed>0);const escrow=s.players[0].escrow;
 applyDuel(s,0,{type:'cancel'},s.updatedAt,'c');assert.equal(s.players[0].money,8700+escrow);assert.equal(s.players[0].escrow,0);
 applyDuel(s,0,{type:'quote',x:6,y:2,typeId:'double'},s.updatedAt,'expiry');s.players[0].escrow=1234;s.players[0].quote!.expires=s.updatedAt+10;advanceDuel(s,s.updatedAt+20);assert.equal(s.players[0].quote,null);assert.equal(s.players[0].escrow,0);
});
test('양쪽 풀이 속도가 달라도 같은 번호의 문제판을 받으며 정답만 알 레벨을 올린다',()=>{
 const s=match(),initial=[...s.players[0].board];assert.ok(solve(s,0).ok);assert.equal(s.players[0].egg,1);assert.deepEqual(s.players[1]!.board,initial);assert.ok(solve(s,1,'-').ok);assert.deepEqual(s.players[0].board,s.players[1]!.board);
 const before=JSON.stringify(s.players[0]);assert.equal(applyDuel(s,0,{type:'fuse',round:0,slots:[0,1,2],operation:'+'},NOW,'stale').ok,false);assert.equal(JSON.stringify(s.players[0]),before);
 assert.equal(applyDuel(s,0,{type:'fuse',round:1,slots:[0,0,2],operation:'+'},NOW,'duplicate').ok,false);
});
test('연속 정답으로 최고 10레벨 알 한 개만 성장하고 부화는 현재 레벨 영웅 한 마리다',()=>{
 const s=match();for(let i=0;i<10;i++)assert.ok(solve(s,0).ok);assert.equal(s.players[0].egg,10);const board=[...s.players[0].board];assert.equal(solve(s,0).ok,false);assert.deepEqual(s.players[0].board,board);
 assert.equal(applyDuel(s,0,{type:'hatch',heroId:'hero-1-0'},NOW,'wrong').ok,false);assert.ok(applyDuel(s,0,{type:'hatch',heroId:'hero-10-0'},NOW,'right').ok);assert.equal(s.enemies.length,1);assert.equal(s.enemies[0].target,1);assert.equal(s.enemies[0].hp,HEROES.find(h=>h.id==='hero-10-0')!.hp);assert.equal(s.players[0].egg,0);assert.equal(applyDuel(s,0,{type:'hatch',heroId:'hero-10-0'},NOW,'duplicate').ok,false);
});
test('군집 영웅은 알 한 개만 소비하고 레벨이 높을수록 더 많은 돌 병사를 데려온다',()=>{
 const s=match();s.players[1]!.egg=10;assert.ok(applyDuel(s,1,{type:'hatch',heroId:'hero-10-1'},NOW,'h').ok);assert.equal(s.enemies.filter(e=>e.hero).length,1);assert.equal(s.enemies.length,5);assert.ok(s.enemies.every(e=>e.owner===1&&e.target===0));assert.equal(s.players[1]!.egg,0);
});
test('가속은 같은 방향의 주변 아군에게만 적용되고 수호 영웅의 감속 저항이 증가한다',()=>{
 const a=match(),b=match();a.enemies=[enemy({id:1,owner:0,target:1,x:4}),enemy({id:2,owner:0,target:1,x:4,hero:'hero-10-0',level:10,hp:36750,max:36750})];b.enemies=[enemy({id:1,owner:0,target:1,x:4}),enemy({id:3,owner:1,target:0,x:4,hero:'hero-10-0',level:10,hp:36750,max:36750})];advanceDuel(a,NOW+1000);advanceDuel(b,NOW+1000);assert.ok(a.enemies[0].x>b.enemies[0].x);
 const c=match();c.enemies=[enemy({id:4,hero:'hero-10-2',level:10,slow:3}),enemy({id:5,hero:'hero-1-2',level:10,slow:3})];advanceDuel(c,NOW+1000);assert.ok(c.enemies[0].x<c.enemies[1].x);
});
test('기본 웨이브는 8초부터 양쪽 대칭이고 시간에 따라 레벨이 증가한다',()=>{const s=match();advanceDuel(s,NOW+8000);assert.equal(s.enemies.length,2);assert.equal(s.enemies[0].hp,s.enemies[1].hp);assert.equal(s.enemies[0].hp%100,0);s.players.forEach(p=>p!.lastSeen=NOW+35000);advanceDuel(s,NOW+35000);assert.ok(s.enemies.some(e=>e.level===2));});
test('처치된 몬스터의 마지막 체력 뺄셈도 발사 기록에 남고 실제 코인 보상은 유효 타격 효율을 따른다',()=>{
 const a=match(),b=match();for(const s of [a,b]){applyDuel(s,0,{type:'quote',x:3,y:2,typeId:'basic'},NOW,'shot');answer(s,0);s.enemies=[enemy({hp:100,max:500,hits:s===a?2:10})];}
 const before=a.players[0].money;advanceDuel(a,NOW+100);advanceDuel(b,NOW+100);assert.equal(a.enemies.length,0);assert.equal(a.shots.length,1);assert.equal(a.shots[0].before,100);assert.equal(a.shots[0].unit,100);assert.equal(a.shots[0].after,0);assert.ok(a.players[0].money>b.players[0].money);assert.ok(a.players[0].money-before<=9000);assert.equal(a.players[0].money%100,0);
 advanceDuel(a,NOW+3000);assert.equal(a.shots.length,0);
});
test('호스트 판정은 초과 피해를 거부하고 상대 불꽃 파괴·시간제한·연결 종료를 처리한다',()=>{
 const s=match();applyDuel(s,0,{type:'quote',x:3,y:2,typeId:'double'},NOW,'t');answer(s,0);s.enemies=[enemy({hp:100,max:100})];advanceDuel(s,NOW+100);assert.equal(s.enemies[0].hp,100);assert.ok(s.log.some(l=>l.includes('공격력이')));
 const win=match();win.players[1]!.flame=1000;win.enemies=[enemy({owner:0,target:1,x:22.99,hero:'hero-1-0'})];advanceDuel(win,NOW+1000);assert.equal(win.status,'finished');assert.equal(win.winner,0);
 const timeout=match();timeout.elapsed=299.95;advanceDuel(timeout,NOW+100);assert.equal(timeout.status,'finished');assert.equal(timeout.winner,null);
 const offline=match();offline.players[0].lastSeen=NOW+50000;advanceDuel(offline,NOW+50000);assert.equal(offline.winner,0);assert.equal(offline.status,'finished');
});
