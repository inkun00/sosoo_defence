import {mkdir,writeFile} from 'node:fs/promises';
import {LEVELS} from '../src/levels';
import type {Difficulty} from '../src/difficulty';
import {Defense,BOSS_AURA_RADIUS,BOSS_AURA_SPEED,BOSS_AURA_SLOW,BOSS_AURA_STUN,STAGE_DURATION,type Inventory} from '../src/model';
import {BOSS_SPELLS,BOSS_SPELL_WARNING_SECONDS,BOSS_SPELL_ACTIVE_SECONDS,BOSS_SPELL_REST_SECONDS,BOSS_SPELL_CYCLE_SECONDS,bossSpellAt,type BossSpellPhase} from '../src/boss-spells';
import {TILE} from '../src/path';
import {BOSS_INTRO_DURATION} from '../src/boss-intro-story';
import {playAutomaticStage} from '../tests/adventure-helpers';
import {numberText} from '../src/math';

const FRAME_SECONDS=.1,difficulties:Difficulty[]=['practice','standard','challenge'];
const finalLevel=LEVELS.at(-1)!;
const rounded=(n:number)=>Math.round(n*1000)/1000;
const inventoryCopy=(inventory:Inventory):Inventory=>({bricks:[...inventory.bricks],walls:inventory.walls,...(inventory.wallDurabilities?{wallDurabilities:[...inventory.wallDurabilities]}:{})});
type SpellSample={seconds:number;bossAge:number;sourceId:number;cycle:number;spellId:string;phase:BossSpellPhase;remaining:number;bossHP:number;bossPosition:{x:number;y:number};empoweredIds:number[]};
type SpellEvent={seconds:number;bossAge:number;type:'boss-warning'|'boss-cast';sourceId:number;cycle:number;spellId:string;message:string};

