# 비밀 스테이지 역공격 밸런스 검증

모든 실행은 공개 API로 정확한 모집 뺄셈 문제를 풀고, 실제 보유 군대만 출격시켰습니다. 돈·체력·시간·명중 판정에 대한 주입이나 전투 중 수치 변경은 없습니다. 자동 전략의 성공 비율이며 실제 어린이의 성공률을 뜻하지 않습니다.

시작 코인 9.90, 동시 보유 한도 12명, 제한 시간 180초입니다. 출격은 0.65초 이상 간격을 지켰습니다. 집결 전략은 살아 있는 병력의 전체 결손 체력이 1.80 이상일 때 덧셈 문제에 정답을 제출해 사용했습니다. 문제를 푸는 동안 전투·발사체·시간은 정지합니다.

감시탑 체력 3.60, 경비탑 5.40, 마법사의 성 9.99. 적 공격은 0.10 / 0.20 / 0.30이며, 연습·표준·도전은 적 사격 간격만 다릅니다. 아군의 초과 공격은 무효이고, 0.01 정찰병이 소수 두 자리 나머지를 마무리합니다.

| 난이도 | 성공 / 실행 | 성공 비율 |
|---|---:|---:|
| practice | 36 / 36 | 100.0% |
| standard | 28 / 36 | 77.8% |
| challenge | 24 / 36 | 66.7% |

