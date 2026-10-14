# 최종 보스 난이도 조정 검증

11스테이지의 일반 몬스터 출현 간격을 8.4초에서 6초로 줄였다. 예산 19.98코인, 보스 체력 99.9, 일반 몬스터 체력, 타워 가격/한도, 성 체력, 보스 마법 수치는 유지한다. 12마리 웨이브의 마지막 몬스터는 100.4초 대신 74초에 출현한다. 2분 방어 시간은 유지되며 살아 있는 몬스터를 모두 처리해야 성공한다.

## 고정 비교 조건

- 실제 `Defense.step(.1)`, 자동 발사/실제 타워 타겟 선정/재장전/감속/기절/보스 마법/정확한 체력 계산/성 피해/학습 목표 판정을 실행했다. 보스 전용 단순 피해량 모형으로 성공을 추정하지 않았다.
- 타워는 준비 중 실제 구입 문제에 정답을 제출하여 설치했다. 전투 중 타워 추가, 타워 이동, 판매, 발사 켜기/끄기, 성벽 추가를 실행하지 않았다. 성벽은 준비 중에만 설치했다.
- 구성 6종: 균형 9타워, 소형 타워부터 구입한 역순 균형, 수호 대포 중심, 망원/감속 중심, 투석기 4개 중심, 룬 2개와 수호 대포 중심. 각각 도로 앞/중간/뒤를 바꾸는 레이아웃 6종을 사전에 고정했다.
- 연습/표준/도전 각 146조건: 위 36개 조합 × 기절 RNG 2종 × 재고 성벽 0/3개, 기존 검증 배치 × 재고 0/3개. 변경 전후 동일한 구입 순서와 위치 선정 기준을 사용했다. RNG만 다른 배치도 실제 계산 과정이 다르므로 별도 실행으로 기록했다.
- 모든 실행은 최대 600초에서 종료한다. `won`만 성공이다. `review`, 보스 탈출, 성 파괴, 시간 제한 후 진행 상태는 성공으로 세지 않았다. 438조건 중 시간 초과는 변경 전후 모두 0개였다.
- 이 수치는 정답을 모두 맞힌 고정 자동 발사 배치들의 벤치마크 성공 비율이다. 실제 사람의 클리어 확률이나 모집단에 대한 통계 추정으로 해석하면 안 된다.

## 438조건 결과

| 난이도 | 변경 전 | 6초 간격 |
|---|---:|---:|
| 연습 | 133 / 146 | 126 / 146 |
| 표준 | 90 / 146 | 51 / 146 |
| 도전 | 64 / 146 | 22 / 146 |
| 합계 | 287 / 438 (65.53%) | 199 / 438 (45.43%) |

20.09%포인트 감소했다. 동일 조건 중 성공 유지 198개, 기존 성공→실패 89개, 기존 실패→성공 1개, 양쪽 실패 150개다. 출현 시간과 자동 타겟 선택/기절 발생의 상호작용으로 개별 배치가 완전히 단조롭게 어려워지는 것은 아니다.

## 실제 게임 기본 RNG 재확인

게임에서 사용하는 기본 기절 RNG 초기값 1458로 222조건도 비교했다. 각 난이도 74조건이다. 이 비교 역시 모두 유한 시간에 종료했다.

| 난이도 | 변경 전 | 6초 간격 |
|---|---:|---:|
| 연습 | 70 / 74 | 64 / 74 |
| 표준 | 46 / 74 | 28 / 74 |
| 도전 | 36 / 74 | 15 / 74 |
| 합계 | 152 / 222 (68.47%) | 107 / 222 (48.20%) |

실제 기본 RNG에서도 20.27%포인트 감소했다.

## 강화 후 실제로 클리어 가능한 예시

추가 재고 성벽 없이도 모든 난이도에서 예산 안의 계획된 배치로 클리어 가능하다. 아래 좌표는 0부터 시작하는 내부 격자 좌표이며 실제 구입 순서다.

- practice: 성 체력 5/5, 13마리 처치, 보스 처치 및 모든 학습 목표 달성, 120.1초, 준비 비용 19.55코인. 배치: `rune@3,2;rune@5,2;catapult@2,5;catapult@5,5;crystal@1,2;frost@3,3;basic@7,2;pebble@9,2;needle@10,5`.
- standard: 성 체력 5/5, 13마리 처치, 보스 처치 및 모든 학습 목표 달성, 123.5초, 준비 비용 19.55코인. 배치: `rune@5,6;rune@7,6;catapult@5,5;catapult@7,5;crystal@5,3;frost@7,3;basic@11,6;pebble@11,5;needle@11,3`.
- challenge: 성 체력 4/5, 12마리 처치, 보스 처치 및 모든 학습 목표 달성, 120.1초, 준비 비용 19.55코인. 배치: `rune@5,6;rune@7,6;catapult@5,5;catapult@7,5;crystal@5,3;frost@7,3;basic@11,6;pebble@11,5;needle@11,3`.