// Observe the exact regression runner without changing its tactics or adding
// engine instrumentation. Restore the original method even if an assertion fails.
function observeStage(stage:number,difficulty:Difficulty,inventory:Inventory){
 const originalStep=Defense.prototype.step,transitions:SpellSample[]=[],events:SpellEvent[]=[],seenEvents=new Set<string>();
 let model:Defense|undefined,seconds=0,lastPhaseKey='',bossDefeatedAtSeconds:number|null=null;
 let preparation:{money:number;purchases:number;formation:{id:number;x:number;y:number;typeId:string;cost:number}[]}|undefined;
 const empoweredFrames:Record<string,number>=Object.fromEntries(BOSS_SPELLS.map(s=>[s.id,0]));
 const empoweredTargets=new Set<number>();
 const sample=(m:Defense)=>{
  const state=m.bossSpellState;if(!state)return;
  const boss=m.bossAuraSource!,empoweredIds=m.enemies.filter(e=>m.isBossEmpowered(e)).map(e=>e.id);
  const key=`${state.sourceId}:${state.cycle}:${state.phase}`;
  if(key!==lastPhaseKey){
   transitions.push({seconds:rounded(seconds),bossAge:rounded(boss.age),sourceId:state.sourceId,cycle:state.cycle,spellId:state.spell.id,phase:state.phase,remaining:rounded(state.remaining),bossHP:boss.hp,bossPosition:{x:rounded(boss.x),y:rounded(boss.y)},empoweredIds});
   lastPhaseKey=key;
  }
 };
 Defense.prototype.step=function(dt:number){
  model=this;
  preparation??={money:this.money,purchases:this.purchases,formation:this.towers.map(({id,x,y,typeId,cost})=>({id,x,y,typeId,cost}))};
  sample(this);
  const bossBefore=this.bossAuraSource,bossAgeBefore=bossBefore?.age??0;
  const appliedState=bossBefore?bossSpellAt(bossAgeBefore+dt,bossBefore.id):null;
  const appliedTargets=bossBefore&&appliedState?.phase==='active'?this.enemies.filter(e=>e!==bossBefore&&e.hp>0&&e.next<e.path.length&&Math.hypot(e.x-bossBefore.x,e.y-bossBefore.y)<=BOSS_AURA_RADIUS+1e-8):[];
  if(appliedTargets.length)empoweredFrames[appliedState!.spell.id]++;
  for(const target of appliedTargets)empoweredTargets.add(target.id);
  originalStep.call(this,dt);seconds+=dt;
  sample(this);
  for(const event of this.events){
   if(event.type!=='boss-warning'&&event.type!=='boss-cast')continue;
   const data=event.data as {bossId:number;spellId:string;cycle:number};
   const key=`${event.type}:${data.bossId}:${data.cycle}`;if(seenEvents.has(key))continue;seenEvents.add(key);
   events.push({seconds:rounded(seconds),bossAge:rounded(this.bossAuraSource?.age??bossAgeBefore+dt),type:event.type,sourceId:data.bossId,cycle:data.cycle,spellId:data.spellId,message:event.message});
  }
  if(this.bossDefeated&&bossDefeatedAtSeconds===null)bossDefeatedAtSeconds=rounded(seconds);
 };
 let error:string|null=null;
 try{model=playAutomaticStage(stage,difficulty,inventory);}
 catch(cause){error=cause instanceof Error?cause.message:String(cause);}
 finally{Defense.prototype.step=originalStep;}
 if(!model||!preparation)throw Error(`No combat model for ${difficulty} stage ${stage}: ${error}`);
 const m=model;
 const counts=BOSS_SPELLS.map(spell=>({spellId:spell.id,name:spell.name,
  warnings:events.filter(e=>e.type==='boss-warning'&&e.spellId===spell.id).length,
  casts:events.filter(e=>e.type==='boss-cast'&&e.spellId===spell.id).length,
  secondsWithEmpoweredTargets:rounded(empoweredFrames[spell.id]*FRAME_SECONDS)}));
 return {model:m,result:{status:error?'failed':'passed',error,stage,name:m.level.name,phase:m.phase,seconds:rounded(seconds),waveElapsed:rounded(m.elapsed),castle:m.castle,kills:m.kills,leaks:m.leaks,stars:m.stars,
  bossHP:m.level.boss?.hp??null,bossSpawned:m.bossSpawned,bossDefeated:m.bossDefeated,bossDefeatedAtSeconds:bossDefeatedAtSeconds as number|null,
  purchases:m.purchases,switches:m.switches,allTowersEnabled:m.towers.every(t=>t.enabled),fusions:m.fusions,wallPlacements:m.wallPlacements,
  initialCoins:numberText(m.level.budget,2),remainingCoins:numberText(m.money,2),remainingMoney:m.money,
  preparationCoins:numberText(preparation.money,2),formation:preparation.formation,inventoryIn:inventoryCopy(inventory),inventoryOut:inventoryCopy(m.inventory),goals:m.goals,
  bossSpells:{counts,transitions,events,empoweredTargetIds:[...empoweredTargets]}}};
}

const results:(ReturnType<typeof observeStage>['result']&{carry:boolean;difficulty:Difficulty;carrySequenceValid:boolean})[]=[];
for(const carry of [false,true])for(const difficulty of difficulties){
 let inventory:Inventory={bricks:[],walls:0},previousStagePassed=true;
 for(const level of LEVELS){
  const run=observeStage(level.id,difficulty,carry?inventory:{bricks:[],walls:0});
  results.push({carry,difficulty,carrySequenceValid:!carry||previousStagePassed,...run.result});
  if(carry){inventory=inventoryCopy(run.model.inventory);previousStagePassed=previousStagePassed&&run.result.status==='passed';}
 }
}
const failures=results.filter(r=>r.status!=='passed'||!r.carrySequenceValid),passed=results.length-failures.length;
const bossSpells={stage:finalLevel.id,radiusTiles:BOSS_AURA_RADIUS/TILE,radiusPixels:BOSS_AURA_RADIUS,
 warningSeconds:BOSS_SPELL_WARNING_SECONDS,activeSeconds:BOSS_SPELL_ACTIVE_SECONDS,restSeconds:BOSS_SPELL_REST_SECONDS,cycleSeconds:BOSS_SPELL_CYCLE_SECONDS,
 order:BOSS_SPELLS.map(spell=>({id:spell.id,name:spell.name,taunt:spell.taunt,description:spell.description,color:spell.color})),
 effects:{hasteSpeedMultiplier:BOSS_AURA_SPEED,ordinarySlowMultiplier:.6,frostWardSlowMultiplier:BOSS_AURA_SLOW,ironWillStunRecoveryMultiplier:BOSS_AURA_STUN},
 oneEffectPerActiveWindow:true,clock:'living boss age',excludesBoss:true,healthUnchanged:true,endsOnBossDeathOrArrival:true};
