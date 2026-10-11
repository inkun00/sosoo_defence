import {mkdir,writeFile} from 'node:fs/promises';
import {LEVELS} from '../src/levels';
import type {Difficulty} from '../src/difficulty';
import {BOSS_AURA_RADIUS,BOSS_AURA_SPEED,BOSS_AURA_SLOW,BOSS_AURA_STUN,STAGE_DURATION,type Inventory} from '../src/model';
import {TILE} from '../src/path';
import {BOSS_INTRO_DURATION} from '../src/boss-intro-story';
import {playLevel} from './simulate';
import {numberText} from '../src/math';

const difficulties:Difficulty[]=['practice','standard','challenge'];
const finalLevel=LEVELS.at(-1)!;
const bossAura={stage:finalLevel.id,radiusTiles:BOSS_AURA_RADIUS/TILE,radiusPixels:BOSS_AURA_RADIUS,speedMultiplier:BOSS_AURA_SPEED,ordinarySlowMultiplier:.6,empoweredSlowMultiplier:BOSS_AURA_SLOW,stunRecoveryMultiplier:BOSS_AURA_STUN,excludesBoss:true,healthUnchanged:true,endsOnBossDeathOrArrival:true};
const results=[];
for(const carry of [false,true])for(const difficulty of difficulties){
 let inventory:Inventory={bricks:[],walls:0};
 for(const level of LEVELS){
  let layout=0,m=playLevel(level.id,difficulty,undefined,layout,undefined,carry?inventory:undefined);
  while(m.phase!=='won'&&layout<9)m=playLevel(level.id,difficulty,undefined,++layout,undefined,carry?inventory:undefined);
  if(m.phase!=='won'||m.castle<=0||!m.goals.every(g=>g.done)||level.boss&&!m.bossDefeated)throw Error(`Unclearable ${difficulty} stage ${level.id} carry=${carry}`);
  results.push({carry,difficulty,stage:level.id,name:level.name,layout,phase:m.phase,seconds:m.simulationSeconds,castle:m.castle,kills:m.kills,leaks:m.leaks,stars:m.stars,bossHP:level.boss?.hp??null,bossDefeated:m.bossDefeated,purchases:m.purchases,initialCoins:numberText(level.budget,2),formation:m.formation,goals:m.goals});
  if(carry)inventory=m.inventory;
 }
}
const lines=[
 '# 최종 스테이지 시뮬레이션 검증',
 '',
 `1~${LEVELS.length}단계 × 연습·표준·도전 × 개별 시작·인벤토리 연속 보관 = ${results.length}회 성공.`,
 '',
 '실제 Defense 모델의 0.1초 프레임으로 검증한다. 실제 구매 문제에 정답을 입력해 준비 단계에서만 타워를 설치한다. 전투 중에는 타워의 발사 토글과 실제 드롭 벽돌의 합성·성벽 배치만 수행한다. 타워 추가 구매·회수·이동, 돈·체력 보정은 하지 않는다. 합법적인 배치를 최대 10개 비교하여 클리어되는 배치를 기록한다. 자동 조작 검증이며 학생의 실제 플레이 난이도 평가는 별도다.',
 '',
 `11단계는 일반 몬스터 12마리의 기존 8.4초 간격 웨이브와 별도로 ${finalLevel.boss!.spawnAt}초에 체력 99.9의 저주 마법사 한 명이 등장한다. 방어 성공과 마법사의 정확한 0 처치가 모두 필요하다. 웨이브 시간은 ${STAGE_DURATION}초이며, 남은 몬스터가 있으면 기존 추가 방어 규칙에 따라 전투가 계속된다.`,
 '',
 `살아 있는 최종 마법사는 반경 ${bossAura.radiusTiles}칸의 다른 몬스터를 강화한다. 이동 속도는 +${(bossAura.speedMultiplier-1)*100}%이며, 감속 중 속도 계수는 ${bossAura.ordinarySlowMultiplier}에서 ${bossAura.empoweredSlowMultiplier}로 높아지고 기절은 ${bossAura.stunRecoveryMultiplier}배 빠르게 회복한다. 마법사 자신은 강화하지 않으며, 범위를 벗어나거나 마법사가 죽거나 성에 도착하면 효과가 끝난다. 현재·최대 체력과 정확한 소수 뺄셈은 바꾸지 않는다. 아래 결과는 이 오라를 적용한 실제 전투 측정이다.`,
 '',
 `최종 스테이지 준비 화면 전에는 ${BOSS_INTRO_DURATION}초의 보스 대면 연출을 재생한다. 연출 중에는 Defense 모델의 전투 시간이 멈춘다. 이 시뮬레이션은 연출을 직접 재생하지 않으며, 아래 시간은 준비 조작과 연출 시간을 제외한 전투 시간이다.`,
 '',
 `최종 준비금은 ${numberText(finalLevel.budget,2)}코인이다. 실제 구매 문항에는 기존 규칙대로 보유금의 한 자리 자연수 부분만 사용하므로 구매·벽돌 문항은 계속 10 미만이다. 99.9는 요청된 최종 보스의 전투 체력만의 예외다.`,
 ''
];
for(const carry of [false,true]){
 lines.push(`## ${carry?'벽돌·성벽을 보관하며 연속 진행':'재고 없이 각 단계에서 독립 시작'}`,'','| 단계 | 연습: 처치 / 성 체력 / 시간 | 표준: 처치 / 성 체력 / 시간 | 도전: 처치 / 성 체력 / 시간 |','|---|---|---|---|');
 for(const l of LEVELS){const values=difficulties.map(d=>{const r=results.find(r=>r.carry===carry&&r.difficulty===d&&r.stage===l.id)!;return `${r.kills} / ${r.castle} / ${r.seconds.toFixed(1)}초`;});lines.push(`| ${l.id}. ${l.name} | ${values.join(' | ')} |`);}
 lines.push('');
}
lines.push('## 최종 스테이지 표준 난이도 성공 배치','','좌표는 왼쪽 위 (0,0) 기준이며, 타워 종류·좌표와 전체 결과는 동봉 JSON에 기록된다.','');
const final=results.find(r=>!r.carry&&r.difficulty==='standard'&&r.stage===LEVELS.length)!;
for(const t of final.formation)lines.push(`- ${t.typeId}: (${t.x}, ${t.y})`);
lines.push('',`마법사 처치 성공, 총 ${final.kills}마리 처치, 성 체력 ${final.castle}/5, ${final.seconds.toFixed(1)}초. 모든 학습 목표 달성.`,'','재현: `npm test` 및 `npx tsx tools/simulate-campaign.ts`','');
await mkdir('docs',{recursive:true});
await writeFile('docs/final-stage-simulation.md',lines.join('\n'));
await writeFile('docs/final-stage-simulation.json',JSON.stringify({frameSeconds:.1,waveSeconds:STAGE_DURATION,bossHP:finalLevel.boss!.hp/1000,bossSpawnAtSeconds:finalLevel.boss!.spawnAt,bossAura,bossIntro:{seconds:BOSS_INTRO_DURATION,modelTimePaused:true,includedInSimulationSeconds:false},results},null,2)+'\n');
console.log(`Verified ${results.length} successful stage runs. Reports: docs/final-stage-simulation.md / .json`);
console.log(JSON.stringify(results.filter(r=>r.stage===LEVELS.length).map(({carry,difficulty,seconds,castle,kills,bossDefeated})=>({carry,difficulty,seconds,castle,kills,bossDefeated}))));