| 편성 | 난이도 | 순서 | 집결 | 결과 | 경과 초 | 성 잔여 체력 | 생존 |
|---|---|---|---|---|---:|---:|---:|
| 균형 편성 | practice | guard-first | 없음 | won | 37.7 | 0.00 | 11 |
| 균형 편성 | practice | guard-first | 사용 | won | 37.7 | 0.00 | 11 |
| 균형 편성 | practice | striker-first | 없음 | won | 39.4 | 0.00 | 11 |
| 균형 편성 | practice | striker-first | 사용 | won | 39.4 | 0.00 | 11 |
| 균형 편성 | practice | scout-first | 없음 | won | 39.1 | 0.00 | 11 |
| 균형 편성 | practice | scout-first | 사용 | won | 39.1 | 0.00 | 11 |
| 정찰 지원 편성 | practice | guard-first | 없음 | won | 26.7 | 0.00 | 12 |
| 정찰 지원 편성 | practice | guard-first | 사용 | won | 26.7 | 0.00 | 12 |
| 정찰 지원 편성 | practice | striker-first | 없음 | won | 29.4 | 0.00 | 12 |
| 정찰 지원 편성 | practice | striker-first | 사용 | won | 29.4 | 0.00 | 12 |
| 정찰 지원 편성 | practice | scout-first | 없음 | won | 31.1 | 0.00 | 12 |
| 정찰 지원 편성 | practice | scout-first | 사용 | won | 31.1 | 0.00 | 12 |
| 돌격 중심 편성 | practice | guard-first | 없음 | won | 30.2 | 0.00 | 11 |
| 돌격 중심 편성 | practice | guard-first | 사용 | won | 30.2 | 0.00 | 11 |
| 돌격 중심 편성 | practice | striker-first | 없음 | won | 36.4 | 0.00 | 11 |
| 돌격 중심 편성 | practice | striker-first | 사용 | won | 36.4 | 0.00 | 11 |
| 돌격 중심 편성 | practice | scout-first | 없음 | won | 36.1 | 0.00 | 11 |
| 돌격 중심 편성 | practice | scout-first | 사용 | won | 36.1 | 0.00 | 11 |
| 방패 중심 편성 | practice | guard-first | 없음 | won | 40.6 | 0.00 | 11 |
| 방패 중심 편성 | practice | guard-first | 사용 | won | 40.6 | 0.00 | 11 |
| 방패 중심 편성 | practice | striker-first | 없음 | won | 39.2 | 0.00 | 11 |
| 방패 중심 편성 | practice | striker-first | 사용 | won | 39.2 | 0.00 | 11 |
| 방패 중심 편성 | practice | scout-first | 없음 | won | 40.3 | 0.00 | 11 |
| 방패 중심 편성 | practice | scout-first | 사용 | won | 40.3 | 0.00 | 11 |
| 정찰 중심 편성 | practice | guard-first | 없음 | won | 104.3 | 0.00 | 4 |
| 정찰 중심 편성 | practice | guard-first | 사용 | won | 82.7 | 0.00 | 9 |
| 정찰 중심 편성 | practice | striker-first | 없음 | won | 104.3 | 0.00 | 4 |
| 정찰 중심 편성 | practice | striker-first | 사용 | won | 82.7 | 0.00 | 9 |
| 정찰 중심 편성 | practice | scout-first | 없음 | won | 104.5 | 0.00 | 5 |
| 정찰 중심 편성 | practice | scout-first | 사용 | won | 82.9 | 0.00 | 10 |
| 소규모 편성 | practice | guard-first | 없음 | won | 66.4 | 0.00 | 2 |
| 소규모 편성 | practice | guard-first | 사용 | won | 66.4 | 0.00 | 3 |
| 소규모 편성 | practice | striker-first | 없음 | won | 69.3 | 0.00 | 1 |
| 소규모 편성 | practice | striker-first | 사용 | won | 69.3 | 0.00 | 3 |
| 소규모 편성 | practice | scout-first | 없음 | won | 67.9 | 0.00 | 2 |
| 소규모 편성 | practice | scout-first | 사용 | won | 67.9 | 0.00 | 3 |
| 균형 편성 | standard | guard-first | 없음 | won | 37.7 | 0.00 | 11 |
| 균형 편성 | standard | guard-first | 사용 | won | 37.7 | 0.00 | 11 |
| 균형 편성 | standard | striker-first | 없음 | won | 39.4 | 0.00 | 11 |
| 균형 편성 | standard | striker-first | 사용 | won | 39.4 | 0.00 | 11 |
| 균형 편성 | standard | scout-first | 없음 | won | 39.1 | 0.00 | 11 |
| 균형 편성 | standard | scout-first | 사용 | won | 39.1 | 0.00 | 11 |
| 정찰 지원 편성 | standard | guard-first | 없음 | won | 26.7 | 0.00 | 12 |
| 정찰 지원 편성 | standard | guard-first | 사용 | won | 26.7 | 0.00 | 12 |
| 정찰 지원 편성 | standard | striker-first | 없음 | won | 29.4 | 0.00 | 12 |
| 정찰 지원 편성 | standard | striker-first | 사용 | won | 29.4 | 0.00 | 12 |
| 정찰 지원 편성 | standard | scout-first | 없음 | won | 32.3 | 0.00 | 11 |
| 정찰 지원 편성 | standard | scout-first | 사용 | won | 31.1 | 0.00 | 12 |
| 돌격 중심 편성 | standard | guard-first | 없음 | won | 30.2 | 0.00 | 11 |
| 돌격 중심 편성 | standard | guard-first | 사용 | won | 30.2 | 0.00 | 11 |
| 돌격 중심 편성 | standard | striker-first | 없음 | won | 36.4 | 0.00 | 11 |
| 돌격 중심 편성 | standard | striker-first | 사용 | won | 36.4 | 0.00 | 11 |
| 돌격 중심 편성 | standard | scout-first | 없음 | won | 36.1 | 0.00 | 11 |
| 돌격 중심 편성 | standard | scout-first | 사용 | won | 36.1 | 0.00 | 11 |
| 방패 중심 편성 | standard | guard-first | 없음 | won | 40.6 | 0.00 | 11 |
| 방패 중심 편성 | standard | guard-first | 사용 | won | 40.6 | 0.00 | 11 |
| 방패 중심 편성 | standard | striker-first | 없음 | won | 39.2 | 0.00 | 11 |
| 방패 중심 편성 | standard | striker-first | 사용 | won | 39.2 | 0.00 | 11 |
| 방패 중심 편성 | standard | scout-first | 없음 | won | 39.1 | 0.00 | 10 |
| 방패 중심 편성 | standard | scout-first | 사용 | won | 40.3 | 0.00 | 11 |
| 정찰 중심 편성 | standard | guard-first | 없음 | lost | 180 | 3.08 | 0 |
| 정찰 중심 편성 | standard | guard-first | 사용 | lost | 180 | 0.66 | 0 |
| 정찰 중심 편성 | standard | striker-first | 없음 | lost | 180 | 3.08 | 0 |
| 정찰 중심 편성 | standard | striker-first | 사용 | lost | 180 | 0.66 | 0 |
| 정찰 중심 편성 | standard | scout-first | 없음 | lost | 180 | 2.69 | 0 |
| 정찰 중심 편성 | standard | scout-first | 사용 | won | 99.7 | 0.00 | 4 |
| 소규모 편성 | standard | guard-first | 없음 | lost | 180 | 0.52 | 0 |
| 소규모 편성 | standard | guard-first | 사용 | won | 66.4 | 0.00 | 2 |
| 소규모 편성 | standard | striker-first | 없음 | lost | 180 | 0.54 | 0 |
| 소규모 편성 | standard | striker-first | 사용 | won | 69.3 | 0.00 | 2 |
| 소규모 편성 | standard | scout-first | 없음 | lost | 180 | 0.54 | 0 |
| 소규모 편성 | standard | scout-first | 사용 | won | 67.9 | 0.00 | 2 |
| 균형 편성 | challenge | guard-first | 없음 | won | 37.7 | 0.00 | 11 |
| 균형 편성 | challenge | guard-first | 사용 | won | 37.7 | 0.00 | 11 |
| 균형 편성 | challenge | striker-first | 없음 | won | 39.4 | 0.00 | 11 |
| 균형 편성 | challenge | striker-first | 사용 | won | 39.4 | 0.00 | 11 |
| 균형 편성 | challenge | scout-first | 없음 | won | 44.5 | 0.00 | 10 |
| 균형 편성 | challenge | scout-first | 사용 | won | 39.1 | 0.00 | 11 |
| 정찰 지원 편성 | challenge | guard-first | 없음 | won | 26.7 | 0.00 | 12 |
| 정찰 지원 편성 | challenge | guard-first | 사용 | won | 26.7 | 0.00 | 12 |
| 정찰 지원 편성 | challenge | striker-first | 없음 | won | 29.4 | 0.00 | 12 |
| 정찰 지원 편성 | challenge | striker-first | 사용 | won | 29.4 | 0.00 | 12 |
| 정찰 지원 편성 | challenge | scout-first | 없음 | won | 32.3 | 0.00 | 11 |
| 정찰 지원 편성 | challenge | scout-first | 사용 | won | 31.1 | 0.00 | 12 |
| 돌격 중심 편성 | challenge | guard-first | 없음 | won | 30.2 | 0.00 | 11 |
| 돌격 중심 편성 | challenge | guard-first | 사용 | won | 30.2 | 0.00 | 11 |
| 돌격 중심 편성 | challenge | striker-first | 없음 | won | 36.4 | 0.00 | 11 |
| 돌격 중심 편성 | challenge | striker-first | 사용 | won | 36.4 | 0.00 | 11 |
| 돌격 중심 편성 | challenge | scout-first | 없음 | won | 43.3 | 0.00 | 10 |
| 돌격 중심 편성 | challenge | scout-first | 사용 | won | 36.1 | 0.00 | 11 |
| 방패 중심 편성 | challenge | guard-first | 없음 | won | 40.6 | 0.00 | 11 |
| 방패 중심 편성 | challenge | guard-first | 사용 | won | 40.6 | 0.00 | 11 |
| 방패 중심 편성 | challenge | striker-first | 없음 | won | 39.2 | 0.00 | 11 |
| 방패 중심 편성 | challenge | striker-first | 사용 | won | 39.2 | 0.00 | 11 |
| 방패 중심 편성 | challenge | scout-first | 없음 | won | 39.7 | 0.00 | 10 |
| 방패 중심 편성 | challenge | scout-first | 사용 | won | 40.3 | 0.00 | 11 |
| 정찰 중심 편성 | challenge | guard-first | 없음 | lost | 180 | 5.26 | 0 |
| 정찰 중심 편성 | challenge | guard-first | 사용 | lost | 180 | 3.27 | 0 |
| 정찰 중심 편성 | challenge | striker-first | 없음 | lost | 180 | 5.26 | 0 |
| 정찰 중심 편성 | challenge | striker-first | 사용 | lost | 180 | 3.27 | 0 |
| 정찰 중심 편성 | challenge | scout-first | 없음 | lost | 180 | 5.47 | 0 |
| 정찰 중심 편성 | challenge | scout-first | 사용 | lost | 180 | 2.74 | 0 |
| 소규모 편성 | challenge | guard-first | 없음 | lost | 180 | 1.99 | 0 |
| 소규모 편성 | challenge | guard-first | 사용 | lost | 180 | 0.31 | 0 |
| 소규모 편성 | challenge | striker-first | 없음 | lost | 180 | 1.79 | 0 |
| 소규모 편성 | challenge | striker-first | 사용 | lost | 180 | 0.07 | 0 |
| 소규모 편성 | challenge | scout-first | 없음 | lost | 180 | 1.29 | 0 |
| 소규모 편성 | challenge | scout-first | 사용 | lost | 180 | 0.07 | 0 |

재현: `npx tsx tools/simulate-secret-siege.ts`
