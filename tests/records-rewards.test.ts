import test from 'node:test';
import assert from 'node:assert/strict';
import {createDuel,joinDuel} from '../src/multiplayer/duel';
import {COMPUTER_OPPONENTS} from '../src/multiplayer/computer-opponents';
import {ACCOUNT_LEVEL_MAX,accountLevel,accountLevelThreshold,computerOpponentLevel,emptyProgress,finishedRecord,matchExperience,normalizeProgress,progressAfter,validRecord,type MatchRecord} from '../src/multiplayer/records';
import {matchLevels,rewardedRecord} from '../functions/src/record-rewards';

const now=Date.now(),id='aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
const record=(extra:Partial<MatchRecord>={}):MatchRecord=>({version:1,matchId:id,hostUid:'human-a',guestUid:'human-b',side:0,outcome:'win',endedAt:now,duration:30,solved:2,purchases:1,wrongQuestions:[],...extra});
const cpu=(level=10):MatchRecord=>record({matchId:`computer-${now}-4294967295`,guestUid:'computer-'+COMPUTER_OPPONENTS[level-1].id,opponentType:'computer',opponentLevel:level});

test('the original XP curve extends through level 50 and higher XP keeps accumulating',()=>{
 assert.equal(ACCOUNT_LEVEL_MAX,50);
 for(let level=1;level<=50;level++){
  const threshold=100*level*(level-1)/2;
  assert.equal(accountLevelThreshold(level),threshold);assert.equal(accountLevel(threshold),level);
  if(level>1)assert.equal(accountLevel(threshold-1),level-1);
 }
 assert.equal(accountLevel(4499),9);assert.equal(accountLevel(4500),10);assert.equal(accountLevel(50000),32);
 assert.equal(accountLevel(122499),49);assert.equal(accountLevel(122500),50);assert.equal(accountLevel(Number.MAX_SAFE_INTEGER),50);
 assert.equal(accountLevelThreshold(100),122500);assert.equal(accountLevelThreshold(0),0);
 const after=progressAfter({wins:7,losses:3,draws:2,experience:50000,level:32},cpu(10));
 assert.deepEqual(after,{wins:8,losses:3,draws:2,experience:50063,level:32});
 const capped=progressAfter({wins:Number.MAX_SAFE_INTEGER,losses:0,draws:0,experience:Number.MAX_SAFE_INTEGER,level:50},cpu());
 assert.equal(capped.experience,Number.MAX_SAFE_INTEGER);assert.equal(capped.wins,Number.MAX_SAFE_INTEGER);assert.equal(capped.level,50);
});

test('loaded progress derives level from XP and preserves existing wins and raw XP',()=>{
 assert.deepEqual(normalizeProgress({wins:24,losses:10,draws:3,experience:7200,level:99}),{wins:24,losses:10,draws:3,experience:7200,level:12});
 assert.deepEqual(normalizeProgress({wins:2,losses:1,draws:0,experience:99,level:10}),{wins:2,losses:1,draws:0,experience:99,level:1});
 assert.deepEqual(normalizeProgress(undefined),emptyProgress());
 assert.deepEqual(normalizeProgress({wins:-1,losses:NaN,draws:Infinity,experience:-20}),emptyProgress());
 assert.equal(accountLevel(NaN),1);assert.equal(accountLevel(-100),1);
});

test('PvP rewards use the reduced base through level 50 while old records and effort limits remain compatible',()=>{
 const rewards=Array.from({length:50},(_,i)=>matchExperience(record({opponentLevel:i+1})));
 assert.deepEqual(rewards,Array.from({length:50},(_,i)=>30*(i+1)+3));
 assert.equal(matchExperience(record()),33,'old v1 records retain a level-1 preview');
 assert.equal(matchExperience(record({opponentLevel:50,solved:1600,purchases:1600})),1550);
 assert.equal(matchExperience(record({opponentLevel:10,outcome:'loss'})),15);
 assert.equal(matchExperience(record({opponentLevel:10,outcome:'draw'})),21);
 assert.equal(matchExperience(record({opponentLevel:10,duration:9})),0);
 assert.equal(matchExperience(record({opponentLevel:10}),10,10),303);
 assert.equal(matchExperience(record({opponentType:'computer',opponentLevel:10}),10,50),303,'unreserved player IDs never activate CPU scaling');
});

test('CPU wins apply the relative level difference to the reduced equal-level reward',()=>{
 const r=cpu(5);
 assert.equal(matchExperience(r,5,5),153);
 assert.equal(matchExperience(r,5,4),168,'one level stronger adds 10% of the reduced base');
 assert.equal(matchExperience(r,5,6),138,'one level weaker removes 10% of the reduced base');
 for(let opponent=1;opponent<=10;opponent++){
  assert.equal(matchExperience(cpu(opponent),opponent,opponent),30*opponent+3);
  let previous=Infinity;
  for(let own=1;own<=50;own++){
   const reward=matchExperience(cpu(opponent),opponent,own);
   assert.ok(Number.isSafeInteger(reward));assert.ok(reward<=previous,'an account level-up never increases the same CPU reward');
   assert.ok(reward>=6*opponent+3&&reward<=45*opponent+3,'all valid account levels remain in the bounded reward range');previous=reward;
  }
 }
});