const lines=[
 '# 최종 스테이지 시뮬레이션 검증','',
 `1~${LEVELS.length}단계 × 연습·표준·도전 × 개별 시작·인벤토리 연속 보관 = ${results.length}회. 성공 ${passed}회, 실패 ${failures.length}회.`,
 '',
 'tests/adventure-helpers.ts의 고정 배치를 실제 Defense 모델의 0.1초 프레임으로 재현한다. 준비 단계에서 합법적인 구매 문제를 풀어 타워를 설치하고, 전투 중에는 모든 타워가 계속 자동 공격한다. 실제 드롭·보관 벽돌의 덧셈 합성과 얻은 성벽의 길 위 배치만 수행한다. 타워 발사 전환·추가 구매·회수·이동, 돈·체력 보정과 실패 시 다른 배치 탐색은 없다. 자동 조작 검증이며 학생의 실제 플레이 난이도 평가는 별도다.',
 '',
 `11단계는 일반 몬스터 12마리의 기존 8.4초 간격 웨이브와 별도로 ${finalLevel.boss!.spawnAt}초에 체력 99.9의 저주 마법사 한 명이 등장한다. 방어 성공과 마법사의 정확한 0 처치가 모두 필요하다. 웨이브 시간은 ${STAGE_DURATION}초이며, 남은 몬스터가 있으면 기존 추가 방어 규칙에 따라 전투가 계속된다.`,
 '',
 `마법사 자신의 생존 시간으로 ${bossSpells.warningSeconds}초 시전 준비 → ${bossSpells.activeSeconds}초 발동 → ${bossSpells.restSeconds}초 휴식을 반복한다. ${bossSpells.cycleSeconds}초마다 광폭 질주(이동 속도 +25%) → 서리 파괴(감속 계수 0.6→0.8) → 불굴의 의지(기절 회복 2배) 순서로 바뀐다. 발동 중 반경 ${bossSpells.radiusTiles}칸의 다른 몬스터에게 해당 주문 한 가지가 적용된다. 마법사 본인, 준비·휴식 시간, 범위 밖에는 적용하지 않는다. 마법사 사망·성 도착 시 끝나며 현재·최대 체력과 소수 뺄셈은 바꾸지 않는다.`,
 '',
 `최종 준비 화면 전에는 ${BOSS_INTRO_DURATION}초의 대면 연출을 재생하고 전투 시간을 멈춘다. 이 도구는 연출을 재생하지 않으며 아래 시간은 준비 조작과 연출을 제외한 전투 시간이다. 최종 준비금은 ${numberText(finalLevel.budget,2)}코인이다. 구매 문항은 기존처럼 보유금의 한 자리 자연수 부분만 사용하므로 10 미만이며 99.9는 최종 보스 체력의 예외다.`,
 '',
 '모든 실행의 배치, 준비 후·종료 후 코인, 재고 입출력, 성 체력, 처치·유출·학습 목표, 보스 처치 시각은 JSON에 기록한다. 주문은 실제 boss-warning/boss-cast 이벤트를 각각 집계하며, phase 전환 시각과 위치, 강화된 몬스터가 있었던 시간도 기록한다. 읽기 전용 step 관찰자는 실행 후 복원하며 전투 동작을 바꾸지 않는다.',''
];
for(const carry of [false,true]){
 lines.push(`## ${carry?'벽돌·성벽을 보관하며 연속 진행':'재고 없이 각 단계에서 독립 시작'}`,'','| 단계 | 연습: 결과 / 처치 / 성 / 시간 | 표준: 결과 / 처치 / 성 / 시간 | 도전: 결과 / 처치 / 성 / 시간 |','|---|---|---|---|');
 for(const level of LEVELS){
  const values=difficulties.map(difficulty=>{const r=results.find(r=>r.carry===carry&&r.difficulty===difficulty&&r.stage===level.id)!;return `${r.status==='passed'&&r.carrySequenceValid?'성공':'실패'} / ${r.kills} / ${r.castle} / ${r.seconds.toFixed(1)}초`;});
  lines.push(`| ${level.id}. ${level.name} | ${values.join(' | ')} |`);
 }
 lines.push('');
}
lines.push('## 최종 스테이지 주문·예산 실측','','| 실행 | 결과 | 준비 후 → 종료 코인 | 보스 처치 | 광폭 질주 준비/발동 | 서리 파괴 준비/발동 | 불굴의 의지 준비/발동 |','|---|---|---|---|---|---|---|');
for(const r of results.filter(r=>r.stage===finalLevel.id)){
 const counts=r.bossSpells.counts.map(c=>`${c.warnings}/${c.casts}`);
 lines.push(`| ${r.carry?'연속':'독립'} ${r.difficulty} | ${r.status} | ${r.preparationCoins} → ${r.remainingCoins} | ${r.bossDefeatedAtSeconds===null?'미처치':r.bossDefeatedAtSeconds.toFixed(1)+'초'} | ${counts.join(' | ')} |`);
}
lines.push('','## 최종 스테이지 표준 난이도 고정 배치','','좌표는 왼쪽 위 (0,0) 기준이다. 도전 난이도는 같은 9개 타워를 별도 고정 좌표에 배치하며 JSON에 기록한다.','');
const final=results.find(r=>!r.carry&&r.difficulty==='standard'&&r.stage===finalLevel.id)!;
for(const tower of final.formation)lines.push(`- ${tower.typeId}: (${tower.x}, ${tower.y})`);
lines.push('',`표준 독립 실행: ${final.status}, 총 ${final.kills}마리 처치, 성 체력 ${final.castle}/5, ${final.seconds.toFixed(1)}초, 남은 ${final.remainingCoins}코인.`,
 '',...failures.map(r=>`실패: ${r.carry?'연속':'독립'} ${r.difficulty} ${r.stage}단계 — ${r.error??'이전 단계의 실패로 연속 재고 검증 무효'}`),
 '재현: `npx tsx tools/simulate-campaign.ts` (동일 자동 전술 회귀: `npm test`)','');
