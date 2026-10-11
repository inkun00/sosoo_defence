import {test} from 'node:test';
import assert from 'node:assert/strict';
import {duelClocks,formatDuelClock,type DuelClockInput} from '../src/multiplayer/duel-clock';
import {advanceDuel,applyDuel,createDuel,joinDuel,DUEL_PREPARATION_SECONDS,DUEL_SECONDS} from '../src/multiplayer/duel';

const state=(status:DuelClockInput['status'],preparationElapsed=0,elapsed=0):DuelClockInput=>({status,preparationElapsed,elapsed});
test('준비 전에는 준비 3분·전투 3분을 각각 대기 상태로 표시한다',()=>{
 const expected={preparationSeconds:180,battleSeconds:180,preparationActive:false,battleActive:false,preparationState:'waiting',battleState:'waiting'};
 for(const input of [undefined,null,state('waiting'),state('waiting',45,30)])assert.deepEqual(duelClocks(input),expected);
});

test('준비 동안 준비 시계만 줄고 전투 시계는 3분을 유지한다',()=>{
 for(const [elapsed,seconds] of [[0,180],[.001,180],[59.999,121],[60,120],[120,60],[179.999,1],[180,0]]){
  assert.deepEqual(duelClocks(state('preparing',elapsed,70)),{preparationSeconds:seconds,battleSeconds:180,preparationActive:true,battleActive:false,preparationState:'active',battleState:'waiting'});
 }
});

test('전투에서는 준비 완료와 전투 잔량을 분리하고 경계에서 00:00이 된다',()=>{
 for(const [elapsed,seconds] of [[0,180],[.001,180],[59.999,121],[60,120],[179.999,1],[180,0]]){
  assert.deepEqual(duelClocks(state('playing',180,elapsed)),{preparationSeconds:0,battleSeconds:seconds,preparationActive:false,battleActive:true,preparationState:'complete',battleState:'active'});
 }
 assert.equal(formatDuelClock(duelClocks(state('playing',180,180)).battleSeconds),'00:00');
});

test('중도 종료는 양쪽 활성 표시를 끄고 실제 준비 또는 전투 잔량을 보존한다',()=>{
 assert.deepEqual(duelClocks(state('finished',70.2)),{preparationSeconds:110,battleSeconds:180,preparationActive:false,battleActive:false,preparationState:'complete',battleState:'waiting'});
 assert.deepEqual(duelClocks(state('finished',180,42.2)),{preparationSeconds:0,battleSeconds:138,preparationActive:false,battleActive:false,preparationState:'complete',battleState:'complete'});
 assert.deepEqual(duelClocks(state('finished',180,0)),{preparationSeconds:0,battleSeconds:180,preparationActive:false,battleActive:false,preparationState:'complete',battleState:'complete'});
 assert.deepEqual(duelClocks(state('finished',0,42.2)),duelClocks(state('finished',180,42.2)),'전투 경과가 있으면 이전 준비 경과 누락에도 전투 시작을 판정한다');
 assert.deepEqual(duelClocks(state('finished')),duelClocks(null));
 const timedOut=duelClocks(state('finished',180,180));assert.equal(timedOut.preparationSeconds,0);assert.equal(timedOut.battleSeconds,0);assert.equal(timedOut.preparationActive||timedOut.battleActive,false);
});

test('경과 값이 경계를 벗어나도 시계는 0~180초이며 잘못된 숫자는 준비 잔량을 늘리지 않는다',()=>{
 for(const [elapsed,seconds] of [[-1,180],[-Infinity,180],[NaN,180],[181,0],[Infinity,0]]){
  assert.equal(duelClocks(state('preparing',elapsed)).preparationSeconds,seconds);assert.equal(duelClocks(state('playing',180,elapsed)).battleSeconds,seconds);
 }
});

test('소수 틱의 미세 오차는 1초를 더 표시하지 않고 실제 남은 소수 초는 올림한다',()=>{
 assert.equal(duelClocks(state('playing',180,60-1e-10)).battleSeconds,120);
 assert.equal(duelClocks(state('playing',180,60-1e-6)).battleSeconds,121);
 assert.equal(duelClocks(state('preparing',180-1e-10)).preparationSeconds,0);
 assert.equal(duelClocks(state('preparing',180-1e-6)).preparationSeconds,1);
});

test('표시는 초 단위로 올림하고 분·초를 두 자리로 출력한다',()=>{
 for(const [seconds,label] of [[0,'00:00'],[.001,'00:01'],[59,'00:59'],[59.01,'01:00'],[60,'01:00'],[179.99,'03:00'],[180,'03:00'],[360,'06:00'],[-1,'00:00'],[NaN,'00:00'],[Infinity,'00:00']] as const)assert.equal(formatDuelClock(seconds),label);
});

test('실제 대전의 준비·전투·기권 단계에서도 두 시계는 실제 경과를 따른다',()=>{
 const now=100000,s=createDuel('a','왼쪽',17,now);joinDuel(s,'b','오른쪽',now);applyDuel(s,0,{type:'ready'},now,'a');applyDuel(s,1,{type:'ready'},now,'b');
 const tick=(at:number)=>{s.players.forEach(p=>p!.lastSeen=at);advanceDuel(s,at);};
 tick(now+45000);const stopped=structuredClone(s);assert.equal(duelClocks(s).preparationSeconds,DUEL_PREPARATION_SECONDS-45);applyDuel(stopped,0,{type:'surrender'},stopped.updatedAt,'quit-prep');assert.equal(duelClocks(stopped).preparationSeconds,135);assert.equal(duelClocks(stopped).battleSeconds,DUEL_SECONDS);assert.equal(duelClocks(stopped).preparationActive,false);
 tick(now+DUEL_PREPARATION_SECONDS*1000);assert.equal(duelClocks(s).preparationSeconds,0);assert.equal(duelClocks(s).battleSeconds,DUEL_SECONDS);assert.equal(duelClocks(s).battleActive,true);
 tick(now+(DUEL_PREPARATION_SECONDS+12)*1000);applyDuel(s,0,{type:'surrender'},s.updatedAt,'quit-battle');const final=duelClocks(s);assert.equal(final.preparationSeconds,0);assert.equal(final.battleSeconds,168);assert.equal(final.preparationActive||final.battleActive,false);
});
