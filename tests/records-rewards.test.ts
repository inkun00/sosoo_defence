import test from 'node:test';
import assert from 'node:assert/strict';
import {createDuel,joinDuel} from '../src/multiplayer/duel';
import {COMPUTER_OPPONENTS} from '../src/multiplayer/computer-opponents';
import {accountLevel,accountLevelThreshold,computerOpponentLevel,emptyProgress,finishedRecord,matchExperience,normalizeProgress,progressAfter,validRecord,type MatchRecord} from '../src/multiplayer/records';
import {matchLevels,rewardedRecord} from '../functions/src/record-rewards';

const now=Date.now(),id='aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
const record=(extra:Partial<MatchRecord>={}):MatchRecord=>({version:1,matchId:id,hostUid:'human-a',guestUid:'human-b',side:0,outcome:'win',endedAt:now,duration:30,solved:2,purchases:1,wrongQuestions:[],...extra});
const cpu=(level=10):MatchRecord=>record({matchId:`computer-${now}-4294967295`,guestUid:'computer-'+COMPUTER_OPPONENTS[level-1].id,opponentType:'computer',opponentLevel:level});

test('the original XP thresholds remain valid through level 10 and higher XP keeps accumulating',()=>{
 for(let level=1;level<=10;level++){
  const threshold=100*level*(level-1)/2;
  assert.equal(accountLevelThreshold(level),threshold);assert.equal(accountLevel(threshold),level);
  if(level>1)assert.equal(accountLevel(threshold-1),level-1);
 }
 assert.equal(accountLevel(4499),9);assert.equal(accountLevel(4500),10);assert.equal(accountLevel(50000),10);
 const after=progressAfter({wins:7,losses:3,draws:2,experience:50000,level:32},cpu(10));
 assert.deepEqual(after,{wins:8,losses:3,draws:2,experience:51015,level:10});
});

test('loaded progress derives level from XP and preserves existing wins and raw XP',()=>{
 assert.deepEqual(normalizeProgress({wins:24,losses:10,draws:3,experience:7200,level:99}),{wins:24,losses:10,draws:3,experience:7200,level:10});
 assert.deepEqual(normalizeProgress({wins:2,losses:1,draws:0,experience:99,level:10}),{wins:2,losses:1,draws:0,experience:99,level:1});
 assert.deepEqual(normalizeProgress(undefined),emptyProgress());
 assert.deepEqual(normalizeProgress({wins:-1,losses:NaN,draws:Infinity,experience:-20}),emptyProgress());
 assert.equal(accountLevel(NaN),1);assert.equal(accountLevel(-100),1);
});

test('winning a higher-level duel awards more XP while old records and effort limits remain compatible',()=>{
 const rewards=Array.from({length:10},(_,i)=>matchExperience(record({opponentLevel:i+1})));
 assert.deepEqual(rewards,[115,215,315,415,515,615,715,815,915,1015]);
 assert.equal(matchExperience(record()),115,'old v1 records retain a level-1 preview');
 assert.equal(matchExperience(record({opponentLevel:10,solved:1600,purchases:1600})),1250);
 assert.equal(matchExperience(record({opponentLevel:10,outcome:'loss'})),55);
 assert.equal(matchExperience(record({opponentLevel:10,outcome:'draw'})),75);
 assert.equal(matchExperience(record({opponentLevel:10,duration:9})),0);
});

test('reserved computer identities match all actual opponents and legacy v1 uploads still validate',()=>{
 COMPUTER_OPPONENTS.forEach(opponent=>assert.equal(computerOpponentLevel('computer-'+opponent.id),opponent.level));
 assert.equal(computerOpponentLevel('computer-fake'),null);assert.equal(computerOpponentLevel('human-b'),null);
 assert.deepEqual(validRecord(record(),'human-a',now),record());
 assert.deepEqual(validRecord(cpu(),'human-a',now),cpu());
 const legacy=cpu();delete legacy.opponentType;delete legacy.opponentLevel;
 assert.deepEqual(validRecord(legacy,'human-a',now),legacy,'optional metadata does not invalidate older pending records');
 assert.equal(validRecord({...cpu(),matchId:id},'human-a',now).opponentLevel,10,'UUID-backed computer recordings also remain valid');
});