## 비교 후 제외한 조정

- 준비 예산만 17.98코인으로 줄이면 기본 균형 구성의 마지막 소형 마무리 타워를 구입하지 못하는 비용 절벽이 생겼다. 대표 30조건 성공이 28개에서 3개로 떨어지고 표준/도전 성공이 0개가 되어 제외했다.
- 출현 간격 6초와 전체 이동 속도 +10~15%를 결합하면 대표 조건의 도전 클리어가 0개가 되어 제외했다.
- 예고 3초/발동 6초/휴식 2초, 반경 4칸, 질주 40%, 감속 시 85%, 기절 회복 2.5배로 마법을 강화한 경우 6초 간격 단독보다 성공이 오히려 7개 많았다(206/438). 마법 발동 시점과 잡몹이 보스 옆에 도달하는 시점이 달라지기 때문에 수치 강화가 항상 더 어려운 것은 아니다. 메커니즘 변경 대신 검증된 단일 출현 간격 변경을 선택한다.
- 보스 HP 증가/일반 HP 증가도 비교했으나 학습 숫자와 배치를 더 크게 바꿀 필요가 없어 제외했다.

## 실제 제품 재검증과 원자료

강화 후 결과는 제품 소스의 평범한 `new Defense(...)`로 재실행했다. 출현 간격, 타워 발사, 이동, 보스 마법과 체력 계산을 프로토타입으로 변경하거나 대신 계산하지 않았다. 실제 기본 RNG 222조건에서는 random 메서드도 변경하지 않았다. 추가 438조건에서만 기절의 재현 가능한 RNG 1/7 스트림을 사용했다. 강화 전은 격리된 서브클래스에서 출현 간격만 8.4초로 되돌렸다. 최종 실제 제품 재실행 결과는 후보 비교와 완전히 일치했다.

[boss-stage-hardening.json](./boss-stage-hardening.json)에 모든 조건의 난이도, 초기 재고, RNG, 타워 구입 순서, 정확한 타워 좌표와 가격, 준비 지출, 변경 전후 결과 및 소스 SHA-256을 기록했다. 재고와 배치를 공유한 짝 비교이며 벽0/3 그룹을 별도로 식별할 수 있다. 변경 전후 준비 배치와 성벽 수가 같은지도 검증했다.

## 원자료로 단일 조건 재현

아래 코드를 저장소 루트에 `test-results/boss-hardening/reproduce.ts`로 저장한 뒤 `npx tsx test-results/boss-hardening/reproduce.ts`로 실행한다. 기본은 첫 실제 RNG 조건을 변경 후 제품으로 실행한다. `suites[0].cases`에서 다른 조건을 골라 재현할 수 있다. 변경 전을 재현하려면 `Model`을 `Before`로 선택한다. 추가 준비 벽은 정해진 최대 수까지 도로의 끝부터 놓는다.

```ts
import {readFileSync} from "node:fs";
import {Defense} from "../../src/model";
import {LEVELS} from "../../src/levels";
import {numberText} from "../../src/math";
const data=JSON.parse(readFileSync("docs/boss-stage-hardening.json","utf8"));
const c=data.suites[0].cases[0];
class Before extends Defense {override get balance(){return {...super.balance,spawnInterval:8.4};}}
const Model=Defense; // Before로 바꾸면 변경 전 비교
const m=new Model(LEVELS[10],c.inventory,c.difficulty);
if(c.stunRandomSeed!==1458){let seed=c.stunRandomSeed;m.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
for(const entry of c.formation){
 const [type,xy]=entry.split("@"),[x,y]=xy.split(",").map(Number);
 if(!m.requestPurchase({x,y},type))throw Error("구매 불가: "+entry);
 const q=m.pendingPurchase!;if(!m.answerPurchase(numberText(q.before-q.cost)))throw Error("구매 정답 거부");
}
while(m.wallStock&&m.walls.length<m.balance.wallLimit){
 const cell=m.path()!.slice(1,-1).reverse().find(c=>m.previewWall(c).valid);
 if(!cell)break;if(!m.placeWall(cell))throw Error("성벽 설치 불가");
}
m.start();let seconds=0;
for(let i=0;i<6000&&m.phase==="playing";i++){m.step(.1);seconds+=.1;m.events=[];}
console.log({phase:m.phase,castle:m.castle,kills:m.kills,leaks:m.leaks,bossDefeated:m.bossDefeated,seconds:Number(seconds.toFixed(1)),goals:m.goals});
```
