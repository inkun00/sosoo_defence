# 비밀 스테이지 역공격 밸런스 검증

모든 실행은 공개 API로 정확한 모집 뺄셈 문제를 풀고, 실제 보유 군대만 출격시켰습니다. 돈·체력·시간·명중 판정에 대한 주입이나 전투 중 수치 변경은 없습니다. 자동 전략의 성공 비율이며 실제 어린이의 성공률을 뜻하지 않습니다.

시작 코인 9.90, 동시 보유 한도 12명, 제한 시간 180초입니다. 출격은 0.65초 이상 간격을 지켰습니다. 집결 전략은 살아 있는 병력의 전체 결손 체력이 1.80 이상일 때 덧셈 문제에 정답을 제출해 사용했습니다. 문제를 푸는 동안 전투·발사체·시간은 정지합니다.

미리 설치된 마력탑·독탑 네 기를 경로 거리 240 / 430 / 620 / 800에서 차례대로 파괴해야 성을 공격할 수 있습니다. 타워 체력은 2.40 / 3.60 / 4.50 / 5.40, 공격은 0.10 / 0.15 / 0.20 / 0.25, 사거리는 175 / 185 / 195 / 205입니다. 성은 체력 9.99, 공격 0.30, 사거리 240을 유지합니다. 타워는 각자 사거리 안의 가장 앞선 병사를 조준하며 0.5초 비행한 발사체가 도착하면 피해를 줍니다. 파괴된 타워는 사격하지 않으며, 이미 발사한 공격도 취소됩니다.

연습·표준·도전은 적 사격 간격만 다릅니다. 네 타워와 성의 사격 간격은 연습 2.10 / 2.00 / 1.90 / 1.80 / 1.65초, 표준 1.60 / 1.55 / 1.50 / 1.40 / 1.20초, 도전 1.25 / 1.20 / 1.15 / 1.10 / 0.95초입니다. 아군의 초과 공격은 무효이고, 0.01 정찰병이 소수 두 자리 나머지를 마무리합니다.

| 난이도 | 성공 / 실행 | 성공 비율 |
|---|---:|---:|
| practice | 24 / 36 | 66.7% |
| standard | 24 / 36 | 66.7% |
| challenge | 24 / 36 | 66.7% |