test('a computer upload rejects spoofed opponents, mismatched levels and invalid local match IDs',()=>{
 for(const invalid of [
  {...cpu(1),opponentLevel:10}, {...cpu(),guestUid:'computer-made-up'}, {...cpu(),opponentType:'player'},
  {...cpu(),opponentLevel:0}, {...cpu(),opponentLevel:11}, {...cpu(),opponentLevel:1.5},
  {...cpu(),matchId:`computer-${now}-4294967296`}, {...cpu(),matchId:'computer-1-2'},
  {...cpu(),hostUid:cpu().guestUid,guestUid:'human-a',side:1},
 ])assert.throws(()=>validRecord(invalid,'human-a',now));
 assert.throws(()=>validRecord({...record(),matchId:cpu().matchId},'human-a',now),'a player duel cannot claim the local CPU namespace');
});

test('a newly completed computer duel carries the actual selected opponent into the pending record',()=>{
 const state=createDuel('human-a','플레이어',1,now,3);joinDuel(state,'computer-'+COMPUTER_OPPONENTS[5].id,'룬 기사',now,6);
 state.status='finished';state.startedAt=now;state.elapsed=30;state.winner=0;
 const before=structuredClone(state),saved=finishedRecord(state,0,`computer-${now}-1`)!;
 assert.equal(saved.opponentType,'computer');assert.equal(saved.opponentLevel,6);assert.equal(matchExperience(saved),600);
 assert.deepEqual(state,before,'recording never changes the authoritative duel');
 assert.deepEqual(validRecord(saved,'human-a',Date.now()),saved);
});

test('PvP reward levels come from server XP, ignoring submitted and cached level hints',()=>{
 const submitted=record({opponentType:'player',opponentLevel:10});
 const levels=matchLevels(submitted,{experience:99,level:10},{experience:300,level:99});
 assert.deepEqual(levels,{hostLevel:1,guestLevel:3});
 const canonical=rewardedRecord(submitted,levels);assert.equal(canonical.opponentLevel,3);assert.equal(matchExperience(canonical),315);
 assert.equal(submitted.opponentLevel,10,'canonicalization does not modify the queued client record');
});

test('both players reuse the initial level snapshot even when the first saved result causes a level-up',()=>{
 const first=record({outcome:'loss',opponentLevel:9}),beforeHost={experience:99},beforeGuest={experience:300};
 const levels=matchLevels(first,beforeHost,beforeGuest),afterHost=progressAfter(normalizeProgress(beforeHost),rewardedRecord(first,levels));
 assert.equal(afterHost.level,2);
 const second=record({side:1,outcome:'win',opponentLevel:10}),frozen=matchLevels(second,afterHost,beforeGuest,levels);
 assert.deepEqual(frozen,levels);assert.equal(rewardedRecord(second,frozen).opponentLevel,1);assert.equal(matchExperience(rewardedRecord(second,frozen)),115);
});

test('computer rewards derive the selected fixed level and legacy match headers can gain a snapshot',()=>{
 const r=cpu(8),levels=matchLevels(r,{experience:12000,level:77},{experience:0,level:1});
 assert.deepEqual(levels,{hostLevel:10,guestLevel:8});assert.equal(matchExperience(rewardedRecord(r,levels)),815);
 assert.deepEqual(matchLevels(record(),{experience:300},{experience:100},{}),{hostLevel:3,guestLevel:2});
 assert.throws(()=>matchLevels(record(),{}, {},{hostLevel:3}));
 assert.throws(()=>matchLevels(record(),{}, {},{hostLevel:0,guestLevel:3}));
 assert.throws(()=>matchLevels(record(),{}, {},{hostLevel:3,guestLevel:11}));
});