await mkdir('docs',{recursive:true});
await writeFile('docs/final-stage-simulation.md',lines.join('\n'));
await writeFile('docs/final-stage-simulation.json',JSON.stringify({status:failures.length?'failed':'passed',runs:results.length,passed,failed:failures.length,
 tactic:'tests/adventure-helpers.ts / fixed legal purchases, always-enabled automatic towers, real drop fusion and walls',frameSeconds:FRAME_SECONDS,
 waveSeconds:STAGE_DURATION,bossHP:finalLevel.boss!.hp/1000,bossSpawnAtSeconds:finalLevel.boss!.spawnAt,bossSpells,
 bossIntro:{seconds:BOSS_INTRO_DURATION,modelTimePaused:true,includedInSimulationSeconds:false},results},null,2)+'\n');
console.log(`Verified ${passed}/${results.length} stage runs. Reports: docs/final-stage-simulation.md / .json`);
console.log(JSON.stringify(results.filter(r=>r.stage===finalLevel.id).map(({carry,difficulty,status,error,seconds,castle,kills,bossDefeated,remainingCoins,bossSpells})=>({carry,difficulty,status,error,seconds,castle,kills,bossDefeated,remainingCoins,counts:bossSpells.counts}))));
if(failures.length)process.exitCode=1;