| 편성 | 난이도 | 순서 | 집결 | 결과 | 경과 초 | 성 잔여 체력 | 생존 | 타워 파괴 | 적 발사 | 받은 피해 |
|---|---|---|---|---|---:|---:|---:|---:|---:|---:|
| 균형 편성 | practice | guard-first | 없음 | won | 41.2 | 0.00 | 11 | 4 / 4 | 23 | 4.75 |
| 균형 편성 | practice | guard-first | 사용 | won | 41.2 | 0.00 | 11 | 4 / 4 | 23 | 4.75 |
| 균형 편성 | practice | striker-first | 없음 | won | 42.5 | 0.00 | 11 | 4 / 4 | 24 | 4.85 |
| 균형 편성 | practice | striker-first | 사용 | won | 42.5 | 0.00 | 11 | 4 / 4 | 24 | 4.85 |
| 균형 편성 | practice | scout-first | 없음 | won | 36.2 | 0.00 | 11 | 4 / 4 | 21 | 4.55 |
| 균형 편성 | practice | scout-first | 사용 | won | 36.2 | 0.00 | 11 | 4 / 4 | 21 | 4.55 |
| 정찰 지원 편성 | practice | guard-first | 없음 | won | 35.8 | 0.00 | 12 | 4 / 4 | 22 | 4.15 |
| 정찰 지원 편성 | practice | guard-first | 사용 | won | 35.8 | 0.00 | 12 | 4 / 4 | 22 | 4.15 |
| 정찰 지원 편성 | practice | striker-first | 없음 | won | 36.2 | 0.00 | 12 | 4 / 4 | 22 | 4.25 |
| 정찰 지원 편성 | practice | striker-first | 사용 | won | 36.2 | 0.00 | 12 | 4 / 4 | 22 | 4.25 |
| 정찰 지원 편성 | practice | scout-first | 없음 | won | 37.9 | 0.00 | 12 | 4 / 4 | 23 | 4.25 |
| 정찰 지원 편성 | practice | scout-first | 사용 | won | 37.9 | 0.00 | 12 | 4 / 4 | 23 | 4.25 |
| 돌격 중심 편성 | practice | guard-first | 없음 | won | 48.7 | 0.00 | 11 | 4 / 4 | 28 | 6.20 |
| 돌격 중심 편성 | practice | guard-first | 사용 | won | 48.7 | 0.00 | 11 | 4 / 4 | 28 | 6.20 |
| 돌격 중심 편성 | practice | striker-first | 없음 | won | 50 | 0.00 | 11 | 4 / 4 | 29 | 6.30 |
| 돌격 중심 편성 | practice | striker-first | 사용 | won | 50 | 0.00 | 11 | 4 / 4 | 29 | 6.30 |
| 돌격 중심 편성 | practice | scout-first | 없음 | won | 55.6 | 0.00 | 11 | 4 / 4 | 32 | 7.05 |
| 돌격 중심 편성 | practice | scout-first | 사용 | won | 55.6 | 0.00 | 11 | 4 / 4 | 32 | 7.05 |
| 방패 중심 편성 | practice | guard-first | 없음 | won | 46.1 | 0.00 | 11 | 4 / 4 | 29 | 5.75 |
| 방패 중심 편성 | practice | guard-first | 사용 | won | 46.1 | 0.00 | 11 | 4 / 4 | 29 | 5.75 |
| 방패 중심 편성 | practice | striker-first | 없음 | won | 44.5 | 0.00 | 11 | 4 / 4 | 28 | 5.65 |
| 방패 중심 편성 | practice | striker-first | 사용 | won | 44.5 | 0.00 | 11 | 4 / 4 | 28 | 5.65 |
| 방패 중심 편성 | practice | scout-first | 없음 | won | 45.6 | 0.00 | 11 | 4 / 4 | 29 | 5.75 |
| 방패 중심 편성 | practice | scout-first | 사용 | won | 45.6 | 0.00 | 11 | 4 / 4 | 29 | 5.75 |
| 정찰 중심 편성 | practice | guard-first | 없음 | lost | 180 | 5.91 | 0 | 4 / 4 | 77 | 18.60 |
| 정찰 중심 편성 | practice | guard-first | 사용 | lost | 180 | 4.32 | 0 | 4 / 4 | 83 | 20.60 |
| 정찰 중심 편성 | practice | striker-first | 없음 | lost | 180 | 5.91 | 0 | 4 / 4 | 77 | 18.60 |
| 정찰 중심 편성 | practice | striker-first | 사용 | lost | 180 | 4.32 | 0 | 4 / 4 | 83 | 20.60 |
| 정찰 중심 편성 | practice | scout-first | 없음 | lost | 180 | 6.12 | 0 | 4 / 4 | 78 | 18.60 |
| 정찰 중심 편성 | practice | scout-first | 사용 | lost | 180 | 4.02 | 0 | 4 / 4 | 85 | 21.10 |
| 소규모 편성 | practice | guard-first | 없음 | lost | 180 | 9.99 | 0 | 3 / 4 | 43 | 9.00 |
| 소규모 편성 | practice | guard-first | 사용 | lost | 180 | 6.78 | 0 | 4 / 4 | 49 | 11.15 |
| 소규모 편성 | practice | striker-first | 없음 | lost | 180 | 9.99 | 0 | 3 / 4 | 44 | 9.00 |
| 소규모 편성 | practice | striker-first | 사용 | lost | 180 | 5.23 | 0 | 4 / 4 | 52 | 11.35 |
| 소규모 편성 | practice | scout-first | 없음 | lost | 180 | 9.99 | 0 | 3 / 4 | 47 | 9.00 |
| 소규모 편성 | practice | scout-first | 사용 | lost | 180 | 6.78 | 0 | 4 / 4 | 54 | 11.35 |
| 균형 편성 | standard | guard-first | 없음 | won | 41.2 | 0.00 | 11 | 4 / 4 | 31 | 6.15 |
| 균형 편성 | standard | guard-first | 사용 | won | 41.2 | 0.00 | 11 | 4 / 4 | 31 | 6.15 |
| 균형 편성 | standard | striker-first | 없음 | won | 42.5 | 0.00 | 11 | 4 / 4 | 32 | 6.25 |
| 균형 편성 | standard | striker-first | 사용 | won | 42.5 | 0.00 | 11 | 4 / 4 | 32 | 6.25 |
| 균형 편성 | standard | scout-first | 없음 | won | 36.2 | 0.00 | 11 | 4 / 4 | 28 | 5.85 |
| 균형 편성 | standard | scout-first | 사용 | won | 36.2 | 0.00 | 11 | 4 / 4 | 28 | 5.85 |
| 정찰 지원 편성 | standard | guard-first | 없음 | won | 35.8 | 0.00 | 12 | 4 / 4 | 27 | 5.75 |
| 정찰 지원 편성 | standard | guard-first | 사용 | won | 35.8 | 0.00 | 12 | 4 / 4 | 27 | 5.75 |
| 정찰 지원 편성 | standard | striker-first | 없음 | won | 36.2 | 0.00 | 12 | 4 / 4 | 27 | 5.85 |
| 정찰 지원 편성 | standard | striker-first | 사용 | won | 36.2 | 0.00 | 12 | 4 / 4 | 27 | 5.85 |
| 정찰 지원 편성 | standard | scout-first | 없음 | won | 37.9 | 0.00 | 12 | 4 / 4 | 28 | 5.95 |
| 정찰 지원 편성 | standard | scout-first | 사용 | won | 37.9 | 0.00 | 12 | 4 / 4 | 28 | 5.95 |
| 돌격 중심 편성 | standard | guard-first | 없음 | won | 54.7 | 0.00 | 9 | 4 / 4 | 43 | 9.60 |
| 돌격 중심 편성 | standard | guard-first | 사용 | won | 48.7 | 0.00 | 10 | 4 / 4 | 38 | 8.10 |
| 돌격 중심 편성 | standard | striker-first | 없음 | won | 50 | 0.00 | 9 | 4 / 4 | 39 | 8.10 |
| 돌격 중심 편성 | standard | striker-first | 사용 | won | 50 | 0.00 | 11 | 4 / 4 | 39 | 8.30 |
| 돌격 중심 편성 | standard | scout-first | 없음 | won | 61.6 | 0.00 | 8 | 4 / 4 | 48 | 10.40 |
| 돌격 중심 편성 | standard | scout-first | 사용 | won | 55.6 | 0.00 | 10 | 4 / 4 | 43 | 9.10 |
| 방패 중심 편성 | standard | guard-first | 없음 | won | 46.1 | 0.00 | 10 | 4 / 4 | 37 | 7.50 |
| 방패 중심 편성 | standard | guard-first | 사용 | won | 46.1 | 0.00 | 11 | 4 / 4 | 37 | 7.65 |
| 방패 중심 편성 | standard | striker-first | 없음 | won | 44.5 | 0.00 | 10 | 4 / 4 | 36 | 7.50 |
| 방패 중심 편성 | standard | striker-first | 사용 | won | 44.5 | 0.00 | 11 | 4 / 4 | 36 | 7.55 |
| 방패 중심 편성 | standard | scout-first | 없음 | won | 45.6 | 0.00 | 10 | 4 / 4 | 36 | 7.60 |
| 방패 중심 편성 | standard | scout-first | 사용 | won | 45.6 | 0.00 | 11 | 4 / 4 | 36 | 7.65 |
| 정찰 중심 편성 | standard | guard-first | 없음 | lost | 180 | 8.37 | 0 | 4 / 4 | 83 | 18.60 |
| 정찰 중심 편성 | standard | guard-first | 사용 | lost | 180 | 7.35 | 0 | 4 / 4 | 89 | 20.65 |
| 정찰 중심 편성 | standard | striker-first | 없음 | lost | 180 | 8.37 | 0 | 4 / 4 | 83 | 18.60 |
| 정찰 중심 편성 | standard | striker-first | 사용 | lost | 180 | 7.35 | 0 | 4 / 4 | 89 | 20.65 |
| 정찰 중심 편성 | standard | scout-first | 없음 | lost | 180 | 8.61 | 0 | 4 / 4 | 86 | 18.60 |
| 정찰 중심 편성 | standard | scout-first | 사용 | lost | 180 | 7.02 | 0 | 4 / 4 | 93 | 21.25 |
| 소규모 편성 | standard | guard-first | 없음 | lost | 180 | 9.99 | 0 | 3 / 4 | 46 | 9.00 |
| 소규모 편성 | standard | guard-first | 사용 | lost | 180 | 9.99 | 0 | 3 / 4 | 53 | 11.15 |
| 소규모 편성 | standard | striker-first | 없음 | lost | 180 | 9.99 | 0 | 3 / 4 | 47 | 9.00 |
| 소규모 편성 | standard | striker-first | 사용 | lost | 180 | 9.99 | 0 | 3 / 4 | 56 | 11.45 |
| 소규모 편성 | standard | scout-first | 없음 | lost | 180 | 9.99 | 0 | 3 / 4 | 50 | 9.00 |
| 소규모 편성 | standard | scout-first | 사용 | lost | 180 | 9.99 | 0 | 3 / 4 | 58 | 11.45 |
| 균형 편성 | challenge | guard-first | 없음 | won | 41.2 | 0.00 | 10 | 4 / 4 | 38 | 7.35 |
| 균형 편성 | challenge | guard-first | 사용 | won | 41.2 | 0.00 | 11 | 4 / 4 | 38 | 7.45 |
| 균형 편성 | challenge | striker-first | 없음 | won | 42.5 | 0.00 | 10 | 4 / 4 | 40 | 7.35 |
| 균형 편성 | challenge | striker-first | 사용 | won | 42.5 | 0.00 | 11 | 4 / 4 | 40 | 7.55 |
| 균형 편성 | challenge | scout-first | 없음 | won | 36.2 | 0.00 | 11 | 4 / 4 | 35 | 7.15 |
| 균형 편성 | challenge | scout-first | 사용 | won | 36.2 | 0.00 | 11 | 4 / 4 | 35 | 7.15 |
| 정찰 지원 편성 | challenge | guard-first | 없음 | won | 35.8 | 0.00 | 11 | 4 / 4 | 34 | 7.05 |
| 정찰 지원 편성 | challenge | guard-first | 사용 | won | 35.8 | 0.00 | 12 | 4 / 4 | 34 | 7.05 |
| 정찰 지원 편성 | challenge | striker-first | 없음 | won | 36.2 | 0.00 | 11 | 4 / 4 | 34 | 6.95 |
| 정찰 지원 편성 | challenge | striker-first | 사용 | won | 36.2 | 0.00 | 12 | 4 / 4 | 34 | 7.00 |
| 정찰 지원 편성 | challenge | scout-first | 없음 | won | 37.9 | 0.00 | 12 | 4 / 4 | 36 | 7.10 |
| 정찰 지원 편성 | challenge | scout-first | 사용 | won | 37.9 | 0.00 | 12 | 4 / 4 | 36 | 7.10 |
| 돌격 중심 편성 | challenge | guard-first | 없음 | won | 43.9 | 0.00 | 9 | 4 / 4 | 42 | 8.40 |
| 돌격 중심 편성 | challenge | guard-first | 사용 | won | 48.7 | 0.00 | 10 | 4 / 4 | 47 | 9.75 |
| 돌격 중심 편성 | challenge | striker-first | 없음 | won | 62 | 0.00 | 7 | 4 / 4 | 61 | 13.20 |
| 돌격 중심 편성 | challenge | striker-first | 사용 | won | 50 | 0.00 | 10 | 4 / 4 | 49 | 9.85 |
| 돌격 중심 편성 | challenge | scout-first | 없음 | won | 50.8 | 0.00 | 9 | 4 / 4 | 49 | 9.90 |
| 돌격 중심 편성 | challenge | scout-first | 사용 | won | 55.6 | 0.00 | 10 | 4 / 4 | 54 | 11.00 |
| 방패 중심 편성 | challenge | guard-first | 없음 | won | 46.1 | 0.00 | 10 | 4 / 4 | 45 | 9.75 |
| 방패 중심 편성 | challenge | guard-first | 사용 | won | 46.1 | 0.00 | 10 | 4 / 4 | 45 | 9.75 |
| 방패 중심 편성 | challenge | striker-first | 없음 | won | 44.5 | 0.00 | 10 | 4 / 4 | 44 | 9.45 |
| 방패 중심 편성 | challenge | striker-first | 사용 | won | 44.5 | 0.00 | 10 | 4 / 4 | 44 | 9.45 |
| 방패 중심 편성 | challenge | scout-first | 없음 | won | 45.6 | 0.00 | 10 | 4 / 4 | 45 | 9.65 |
| 방패 중심 편성 | challenge | scout-first | 사용 | won | 45.6 | 0.00 | 10 | 4 / 4 | 45 | 9.65 |
| 정찰 중심 편성 | challenge | guard-first | 없음 | lost | 180 | 9.81 | 0 | 4 / 4 | 90 | 18.60 |
| 정찰 중심 편성 | challenge | guard-first | 사용 | lost | 180 | 9.04 | 0 | 4 / 4 | 94 | 20.50 |
| 정찰 중심 편성 | challenge | striker-first | 없음 | lost | 180 | 9.81 | 0 | 4 / 4 | 90 | 18.60 |
| 정찰 중심 편성 | challenge | striker-first | 사용 | lost | 180 | 9.04 | 0 | 4 / 4 | 94 | 20.50 |
| 정찰 중심 편성 | challenge | scout-first | 없음 | lost | 180 | 9.99 | 0 | 3 / 4 | 93 | 18.60 |
| 정찰 중심 편성 | challenge | scout-first | 사용 | lost | 180 | 9.04 | 0 | 4 / 4 | 97 | 21.20 |
| 소규모 편성 | challenge | guard-first | 없음 | lost | 180 | 9.99 | 0 | 3 / 4 | 51 | 9.00 |
| 소규모 편성 | challenge | guard-first | 사용 | lost | 180 | 9.99 | 0 | 3 / 4 | 58 | 11.30 |
| 소규모 편성 | challenge | striker-first | 없음 | lost | 180 | 9.99 | 0 | 3 / 4 | 49 | 9.00 |
| 소규모 편성 | challenge | striker-first | 사용 | lost | 180 | 9.99 | 0 | 3 / 4 | 58 | 11.60 |
| 소규모 편성 | challenge | scout-first | 없음 | lost | 180 | 9.99 | 0 | 3 / 4 | 54 | 9.00 |
| 소규모 편성 | challenge | scout-first | 사용 | lost | 180 | 9.99 | 0 | 3 / 4 | 64 | 11.70 |

재현: `npx tsx tools/simulate-secret-siege.ts`