test('CPU rewards stay within 20 to 150 percent and reduced learning bonuses remain available',()=>{
 assert.equal(matchExperience(cpu(1),1,10),9);
 assert.equal(matchExperience(cpu(1),1,50),9);assert.equal(matchExperience(cpu(1),1,100),9);
 assert.equal(matchExperience(cpu(10),10,1),453);
 assert.equal(matchExperience(cpu(10),10,0),453);
 assert.equal(matchExperience(cpu(10),10,5),453);assert.equal(matchExperience(cpu(10),10,6),423);
 assert.equal(matchExperience({...cpu(1),solved:1600,purchases:1600},1,50),56,'all 50 learning XP remain available against easier opponents');
 assert.equal(matchExperience({...cpu(10),outcome:'loss'},10,1),15);
 assert.equal(matchExperience({...cpu(10),outcome:'draw'},10,1),21);
 assert.equal(matchExperience({...cpu(10),duration:9},10,1),0);
});

test('CPU reward calculations derive the opponent from its reserved ID, including legacy and forged hints',()=>{
 const legacy=cpu(5);delete legacy.opponentType;delete legacy.opponentLevel;
 assert.equal(matchExperience(legacy,1,5),153);
 assert.equal(matchExperience({...cpu(5),opponentType:'player',opponentLevel:50},50,5),153);
 assert.equal(matchExperience({...cpu(1),opponentLevel:10},10,10),9);
});

test('CPU progress uses persisted XP before the win rather than a submitted or newly earned level',()=>{
 const before={wins:3,losses:1,draws:0,experience:1499,level:1},r=cpu(5);
 const first=progressAfter(before,r);assert.equal(first.experience,1652);assert.equal(first.level,6);assert.equal(first.wins,4);
 const second=progressAfter(first,r);assert.equal(second.experience,1790);assert.equal(second.level,6);assert.equal(second.wins,5);
 assert.equal(second.experience-first.experience,138,'the next saved result sees the newly persisted level');
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
 assert.equal(saved.opponentType,'computer');assert.equal(saved.opponentLevel,6);assert.equal(matchExperience(saved,6,3),234);
 assert.deepEqual(state,before,'recording never changes the authoritative duel');
 assert.deepEqual(validRecord(saved,'human-a',Date.now()),saved);
});

test('PvP reward levels come from server XP, ignoring submitted and cached level hints',()=>{
 const submitted=record({opponentType:'player',opponentLevel:10});
 const levels=matchLevels(submitted,{experience:99,level:10},{experience:300,level:99});
 assert.deepEqual(levels,{hostLevel:1,guestLevel:3});
 const canonical=rewardedRecord(submitted,levels);assert.equal(canonical.opponentLevel,3);assert.equal(matchExperience(canonical),93);
 assert.equal(submitted.opponentLevel,10,'canonicalization does not modify the queued client record');
});

test('both players reuse the initial level snapshot even when the first saved result causes a level-up',()=>{
 const first=record({outcome:'loss',opponentLevel:9}),beforeHost={experience:99},beforeGuest={experience:300};
 const levels=matchLevels(first,beforeHost,beforeGuest),afterHost=progressAfter(normalizeProgress(beforeHost),rewardedRecord(first,levels));
 assert.equal(afterHost.level,2);
 const second=record({side:1,outcome:'win',opponentLevel:10}),frozen=matchLevels(second,afterHost,beforeGuest,levels);
 assert.deepEqual(frozen,levels);assert.equal(rewardedRecord(second,frozen).opponentLevel,1);assert.equal(matchExperience(rewardedRecord(second,frozen)),33);
});

test('computer rewards derive the selected fixed level and legacy match headers can gain a snapshot',()=>{
 const r=cpu(8),levels=matchLevels(r,{experience:12000,level:77},{experience:0,level:1});
 assert.deepEqual(levels,{hostLevel:16,guestLevel:8});assert.equal(matchExperience(rewardedRecord(r,levels),8,levels.hostLevel),51);
 assert.deepEqual(matchLevels(record(),{experience:300},{experience:100},{}),{hostLevel:3,guestLevel:2});
 assert.throws(()=>matchLevels(record(),{}, {},{hostLevel:3}));
 assert.throws(()=>matchLevels(record(),{}, {},{hostLevel:0,guestLevel:3}));
 assert.deepEqual(matchLevels(record(),{}, {},{hostLevel:3,guestLevel:50}),{hostLevel:3,guestLevel:50});
 assert.throws(()=>matchLevels(record(),{}, {},{hostLevel:3,guestLevel:51}));
});

test('PvP records accept account level 50 but reject higher or fractional levels without widening question levels',()=>{
 for(let level=1;level<=50;level++)assert.equal(validRecord(record({opponentType:'player',opponentLevel:level}),'human-a',now).opponentLevel,level);
 for(const level of [0,51,1.5,NaN])assert.throws(()=>validRecord(record({opponentLevel:level}),'human-a',now));
 const q={id:'wrong',kind:'tower' as const,a:100,b:10,operation:'-' as const,submitted:'0',correct:90,level:11,elapsed:0,attempts:1};
 assert.throws(()=>validRecord(record({wrongQuestions:[q]}),'human-a',now));
 q.level=10;assert.equal(validRecord(record({wrongQuestions:[q]}),'human-a',now).wrongQuestions[0].level,10);
});

test('finished player duels persist account levels above the CPU roster without mutating participants',()=>{
 const state=createDuel('human-a','플레이어',1,now,25);joinDuel(state,'human-b','상대',now,50);
 state.players[1]!.accountLevel=50;state.status='finished';state.startedAt=now;state.elapsed=30;state.winner=0;
 const saved=finishedRecord(state,0,id)!;assert.equal(saved.opponentType,'player');assert.equal(saved.opponentLevel,50);
 assert.equal(matchExperience(saved),1500);assert.equal(validRecord(saved,'human-a',Date.now()).opponentLevel,50);
});
