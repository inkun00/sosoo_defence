# 비밀 원정 10단계 역공격 밸런스 검증

모든 실행은 공개 API로 정확한 모집 뺄셈 문제를 풀고, 실제 보유 군대만 출격시켰습니다. 돈·체력·시간·명중 판정에 대한 주입이나 전투 중 수치 변경은 없습니다. 자동 전략의 성공 비율이며 실제 어린이의 성공률을 뜻하지 않습니다.

시작 코인 9.90, 동시 보유 한도 12명, 제한 시간 180초입니다. 출격은 0.65초 이상 간격을 지켰습니다. 기본 1,080회 전략은 살아 있는 병력의 전체 결손 체력이 1.80 이상일 때 덧셈 문제에 정답을 제출해 집결을 사용했습니다. 추가 486회는 집결을 아껴 보스의 마법이 명중한 후 사용했습니다. 문제를 푸는 동안 전투·발사체·마법 예고·속박·시간은 정지합니다.

마력탑·독탑 네 기를 경로 거리 240 / 430 / 620 / 800에서 차례로 파괴해야 합니다. 1단계 타워 체력은 2.40 / 3.60 / 4.50 / 5.40이며 단계마다 각각 0.45씩 증가합니다. 10단계는 6.45 / 7.65 / 8.55 / 9.45입니다. 성의 체력은 모든 단계에서 9.99이며 공격력·사거리·사격 빈도가 증가합니다. 모집·회복 문제의 피연산자와 답은 기존 10 미만 소수 두 자리 범위를 유지합니다. 보스의 큰 체력은 학습 문제로 출제하지 않습니다.

기본 사격 간격(네 타워 / 성)은 연습 2.10 / 2.00 / 1.90 / 1.80 / 1.65초, 표준 1.60 / 1.55 / 1.50 / 1.40 / 1.20초, 도전 1.25 / 1.20 / 1.15 / 1.10 / 0.95초입니다. 단계마다 사격 배율이 0.018씩 감소하며 10단계는 기본 간격의 0.838배입니다. 타워는 사거리 안 가장 앞선 병사를 조준하며 발사체는 기존 0.5초를 1.2로 나눈 약 0.417초 후 명중합니다. 방패병·돌격병·정찰병의 비행 시간도 각각 0.5 / 0.6 / 0.35초의 1/1.2로 줄여 모든 발사체의 이동 속도를 20% 높였습니다. 사격 간격·공격력·체력·마법 시전 시간은 유지합니다. 파괴된 타워의 비행 중 공격은 취소됩니다. 아군의 초과 공격은 무효이며 0.01 정찰병이 소수 두 자리 나머지를 마무리합니다.

1~9단계의 적·군대 능력치는 유지했으며 발사체 이동 속도 변경 후 대표 편성 27회의 경과 시간·발사 수·받은 피해·생존 수를 다시 검증했습니다. 정확한 나머지를 마무리하는 소요 시간과 피격 대상이 달라져 모든 편성의 경과 시간과 피해가 매 단계 단조롭게 증가하지는 않습니다.

## 마지막 단계: 부활한 저주 마법사

10단계에서는 네 타워 → 부활한 저주 마법사 → 성을 차례로 쓰러뜨려야 합니다. 보스의 체력은 119.90로 본편 11단계 마법사 체력 99.90보다 20.00 높습니다. 본편 마법사는 주변 몬스터 강화가 주 역할이지만, 부활한 마법사는 직접 마력탄과 두 가지 광역 마법으로 군대와 싸웁니다. 서로 다른 모드이므로 두 모드의 실제 사람 성공률을 수치로 비교한 것은 아닙니다.

- 네 타워가 살아 있는 동안에는 대기합니다. 보스가 살아 있는 동안 성은 공격과 피격 모두 보호막으로 정지하므로 성·보스 공격이 겹쳐 즉시 전멸하지 않습니다.
- 기본 마력탄은 공격 0.26, 사거리 240, 비행 0.5/1.2초(약 0.417초)입니다. 사격 간격은 연습 1.80 / 표준 1.55 / 도전 1.30초입니다.
- 체력 40% 이하에서는 격노해 마력탄이 0.34, 사격 간격이 기본의 0.8배가 됩니다. 마법 후 휴식도 5.2초에서 3.8초로 줄어듭니다.
- 암흑 파동: 2.8초 고정 범위 예고 후 반경 80 안 아군에게 0.44 피해를 한 번 줍니다. 효과는 1.4초 동안 보입니다.
- 영혼의 속박: 같은 2.8초 예고 후 범위 안 아군에게 0.20 피해를 주고 3.5초 동안 공격 간격을 1.6배로 늦춥니다. 파동과 번갈아 사용합니다.
- 마법을 예고·시전하는 동안 기본 마력탄은 쉬므로 대응 시간이 생깁니다. 광역 마법이 명중한 뒤 부상병이 함께 모였을 때 집결을 쓰거나 후발 병력을 보낼 수 있습니다. 예고 범위는 병력을 따라 움직이지 않습니다.
- 보스가 죽으면 남은 마법·비행 중 마력탄이 취소되고 성의 보호막이 사라집니다. 보스가 살아 있다면 성의 체력을 0으로 바꾸더라도 승리하지 않습니다.

| 단계 | 이름 | 타워 체력 | 타워 공격력 | 성 공격력 | 사거리 증가 | 사격 간격 배율 |
|---:|---|---|---|---:|---:|---:|
| 1 | 잿빛 변두리 | 2.40 / 3.60 / 4.50 / 5.40 | 0.10 / 0.15 / 0.20 / 0.25 | 0.30 | +0 | 1 |
| 2 | 침묵의 숲 | 2.85 / 4.05 / 4.95 / 5.85 | 0.11 / 0.16 / 0.22 / 0.27 | 0.32 | +4 | 0.982 |
| 3 | 부서진 협곡 | 3.30 / 4.50 / 5.40 / 6.30 | 0.12 / 0.17 / 0.24 / 0.29 | 0.34 | +8 | 0.964 |
| 4 | 그림자 성문 | 3.75 / 4.95 / 5.85 / 6.75 | 0.13 / 0.18 / 0.26 / 0.31 | 0.36 | +12 | 0.946 |
| 5 | 독안개 습지 | 4.20 / 5.40 / 6.30 / 7.20 | 0.14 / 0.19 / 0.28 / 0.33 | 0.38 | +16 | 0.928 |
| 6 | 망각의 계곡 | 4.65 / 5.85 / 6.75 / 7.65 | 0.15 / 0.20 / 0.30 / 0.35 | 0.40 | +20 | 0.91 |
| 7 | 검은 첨탑 | 5.10 / 6.30 / 7.20 / 8.10 | 0.16 / 0.21 / 0.32 / 0.37 | 0.42 | +24 | 0.892 |
| 8 | 저주받은 내성 | 5.55 / 6.75 / 7.65 / 8.55 | 0.17 / 0.22 / 0.34 / 0.39 | 0.44 | +28 | 0.874 |
| 9 | 황혼의 왕좌 | 6.00 / 7.20 / 8.10 / 9.00 | 0.18 / 0.23 / 0.36 / 0.41 | 0.46 | +32 | 0.856 |
| 10 | 어둠의 심장 | 6.45 / 7.65 / 8.55 / 9.45 | 0.19 / 0.24 / 0.38 / 0.43 | 0.48 | +36 | 0.838 |

총 1,080회: 10단계 × 3가지 기본 난이도 × 6가지 편성 × 3가지 출격 순서 × 집결 사용 여부.

| 단계 | 연습 성공 / 36 | 표준 성공 / 36 | 도전 성공 / 36 |
|---:|---:|---:|---:|
| 1 | 24 | 24 | 24 |
| 2 | 24 | 24 | 24 |
| 3 | 24 | 24 | 24 |
| 4 | 24 | 24 | 24 |
| 5 | 24 | 24 | 24 |
| 6 | 24 | 24 | 22 |
| 7 | 24 | 24 | 18 |
| 8 | 24 | 24 | 22 |
| 9 | 24 | 20 | 15 |
| 10 | 0 | 0 | 0 |

기본 전략에서는 집결을 타워 구간에서 소진하므로 마지막 보스전 108회가 모두 실패합니다. 집결을 누르지 않은 균형 편성 역시 세 난이도에서 전멸합니다. 아래 추가 검증에서는 마법에 맞은 뒤에 회복하는 전략으로 마지막 단계의 합법적인 클리어 경로를 확인했습니다.

## 보스전의 출격·회복 타이밍 탐색

추가 486회 = 6가지 편성 × 3난이도 × 3출격 순서 × 출격 간격 0.7 / 1.0 / 1.5초 × 마법 명중 후 반응 지연 0 / 0.5 / 1초입니다. 최초 세 번의 마법 명중 후 집결을 사용하며, 덧셈을 푸는 동안은 전투 시간이 진행하지 않습니다.

| 난이도 | 타이밍 전략 성공 / 162 |
|---|---:|
| practice | 78 |
| standard | 51 |
| challenge | 15 |

화면에서 실행할 수 있는 공략은 방패 3 → 돌격 6 → 정찰 2 순서로 약 1초마다 출격하고, 처음 세 번의 광역 마법이 맞은 직후 집결을 사용하는 것입니다. 대안은 같은 순서로 방패 3 / 돌격 5 / 정찰 4를 약 0.7초마다 출격하는 정찰 지원 결전 편성입니다. 발사체 20% 가속 후 기존 방패 2 / 돌격 7 / 정찰 2·1초 출격 전략은 도전의 0.1초 갱신 간격에서 성 체력 0.64를 남기고 실패해, 능력치 변경 없이 합법적인 대안 편성을 탐색했습니다. 마지막 18회는 이 두 검증된 편성을 3난이도 × 10 / 20 / 60fps의 전투 갱신 간격으로 재현한 것으로, 모두 0.5초 반응 지연과 집결 정답 제출을 포함합니다.

| 편성 | 난이도 | 갱신 간격 | 결과 | 경과 초 | 생존 | 보스 마법 | 받은 피해 |
|---|---|---:|---|---:|---:|---:|---:|
| 균형 편성 | practice | 0.1000 | won | 94.7 | 9 | 5 | 32.73 |
| 균형 편성 | practice | 0.0500 | won | 88.9 | 9 | 4 | 29.16 |
| 균형 편성 | practice | 0.0167 | won | 87.4 | 9 | 4 | 28.01 |
| 정찰 지원 결전 편성 | practice | 0.1000 | won | 85.2 | 10 | 4 | 27.22 |
| 정찰 지원 결전 편성 | practice | 0.0500 | won | 83.1 | 10 | 4 | 27.32 |
| 정찰 지원 결전 편성 | practice | 0.0167 | won | 82.8 | 10 | 4 | 27.32 |
| 균형 편성 | standard | 0.1000 | won | 112.7 | 3 | 5 | 41.28 |
| 균형 편성 | standard | 0.0500 | won | 100.3 | 6 | 4 | 34.80 |
| 균형 편성 | standard | 0.0167 | won | 90.2 | 7 | 4 | 32.12 |
| 정찰 지원 결전 편성 | standard | 0.1000 | won | 84.6 | 10 | 4 | 30.77 |
| 정찰 지원 결전 편성 | standard | 0.0500 | won | 84.8 | 9 | 5 | 34.58 |
| 정찰 지원 결전 편성 | standard | 0.0167 | won | 85.6 | 10 | 5 | 34.79 |
| 균형 편성 | challenge | 0.1000 | won | 95.9 | 5 | 4 | 35.44 |
| 균형 편성 | challenge | 0.0500 | won | 90.4 | 5 | 4 | 34.96 |
| 균형 편성 | challenge | 0.0167 | won | 97.2 | 4 | 5 | 38.32 |
| 정찰 지원 결전 편성 | challenge | 0.1000 | won | 99 | 4 | 5 | 43.48 |
| 정찰 지원 결전 편성 | challenge | 0.0500 | won | 91.4 | 6 | 5 | 40.26 |
| 정찰 지원 결전 편성 | challenge | 0.0167 | won | 82.7 | 8 | 5 | 35.96 |

총 1,584회 = 기본 1,080회 + 보스 타이밍 486회 + 갱신 간격 검증 18회. 아래는 각 단계의 대표 균형 편성 결과입니다. 1~9단계는 기존 집결 전략, 10단계는 마법 후 집결·1초 출격 간격·0.5초 반응 전략입니다.

| 단계 | 난이도 | 결과 | 경과 초 | 적 발사 | 받은 피해 | 생존 / 11 |
|---:|---|---|---:|---:|---:|---:|
| 1 | practice | won | 40.8 | 23 | 4.75 | 11 |
| 1 | standard | won | 40.8 | 31 | 6.15 | 11 |
| 1 | challenge | won | 40.8 | 37 | 7.45 | 11 |
| 2 | practice | won | 37.6 | 23 | 4.90 | 11 |
| 2 | standard | won | 37.6 | 30 | 6.57 | 11 |
| 2 | challenge | won | 37.6 | 37 | 7.75 | 11 |
| 3 | practice | won | 40.9 | 28 | 7.02 | 11 |
| 3 | standard | won | 40.9 | 36 | 8.92 | 10 |
| 3 | challenge | won | 40.9 | 43 | 10.62 | 10 |
| 4 | practice | won | 38.1 | 24 | 6.30 | 11 |
| 4 | standard | won | 38.1 | 31 | 8.26 | 11 |
| 4 | challenge | won | 38.1 | 41 | 10.11 | 10 |
| 5 | practice | won | 40.6 | 32 | 9.14 | 10 |
| 5 | standard | won | 40.6 | 42 | 11.04 | 10 |
| 5 | challenge | won | 40.6 | 51 | 13.93 | 10 |
| 6 | practice | won | 37.9 | 27 | 7.65 | 11 |
| 6 | standard | won | 37.9 | 34 | 9.65 | 10 |
| 6 | challenge | won | 37.9 | 44 | 12.05 | 10 |
| 7 | practice | won | 45.1 | 33 | 9.88 | 10 |
| 7 | standard | won | 45.3 | 43 | 12.67 | 10 |
| 7 | challenge | won | 52.3 | 62 | 19.80 | 9 |
| 8 | practice | won | 45.6 | 35 | 11.28 | 10 |
| 8 | standard | won | 45.6 | 45 | 14.16 | 10 |
| 8 | challenge | won | 51.6 | 64 | 20.15 | 9 |
| 9 | practice | won | 42.1 | 33 | 10.60 | 10 |
| 9 | standard | won | 42.1 | 41 | 14.08 | 10 |
| 9 | challenge | won | 42.1 | 52 | 16.61 | 8 |
| 10 | practice | won | 94.7 | 50 | 32.73 | 9 |
| 10 | standard | won | 112.7 | 78 | 41.28 | 3 |
| 10 | challenge | won | 95.9 | 79 | 35.44 | 5 |

<details><summary>전체 자동 전략 1,080회 결과</summary>

| 단계 | 편성 | 난이도 | 순서 | 집결 | 결과 | 경과 초 | 성 잔여 체력 | 생존 | 타워 파괴 | 적 발사 | 받은 피해 |
|---:|---|---|---|---|---|---:|---:|---:|---:|---:|---:|
| 1 | 균형 편성 | practice | guard-first | 없음 | won | 40.8 | 0.00 | 11 | 4 / 4 | 23 | 4.75 |
| 1 | 균형 편성 | practice | guard-first | 사용 | won | 40.8 | 0.00 | 11 | 4 / 4 | 23 | 4.75 |
| 1 | 균형 편성 | practice | striker-first | 없음 | won | 42.1 | 0.00 | 11 | 4 / 4 | 24 | 4.85 |
| 1 | 균형 편성 | practice | striker-first | 사용 | won | 42.1 | 0.00 | 11 | 4 / 4 | 24 | 4.85 |
| 1 | 균형 편성 | practice | scout-first | 없음 | won | 35.8 | 0.00 | 11 | 4 / 4 | 21 | 4.55 |
| 1 | 균형 편성 | practice | scout-first | 사용 | won | 35.8 | 0.00 | 11 | 4 / 4 | 21 | 4.55 |
| 1 | 정찰 지원 편성 | practice | guard-first | 없음 | won | 35.4 | 0.00 | 12 | 4 / 4 | 22 | 4.15 |
| 1 | 정찰 지원 편성 | practice | guard-first | 사용 | won | 35.4 | 0.00 | 12 | 4 / 4 | 22 | 4.15 |
| 1 | 정찰 지원 편성 | practice | striker-first | 없음 | won | 35.7 | 0.00 | 12 | 4 / 4 | 22 | 4.25 |
| 1 | 정찰 지원 편성 | practice | striker-first | 사용 | won | 35.7 | 0.00 | 12 | 4 / 4 | 22 | 4.25 |
| 1 | 정찰 지원 편성 | practice | scout-first | 없음 | won | 37.4 | 0.00 | 12 | 4 / 4 | 23 | 4.25 |
| 1 | 정찰 지원 편성 | practice | scout-first | 사용 | won | 37.4 | 0.00 | 12 | 4 / 4 | 23 | 4.25 |
| 1 | 돌격 중심 편성 | practice | guard-first | 없음 | won | 48.3 | 0.00 | 11 | 4 / 4 | 28 | 6.20 |
| 1 | 돌격 중심 편성 | practice | guard-first | 사용 | won | 48.3 | 0.00 | 11 | 4 / 4 | 28 | 6.20 |
| 1 | 돌격 중심 편성 | practice | striker-first | 없음 | won | 49.6 | 0.00 | 11 | 4 / 4 | 29 | 6.30 |
| 1 | 돌격 중심 편성 | practice | striker-first | 사용 | won | 49.6 | 0.00 | 11 | 4 / 4 | 29 | 6.30 |
| 1 | 돌격 중심 편성 | practice | scout-first | 없음 | won | 55.1 | 0.00 | 11 | 4 / 4 | 32 | 7.05 |
| 1 | 돌격 중심 편성 | practice | scout-first | 사용 | won | 55.1 | 0.00 | 11 | 4 / 4 | 32 | 7.05 |
| 1 | 방패 중심 편성 | practice | guard-first | 없음 | won | 45.6 | 0.00 | 11 | 4 / 4 | 29 | 5.75 |
| 1 | 방패 중심 편성 | practice | guard-first | 사용 | won | 45.6 | 0.00 | 11 | 4 / 4 | 29 | 5.75 |
| 1 | 방패 중심 편성 | practice | striker-first | 없음 | won | 44 | 0.00 | 11 | 4 / 4 | 28 | 5.65 |
| 1 | 방패 중심 편성 | practice | striker-first | 사용 | won | 44 | 0.00 | 11 | 4 / 4 | 28 | 5.65 |
| 1 | 방패 중심 편성 | practice | scout-first | 없음 | won | 45.1 | 0.00 | 11 | 4 / 4 | 29 | 5.75 |
| 1 | 방패 중심 편성 | practice | scout-first | 사용 | won | 45.1 | 0.00 | 11 | 4 / 4 | 29 | 5.75 |
| 1 | 정찰 중심 편성 | practice | guard-first | 없음 | lost | 180 | 5.91 | 0 | 4 / 4 | 77 | 18.60 |
| 1 | 정찰 중심 편성 | practice | guard-first | 사용 | lost | 180 | 4.32 | 0 | 4 / 4 | 83 | 20.60 |
| 1 | 정찰 중심 편성 | practice | striker-first | 없음 | lost | 180 | 5.91 | 0 | 4 / 4 | 77 | 18.60 |
| 1 | 정찰 중심 편성 | practice | striker-first | 사용 | lost | 180 | 4.32 | 0 | 4 / 4 | 83 | 20.60 |
| 1 | 정찰 중심 편성 | practice | scout-first | 없음 | lost | 180 | 6.12 | 0 | 4 / 4 | 78 | 18.60 |
| 1 | 정찰 중심 편성 | practice | scout-first | 사용 | lost | 180 | 4.02 | 0 | 4 / 4 | 85 | 21.10 |
| 1 | 소규모 편성 | practice | guard-first | 없음 | lost | 180 | 9.99 | 0 | 3 / 4 | 43 | 9.00 |
| 1 | 소규모 편성 | practice | guard-first | 사용 | lost | 180 | 6.78 | 0 | 4 / 4 | 49 | 11.15 |
| 1 | 소규모 편성 | practice | striker-first | 없음 | lost | 180 | 9.99 | 0 | 3 / 4 | 44 | 9.00 |
| 1 | 소규모 편성 | practice | striker-first | 사용 | lost | 180 | 5.22 | 0 | 4 / 4 | 52 | 11.35 |
| 1 | 소규모 편성 | practice | scout-first | 없음 | lost | 180 | 9.99 | 0 | 3 / 4 | 47 | 9.00 |
| 1 | 소규모 편성 | practice | scout-first | 사용 | lost | 180 | 6.78 | 0 | 4 / 4 | 54 | 11.35 |
| 1 | 균형 편성 | standard | guard-first | 없음 | won | 40.8 | 0.00 | 11 | 4 / 4 | 31 | 6.15 |
| 1 | 균형 편성 | standard | guard-first | 사용 | won | 40.8 | 0.00 | 11 | 4 / 4 | 31 | 6.15 |
| 1 | 균형 편성 | standard | striker-first | 없음 | won | 42.1 | 0.00 | 11 | 4 / 4 | 32 | 6.25 |
| 1 | 균형 편성 | standard | striker-first | 사용 | won | 42.1 | 0.00 | 11 | 4 / 4 | 32 | 6.25 |
| 1 | 균형 편성 | standard | scout-first | 없음 | won | 35.8 | 0.00 | 11 | 4 / 4 | 28 | 5.85 |
| 1 | 균형 편성 | standard | scout-first | 사용 | won | 35.8 | 0.00 | 11 | 4 / 4 | 28 | 5.85 |
| 1 | 정찰 지원 편성 | standard | guard-first | 없음 | won | 35.4 | 0.00 | 12 | 4 / 4 | 26 | 5.75 |
| 1 | 정찰 지원 편성 | standard | guard-first | 사용 | won | 35.4 | 0.00 | 12 | 4 / 4 | 26 | 5.75 |
| 1 | 정찰 지원 편성 | standard | striker-first | 없음 | won | 35.7 | 0.00 | 12 | 4 / 4 | 27 | 5.85 |
| 1 | 정찰 지원 편성 | standard | striker-first | 사용 | won | 35.7 | 0.00 | 12 | 4 / 4 | 27 | 5.85 |
| 1 | 정찰 지원 편성 | standard | scout-first | 없음 | won | 37.4 | 0.00 | 12 | 4 / 4 | 28 | 5.95 |
| 1 | 정찰 지원 편성 | standard | scout-first | 사용 | won | 37.4 | 0.00 | 12 | 4 / 4 | 28 | 5.95 |
| 1 | 돌격 중심 편성 | standard | guard-first | 없음 | won | 54.3 | 0.00 | 9 | 4 / 4 | 43 | 9.60 |
| 1 | 돌격 중심 편성 | standard | guard-first | 사용 | won | 48.3 | 0.00 | 10 | 4 / 4 | 38 | 8.10 |
| 1 | 돌격 중심 편성 | standard | striker-first | 없음 | won | 49.6 | 0.00 | 9 | 4 / 4 | 39 | 8.10 |
| 1 | 돌격 중심 편성 | standard | striker-first | 사용 | won | 49.6 | 0.00 | 11 | 4 / 4 | 39 | 8.30 |
| 1 | 돌격 중심 편성 | standard | scout-first | 없음 | won | 61.1 | 0.00 | 8 | 4 / 4 | 48 | 10.40 |
| 1 | 돌격 중심 편성 | standard | scout-first | 사용 | won | 55.1 | 0.00 | 10 | 4 / 4 | 43 | 9.10 |
| 1 | 방패 중심 편성 | standard | guard-first | 없음 | won | 45.6 | 0.00 | 10 | 4 / 4 | 36 | 7.50 |
| 1 | 방패 중심 편성 | standard | guard-first | 사용 | won | 45.6 | 0.00 | 11 | 4 / 4 | 36 | 7.65 |
| 1 | 방패 중심 편성 | standard | striker-first | 없음 | won | 44 | 0.00 | 10 | 4 / 4 | 36 | 7.50 |
| 1 | 방패 중심 편성 | standard | striker-first | 사용 | won | 44 | 0.00 | 11 | 4 / 4 | 36 | 7.55 |
| 1 | 방패 중심 편성 | standard | scout-first | 없음 | won | 45.1 | 0.00 | 10 | 4 / 4 | 36 | 7.60 |
| 1 | 방패 중심 편성 | standard | scout-first | 사용 | won | 45.1 | 0.00 | 11 | 4 / 4 | 36 | 7.65 |
| 1 | 정찰 중심 편성 | standard | guard-first | 없음 | lost | 180 | 8.37 | 0 | 4 / 4 | 83 | 18.60 |
| 1 | 정찰 중심 편성 | standard | guard-first | 사용 | lost | 180 | 7.35 | 0 | 4 / 4 | 89 | 20.65 |
| 1 | 정찰 중심 편성 | standard | striker-first | 없음 | lost | 180 | 8.37 | 0 | 4 / 4 | 83 | 18.60 |
| 1 | 정찰 중심 편성 | standard | striker-first | 사용 | lost | 180 | 7.35 | 0 | 4 / 4 | 89 | 20.65 |
| 1 | 정찰 중심 편성 | standard | scout-first | 없음 | lost | 180 | 8.61 | 0 | 4 / 4 | 85 | 18.60 |
| 1 | 정찰 중심 편성 | standard | scout-first | 사용 | lost | 180 | 7.02 | 0 | 4 / 4 | 92 | 21.25 |
| 1 | 소규모 편성 | standard | guard-first | 없음 | lost | 180 | 9.99 | 0 | 3 / 4 | 46 | 9.00 |
| 1 | 소규모 편성 | standard | guard-first | 사용 | lost | 180 | 9.99 | 0 | 3 / 4 | 53 | 11.15 |
| 1 | 소규모 편성 | standard | striker-first | 없음 | lost | 180 | 9.99 | 0 | 3 / 4 | 47 | 9.00 |
| 1 | 소규모 편성 | standard | striker-first | 사용 | lost | 180 | 9.99 | 0 | 3 / 4 | 56 | 11.45 |
| 1 | 소규모 편성 | standard | scout-first | 없음 | lost | 180 | 9.99 | 0 | 3 / 4 | 50 | 9.00 |
| 1 | 소규모 편성 | standard | scout-first | 사용 | lost | 180 | 9.99 | 0 | 3 / 4 | 58 | 11.45 |
| 1 | 균형 편성 | challenge | guard-first | 없음 | won | 40.8 | 0.00 | 10 | 4 / 4 | 37 | 7.35 |
| 1 | 균형 편성 | challenge | guard-first | 사용 | won | 40.8 | 0.00 | 11 | 4 / 4 | 37 | 7.45 |
| 1 | 균형 편성 | challenge | striker-first | 없음 | won | 42.1 | 0.00 | 10 | 4 / 4 | 39 | 7.35 |
| 1 | 균형 편성 | challenge | striker-first | 사용 | won | 42.1 | 0.00 | 11 | 4 / 4 | 39 | 7.55 |
| 1 | 균형 편성 | challenge | scout-first | 없음 | won | 35.8 | 0.00 | 11 | 4 / 4 | 34 | 7.15 |
| 1 | 균형 편성 | challenge | scout-first | 사용 | won | 35.8 | 0.00 | 11 | 4 / 4 | 34 | 7.15 |
| 1 | 정찰 지원 편성 | challenge | guard-first | 없음 | won | 35.4 | 0.00 | 11 | 4 / 4 | 33 | 7.05 |
| 1 | 정찰 지원 편성 | challenge | guard-first | 사용 | won | 35.4 | 0.00 | 12 | 4 / 4 | 33 | 7.05 |
| 1 | 정찰 지원 편성 | challenge | striker-first | 없음 | won | 35.7 | 0.00 | 11 | 4 / 4 | 33 | 6.95 |
| 1 | 정찰 지원 편성 | challenge | striker-first | 사용 | won | 35.7 | 0.00 | 12 | 4 / 4 | 33 | 7.00 |
| 1 | 정찰 지원 편성 | challenge | scout-first | 없음 | won | 37.4 | 0.00 | 12 | 4 / 4 | 35 | 7.10 |
| 1 | 정찰 지원 편성 | challenge | scout-first | 사용 | won | 37.4 | 0.00 | 12 | 4 / 4 | 35 | 7.10 |
| 1 | 돌격 중심 편성 | challenge | guard-first | 없음 | won | 43.5 | 0.00 | 9 | 4 / 4 | 42 | 8.40 |
| 1 | 돌격 중심 편성 | challenge | guard-first | 사용 | won | 48.3 | 0.00 | 10 | 4 / 4 | 47 | 9.75 |
| 1 | 돌격 중심 편성 | challenge | striker-first | 없음 | won | 61.6 | 0.00 | 7 | 4 / 4 | 61 | 13.20 |
| 1 | 돌격 중심 편성 | challenge | striker-first | 사용 | won | 49.6 | 0.00 | 10 | 4 / 4 | 49 | 9.85 |
| 1 | 돌격 중심 편성 | challenge | scout-first | 없음 | won | 50.3 | 0.00 | 9 | 4 / 4 | 49 | 9.90 |
| 1 | 돌격 중심 편성 | challenge | scout-first | 사용 | won | 55.1 | 0.00 | 10 | 4 / 4 | 54 | 11.00 |
| 1 | 방패 중심 편성 | challenge | guard-first | 없음 | won | 45.6 | 0.00 | 10 | 4 / 4 | 45 | 9.75 |
| 1 | 방패 중심 편성 | challenge | guard-first | 사용 | won | 45.6 | 0.00 | 10 | 4 / 4 | 45 | 9.75 |
| 1 | 방패 중심 편성 | challenge | striker-first | 없음 | won | 44 | 0.00 | 10 | 4 / 4 | 44 | 9.45 |
| 1 | 방패 중심 편성 | challenge | striker-first | 사용 | won | 44 | 0.00 | 10 | 4 / 4 | 44 | 9.45 |
| 1 | 방패 중심 편성 | challenge | scout-first | 없음 | won | 45.1 | 0.00 | 10 | 4 / 4 | 45 | 9.65 |
| 1 | 방패 중심 편성 | challenge | scout-first | 사용 | won | 45.1 | 0.00 | 10 | 4 / 4 | 45 | 9.65 |
| 1 | 정찰 중심 편성 | challenge | guard-first | 없음 | lost | 180 | 9.81 | 0 | 4 / 4 | 90 | 18.60 |
| 1 | 정찰 중심 편성 | challenge | guard-first | 사용 | lost | 180 | 9.04 | 0 | 4 / 4 | 94 | 20.50 |
| 1 | 정찰 중심 편성 | challenge | striker-first | 없음 | lost | 180 | 9.81 | 0 | 4 / 4 | 90 | 18.60 |
| 1 | 정찰 중심 편성 | challenge | striker-first | 사용 | lost | 180 | 9.04 | 0 | 4 / 4 | 94 | 20.50 |
| 1 | 정찰 중심 편성 | challenge | scout-first | 없음 | lost | 180 | 9.99 | 0 | 3 / 4 | 93 | 18.60 |
| 1 | 정찰 중심 편성 | challenge | scout-first | 사용 | lost | 180 | 9.04 | 0 | 4 / 4 | 97 | 21.20 |
| 1 | 소규모 편성 | challenge | guard-first | 없음 | lost | 180 | 9.99 | 0 | 3 / 4 | 50 | 9.00 |
| 1 | 소규모 편성 | challenge | guard-first | 사용 | lost | 180 | 9.99 | 0 | 3 / 4 | 57 | 11.30 |
| 1 | 소규모 편성 | challenge | striker-first | 없음 | lost | 180 | 9.99 | 0 | 3 / 4 | 49 | 9.00 |
| 1 | 소규모 편성 | challenge | striker-first | 사용 | lost | 180 | 9.99 | 0 | 3 / 4 | 58 | 11.60 |
| 1 | 소규모 편성 | challenge | scout-first | 없음 | lost | 180 | 9.99 | 0 | 3 / 4 | 54 | 9.00 |
| 1 | 소규모 편성 | challenge | scout-first | 사용 | lost | 180 | 9.99 | 0 | 3 / 4 | 64 | 11.70 |
| 2 | 균형 편성 | practice | guard-first | 없음 | won | 37.6 | 0.00 | 11 | 4 / 4 | 23 | 4.90 |
| 2 | 균형 편성 | practice | guard-first | 사용 | won | 37.6 | 0.00 | 11 | 4 / 4 | 23 | 4.90 |
| 2 | 균형 편성 | practice | striker-first | 없음 | won | 39.3 | 0.00 | 11 | 4 / 4 | 24 | 5.01 |
| 2 | 균형 편성 | practice | striker-first | 사용 | won | 39.3 | 0.00 | 11 | 4 / 4 | 24 | 5.01 |
| 2 | 균형 편성 | practice | scout-first | 없음 | won | 44.8 | 0.00 | 11 | 4 / 4 | 28 | 5.67 |
| 2 | 균형 편성 | practice | scout-first | 사용 | won | 44.8 | 0.00 | 11 | 4 / 4 | 28 | 5.67 |
| 2 | 정찰 지원 편성 | practice | guard-first | 없음 | won | 34.4 | 0.00 | 12 | 4 / 4 | 21 | 4.90 |
| 2 | 정찰 지원 편성 | practice | guard-first | 사용 | won | 34.4 | 0.00 | 12 | 4 / 4 | 21 | 4.90 |
| 2 | 정찰 지원 편성 | practice | striker-first | 없음 | won | 35.5 | 0.00 | 12 | 4 / 4 | 21 | 4.80 |
| 2 | 정찰 지원 편성 | practice | striker-first | 사용 | won | 35.5 | 0.00 | 12 | 4 / 4 | 21 | 4.80 |
| 2 | 정찰 지원 편성 | practice | scout-first | 없음 | won | 37 | 0.00 | 12 | 4 / 4 | 22 | 4.96 |
| 2 | 정찰 지원 편성 | practice | scout-first | 사용 | won | 37 | 0.00 | 12 | 4 / 4 | 22 | 4.96 |
| 2 | 돌격 중심 편성 | practice | guard-first | 없음 | won | 46.6 | 0.00 | 10 | 4 / 4 | 30 | 7.01 |
| 2 | 돌격 중심 편성 | practice | guard-first | 사용 | won | 46.6 | 0.00 | 11 | 4 / 4 | 30 | 7.10 |
| 2 | 돌격 중심 편성 | practice | striker-first | 없음 | won | 52.3 | 0.00 | 10 | 4 / 4 | 33 | 7.45 |
| 2 | 돌격 중심 편성 | practice | striker-first | 사용 | won | 52.3 | 0.00 | 11 | 4 / 4 | 33 | 7.54 |
| 2 | 돌격 중심 편성 | practice | scout-first | 없음 | won | 52 | 0.00 | 10 | 4 / 4 | 33 | 7.24 |
| 2 | 돌격 중심 편성 | practice | scout-first | 사용 | won | 52 | 0.00 | 11 | 4 / 4 | 33 | 7.54 |
| 2 | 방패 중심 편성 | practice | guard-first | 없음 | won | 44 | 0.00 | 10 | 4 / 4 | 28 | 6.37 |
| 2 | 방패 중심 편성 | practice | guard-first | 사용 | won | 44 | 0.00 | 11 | 4 / 4 | 28 | 6.51 |
| 2 | 방패 중심 편성 | practice | striker-first | 없음 | won | 42.8 | 0.00 | 11 | 4 / 4 | 28 | 6.40 |
| 2 | 방패 중심 편성 | practice | striker-first | 사용 | won | 42.8 | 0.00 | 11 | 4 / 4 | 28 | 6.40 |
| 2 | 방패 중심 편성 | practice | scout-first | 없음 | won | 46 | 0.00 | 11 | 4 / 4 | 29 | 6.62 |
| 2 | 방패 중심 편성 | practice | scout-first | 사용 | won | 46 | 0.00 | 11 | 4 / 4 | 29 | 6.62 |
| 2 | 정찰 중심 편성 | practice | guard-first | 없음 | lost | 180 | 6.58 | 0 | 4 / 4 | 79 | 18.60 |
| 2 | 정찰 중심 편성 | practice | guard-first | 사용 | lost | 180 | 5.40 | 0 | 4 / 4 | 84 | 20.62 |
| 2 | 정찰 중심 편성 | practice | striker-first | 없음 | lost | 180 | 6.58 | 0 | 4 / 4 | 79 | 18.60 |
| 2 | 정찰 중심 편성 | practice | striker-first | 사용 | lost | 180 | 5.40 | 0 | 4 / 4 | 84 | 20.62 |
| 2 | 정찰 중심 편성 | practice | scout-first | 없음 | lost | 180 | 7.21 | 0 | 4 / 4 | 78 | 18.60 |
| 2 | 정찰 중심 편성 | practice | scout-first | 사용 | lost | 180 | 5.40 | 0 | 4 / 4 | 85 | 21.17 |
| 2 | 소규모 편성 | practice | guard-first | 없음 | lost | 180 | 9.99 | 0 | 3 / 4 | 44 | 9.00 |
| 2 | 소규모 편성 | practice | guard-first | 사용 | lost | 180 | 3.69 | 0 | 4 / 4 | 49 | 11.18 |
| 2 | 소규모 편성 | practice | striker-first | 없음 | lost | 180 | 9.99 | 0 | 3 / 4 | 44 | 9.00 |
| 2 | 소규모 편성 | practice | striker-first | 사용 | lost | 180 | 3.69 | 0 | 4 / 4 | 49 | 11.40 |
| 2 | 소규모 편성 | practice | scout-first | 없음 | lost | 180 | 9.99 | 0 | 3 / 4 | 45 | 9.00 |
| 2 | 소규모 편성 | practice | scout-first | 사용 | lost | 180 | 2.71 | 0 | 4 / 4 | 50 | 11.40 |
| 2 | 균형 편성 | standard | guard-first | 없음 | won | 37.6 | 0.00 | 10 | 4 / 4 | 30 | 6.37 |
| 2 | 균형 편성 | standard | guard-first | 사용 | won | 37.6 | 0.00 | 11 | 4 / 4 | 30 | 6.57 |
| 2 | 균형 편성 | standard | striker-first | 없음 | won | 39.3 | 0.00 | 11 | 4 / 4 | 31 | 6.68 |
| 2 | 균형 편성 | standard | striker-first | 사용 | won | 39.3 | 0.00 | 11 | 4 / 4 | 31 | 6.68 |
| 2 | 균형 편성 | standard | scout-first | 없음 | won | 44.8 | 0.00 | 10 | 4 / 4 | 35 | 7.35 |
| 2 | 균형 편성 | standard | scout-first | 사용 | won | 44.8 | 0.00 | 11 | 4 / 4 | 35 | 7.56 |
| 2 | 정찰 지원 편성 | standard | guard-first | 없음 | won | 34.4 | 0.00 | 12 | 4 / 4 | 27 | 5.92 |
| 2 | 정찰 지원 편성 | standard | guard-first | 사용 | won | 34.4 | 0.00 | 12 | 4 / 4 | 27 | 5.92 |
| 2 | 정찰 지원 편성 | standard | striker-first | 없음 | won | 35.5 | 0.00 | 12 | 4 / 4 | 27 | 5.77 |
| 2 | 정찰 지원 편성 | standard | striker-first | 사용 | won | 35.5 | 0.00 | 12 | 4 / 4 | 27 | 5.77 |
| 2 | 정찰 지원 편성 | standard | scout-first | 없음 | won | 37 | 0.00 | 12 | 4 / 4 | 29 | 5.93 |
| 2 | 정찰 지원 편성 | standard | scout-first | 사용 | won | 37 | 0.00 | 12 | 4 / 4 | 29 | 5.93 |
| 2 | 돌격 중심 편성 | standard | guard-first | 없음 | won | 41.8 | 0.00 | 9 | 4 / 4 | 34 | 7.80 |
| 2 | 돌격 중심 편성 | standard | guard-first | 사용 | won | 46.6 | 0.00 | 10 | 4 / 4 | 38 | 9.13 |
| 2 | 돌격 중심 편성 | standard | striker-first | 없음 | won | 47.5 | 0.00 | 9 | 4 / 4 | 38 | 8.12 |
| 2 | 돌격 중심 편성 | standard | striker-first | 사용 | won | 52.3 | 0.00 | 10 | 4 / 4 | 42 | 9.47 |
| 2 | 돌격 중심 편성 | standard | scout-first | 없음 | won | 47.2 | 0.00 | 9 | 4 / 4 | 38 | 8.34 |
| 2 | 돌격 중심 편성 | standard | scout-first | 사용 | won | 52 | 0.00 | 10 | 4 / 4 | 42 | 9.58 |
| 2 | 방패 중심 편성 | standard | guard-first | 없음 | won | 44 | 0.00 | 10 | 4 / 4 | 37 | 8.29 |
| 2 | 방패 중심 편성 | standard | guard-first | 사용 | won | 44 | 0.00 | 10 | 4 / 4 | 37 | 8.49 |
| 2 | 방패 중심 편성 | standard | striker-first | 없음 | won | 42.8 | 0.00 | 10 | 4 / 4 | 36 | 8.30 |
| 2 | 방패 중심 편성 | standard | striker-first | 사용 | won | 42.8 | 0.00 | 11 | 4 / 4 | 36 | 8.44 |
| 2 | 방패 중심 편성 | standard | scout-first | 없음 | won | 46 | 0.00 | 10 | 4 / 4 | 38 | 8.73 |
| 2 | 방패 중심 편성 | standard | scout-first | 사용 | won | 46 | 0.00 | 10 | 4 / 4 | 38 | 8.61 |
| 2 | 정찰 중심 편성 | standard | guard-first | 없음 | lost | 180 | 8.94 | 0 | 4 / 4 | 83 | 18.60 |
| 2 | 정찰 중심 편성 | standard | guard-first | 사용 | lost | 180 | 8.24 | 0 | 4 / 4 | 89 | 20.51 |
| 2 | 정찰 중심 편성 | standard | striker-first | 없음 | lost | 180 | 8.94 | 0 | 4 / 4 | 83 | 18.60 |
| 2 | 정찰 중심 편성 | standard | striker-first | 사용 | lost | 180 | 8.24 | 0 | 4 / 4 | 89 | 20.51 |
| 2 | 정찰 중심 편성 | standard | scout-first | 없음 | lost | 180 | 9.31 | 0 | 4 / 4 | 84 | 18.60 |
| 2 | 정찰 중심 편성 | standard | scout-first | 사용 | lost | 180 | 8.24 | 0 | 4 / 4 | 90 | 21.17 |
| 2 | 소규모 편성 | standard | guard-first | 없음 | lost | 180 | 9.99 | 0 | 3 / 4 | 46 | 9.00 |
| 2 | 소규모 편성 | standard | guard-first | 사용 | lost | 180 | 9.99 | 0 | 3 / 4 | 55 | 11.18 |
| 2 | 소규모 편성 | standard | striker-first | 없음 | lost | 180 | 9.99 | 0 | 3 / 4 | 46 | 9.00 |
| 2 | 소규모 편성 | standard | striker-first | 사용 | lost | 180 | 9.99 | 0 | 3 / 4 | 55 | 11.51 |
| 2 | 소규모 편성 | standard | scout-first | 없음 | lost | 180 | 9.99 | 0 | 3 / 4 | 49 | 9.00 |
| 2 | 소규모 편성 | standard | scout-first | 사용 | lost | 180 | 9.99 | 0 | 3 / 4 | 57 | 11.51 |
| 2 | 균형 편성 | challenge | guard-first | 없음 | won | 37.6 | 0.00 | 10 | 4 / 4 | 37 | 7.49 |
| 2 | 균형 편성 | challenge | guard-first | 사용 | won | 37.6 | 0.00 | 11 | 4 / 4 | 37 | 7.75 |
| 2 | 균형 편성 | challenge | striker-first | 없음 | won | 39.3 | 0.00 | 10 | 4 / 4 | 39 | 7.83 |
| 2 | 균형 편성 | challenge | striker-first | 사용 | won | 39.3 | 0.00 | 11 | 4 / 4 | 39 | 7.97 |
| 2 | 균형 편성 | challenge | scout-first | 없음 | won | 44.8 | 0.00 | 10 | 4 / 4 | 43 | 8.90 |
| 2 | 균형 편성 | challenge | scout-first | 사용 | won | 44.8 | 0.00 | 11 | 4 / 4 | 43 | 9.07 |
| 2 | 정찰 지원 편성 | challenge | guard-first | 없음 | won | 34.4 | 0.00 | 11 | 4 / 4 | 32 | 7.17 |
| 2 | 정찰 지원 편성 | challenge | guard-first | 사용 | won | 34.4 | 0.00 | 12 | 4 / 4 | 32 | 7.32 |
| 2 | 정찰 지원 편성 | challenge | striker-first | 없음 | won | 35.5 | 0.00 | 11 | 4 / 4 | 33 | 7.08 |
| 2 | 정찰 지원 편성 | challenge | striker-first | 사용 | won | 35.5 | 0.00 | 12 | 4 / 4 | 33 | 7.28 |
| 2 | 정찰 지원 편성 | challenge | scout-first | 없음 | won | 37 | 0.00 | 12 | 4 / 4 | 35 | 7.44 |
| 2 | 정찰 지원 편성 | challenge | scout-first | 사용 | won | 37 | 0.00 | 12 | 4 / 4 | 35 | 7.44 |
| 2 | 돌격 중심 편성 | challenge | guard-first | 없음 | won | 41.8 | 0.00 | 9 | 4 / 4 | 41 | 9.72 |
| 2 | 돌격 중심 편성 | challenge | guard-first | 사용 | won | 52.6 | 0.00 | 8 | 4 / 4 | 52 | 12.86 |
| 2 | 돌격 중심 편성 | challenge | striker-first | 없음 | won | 47.5 | 0.00 | 9 | 4 / 4 | 46 | 10.04 |
| 2 | 돌격 중심 편성 | challenge | striker-first | 사용 | won | 52.3 | 0.00 | 9 | 4 / 4 | 51 | 11.50 |
| 2 | 돌격 중심 편성 | challenge | scout-first | 없음 | won | 47.2 | 0.00 | 9 | 4 / 4 | 46 | 10.05 |
| 2 | 돌격 중심 편성 | challenge | scout-first | 사용 | won | 52 | 0.00 | 9 | 4 / 4 | 51 | 11.61 |
| 2 | 방패 중심 편성 | challenge | guard-first | 없음 | won | 44 | 0.00 | 10 | 4 / 4 | 45 | 10.05 |
| 2 | 방패 중심 편성 | challenge | guard-first | 사용 | won | 44 | 0.00 | 10 | 4 / 4 | 45 | 10.25 |
| 2 | 방패 중심 편성 | challenge | striker-first | 없음 | won | 42.8 | 0.00 | 10 | 4 / 4 | 44 | 10.06 |
| 2 | 방패 중심 편성 | challenge | striker-first | 사용 | won | 42.8 | 0.00 | 10 | 4 / 4 | 44 | 9.94 |
| 2 | 방패 중심 편성 | challenge | scout-first | 없음 | won | 46 | 0.00 | 10 | 4 / 4 | 47 | 10.28 |
| 2 | 방패 중심 편성 | challenge | scout-first | 사용 | won | 46 | 0.00 | 10 | 4 / 4 | 47 | 10.48 |
| 2 | 정찰 중심 편성 | challenge | guard-first | 없음 | lost | 180 | 9.99 | 0 | 3 / 4 | 89 | 18.60 |
| 2 | 정찰 중심 편성 | challenge | guard-first | 사용 | lost | 180 | 9.98 | 0 | 4 / 4 | 96 | 20.51 |
| 2 | 정찰 중심 편성 | challenge | striker-first | 없음 | lost | 180 | 9.99 | 0 | 3 / 4 | 89 | 18.60 |
| 2 | 정찰 중심 편성 | challenge | striker-first | 사용 | lost | 180 | 9.98 | 0 | 4 / 4 | 96 | 20.51 |
| 2 | 정찰 중심 편성 | challenge | scout-first | 없음 | lost | 180 | 9.99 | 0 | 3 / 4 | 92 | 18.60 |
| 2 | 정찰 중심 편성 | challenge | scout-first | 사용 | lost | 180 | 9.88 | 0 | 4 / 4 | 99 | 21.28 |
| 2 | 소규모 편성 | challenge | guard-first | 없음 | lost | 180 | 9.99 | 0 | 3 / 4 | 50 | 9.00 |
| 2 | 소규모 편성 | challenge | guard-first | 사용 | lost | 180 | 9.99 | 0 | 3 / 4 | 56 | 11.12 |
| 2 | 소규모 편성 | challenge | striker-first | 없음 | lost | 180 | 9.99 | 0 | 3 / 4 | 50 | 9.00 |
| 2 | 소규모 편성 | challenge | striker-first | 사용 | lost | 180 | 9.99 | 0 | 3 / 4 | 58 | 11.45 |
| 2 | 소규모 편성 | challenge | scout-first | 없음 | lost | 180 | 9.99 | 0 | 3 / 4 | 48 | 9.00 |
| 2 | 소규모 편성 | challenge | scout-first | 사용 | lost | 180 | 9.99 | 0 | 3 / 4 | 57 | 11.56 |
| 3 | 균형 편성 | practice | guard-first | 없음 | won | 40.9 | 0.00 | 10 | 4 / 4 | 28 | 6.83 |
| 3 | 균형 편성 | practice | guard-first | 사용 | won | 40.9 | 0.00 | 11 | 4 / 4 | 28 | 7.02 |
| 3 | 균형 편성 | practice | striker-first | 없음 | won | 42.6 | 0.00 | 10 | 4 / 4 | 29 | 6.97 |
| 3 | 균형 편성 | practice | striker-first | 사용 | won | 42.6 | 0.00 | 11 | 4 / 4 | 29 | 7.14 |
| 3 | 균형 편성 | practice | scout-first | 없음 | won | 42.3 | 0.00 | 10 | 4 / 4 | 28 | 6.97 |
| 3 | 균형 편성 | practice | scout-first | 사용 | won | 42.3 | 0.00 | 11 | 4 / 4 | 28 | 7.14 |
| 3 | 정찰 지원 편성 | practice | guard-first | 없음 | won | 35.9 | 0.00 | 12 | 4 / 4 | 23 | 5.47 |
| 3 | 정찰 지원 편성 | practice | guard-first | 사용 | won | 35.9 | 0.00 | 12 | 4 / 4 | 23 | 5.47 |
| 3 | 정찰 지원 편성 | practice | striker-first | 없음 | won | 36.5 | 0.00 | 12 | 4 / 4 | 23 | 5.30 |
| 3 | 정찰 지원 편성 | practice | striker-first | 사용 | won | 36.5 | 0.00 | 12 | 4 / 4 | 23 | 5.30 |
| 3 | 정찰 지원 편성 | practice | scout-first | 없음 | won | 40.3 | 0.00 | 12 | 4 / 4 | 25 | 5.54 |
| 3 | 정찰 지원 편성 | practice | scout-first | 사용 | won | 40.3 | 0.00 | 12 | 4 / 4 | 25 | 5.54 |
| 3 | 돌격 중심 편성 | practice | guard-first | 없음 | won | 45.3 | 0.00 | 10 | 4 / 4 | 27 | 6.83 |
| 3 | 돌격 중심 편성 | practice | guard-first | 사용 | won | 45.3 | 0.00 | 11 | 4 / 4 | 27 | 6.85 |
| 3 | 돌격 중심 편성 | practice | striker-first | 없음 | won | 45.3 | 0.00 | 11 | 4 / 4 | 28 | 6.85 |
| 3 | 돌격 중심 편성 | practice | striker-first | 사용 | won | 45.3 | 0.00 | 11 | 4 / 4 | 28 | 6.85 |
| 3 | 돌격 중심 편성 | practice | scout-first | 없음 | won | 50.8 | 0.00 | 10 | 4 / 4 | 30 | 7.09 |
| 3 | 돌격 중심 편성 | practice | scout-first | 사용 | won | 50.8 | 0.00 | 11 | 4 / 4 | 30 | 7.36 |
| 3 | 방패 중심 편성 | practice | guard-first | 없음 | won | 47.3 | 0.00 | 10 | 4 / 4 | 31 | 7.51 |
| 3 | 방패 중심 편성 | practice | guard-first | 사용 | won | 47.3 | 0.00 | 11 | 4 / 4 | 31 | 7.77 |
| 3 | 방패 중심 편성 | practice | striker-first | 없음 | won | 46.1 | 0.00 | 10 | 4 / 4 | 31 | 7.41 |
| 3 | 방패 중심 편성 | practice | striker-first | 사용 | won | 46.1 | 0.00 | 11 | 4 / 4 | 31 | 7.65 |
| 3 | 방패 중심 편성 | practice | scout-first | 없음 | won | 45 | 0.00 | 10 | 4 / 4 | 30 | 7.53 |
| 3 | 방패 중심 편성 | practice | scout-first | 사용 | won | 45 | 0.00 | 11 | 4 / 4 | 30 | 7.60 |
| 3 | 정찰 중심 편성 | practice | guard-first | 없음 | lost | 180 | 9.99 | 0 | 3 / 4 | 76 | 18.60 |
| 3 | 정찰 중심 편성 | practice | guard-first | 사용 | lost | 180 | 9.99 | 0 | 3 / 4 | 83 | 20.57 |
| 3 | 정찰 중심 편성 | practice | striker-first | 없음 | lost | 180 | 9.99 | 0 | 3 / 4 | 76 | 18.60 |
| 3 | 정찰 중심 편성 | practice | striker-first | 사용 | lost | 180 | 9.99 | 0 | 3 / 4 | 83 | 20.57 |
| 3 | 정찰 중심 편성 | practice | scout-first | 없음 | lost | 180 | 9.99 | 0 | 3 / 4 | 78 | 18.60 |
| 3 | 정찰 중심 편성 | practice | scout-first | 사용 | lost | 180 | 9.99 | 0 | 3 / 4 | 85 | 21.17 |
| 3 | 소규모 편성 | practice | guard-first | 없음 | lost | 180 | 9.99 | 0 | 3 / 4 | 43 | 9.00 |
| 3 | 소규모 편성 | practice | guard-first | 사용 | lost | 180 | 9.97 | 0 | 4 / 4 | 50 | 11.21 |
| 3 | 소규모 편성 | practice | striker-first | 없음 | lost | 180 | 9.99 | 0 | 3 / 4 | 44 | 9.00 |
| 3 | 소규모 편성 | practice | striker-first | 사용 | lost | 180 | 9.97 | 0 | 4 / 4 | 50 | 11.45 |
| 3 | 소규모 편성 | practice | scout-first | 없음 | lost | 180 | 9.99 | 0 | 3 / 4 | 43 | 9.00 |
| 3 | 소규모 편성 | practice | scout-first | 사용 | lost | 180 | 9.97 | 0 | 4 / 4 | 49 | 11.45 |
| 3 | 균형 편성 | standard | guard-first | 없음 | won | 40.9 | 0.00 | 10 | 4 / 4 | 36 | 8.82 |
| 3 | 균형 편성 | standard | guard-first | 사용 | won | 40.9 | 0.00 | 10 | 4 / 4 | 36 | 8.92 |
| 3 | 균형 편성 | standard | striker-first | 없음 | won | 42.6 | 0.00 | 10 | 4 / 4 | 37 | 9.08 |
| 3 | 균형 편성 | standard | striker-first | 사용 | won | 42.6 | 0.00 | 11 | 4 / 4 | 37 | 9.10 |
| 3 | 균형 편성 | standard | scout-first | 없음 | won | 42.3 | 0.00 | 10 | 4 / 4 | 37 | 8.86 |
| 3 | 균형 편성 | standard | scout-first | 사용 | won | 42.3 | 0.00 | 11 | 4 / 4 | 37 | 9.10 |
| 3 | 정찰 지원 편성 | standard | guard-first | 없음 | won | 35.9 | 0.00 | 11 | 4 / 4 | 28 | 6.78 |
| 3 | 정찰 지원 편성 | standard | guard-first | 사용 | won | 35.9 | 0.00 | 12 | 4 / 4 | 28 | 6.97 |
| 3 | 정찰 지원 편성 | standard | striker-first | 없음 | won | 36.5 | 0.00 | 12 | 4 / 4 | 29 | 6.80 |
| 3 | 정찰 지원 편성 | standard | striker-first | 사용 | won | 36.5 | 0.00 | 12 | 4 / 4 | 29 | 6.80 |
| 3 | 정찰 지원 편성 | standard | scout-first | 없음 | won | 40.3 | 0.00 | 12 | 4 / 4 | 30 | 7.16 |
| 3 | 정찰 지원 편성 | standard | scout-first | 사용 | won | 40.3 | 0.00 | 12 | 4 / 4 | 30 | 7.16 |
| 3 | 돌격 중심 편성 | standard | guard-first | 없음 | won | 45.3 | 0.00 | 9 | 4 / 4 | 35 | 8.48 |
| 3 | 돌격 중심 편성 | standard | guard-first | 사용 | won | 45.3 | 0.00 | 10 | 4 / 4 | 35 | 8.58 |
| 3 | 돌격 중심 편성 | standard | striker-first | 없음 | won | 45.3 | 0.00 | 9 | 4 / 4 | 35 | 8.48 |
| 3 | 돌격 중심 편성 | standard | striker-first | 사용 | won | 45.3 | 0.00 | 11 | 4 / 4 | 35 | 8.81 |
| 3 | 돌격 중심 편성 | standard | scout-first | 없음 | won | 50.8 | 0.00 | 9 | 4 / 4 | 39 | 9.06 |
| 3 | 돌격 중심 편성 | standard | scout-first | 사용 | won | 50.8 | 0.00 | 10 | 4 / 4 | 39 | 9.42 |
| 3 | 방패 중심 편성 | standard | guard-first | 없음 | won | 47.3 | 0.00 | 10 | 4 / 4 | 40 | 9.50 |
| 3 | 방패 중심 편성 | standard | guard-first | 사용 | won | 47.3 | 0.00 | 10 | 4 / 4 | 40 | 9.60 |
| 3 | 방패 중심 편성 | standard | striker-first | 없음 | won | 46.1 | 0.00 | 10 | 4 / 4 | 39 | 9.86 |
| 3 | 방패 중심 편성 | standard | striker-first | 사용 | won | 46.1 | 0.00 | 10 | 4 / 4 | 39 | 9.62 |
| 3 | 방패 중심 편성 | standard | scout-first | 없음 | won | 45 | 0.00 | 10 | 4 / 4 | 38 | 9.64 |
| 3 | 방패 중심 편성 | standard | scout-first | 사용 | won | 45 | 0.00 | 10 | 4 / 4 | 38 | 9.40 |
| 3 | 정찰 중심 편성 | standard | guard-first | 없음 | lost | 180 | 9.99 | 0 | 3 / 4 | 81 | 18.60 |
| 3 | 정찰 중심 편성 | standard | guard-first | 사용 | lost | 180 | 9.99 | 0 | 3 / 4 | 87 | 20.52 |
| 3 | 정찰 중심 편성 | standard | striker-first | 없음 | lost | 180 | 9.99 | 0 | 3 / 4 | 81 | 18.60 |
| 3 | 정찰 중심 편성 | standard | striker-first | 사용 | lost | 180 | 9.99 | 0 | 3 / 4 | 87 | 20.52 |
| 3 | 정찰 중심 편성 | standard | scout-first | 없음 | lost | 180 | 9.99 | 0 | 3 / 4 | 82 | 18.60 |
| 3 | 정찰 중심 편성 | standard | scout-first | 사용 | lost | 180 | 9.99 | 0 | 3 / 4 | 92 | 21.24 |
| 3 | 소규모 편성 | standard | guard-first | 없음 | lost | 180 | 9.99 | 0 | 3 / 4 | 48 | 9.00 |
| 3 | 소규모 편성 | standard | guard-first | 사용 | lost | 180 | 9.99 | 0 | 3 / 4 | 54 | 10.97 |
| 3 | 소규모 편성 | standard | striker-first | 없음 | lost | 180 | 9.99 | 0 | 3 / 4 | 48 | 9.00 |
| 3 | 소규모 편성 | standard | striker-first | 사용 | lost | 180 | 9.99 | 0 | 3 / 4 | 56 | 11.33 |
| 3 | 소규모 편성 | standard | scout-first | 없음 | lost | 180 | 9.99 | 0 | 3 / 4 | 47 | 9.00 |
| 3 | 소규모 편성 | standard | scout-first | 사용 | lost | 180 | 9.99 | 0 | 3 / 4 | 55 | 11.33 |
| 3 | 균형 편성 | challenge | guard-first | 없음 | won | 40.9 | 0.00 | 10 | 4 / 4 | 43 | 10.42 |
| 3 | 균형 편성 | challenge | guard-first | 사용 | won | 40.9 | 0.00 | 10 | 4 / 4 | 43 | 10.62 |
| 3 | 균형 편성 | challenge | striker-first | 없음 | won | 42.6 | 0.00 | 10 | 4 / 4 | 45 | 10.51 |
| 3 | 균형 편성 | challenge | striker-first | 사용 | won | 42.6 | 0.00 | 10 | 4 / 4 | 45 | 10.66 |
| 3 | 균형 편성 | challenge | scout-first | 없음 | won | 42.3 | 0.00 | 10 | 4 / 4 | 45 | 10.63 |
| 3 | 균형 편성 | challenge | scout-first | 사용 | won | 42.3 | 0.00 | 10 | 4 / 4 | 45 | 10.78 |
| 3 | 정찰 지원 편성 | challenge | guard-first | 없음 | won | 34.1 | 0.00 | 11 | 4 / 4 | 33 | 7.46 |
| 3 | 정찰 지원 편성 | challenge | guard-first | 사용 | won | 35.9 | 0.00 | 11 | 4 / 4 | 35 | 8.24 |
| 3 | 정찰 지원 편성 | challenge | striker-first | 없음 | won | 34.7 | 0.00 | 11 | 4 / 4 | 34 | 7.72 |
| 3 | 정찰 지원 편성 | challenge | striker-first | 사용 | won | 36.5 | 0.00 | 12 | 4 / 4 | 36 | 8.42 |
| 3 | 정찰 지원 편성 | challenge | scout-first | 없음 | won | 38.5 | 0.00 | 11 | 4 / 4 | 36 | 8.08 |
| 3 | 정찰 지원 편성 | challenge | scout-first | 사용 | won | 40.3 | 0.00 | 12 | 4 / 4 | 38 | 8.78 |
| 3 | 돌격 중심 편성 | challenge | guard-first | 없음 | won | 40.5 | 0.00 | 9 | 4 / 4 | 38 | 8.82 |
| 3 | 돌격 중심 편성 | challenge | guard-first | 사용 | won | 45.3 | 0.00 | 9 | 4 / 4 | 43 | 10.35 |
| 3 | 돌격 중심 편성 | challenge | striker-first | 없음 | won | 51.3 | 0.00 | 8 | 4 / 4 | 49 | 11.90 |
| 3 | 돌격 중심 편성 | challenge | striker-first | 사용 | won | 45.3 | 0.00 | 10 | 4 / 4 | 43 | 10.44 |
| 3 | 돌격 중심 편성 | challenge | scout-first | 없음 | won | 46 | 0.00 | 9 | 4 / 4 | 43 | 9.52 |
| 3 | 돌격 중심 편성 | challenge | scout-first | 사용 | won | 50.8 | 0.00 | 9 | 4 / 4 | 48 | 10.97 |
| 3 | 방패 중심 편성 | challenge | guard-first | 없음 | won | 47.3 | 0.00 | 10 | 4 / 4 | 49 | 12.07 |
| 3 | 방패 중심 편성 | challenge | guard-first | 사용 | won | 47.3 | 0.00 | 10 | 4 / 4 | 49 | 11.98 |
| 3 | 방패 중심 편성 | challenge | striker-first | 없음 | won | 46.1 | 0.00 | 10 | 4 / 4 | 48 | 11.80 |
| 3 | 방패 중심 편성 | challenge | striker-first | 사용 | won | 46.1 | 0.00 | 10 | 4 / 4 | 48 | 12.00 |
| 3 | 방패 중심 편성 | challenge | scout-first | 없음 | won | 45 | 0.00 | 10 | 4 / 4 | 47 | 11.41 |
| 3 | 방패 중심 편성 | challenge | scout-first | 사용 | won | 45 | 0.00 | 10 | 4 / 4 | 47 | 11.56 |
| 3 | 정찰 중심 편성 | challenge | guard-first | 없음 | lost | 180 | 9.99 | 0 | 3 / 4 | 82 | 18.60 |
| 3 | 정찰 중심 편성 | challenge | guard-first | 사용 | lost | 180 | 9.99 | 0 | 3 / 4 | 89 | 20.52 |
| 3 | 정찰 중심 편성 | challenge | striker-first | 없음 | lost | 180 | 9.99 | 0 | 3 / 4 | 82 | 18.60 |
| 3 | 정찰 중심 편성 | challenge | striker-first | 사용 | lost | 180 | 9.99 | 0 | 3 / 4 | 89 | 20.52 |
| 3 | 정찰 중심 편성 | challenge | scout-first | 없음 | lost | 180 | 9.99 | 0 | 3 / 4 | 86 | 18.60 |
| 3 | 정찰 중심 편성 | challenge | scout-first | 사용 | lost | 180 | 9.99 | 0 | 3 / 4 | 94 | 21.36 |
| 3 | 소규모 편성 | challenge | guard-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 51 | 9.00 |
| 3 | 소규모 편성 | challenge | guard-first | 사용 | lost | 180 | 9.99 | 0 | 3 / 4 | 57 | 10.97 |
| 3 | 소규모 편성 | challenge | striker-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 51 | 9.00 |
| 3 | 소규모 편성 | challenge | striker-first | 사용 | lost | 180 | 9.99 | 0 | 3 / 4 | 58 | 11.33 |
| 3 | 소규모 편성 | challenge | scout-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 51 | 9.00 |
| 3 | 소규모 편성 | challenge | scout-first | 사용 | lost | 180 | 9.99 | 0 | 3 / 4 | 59 | 11.45 |
| 4 | 균형 편성 | practice | guard-first | 없음 | won | 38.1 | 0.00 | 10 | 4 / 4 | 24 | 6.20 |
| 4 | 균형 편성 | practice | guard-first | 사용 | won | 38.1 | 0.00 | 11 | 4 / 4 | 24 | 6.30 |
| 4 | 균형 편성 | practice | striker-first | 없음 | won | 40.7 | 0.00 | 11 | 4 / 4 | 26 | 6.81 |
| 4 | 균형 편성 | practice | striker-first | 사용 | won | 40.7 | 0.00 | 11 | 4 / 4 | 26 | 6.81 |
| 4 | 균형 편성 | practice | scout-first | 없음 | won | 44.9 | 0.00 | 11 | 4 / 4 | 28 | 6.84 |
| 4 | 균형 편성 | practice | scout-first | 사용 | won | 44.9 | 0.00 | 11 | 4 / 4 | 28 | 6.84 |
| 4 | 정찰 지원 편성 | practice | guard-first | 없음 | won | 37.1 | 0.00 | 12 | 4 / 4 | 24 | 6.27 |
| 4 | 정찰 지원 편성 | practice | guard-first | 사용 | won | 37.1 | 0.00 | 12 | 4 / 4 | 24 | 6.27 |
| 4 | 정찰 지원 편성 | practice | striker-first | 없음 | won | 33.8 | 0.00 | 12 | 4 / 4 | 22 | 6.01 |
| 4 | 정찰 지원 편성 | practice | striker-first | 사용 | won | 33.8 | 0.00 | 12 | 4 / 4 | 22 | 6.01 |
| 4 | 정찰 지원 편성 | practice | scout-first | 없음 | won | 39.4 | 0.00 | 12 | 4 / 4 | 25 | 6.40 |
| 4 | 정찰 지원 편성 | practice | scout-first | 사용 | won | 39.4 | 0.00 | 12 | 4 / 4 | 25 | 6.40 |
| 4 | 돌격 중심 편성 | practice | guard-first | 없음 | won | 64.6 | 0.00 | 8 | 4 / 4 | 41 | 10.56 |
| 4 | 돌격 중심 편성 | practice | guard-first | 사용 | won | 52.6 | 0.00 | 10 | 4 / 4 | 33 | 8.36 |
| 4 | 돌격 중심 편성 | practice | striker-first | 없음 | won | 48.1 | 0.00 | 9 | 4 / 4 | 31 | 8.16 |
| 4 | 돌격 중심 편성 | practice | striker-first | 사용 | won | 48.1 | 0.00 | 11 | 4 / 4 | 31 | 8.51 |
| 4 | 돌격 중심 편성 | practice | scout-first | 없음 | won | 53.8 | 0.00 | 9 | 4 / 4 | 39 | 9.50 |
| 4 | 돌격 중심 편성 | practice | scout-first | 사용 | won | 64.6 | 0.00 | 9 | 4 / 4 | 46 | 11.77 |
| 4 | 방패 중심 편성 | practice | guard-first | 없음 | won | 48 | 0.00 | 10 | 4 / 4 | 32 | 8.72 |
| 4 | 방패 중심 편성 | practice | guard-first | 사용 | won | 48 | 0.00 | 10 | 4 / 4 | 32 | 8.72 |
| 4 | 방패 중심 편성 | practice | striker-first | 없음 | won | 46.4 | 0.00 | 10 | 4 / 4 | 32 | 8.62 |
| 4 | 방패 중심 편성 | practice | striker-first | 사용 | won | 46.4 | 0.00 | 10 | 4 / 4 | 32 | 8.62 |
| 4 | 방패 중심 편성 | practice | scout-first | 없음 | won | 47.5 | 0.00 | 10 | 4 / 4 | 32 | 8.52 |
| 4 | 방패 중심 편성 | practice | scout-first | 사용 | won | 47.5 | 0.00 | 10 | 4 / 4 | 32 | 8.52 |
| 4 | 정찰 중심 편성 | practice | guard-first | 없음 | lost | 180 | 9.99 | 0 | 3 / 4 | 76 | 18.60 |
| 4 | 정찰 중심 편성 | practice | guard-first | 사용 | lost | 180 | 9.99 | 0 | 3 / 4 | 83 | 20.58 |
| 4 | 정찰 중심 편성 | practice | striker-first | 없음 | lost | 180 | 9.99 | 0 | 3 / 4 | 76 | 18.60 |
| 4 | 정찰 중심 편성 | practice | striker-first | 사용 | lost | 180 | 9.99 | 0 | 3 / 4 | 83 | 20.58 |
| 4 | 정찰 중심 편성 | practice | scout-first | 없음 | lost | 180 | 9.99 | 0 | 3 / 4 | 77 | 18.60 |
| 4 | 정찰 중심 편성 | practice | scout-first | 사용 | lost | 180 | 9.99 | 0 | 3 / 4 | 85 | 21.23 |
| 4 | 소규모 편성 | practice | guard-first | 없음 | lost | 180 | 9.99 | 0 | 3 / 4 | 37 | 9.00 |
| 4 | 소규모 편성 | practice | guard-first | 사용 | lost | 180 | 9.99 | 0 | 3 / 4 | 45 | 11.24 |
| 4 | 소규모 편성 | practice | striker-first | 없음 | lost | 180 | 9.99 | 0 | 3 / 4 | 38 | 9.00 |
| 4 | 소규모 편성 | practice | striker-first | 사용 | lost | 180 | 9.99 | 0 | 3 / 4 | 45 | 11.50 |
| 4 | 소규모 편성 | practice | scout-first | 없음 | lost | 180 | 9.99 | 0 | 3 / 4 | 37 | 9.00 |
| 4 | 소규모 편성 | practice | scout-first | 사용 | lost | 180 | 9.94 | 0 | 4 / 4 | 47 | 11.63 |
| 4 | 균형 편성 | standard | guard-first | 없음 | won | 38.1 | 0.00 | 10 | 4 / 4 | 31 | 8.05 |
| 4 | 균형 편성 | standard | guard-first | 사용 | won | 38.1 | 0.00 | 11 | 4 / 4 | 31 | 8.26 |
| 4 | 균형 편성 | standard | striker-first | 없음 | won | 40.7 | 0.00 | 10 | 4 / 4 | 33 | 8.62 |
| 4 | 균형 편성 | standard | striker-first | 사용 | won | 40.7 | 0.00 | 11 | 4 / 4 | 33 | 8.64 |
| 4 | 균형 편성 | standard | scout-first | 없음 | won | 44.9 | 0.00 | 10 | 4 / 4 | 36 | 8.83 |
| 4 | 균형 편성 | standard | scout-first | 사용 | won | 44.9 | 0.00 | 11 | 4 / 4 | 36 | 9.11 |
| 4 | 정찰 지원 편성 | standard | guard-first | 없음 | won | 35.3 | 0.00 | 11 | 4 / 4 | 29 | 6.97 |
| 4 | 정찰 지원 편성 | standard | guard-first | 사용 | won | 37.1 | 0.00 | 12 | 4 / 4 | 31 | 7.97 |
| 4 | 정찰 지원 편성 | standard | striker-first | 없음 | won | 33.8 | 0.00 | 11 | 4 / 4 | 28 | 7.54 |
| 4 | 정찰 지원 편성 | standard | striker-first | 사용 | won | 33.8 | 0.00 | 12 | 4 / 4 | 28 | 7.58 |
| 4 | 정찰 지원 편성 | standard | scout-first | 없음 | won | 39.4 | 0.00 | 11 | 4 / 4 | 33 | 7.88 |
| 4 | 정찰 지원 편성 | standard | scout-first | 사용 | won | 39.4 | 0.00 | 12 | 4 / 4 | 33 | 8.10 |
| 4 | 돌격 중심 편성 | standard | guard-first | 없음 | won | 53.6 | 0.00 | 8 | 4 / 4 | 48 | 11.64 |
| 4 | 돌격 중심 편성 | standard | guard-first | 사용 | won | 58.6 | 0.00 | 8 | 4 / 4 | 48 | 12.54 |
| 4 | 돌격 중심 편성 | standard | striker-first | 없음 | won | 60.1 | 0.00 | 7 | 4 / 4 | 50 | 13.68 |
| 4 | 돌격 중심 편성 | standard | striker-first | 사용 | won | 48.1 | 0.00 | 10 | 4 / 4 | 40 | 10.54 |
| 4 | 돌격 중심 편성 | standard | scout-first | 없음 | won | 53.8 | 0.00 | 8 | 4 / 4 | 48 | 11.90 |
| 4 | 돌격 중심 편성 | standard | scout-first | 사용 | won | 53.8 | 0.00 | 9 | 4 / 4 | 48 | 12.49 |
| 4 | 방패 중심 편성 | standard | guard-first | 없음 | won | 48 | 0.00 | 10 | 4 / 4 | 42 | 10.52 |
| 4 | 방패 중심 편성 | standard | guard-first | 사용 | won | 48 | 0.00 | 10 | 4 / 4 | 42 | 10.93 |
| 4 | 방패 중심 편성 | standard | striker-first | 없음 | won | 46.4 | 0.00 | 10 | 4 / 4 | 41 | 10.91 |
| 4 | 방패 중심 편성 | standard | striker-first | 사용 | won | 46.4 | 0.00 | 10 | 4 / 4 | 41 | 10.96 |
| 4 | 방패 중심 편성 | standard | scout-first | 없음 | won | 47.5 | 0.00 | 10 | 4 / 4 | 42 | 11.04 |
| 4 | 방패 중심 편성 | standard | scout-first | 사용 | won | 47.5 | 0.00 | 10 | 4 / 4 | 42 | 11.09 |
| 4 | 정찰 중심 편성 | standard | guard-first | 없음 | lost | 180 | 9.99 | 0 | 3 / 4 | 80 | 18.60 |
| 4 | 정찰 중심 편성 | standard | guard-first | 사용 | lost | 180 | 9.99 | 0 | 3 / 4 | 85 | 20.53 |
| 4 | 정찰 중심 편성 | standard | striker-first | 없음 | lost | 180 | 9.99 | 0 | 3 / 4 | 80 | 18.60 |
| 4 | 정찰 중심 편성 | standard | striker-first | 사용 | lost | 180 | 9.99 | 0 | 3 / 4 | 85 | 20.53 |
| 4 | 정찰 중심 편성 | standard | scout-first | 없음 | lost | 180 | 9.99 | 0 | 3 / 4 | 81 | 18.60 |
| 4 | 정찰 중심 편성 | standard | scout-first | 사용 | lost | 180 | 9.99 | 0 | 3 / 4 | 90 | 21.31 |
| 4 | 소규모 편성 | standard | guard-first | 없음 | lost | 180 | 9.99 | 0 | 3 / 4 | 40 | 9.00 |
| 4 | 소규모 편성 | standard | guard-first | 사용 | lost | 180 | 9.99 | 0 | 3 / 4 | 47 | 10.98 |
| 4 | 소규모 편성 | standard | striker-first | 없음 | lost | 180 | 9.99 | 0 | 3 / 4 | 41 | 9.00 |
| 4 | 소규모 편성 | standard | striker-first | 사용 | lost | 180 | 9.99 | 0 | 3 / 4 | 50 | 11.37 |
| 4 | 소규모 편성 | standard | scout-first | 없음 | lost | 180 | 9.99 | 0 | 3 / 4 | 41 | 9.00 |
| 4 | 소규모 편성 | standard | scout-first | 사용 | lost | 180 | 9.99 | 0 | 3 / 4 | 49 | 11.37 |
| 4 | 균형 편성 | challenge | guard-first | 없음 | won | 38.1 | 0.00 | 10 | 4 / 4 | 41 | 9.75 |
| 4 | 균형 편성 | challenge | guard-first | 사용 | won | 38.1 | 0.00 | 10 | 4 / 4 | 41 | 10.11 |
| 4 | 균형 편성 | challenge | striker-first | 없음 | won | 40.7 | 0.00 | 9 | 4 / 4 | 43 | 10.32 |
| 4 | 균형 편성 | challenge | striker-first | 사용 | won | 40.7 | 0.00 | 10 | 4 / 4 | 43 | 10.57 |
| 4 | 균형 편성 | challenge | scout-first | 없음 | won | 44.9 | 0.00 | 10 | 4 / 4 | 46 | 10.79 |
| 4 | 균형 편성 | challenge | scout-first | 사용 | won | 44.9 | 0.00 | 10 | 4 / 4 | 46 | 11.15 |
| 4 | 정찰 지원 편성 | challenge | guard-first | 없음 | won | 35.3 | 0.00 | 11 | 4 / 4 | 37 | 9.03 |
| 4 | 정찰 지원 편성 | challenge | guard-first | 사용 | won | 37.1 | 0.00 | 11 | 4 / 4 | 39 | 9.75 |
| 4 | 정찰 지원 편성 | challenge | striker-first | 없음 | won | 32 | 0.00 | 10 | 4 / 4 | 34 | 8.52 |
| 4 | 정찰 지원 편성 | challenge | striker-first | 사용 | won | 33.8 | 0.00 | 12 | 4 / 4 | 36 | 9.54 |
| 4 | 정찰 지원 편성 | challenge | scout-first | 없음 | won | 37.6 | 0.00 | 11 | 4 / 4 | 39 | 9.48 |
| 4 | 정찰 지원 편성 | challenge | scout-first | 사용 | won | 39.4 | 0.00 | 11 | 4 / 4 | 41 | 10.09 |
| 4 | 돌격 중심 편성 | challenge | guard-first | 없음 | won | 59.6 | 0.00 | 5 | 4 / 4 | 73 | 17.76 |
| 4 | 돌격 중심 편성 | challenge | guard-first | 사용 | won | 53.6 | 0.00 | 7 | 4 / 4 | 60 | 15.33 |
| 4 | 돌격 중심 편성 | challenge | striker-first | 없음 | won | 49.1 | 0.00 | 7 | 4 / 4 | 57 | 14.40 |
| 4 | 돌격 중심 편성 | challenge | striker-first | 사용 | won | 60.1 | 0.00 | 7 | 4 / 4 | 65 | 18.12 |
| 4 | 돌격 중심 편성 | challenge | scout-first | 없음 | won | 53.8 | 0.00 | 7 | 4 / 4 | 61 | 14.79 |
| 4 | 돌격 중심 편성 | challenge | scout-first | 사용 | won | 53.8 | 0.00 | 8 | 4 / 4 | 61 | 15.30 |
| 4 | 방패 중심 편성 | challenge | guard-first | 없음 | won | 49.8 | 0.00 | 9 | 4 / 4 | 57 | 15.15 |
| 4 | 방패 중심 편성 | challenge | guard-first | 사용 | won | 48 | 0.00 | 10 | 4 / 4 | 55 | 13.66 |
| 4 | 방패 중심 편성 | challenge | striker-first | 없음 | won | 44 | 0.00 | 10 | 4 / 4 | 48 | 12.25 |
| 4 | 방패 중심 편성 | challenge | striker-first | 사용 | won | 46.4 | 0.00 | 10 | 4 / 4 | 54 | 14.05 |
| 4 | 방패 중심 편성 | challenge | scout-first | 없음 | won | 45.1 | 0.00 | 10 | 4 / 4 | 49 | 12.64 |
| 4 | 방패 중심 편성 | challenge | scout-first | 사용 | won | 47.5 | 0.00 | 10 | 4 / 4 | 55 | 13.77 |
| 4 | 정찰 중심 편성 | challenge | guard-first | 없음 | lost | 180 | 9.99 | 0 | 3 / 4 | 87 | 18.60 |
| 4 | 정찰 중심 편성 | challenge | guard-first | 사용 | lost | 180 | 9.99 | 0 | 3 / 4 | 93 | 20.53 |
| 4 | 정찰 중심 편성 | challenge | striker-first | 없음 | lost | 180 | 9.99 | 0 | 3 / 4 | 87 | 18.60 |
| 4 | 정찰 중심 편성 | challenge | striker-first | 사용 | lost | 180 | 9.99 | 0 | 3 / 4 | 93 | 20.53 |
| 4 | 정찰 중심 편성 | challenge | scout-first | 없음 | lost | 180 | 9.99 | 0 | 3 / 4 | 88 | 18.60 |
| 4 | 정찰 중심 편성 | challenge | scout-first | 사용 | lost | 180 | 9.99 | 0 | 3 / 4 | 96 | 21.57 |
| 4 | 소규모 편성 | challenge | guard-first | 없음 | lost | 180 | 9.99 | 0 | 3 / 4 | 46 | 9.00 |
| 4 | 소규모 편성 | challenge | guard-first | 사용 | lost | 180 | 9.99 | 0 | 3 / 4 | 50 | 11.11 |
| 4 | 소규모 편성 | challenge | striker-first | 없음 | lost | 180 | 9.99 | 0 | 3 / 4 | 44 | 9.00 |
| 4 | 소규모 편성 | challenge | striker-first | 사용 | lost | 180 | 9.99 | 0 | 3 / 4 | 52 | 11.37 |
| 4 | 소규모 편성 | challenge | scout-first | 없음 | lost | 180 | 9.99 | 0 | 3 / 4 | 43 | 9.00 |
| 4 | 소규모 편성 | challenge | scout-first | 사용 | lost | 180 | 9.99 | 0 | 3 / 4 | 54 | 11.50 |
| 5 | 균형 편성 | practice | guard-first | 없음 | won | 40.6 | 0.00 | 10 | 4 / 4 | 32 | 9.19 |
| 5 | 균형 편성 | practice | guard-first | 사용 | won | 40.6 | 0.00 | 10 | 4 / 4 | 32 | 9.14 |
| 5 | 균형 편성 | practice | striker-first | 없음 | won | 42.1 | 0.00 | 10 | 4 / 4 | 32 | 9.04 |
| 5 | 균형 편성 | practice | striker-first | 사용 | won | 42.1 | 0.00 | 10 | 4 / 4 | 32 | 9.32 |
| 5 | 균형 편성 | practice | scout-first | 없음 | won | 42.4 | 0.00 | 10 | 4 / 4 | 32 | 9.18 |
| 5 | 균형 편성 | practice | scout-first | 사용 | won | 42.4 | 0.00 | 11 | 4 / 4 | 32 | 9.34 |
| 5 | 정찰 지원 편성 | practice | guard-first | 없음 | won | 38 | 0.00 | 11 | 4 / 4 | 27 | 6.96 |
| 5 | 정찰 지원 편성 | practice | guard-first | 사용 | won | 38 | 0.00 | 12 | 4 / 4 | 27 | 7.13 |
| 5 | 정찰 지원 편성 | practice | striker-first | 없음 | won | 36.8 | 0.00 | 12 | 4 / 4 | 27 | 6.99 |
| 5 | 정찰 지원 편성 | practice | striker-first | 사용 | won | 36.8 | 0.00 | 12 | 4 / 4 | 27 | 6.99 |
| 5 | 정찰 지원 편성 | practice | scout-first | 없음 | won | 38.8 | 0.00 | 12 | 4 / 4 | 28 | 7.18 |
| 5 | 정찰 지원 편성 | practice | scout-first | 사용 | won | 38.8 | 0.00 | 12 | 4 / 4 | 28 | 7.18 |
| 5 | 돌격 중심 편성 | practice | guard-first | 없음 | won | 41.6 | 0.00 | 9 | 4 / 4 | 30 | 8.18 |
| 5 | 돌격 중심 편성 | practice | guard-first | 사용 | won | 46.4 | 0.00 | 10 | 4 / 4 | 33 | 9.57 |
| 5 | 돌격 중심 편성 | practice | striker-first | 없음 | won | 47.6 | 0.00 | 9 | 4 / 4 | 33 | 8.56 |
| 5 | 돌격 중심 편성 | practice | striker-first | 사용 | won | 52.4 | 0.00 | 10 | 4 / 4 | 36 | 10.27 |
| 5 | 돌격 중심 편성 | practice | scout-first | 없음 | won | 47.3 | 0.00 | 9 | 4 / 4 | 33 | 8.84 |
| 5 | 돌격 중심 편성 | practice | scout-first | 사용 | won | 52.1 | 0.00 | 10 | 4 / 4 | 36 | 10.27 |
| 5 | 방패 중심 편성 | practice | guard-first | 없음 | won | 49.2 | 0.00 | 10 | 4 / 4 | 37 | 9.95 |
| 5 | 방패 중심 편성 | practice | guard-first | 사용 | won | 49.2 | 0.00 | 10 | 4 / 4 | 37 | 9.90 |
| 5 | 방패 중심 편성 | practice | striker-first | 없음 | won | 47.8 | 0.00 | 10 | 4 / 4 | 36 | 9.85 |
| 5 | 방패 중심 편성 | practice | striker-first | 사용 | won | 47.8 | 0.00 | 10 | 4 / 4 | 36 | 9.80 |
| 5 | 방패 중심 편성 | practice | scout-first | 없음 | won | 48.9 | 0.00 | 10 | 4 / 4 | 37 | 10.13 |
| 5 | 방패 중심 편성 | practice | scout-first | 사용 | won | 48.9 | 0.00 | 10 | 4 / 4 | 37 | 10.08 |
| 5 | 정찰 중심 편성 | practice | guard-first | 없음 | lost | 180 | 9.99 | 0 | 3 / 4 | 76 | 18.60 |
| 5 | 정찰 중심 편성 | practice | guard-first | 사용 | lost | 180 | 9.99 | 0 | 3 / 4 | 81 | 20.59 |
| 5 | 정찰 중심 편성 | practice | striker-first | 없음 | lost | 180 | 9.99 | 0 | 3 / 4 | 76 | 18.60 |
| 5 | 정찰 중심 편성 | practice | striker-first | 사용 | lost | 180 | 9.99 | 0 | 3 / 4 | 81 | 20.59 |
| 5 | 정찰 중심 편성 | practice | scout-first | 없음 | lost | 180 | 9.99 | 0 | 3 / 4 | 77 | 18.60 |
| 5 | 정찰 중심 편성 | practice | scout-first | 사용 | lost | 180 | 9.99 | 0 | 3 / 4 | 85 | 21.43 |
| 5 | 소규모 편성 | practice | guard-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 41 | 9.00 |
| 5 | 소규모 편성 | practice | guard-first | 사용 | lost | 180 | 9.99 | 0 | 3 / 4 | 47 | 11.27 |
| 5 | 소규모 편성 | practice | striker-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 40 | 9.00 |
| 5 | 소규모 편성 | practice | striker-first | 사용 | lost | 180 | 9.99 | 0 | 3 / 4 | 47 | 11.55 |
| 5 | 소규모 편성 | practice | scout-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 39 | 9.00 |
| 5 | 소규모 편성 | practice | scout-first | 사용 | lost | 180 | 9.99 | 0 | 3 / 4 | 46 | 11.69 |
| 5 | 균형 편성 | standard | guard-first | 없음 | won | 40.6 | 0.00 | 10 | 4 / 4 | 42 | 11.37 |
| 5 | 균형 편성 | standard | guard-first | 사용 | won | 40.6 | 0.00 | 10 | 4 / 4 | 42 | 11.04 |
| 5 | 균형 편성 | standard | striker-first | 없음 | won | 42.1 | 0.00 | 10 | 4 / 4 | 43 | 11.74 |
| 5 | 균형 편성 | standard | striker-first | 사용 | won | 42.1 | 0.00 | 10 | 4 / 4 | 43 | 11.74 |
| 5 | 균형 편성 | standard | scout-first | 없음 | won | 42.4 | 0.00 | 10 | 4 / 4 | 43 | 11.88 |
| 5 | 균형 편성 | standard | scout-first | 사용 | won | 42.4 | 0.00 | 10 | 4 / 4 | 43 | 11.88 |
| 5 | 정찰 지원 편성 | standard | guard-first | 없음 | won | 36.2 | 0.00 | 11 | 4 / 4 | 32 | 8.53 |
| 5 | 정찰 지원 편성 | standard | guard-first | 사용 | won | 38 | 0.00 | 11 | 4 / 4 | 33 | 9.19 |
| 5 | 정찰 지원 편성 | standard | striker-first | 없음 | won | 35 | 0.00 | 11 | 4 / 4 | 31 | 8.47 |
| 5 | 정찰 지원 편성 | standard | striker-first | 사용 | won | 36.8 | 0.00 | 12 | 4 / 4 | 32 | 9.07 |
| 5 | 정찰 지원 편성 | standard | scout-first | 없음 | won | 37 | 0.00 | 11 | 4 / 4 | 33 | 8.80 |
| 5 | 정찰 지원 편성 | standard | scout-first | 사용 | won | 38.8 | 0.00 | 12 | 4 / 4 | 34 | 9.40 |
| 5 | 돌격 중심 편성 | standard | guard-first | 없음 | won | 41.6 | 0.00 | 8 | 4 / 4 | 38 | 10.58 |
| 5 | 돌격 중심 편성 | standard | guard-first | 사용 | won | 41.6 | 0.00 | 9 | 4 / 4 | 38 | 10.83 |
| 5 | 돌격 중심 편성 | standard | striker-first | 없음 | won | 47.6 | 0.00 | 8 | 4 / 4 | 43 | 10.96 |
| 5 | 돌격 중심 편성 | standard | striker-first | 사용 | won | 47.6 | 0.00 | 9 | 4 / 4 | 43 | 11.29 |
| 5 | 돌격 중심 편성 | standard | scout-first | 없음 | won | 47.3 | 0.00 | 8 | 4 / 4 | 42 | 11.38 |
| 5 | 돌격 중심 편성 | standard | scout-first | 사용 | won | 47.3 | 0.00 | 9 | 4 / 4 | 42 | 11.43 |
| 5 | 방패 중심 편성 | standard | guard-first | 없음 | won | 50.4 | 0.00 | 9 | 4 / 4 | 48 | 13.50 |
| 5 | 방패 중심 편성 | standard | guard-first | 사용 | won | 49.2 | 0.00 | 10 | 4 / 4 | 47 | 12.89 |
| 5 | 방패 중심 편성 | standard | striker-first | 없음 | won | 47.8 | 0.00 | 9 | 4 / 4 | 46 | 12.78 |
| 5 | 방패 중심 편성 | standard | striker-first | 사용 | won | 47.8 | 0.00 | 10 | 4 / 4 | 46 | 12.60 |
| 5 | 방패 중심 편성 | standard | scout-first | 없음 | won | 48.9 | 0.00 | 9 | 4 / 4 | 47 | 13.06 |
| 5 | 방패 중심 편성 | standard | scout-first | 사용 | won | 48.9 | 0.00 | 10 | 4 / 4 | 47 | 12.88 |
| 5 | 정찰 중심 편성 | standard | guard-first | 없음 | lost | 180 | 9.99 | 0 | 3 / 4 | 81 | 18.60 |
| 5 | 정찰 중심 편성 | standard | guard-first | 사용 | lost | 180 | 9.99 | 0 | 3 / 4 | 87 | 20.54 |
| 5 | 정찰 중심 편성 | standard | striker-first | 없음 | lost | 180 | 9.99 | 0 | 3 / 4 | 81 | 18.60 |
| 5 | 정찰 중심 편성 | standard | striker-first | 사용 | lost | 180 | 9.99 | 0 | 3 / 4 | 87 | 20.54 |
| 5 | 정찰 중심 편성 | standard | scout-first | 없음 | lost | 180 | 9.99 | 0 | 3 / 4 | 83 | 18.60 |
| 5 | 정찰 중심 편성 | standard | scout-first | 사용 | lost | 180 | 9.99 | 0 | 3 / 4 | 92 | 21.38 |
| 5 | 소규모 편성 | standard | guard-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 42 | 9.00 |
| 5 | 소규모 편성 | standard | guard-first | 사용 | lost | 180 | 9.99 | 0 | 2 / 4 | 49 | 10.99 |
| 5 | 소규모 편성 | standard | striker-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 43 | 9.00 |
| 5 | 소규모 편성 | standard | striker-first | 사용 | lost | 180 | 9.99 | 0 | 2 / 4 | 51 | 11.41 |
| 5 | 소규모 편성 | standard | scout-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 42 | 9.00 |
| 5 | 소규모 편성 | standard | scout-first | 사용 | lost | 180 | 9.99 | 0 | 2 / 4 | 50 | 11.41 |
| 5 | 균형 편성 | challenge | guard-first | 없음 | won | 40.6 | 0.00 | 9 | 4 / 4 | 51 | 13.88 |
| 5 | 균형 편성 | challenge | guard-first | 사용 | won | 40.6 | 0.00 | 10 | 4 / 4 | 51 | 13.93 |
| 5 | 균형 편성 | challenge | striker-first | 없음 | won | 42.1 | 0.00 | 8 | 4 / 4 | 52 | 14.34 |
| 5 | 균형 편성 | challenge | striker-first | 사용 | won | 42.1 | 0.00 | 10 | 4 / 4 | 52 | 14.06 |
| 5 | 균형 편성 | challenge | scout-first | 없음 | won | 42.4 | 0.00 | 9 | 4 / 4 | 52 | 14.24 |
| 5 | 균형 편성 | challenge | scout-first | 사용 | won | 42.4 | 0.00 | 10 | 4 / 4 | 52 | 14.31 |
| 5 | 정찰 지원 편성 | challenge | guard-first | 없음 | won | 36.4 | 0.00 | 11 | 4 / 4 | 41 | 11.04 |
| 5 | 정찰 지원 편성 | challenge | guard-first | 사용 | won | 36.2 | 0.00 | 11 | 4 / 4 | 41 | 11.04 |
| 5 | 정찰 지원 편성 | challenge | striker-first | 없음 | won | 35 | 0.00 | 10 | 4 / 4 | 40 | 10.46 |
| 5 | 정찰 지원 편성 | challenge | striker-first | 사용 | won | 35 | 0.00 | 11 | 4 / 4 | 40 | 10.74 |
| 5 | 정찰 지원 편성 | challenge | scout-first | 없음 | won | 37 | 0.00 | 10 | 4 / 4 | 42 | 10.78 |
| 5 | 정찰 지원 편성 | challenge | scout-first | 사용 | won | 37 | 0.00 | 11 | 4 / 4 | 42 | 11.04 |
| 5 | 돌격 중심 편성 | challenge | guard-first | 없음 | won | 41.6 | 0.00 | 7 | 4 / 4 | 49 | 13.74 |
| 5 | 돌격 중심 편성 | challenge | guard-first | 사용 | won | 41.6 | 0.00 | 8 | 4 / 4 | 49 | 13.61 |
| 5 | 돌격 중심 편성 | challenge | striker-first | 없음 | won | 47.6 | 0.00 | 7 | 4 / 4 | 54 | 13.74 |
| 5 | 돌격 중심 편성 | challenge | striker-first | 사용 | won | 47.6 | 0.00 | 8 | 4 / 4 | 54 | 14.21 |
| 5 | 돌격 중심 편성 | challenge | scout-first | 없음 | won | 47.3 | 0.00 | 7 | 4 / 4 | 54 | 14.16 |
| 5 | 돌격 중심 편성 | challenge | scout-first | 사용 | won | 47.3 | 0.00 | 8 | 4 / 4 | 54 | 14.45 |
| 5 | 방패 중심 편성 | challenge | guard-first | 없음 | won | 50.4 | 0.00 | 9 | 4 / 4 | 60 | 16.49 |
| 5 | 방패 중심 편성 | challenge | guard-first | 사용 | won | 50.4 | 0.00 | 9 | 4 / 4 | 60 | 16.39 |
| 5 | 방패 중심 편성 | challenge | striker-first | 없음 | won | 49 | 0.00 | 9 | 4 / 4 | 59 | 16.53 |
| 5 | 방패 중심 편성 | challenge | striker-first | 사용 | won | 49 | 0.00 | 9 | 4 / 4 | 59 | 16.81 |
| 5 | 방패 중심 편성 | challenge | scout-first | 없음 | won | 50.1 | 0.00 | 9 | 4 / 4 | 60 | 16.95 |
| 5 | 방패 중심 편성 | challenge | scout-first | 사용 | won | 50.1 | 0.00 | 9 | 4 / 4 | 60 | 16.47 |
| 5 | 정찰 중심 편성 | challenge | guard-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 88 | 18.60 |
| 5 | 정찰 중심 편성 | challenge | guard-first | 사용 | lost | 180 | 9.99 | 0 | 3 / 4 | 92 | 20.54 |
| 5 | 정찰 중심 편성 | challenge | striker-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 88 | 18.60 |
| 5 | 정찰 중심 편성 | challenge | striker-first | 사용 | lost | 180 | 9.99 | 0 | 3 / 4 | 92 | 20.54 |
| 5 | 정찰 중심 편성 | challenge | scout-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 89 | 18.60 |
| 5 | 정찰 중심 편성 | challenge | scout-first | 사용 | lost | 180 | 9.99 | 0 | 2 / 4 | 95 | 20.40 |
| 5 | 소규모 편성 | challenge | guard-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 45 | 9.00 |
| 5 | 소규모 편성 | challenge | guard-first | 사용 | lost | 180 | 9.99 | 0 | 2 / 4 | 52 | 10.99 |
| 5 | 소규모 편성 | challenge | striker-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 44 | 9.00 |
| 5 | 소규모 편성 | challenge | striker-first | 사용 | lost | 180 | 9.99 | 0 | 2 / 4 | 52 | 11.41 |
| 5 | 소규모 편성 | challenge | scout-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 44 | 9.00 |
| 5 | 소규모 편성 | challenge | scout-first | 사용 | lost | 180 | 9.99 | 0 | 3 / 4 | 53 | 11.55 |
| 6 | 균형 편성 | practice | guard-first | 없음 | won | 37.9 | 0.00 | 10 | 4 / 4 | 27 | 7.50 |
| 6 | 균형 편성 | practice | guard-first | 사용 | won | 37.9 | 0.00 | 11 | 4 / 4 | 27 | 7.65 |
| 6 | 균형 편성 | practice | striker-first | 없음 | won | 40.9 | 0.00 | 10 | 4 / 4 | 29 | 7.70 |
| 6 | 균형 편성 | practice | striker-first | 사용 | won | 40.9 | 0.00 | 11 | 4 / 4 | 29 | 7.80 |
| 6 | 균형 편성 | practice | scout-first | 없음 | won | 36.1 | 0.00 | 10 | 4 / 4 | 26 | 7.15 |
| 6 | 균형 편성 | practice | scout-first | 사용 | won | 36.1 | 0.00 | 11 | 4 / 4 | 26 | 7.35 |
| 6 | 정찰 지원 편성 | practice | guard-first | 없음 | won | 35.4 | 0.00 | 11 | 4 / 4 | 26 | 7.05 |
| 6 | 정찰 지원 편성 | practice | guard-first | 사용 | won | 35.4 | 0.00 | 12 | 4 / 4 | 26 | 7.35 |
| 6 | 정찰 지원 편성 | practice | striker-first | 없음 | won | 35.9 | 0.00 | 11 | 4 / 4 | 26 | 7.25 |
| 6 | 정찰 지원 편성 | practice | striker-first | 사용 | won | 35.9 | 0.00 | 12 | 4 / 4 | 26 | 7.50 |
| 6 | 정찰 지원 편성 | practice | scout-first | 없음 | won | 37.6 | 0.00 | 11 | 4 / 4 | 27 | 7.40 |
| 6 | 정찰 지원 편성 | practice | scout-first | 사용 | won | 37.6 | 0.00 | 12 | 4 / 4 | 27 | 7.65 |
| 6 | 돌격 중심 편성 | practice | guard-first | 없음 | won | 53.7 | 0.00 | 8 | 4 / 4 | 43 | 12.20 |
| 6 | 돌격 중심 편성 | practice | guard-first | 사용 | won | 47.7 | 0.00 | 9 | 4 / 4 | 36 | 10.10 |
| 6 | 돌격 중심 편성 | practice | striker-first | 없음 | won | 49 | 0.00 | 9 | 4 / 4 | 37 | 9.80 |
| 6 | 돌격 중심 편성 | practice | striker-first | 사용 | won | 49 | 0.00 | 10 | 4 / 4 | 37 | 10.45 |
| 6 | 돌격 중심 편성 | practice | scout-first | 없음 | won | 66.8 | 0.00 | 6 | 4 / 4 | 59 | 17.30 |
| 6 | 돌격 중심 편성 | practice | scout-first | 사용 | won | 54.8 | 0.00 | 9 | 4 / 4 | 45 | 11.95 |
| 6 | 방패 중심 편성 | practice | guard-first | 없음 | won | 49.7 | 0.00 | 10 | 4 / 4 | 38 | 10.95 |
| 6 | 방패 중심 편성 | practice | guard-first | 사용 | won | 49.7 | 0.00 | 10 | 4 / 4 | 38 | 11.25 |
| 6 | 방패 중심 편성 | practice | striker-first | 없음 | won | 48.5 | 0.00 | 10 | 4 / 4 | 37 | 11.25 |
| 6 | 방패 중심 편성 | practice | striker-first | 사용 | won | 48.5 | 0.00 | 10 | 4 / 4 | 37 | 11.55 |
| 6 | 방패 중심 편성 | practice | scout-first | 없음 | won | 51.5 | 0.00 | 10 | 4 / 4 | 39 | 11.55 |
| 6 | 방패 중심 편성 | practice | scout-first | 사용 | won | 51.5 | 0.00 | 10 | 4 / 4 | 39 | 11.45 |
| 6 | 정찰 중심 편성 | practice | guard-first | 없음 | lost | 180 | 9.99 | 0 | 3 / 4 | 72 | 18.60 |
| 6 | 정찰 중심 편성 | practice | guard-first | 사용 | lost | 180 | 9.99 | 0 | 3 / 4 | 80 | 20.55 |
| 6 | 정찰 중심 편성 | practice | striker-first | 없음 | lost | 180 | 9.99 | 0 | 3 / 4 | 72 | 18.60 |
| 6 | 정찰 중심 편성 | practice | striker-first | 사용 | lost | 180 | 9.99 | 0 | 3 / 4 | 80 | 20.55 |
| 6 | 정찰 중심 편성 | practice | scout-first | 없음 | lost | 180 | 9.99 | 0 | 3 / 4 | 74 | 18.60 |
| 6 | 정찰 중심 편성 | practice | scout-first | 사용 | lost | 180 | 9.99 | 0 | 3 / 4 | 82 | 21.30 |
| 6 | 소규모 편성 | practice | guard-first | 없음 | lost | 180 | 9.99 | 0 | 3 / 4 | 36 | 9.00 |
| 6 | 소규모 편성 | practice | guard-first | 사용 | lost | 180 | 9.99 | 0 | 3 / 4 | 42 | 11.30 |
| 6 | 소규모 편성 | practice | striker-first | 없음 | lost | 180 | 9.99 | 0 | 3 / 4 | 36 | 9.00 |
| 6 | 소규모 편성 | practice | striker-first | 사용 | lost | 180 | 9.99 | 0 | 3 / 4 | 43 | 11.60 |
| 6 | 소규모 편성 | practice | scout-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 37 | 9.00 |
| 6 | 소규모 편성 | practice | scout-first | 사용 | lost | 180 | 9.99 | 0 | 3 / 4 | 45 | 11.75 |
| 6 | 균형 편성 | standard | guard-first | 없음 | won | 37.9 | 0.00 | 10 | 4 / 4 | 34 | 9.45 |
| 6 | 균형 편성 | standard | guard-first | 사용 | won | 37.9 | 0.00 | 10 | 4 / 4 | 34 | 9.65 |
| 6 | 균형 편성 | standard | striker-first | 없음 | won | 40.9 | 0.00 | 9 | 4 / 4 | 37 | 9.80 |
| 6 | 균형 편성 | standard | striker-first | 사용 | won | 40.9 | 0.00 | 10 | 4 / 4 | 37 | 10.00 |
| 6 | 균형 편성 | standard | scout-first | 없음 | won | 40.3 | 0.00 | 9 | 4 / 4 | 38 | 11.05 |
| 6 | 균형 편성 | standard | scout-first | 사용 | won | 36.1 | 0.00 | 11 | 4 / 4 | 34 | 9.55 |
| 6 | 정찰 지원 편성 | standard | guard-first | 없음 | won | 33.8 | 0.00 | 11 | 4 / 4 | 32 | 9.45 |
| 6 | 정찰 지원 편성 | standard | guard-first | 사용 | won | 33.6 | 0.00 | 11 | 4 / 4 | 32 | 8.85 |
| 6 | 정찰 지원 편성 | standard | striker-first | 없음 | won | 34.1 | 0.00 | 11 | 4 / 4 | 32 | 9.00 |
| 6 | 정찰 지원 편성 | standard | striker-first | 사용 | won | 35.9 | 0.00 | 11 | 4 / 4 | 33 | 9.60 |
| 6 | 정찰 지원 편성 | standard | scout-first | 없음 | won | 35.8 | 0.00 | 11 | 4 / 4 | 33 | 9.30 |
| 6 | 정찰 지원 편성 | standard | scout-first | 사용 | won | 37.6 | 0.00 | 11 | 4 / 4 | 34 | 9.85 |
| 6 | 돌격 중심 편성 | standard | guard-first | 없음 | won | 59.7 | 0.00 | 5 | 4 / 4 | 69 | 19.40 |
| 6 | 돌격 중심 편성 | standard | guard-first | 사용 | won | 47.7 | 0.00 | 8 | 4 / 4 | 49 | 13.30 |
| 6 | 돌격 중심 편성 | standard | striker-first | 없음 | won | 55 | 0.00 | 6 | 4 / 4 | 59 | 16.20 |
| 6 | 돌격 중심 편성 | standard | striker-first | 사용 | won | 49 | 0.00 | 8 | 4 / 4 | 50 | 13.80 |
| 6 | 돌격 중심 편성 | standard | scout-first | 없음 | won | 50.6 | 0.00 | 7 | 4 / 4 | 51 | 13.85 |
| 6 | 돌격 중심 편성 | standard | scout-first | 사용 | won | 50.6 | 0.00 | 8 | 4 / 4 | 51 | 14.30 |
| 6 | 방패 중심 편성 | standard | guard-first | 없음 | won | 53.9 | 0.00 | 9 | 4 / 4 | 57 | 17.20 |
| 6 | 방패 중심 편성 | standard | guard-first | 사용 | won | 49.7 | 0.00 | 9 | 4 / 4 | 51 | 14.25 |
| 6 | 방패 중심 편성 | standard | striker-first | 없음 | won | 52.7 | 0.00 | 9 | 4 / 4 | 56 | 16.90 |
| 6 | 방패 중심 편성 | standard | striker-first | 사용 | won | 48.5 | 0.00 | 9 | 4 / 4 | 50 | 14.70 |
| 6 | 방패 중심 편성 | standard | scout-first | 없음 | won | 55.7 | 0.00 | 9 | 4 / 4 | 58 | 17.20 |
| 6 | 방패 중심 편성 | standard | scout-first | 사용 | won | 51.5 | 0.00 | 9 | 4 / 4 | 52 | 15.00 |
| 6 | 정찰 중심 편성 | standard | guard-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 75 | 18.60 |
| 6 | 정찰 중심 편성 | standard | guard-first | 사용 | lost | 180 | 9.99 | 0 | 3 / 4 | 84 | 20.55 |
| 6 | 정찰 중심 편성 | standard | striker-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 75 | 18.60 |
| 6 | 정찰 중심 편성 | standard | striker-first | 사용 | lost | 180 | 9.99 | 0 | 3 / 4 | 84 | 20.55 |
| 6 | 정찰 중심 편성 | standard | scout-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 77 | 18.60 |
| 6 | 정찰 중심 편성 | standard | scout-first | 사용 | lost | 180 | 9.99 | 0 | 3 / 4 | 87 | 21.45 |
| 6 | 소규모 편성 | standard | guard-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 37 | 9.00 |
| 6 | 소규모 편성 | standard | guard-first | 사용 | lost | 180 | 9.99 | 0 | 3 / 4 | 44 | 11.30 |
| 6 | 소규모 편성 | standard | striker-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 36 | 9.00 |
| 6 | 소규모 편성 | standard | striker-first | 사용 | lost | 180 | 9.99 | 0 | 3 / 4 | 45 | 11.75 |
| 6 | 소규모 편성 | standard | scout-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 40 | 9.00 |
| 6 | 소규모 편성 | standard | scout-first | 사용 | lost | 180 | 9.99 | 0 | 3 / 4 | 48 | 11.45 |
| 6 | 균형 편성 | challenge | guard-first | 없음 | won | 37.9 | 0.00 | 10 | 4 / 4 | 44 | 12.15 |
| 6 | 균형 편성 | challenge | guard-first | 사용 | won | 37.9 | 0.00 | 10 | 4 / 4 | 44 | 12.05 |
| 6 | 균형 편성 | challenge | striker-first | 없음 | won | 40.9 | 0.00 | 9 | 4 / 4 | 47 | 11.80 |
| 6 | 균형 편성 | challenge | striker-first | 사용 | won | 40.9 | 0.00 | 10 | 4 / 4 | 47 | 12.15 |
| 6 | 균형 편성 | challenge | scout-first | 없음 | won | 36.1 | 0.00 | 9 | 4 / 4 | 42 | 11.45 |
| 6 | 균형 편성 | challenge | scout-first | 사용 | won | 36.1 | 0.00 | 10 | 4 / 4 | 42 | 11.60 |
| 6 | 정찰 지원 편성 | challenge | guard-first | 없음 | won | 33.6 | 0.00 | 11 | 4 / 4 | 38 | 10.60 |
| 6 | 정찰 지원 편성 | challenge | guard-first | 사용 | won | 33.6 | 0.00 | 11 | 4 / 4 | 38 | 10.85 |
| 6 | 정찰 지원 편성 | challenge | striker-first | 없음 | won | 34.2 | 0.00 | 10 | 4 / 4 | 39 | 10.60 |
| 6 | 정찰 지원 편성 | challenge | striker-first | 사용 | won | 34.1 | 0.00 | 11 | 4 / 4 | 39 | 10.95 |
| 6 | 정찰 지원 편성 | challenge | scout-first | 없음 | won | 35.8 | 0.00 | 11 | 4 / 4 | 41 | 10.80 |
| 6 | 정찰 지원 편성 | challenge | scout-first | 사용 | won | 35.8 | 0.00 | 11 | 4 / 4 | 41 | 10.80 |
| 6 | 돌격 중심 편성 | challenge | guard-first | 없음 | won | 43.5 | 0.00 | 7 | 4 / 4 | 50 | 13.00 |
| 6 | 돌격 중심 편성 | challenge | guard-first | 사용 | lost | 180 | 0.44 | 0 | 4 / 4 | 95 | 29.00 |
| 6 | 돌격 중심 편성 | challenge | striker-first | 없음 | lost | 180 | 3.59 | 0 | 4 / 4 | 92 | 27.00 |
| 6 | 돌격 중심 편성 | challenge | striker-first | 사용 | won | 55 | 0.00 | 6 | 4 / 4 | 72 | 20.50 |
| 6 | 돌격 중심 편성 | challenge | scout-first | 없음 | won | 50.6 | 0.00 | 6 | 4 / 4 | 60 | 15.85 |
| 6 | 돌격 중심 편성 | challenge | scout-first | 사용 | won | 50.6 | 0.00 | 7 | 4 / 4 | 62 | 16.45 |
| 6 | 방패 중심 편성 | challenge | guard-first | 없음 | won | 54.5 | 0.00 | 8 | 4 / 4 | 69 | 21.05 |
| 6 | 방패 중심 편성 | challenge | guard-first | 사용 | won | 53.9 | 0.00 | 8 | 4 / 4 | 69 | 20.45 |
| 6 | 방패 중심 편성 | challenge | striker-first | 없음 | won | 65.9 | 0.00 | 6 | 4 / 4 | 82 | 26.40 |
| 6 | 방패 중심 편성 | challenge | striker-first | 사용 | won | 52.7 | 0.00 | 8 | 4 / 4 | 68 | 20.90 |
| 6 | 방패 중심 편성 | challenge | scout-first | 없음 | won | 55.7 | 0.00 | 8 | 4 / 4 | 71 | 21.15 |
| 6 | 방패 중심 편성 | challenge | scout-first | 사용 | won | 55.7 | 0.00 | 9 | 4 / 4 | 71 | 20.75 |
| 6 | 정찰 중심 편성 | challenge | guard-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 78 | 18.60 |
| 6 | 정찰 중심 편성 | challenge | guard-first | 사용 | lost | 180 | 9.99 | 0 | 2 / 4 | 84 | 20.60 |
| 6 | 정찰 중심 편성 | challenge | striker-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 78 | 18.60 |
| 6 | 정찰 중심 편성 | challenge | striker-first | 사용 | lost | 180 | 9.99 | 0 | 2 / 4 | 84 | 20.60 |
| 6 | 정찰 중심 편성 | challenge | scout-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 79 | 18.60 |
| 6 | 정찰 중심 편성 | challenge | scout-first | 사용 | lost | 180 | 9.99 | 0 | 2 / 4 | 86 | 20.75 |
| 6 | 소규모 편성 | challenge | guard-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 39 | 9.00 |
| 6 | 소규모 편성 | challenge | guard-first | 사용 | lost | 180 | 9.99 | 0 | 2 / 4 | 45 | 11.00 |
| 6 | 소규모 편성 | challenge | striker-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 39 | 9.00 |
| 6 | 소규모 편성 | challenge | striker-first | 사용 | lost | 180 | 9.99 | 0 | 2 / 4 | 47 | 11.45 |
| 6 | 소규모 편성 | challenge | scout-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 43 | 9.00 |
| 6 | 소규모 편성 | challenge | scout-first | 사용 | lost | 180 | 9.99 | 0 | 2 / 4 | 51 | 11.60 |
| 7 | 균형 편성 | practice | guard-first | 없음 | won | 46.3 | 0.00 | 10 | 4 / 4 | 35 | 10.08 |
| 7 | 균형 편성 | practice | guard-first | 사용 | won | 45.1 | 0.00 | 10 | 4 / 4 | 33 | 9.88 |
| 7 | 균형 편성 | practice | striker-first | 없음 | won | 48.3 | 0.00 | 10 | 4 / 4 | 35 | 10.35 |
| 7 | 균형 편성 | practice | striker-first | 사용 | won | 48.1 | 0.00 | 10 | 4 / 4 | 35 | 10.10 |
| 7 | 균형 편성 | practice | scout-first | 없음 | won | 53.8 | 0.00 | 9 | 4 / 4 | 43 | 13.44 |
| 7 | 균형 편성 | practice | scout-first | 사용 | won | 47.8 | 0.00 | 10 | 4 / 4 | 35 | 10.26 |
| 7 | 정찰 지원 편성 | practice | guard-first | 없음 | won | 34.6 | 0.00 | 11 | 4 / 4 | 26 | 6.87 |
| 7 | 정찰 지원 편성 | practice | guard-first | 사용 | won | 36.4 | 0.00 | 11 | 4 / 4 | 27 | 7.83 |
| 7 | 정찰 지원 편성 | practice | striker-first | 없음 | won | 35.2 | 0.00 | 11 | 4 / 4 | 27 | 7.09 |
| 7 | 정찰 지원 편성 | practice | striker-first | 사용 | won | 37 | 0.00 | 12 | 4 / 4 | 28 | 8.08 |
| 7 | 정찰 지원 편성 | practice | scout-first | 없음 | won | 37 | 0.00 | 11 | 4 / 4 | 27 | 8.04 |
| 7 | 정찰 지원 편성 | practice | scout-first | 사용 | won | 37 | 0.00 | 12 | 4 / 4 | 27 | 8.08 |
| 7 | 돌격 중심 편성 | practice | guard-first | 없음 | won | 53.8 | 0.00 | 6 | 4 / 4 | 49 | 15.00 |
| 7 | 돌격 중심 편성 | practice | guard-first | 사용 | won | 41.8 | 0.00 | 9 | 4 / 4 | 34 | 10.65 |
| 7 | 돌격 중심 편성 | practice | striker-first | 없음 | won | 53.5 | 0.00 | 7 | 4 / 4 | 45 | 13.44 |
| 7 | 돌격 중심 편성 | practice | striker-first | 사용 | won | 47.5 | 0.00 | 9 | 4 / 4 | 37 | 11.03 |
| 7 | 돌격 중심 편성 | practice | scout-first | 없음 | won | 53.2 | 0.00 | 7 | 4 / 4 | 45 | 12.92 |
| 7 | 돌격 중심 편성 | practice | scout-first | 사용 | won | 47.2 | 0.00 | 9 | 4 / 4 | 37 | 11.19 |
| 7 | 방패 중심 편성 | practice | guard-first | 없음 | won | 51.1 | 0.00 | 10 | 4 / 4 | 41 | 11.76 |
| 7 | 방패 중심 편성 | practice | guard-first | 사용 | won | 51.1 | 0.00 | 10 | 4 / 4 | 41 | 11.98 |
| 7 | 방패 중심 편성 | practice | striker-first | 없음 | won | 49.5 | 0.00 | 10 | 4 / 4 | 40 | 12.08 |
| 7 | 방패 중심 편성 | practice | striker-first | 사용 | won | 49.3 | 0.00 | 10 | 4 / 4 | 39 | 11.51 |
| 7 | 방패 중심 편성 | practice | scout-first | 없음 | won | 57.6 | 0.00 | 9 | 4 / 4 | 46 | 14.17 |
| 7 | 방패 중심 편성 | practice | scout-first | 사용 | won | 53.4 | 0.00 | 10 | 4 / 4 | 41 | 11.83 |
| 7 | 정찰 중심 편성 | practice | guard-first | 없음 | lost | 180 | 9.99 | 0 | 3 / 4 | 71 | 18.60 |
| 7 | 정찰 중심 편성 | practice | guard-first | 사용 | lost | 180 | 9.99 | 0 | 3 / 4 | 77 | 20.56 |
| 7 | 정찰 중심 편성 | practice | striker-first | 없음 | lost | 180 | 9.99 | 0 | 3 / 4 | 71 | 18.60 |
| 7 | 정찰 중심 편성 | practice | striker-first | 사용 | lost | 180 | 9.99 | 0 | 3 / 4 | 77 | 20.56 |
| 7 | 정찰 중심 편성 | practice | scout-first | 없음 | lost | 180 | 9.99 | 0 | 3 / 4 | 74 | 18.60 |
| 7 | 정찰 중심 편성 | practice | scout-first | 사용 | lost | 180 | 9.99 | 0 | 3 / 4 | 79 | 21.36 |
| 7 | 소규모 편성 | practice | guard-first | 없음 | lost | 180 | 9.99 | 0 | 3 / 4 | 36 | 9.00 |
| 7 | 소규모 편성 | practice | guard-first | 사용 | lost | 180 | 9.99 | 0 | 2 / 4 | 41 | 11.01 |
| 7 | 소규모 편성 | practice | striker-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 36 | 9.00 |
| 7 | 소규모 편성 | practice | striker-first | 사용 | lost | 180 | 9.99 | 0 | 2 / 4 | 44 | 11.33 |
| 7 | 소규모 편성 | practice | scout-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 39 | 9.00 |
| 7 | 소규모 편성 | practice | scout-first | 사용 | lost | 180 | 9.99 | 0 | 2 / 4 | 47 | 11.49 |
| 7 | 균형 편성 | standard | guard-first | 없음 | won | 46.3 | 0.00 | 9 | 4 / 4 | 44 | 13.38 |
| 7 | 균형 편성 | standard | guard-first | 사용 | won | 45.3 | 0.00 | 10 | 4 / 4 | 43 | 12.67 |
| 7 | 균형 편성 | standard | striker-first | 없음 | won | 49.3 | 0.00 | 9 | 4 / 4 | 46 | 13.76 |
| 7 | 균형 편성 | standard | striker-first | 사용 | won | 48.1 | 0.00 | 10 | 4 / 4 | 44 | 12.68 |
| 7 | 균형 편성 | standard | scout-first | 없음 | won | 49 | 0.00 | 9 | 4 / 4 | 46 | 13.50 |
| 7 | 균형 편성 | standard | scout-first | 사용 | won | 47.8 | 0.00 | 10 | 4 / 4 | 44 | 12.84 |
| 7 | 정찰 지원 편성 | standard | guard-first | 없음 | won | 34.6 | 0.00 | 11 | 4 / 4 | 32 | 9.24 |
| 7 | 정찰 지원 편성 | standard | guard-first | 사용 | won | 34.6 | 0.00 | 11 | 4 / 4 | 32 | 9.36 |
| 7 | 정찰 지원 편성 | standard | striker-first | 없음 | won | 35.2 | 0.00 | 11 | 4 / 4 | 32 | 9.62 |
| 7 | 정찰 지원 편성 | standard | striker-first | 사용 | won | 37 | 0.00 | 11 | 4 / 4 | 34 | 10.16 |
| 7 | 정찰 지원 편성 | standard | scout-first | 없음 | won | 35.2 | 0.00 | 11 | 4 / 4 | 32 | 9.52 |
| 7 | 정찰 지원 편성 | standard | scout-first | 사용 | won | 37 | 0.00 | 11 | 4 / 4 | 34 | 10.09 |
| 7 | 돌격 중심 편성 | standard | guard-first | 없음 | won | 53.8 | 0.00 | 4 | 4 / 4 | 64 | 20.22 |
| 7 | 돌격 중심 편성 | standard | guard-first | 사용 | won | 47.8 | 0.00 | 7 | 4 / 4 | 54 | 16.61 |
| 7 | 돌격 중심 편성 | standard | striker-first | 없음 | won | 59.5 | 0.00 | 4 | 4 / 4 | 68 | 20.64 |
| 7 | 돌격 중심 편성 | standard | striker-first | 사용 | won | 47.5 | 0.00 | 8 | 4 / 4 | 48 | 13.91 |
| 7 | 돌격 중심 편성 | standard | scout-first | 없음 | won | 59.2 | 0.00 | 4 | 4 / 4 | 68 | 20.28 |
| 7 | 돌격 중심 편성 | standard | scout-first | 사용 | won | 47.2 | 0.00 | 8 | 4 / 4 | 48 | 14.07 |
| 7 | 방패 중심 편성 | standard | guard-first | 없음 | won | 52.3 | 0.00 | 9 | 4 / 4 | 52 | 16.74 |
| 7 | 방패 중심 편성 | standard | guard-first | 사용 | won | 52.3 | 0.00 | 9 | 4 / 4 | 52 | 16.44 |
| 7 | 방패 중심 편성 | standard | striker-first | 없음 | won | 50.7 | 0.00 | 9 | 4 / 4 | 51 | 16.38 |
| 7 | 방패 중심 편성 | standard | striker-first | 사용 | won | 50.7 | 0.00 | 9 | 4 / 4 | 51 | 16.08 |
| 7 | 방패 중심 편성 | standard | scout-first | 없음 | won | 57.6 | 0.00 | 9 | 4 / 4 | 59 | 18.33 |
| 7 | 방패 중심 편성 | standard | scout-first | 사용 | won | 57.6 | 0.00 | 9 | 4 / 4 | 59 | 18.08 |
| 7 | 정찰 중심 편성 | standard | guard-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 74 | 18.60 |
| 7 | 정찰 중심 편성 | standard | guard-first | 사용 | lost | 180 | 9.99 | 0 | 2 / 4 | 80 | 20.56 |
| 7 | 정찰 중심 편성 | standard | striker-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 74 | 18.60 |
| 7 | 정찰 중심 편성 | standard | striker-first | 사용 | lost | 180 | 9.99 | 0 | 2 / 4 | 80 | 20.56 |
| 7 | 정찰 중심 편성 | standard | scout-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 76 | 18.60 |
| 7 | 정찰 중심 편성 | standard | scout-first | 사용 | lost | 180 | 9.99 | 0 | 3 / 4 | 85 | 21.52 |
| 7 | 소규모 편성 | standard | guard-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 37 | 9.00 |
| 7 | 소규모 편성 | standard | guard-first | 사용 | lost | 180 | 9.99 | 0 | 3 / 4 | 45 | 11.01 |
| 7 | 소규모 편성 | standard | striker-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 39 | 9.00 |
| 7 | 소규모 편성 | standard | striker-first | 사용 | lost | 180 | 9.99 | 0 | 2 / 4 | 47 | 11.49 |
| 7 | 소규모 편성 | standard | scout-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 41 | 9.00 |
| 7 | 소규모 편성 | standard | scout-first | 사용 | lost | 180 | 9.99 | 0 | 2 / 4 | 49 | 11.49 |
| 7 | 균형 편성 | challenge | guard-first | 없음 | won | 52.3 | 0.00 | 7 | 4 / 4 | 62 | 18.60 |
| 7 | 균형 편성 | challenge | guard-first | 사용 | won | 52.3 | 0.00 | 9 | 4 / 4 | 62 | 19.80 |
| 7 | 균형 편성 | challenge | striker-first | 없음 | won | 55.3 | 0.00 | 7 | 4 / 4 | 65 | 19.02 |
| 7 | 균형 편성 | challenge | striker-first | 사용 | won | 49.3 | 0.00 | 9 | 4 / 4 | 58 | 16.98 |
| 7 | 균형 편성 | challenge | scout-first | 없음 | won | 55 | 0.00 | 7 | 4 / 4 | 65 | 19.50 |
| 7 | 균형 편성 | challenge | scout-first | 사용 | won | 49 | 0.00 | 9 | 4 / 4 | 58 | 16.88 |
| 7 | 정찰 지원 편성 | challenge | guard-first | 없음 | won | 39.2 | 0.00 | 9 | 4 / 4 | 47 | 14.04 |
| 7 | 정찰 지원 편성 | challenge | guard-first | 사용 | won | 34.6 | 0.00 | 11 | 4 / 4 | 40 | 11.04 |
| 7 | 정찰 지원 편성 | challenge | striker-first | 없음 | won | 41.6 | 0.00 | 9 | 4 / 4 | 52 | 14.88 |
| 7 | 정찰 지원 편성 | challenge | striker-first | 사용 | won | 35.2 | 0.00 | 11 | 4 / 4 | 41 | 11.16 |
| 7 | 정찰 지원 편성 | challenge | scout-first | 없음 | won | 39.2 | 0.00 | 10 | 4 / 4 | 49 | 14.75 |
| 7 | 정찰 지원 편성 | challenge | scout-first | 사용 | won | 35.2 | 0.00 | 11 | 4 / 4 | 41 | 11.09 |
| 7 | 돌격 중심 편성 | challenge | guard-first | 없음 | lost | 180 | 2.80 | 0 | 4 / 4 | 85 | 27.00 |
| 7 | 돌격 중심 편성 | challenge | guard-first | 사용 | lost | 180 | 0.40 | 0 | 4 / 4 | 93 | 29.33 |
| 7 | 돌격 중심 편성 | challenge | striker-first | 없음 | lost | 180 | 5.89 | 0 | 4 / 4 | 88 | 27.00 |
| 7 | 돌격 중심 편성 | challenge | striker-first | 사용 | lost | 180 | 0.40 | 0 | 4 / 4 | 98 | 30.60 |
| 7 | 돌격 중심 편성 | challenge | scout-first | 없음 | lost | 180 | 3.61 | 0 | 4 / 4 | 89 | 27.00 |
| 7 | 돌격 중심 편성 | challenge | scout-first | 사용 | lost | 180 | 0.40 | 0 | 4 / 4 | 98 | 30.65 |
| 7 | 방패 중심 편성 | challenge | guard-first | 없음 | won | 52.7 | 0.00 | 8 | 4 / 4 | 66 | 20.46 |
| 7 | 방패 중심 편성 | challenge | guard-first | 사용 | won | 52.3 | 0.00 | 8 | 4 / 4 | 65 | 20.58 |
| 7 | 방패 중심 편성 | challenge | striker-first | 없음 | won | 50.7 | 0.00 | 8 | 4 / 4 | 64 | 19.42 |
| 7 | 방패 중심 편성 | challenge | striker-first | 사용 | won | 50.7 | 0.00 | 9 | 4 / 4 | 64 | 19.60 |
| 7 | 방패 중심 편성 | challenge | scout-first | 없음 | won | 68.4 | 0.00 | 6 | 4 / 4 | 83 | 26.74 |
| 7 | 방패 중심 편성 | challenge | scout-first | 사용 | won | 57.6 | 0.00 | 8 | 4 / 4 | 74 | 22.38 |
| 7 | 정찰 중심 편성 | challenge | guard-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 80 | 18.60 |
| 7 | 정찰 중심 편성 | challenge | guard-first | 사용 | lost | 180 | 9.99 | 0 | 2 / 4 | 84 | 20.40 |
| 7 | 정찰 중심 편성 | challenge | striker-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 80 | 18.60 |
| 7 | 정찰 중심 편성 | challenge | striker-first | 사용 | lost | 180 | 9.99 | 0 | 2 / 4 | 84 | 20.40 |
| 7 | 정찰 중심 편성 | challenge | scout-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 81 | 18.60 |
| 7 | 정찰 중심 편성 | challenge | scout-first | 사용 | lost | 180 | 9.99 | 0 | 2 / 4 | 88 | 20.77 |
| 7 | 소규모 편성 | challenge | guard-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 39 | 9.00 |
| 7 | 소규모 편성 | challenge | guard-first | 사용 | lost | 180 | 9.99 | 0 | 2 / 4 | 46 | 11.01 |
| 7 | 소규모 편성 | challenge | striker-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 40 | 9.00 |
| 7 | 소규모 편성 | challenge | striker-first | 사용 | lost | 180 | 9.99 | 0 | 2 / 4 | 49 | 11.65 |
| 7 | 소규모 편성 | challenge | scout-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 45 | 9.00 |
| 7 | 소규모 편성 | challenge | scout-first | 사용 | lost | 180 | 9.99 | 0 | 2 / 4 | 53 | 11.65 |
| 8 | 균형 편성 | practice | guard-first | 없음 | won | 45.6 | 0.00 | 10 | 4 / 4 | 35 | 11.14 |
| 8 | 균형 편성 | practice | guard-first | 사용 | won | 45.6 | 0.00 | 10 | 4 / 4 | 35 | 11.28 |
| 8 | 균형 편성 | practice | striker-first | 없음 | won | 42.6 | 0.00 | 10 | 4 / 4 | 33 | 10.99 |
| 8 | 균형 편성 | practice | striker-first | 사용 | won | 42.6 | 0.00 | 10 | 4 / 4 | 33 | 11.13 |
| 8 | 균형 편성 | practice | scout-first | 없음 | won | 42.3 | 0.00 | 10 | 4 / 4 | 33 | 11.16 |
| 8 | 균형 편성 | practice | scout-first | 사용 | won | 42.3 | 0.00 | 10 | 4 / 4 | 33 | 10.86 |
| 8 | 정찰 지원 편성 | practice | guard-first | 없음 | won | 34.1 | 0.00 | 11 | 4 / 4 | 26 | 7.77 |
| 8 | 정찰 지원 편성 | practice | guard-first | 사용 | won | 35.9 | 0.00 | 12 | 4 / 4 | 27 | 8.39 |
| 8 | 정찰 지원 편성 | practice | striker-first | 없음 | won | 34.7 | 0.00 | 11 | 4 / 4 | 26 | 8.01 |
| 8 | 정찰 지원 편성 | practice | striker-first | 사용 | won | 36.5 | 0.00 | 12 | 4 / 4 | 27 | 8.56 |
| 8 | 정찰 지원 편성 | practice | scout-first | 없음 | won | 38.5 | 0.00 | 11 | 4 / 4 | 28 | 8.35 |
| 8 | 정찰 지원 편성 | practice | scout-first | 사용 | won | 40.3 | 0.00 | 12 | 4 / 4 | 29 | 8.90 |
| 8 | 돌격 중심 편성 | practice | guard-first | 없음 | won | 49.7 | 0.00 | 7 | 4 / 4 | 42 | 12.60 |
| 8 | 돌격 중심 편성 | practice | guard-first | 사용 | won | 49.7 | 0.00 | 8 | 4 / 4 | 42 | 13.10 |
| 8 | 돌격 중심 편성 | practice | striker-first | 없음 | won | 50.7 | 0.00 | 7 | 4 / 4 | 42 | 13.48 |
| 8 | 돌격 중심 편성 | practice | striker-first | 사용 | won | 44.7 | 0.00 | 9 | 4 / 4 | 35 | 10.67 |
| 8 | 돌격 중심 편성 | practice | scout-first | 없음 | won | 56.2 | 0.00 | 7 | 4 / 4 | 46 | 13.82 |
| 8 | 돌격 중심 편성 | practice | scout-first | 사용 | won | 56.2 | 0.00 | 8 | 4 / 4 | 46 | 14.12 |
| 8 | 방패 중심 편성 | practice | guard-first | 없음 | won | 55.3 | 0.00 | 9 | 4 / 4 | 44 | 14.93 |
| 8 | 방패 중심 편성 | practice | guard-first | 사용 | won | 55.3 | 0.00 | 9 | 4 / 4 | 44 | 14.53 |
| 8 | 방패 중심 편성 | practice | striker-first | 없음 | won | 53.9 | 0.00 | 9 | 4 / 4 | 44 | 14.83 |
| 8 | 방패 중심 편성 | practice | striker-first | 사용 | won | 50.5 | 0.00 | 10 | 4 / 4 | 41 | 13.33 |
| 8 | 방패 중심 편성 | practice | scout-first | 없음 | won | 58 | 0.00 | 9 | 4 / 4 | 46 | 15.17 |
| 8 | 방패 중심 편성 | practice | scout-first | 사용 | won | 56.2 | 0.00 | 10 | 4 / 4 | 45 | 14.50 |
| 8 | 정찰 중심 편성 | practice | guard-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 72 | 18.60 |
| 8 | 정찰 중심 편성 | practice | guard-first | 사용 | lost | 180 | 9.99 | 0 | 3 / 4 | 76 | 20.57 |
| 8 | 정찰 중심 편성 | practice | striker-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 72 | 18.60 |
| 8 | 정찰 중심 편성 | practice | striker-first | 사용 | lost | 180 | 9.99 | 0 | 3 / 4 | 76 | 20.57 |
| 8 | 정찰 중심 편성 | practice | scout-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 73 | 18.60 |
| 8 | 정찰 중심 편성 | practice | scout-first | 사용 | lost | 180 | 9.99 | 0 | 3 / 4 | 80 | 21.42 |
| 8 | 소규모 편성 | practice | guard-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 37 | 9.00 |
| 8 | 소규모 편성 | practice | guard-first | 사용 | lost | 180 | 9.99 | 0 | 2 / 4 | 44 | 11.02 |
| 8 | 소규모 편성 | practice | striker-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 38 | 9.00 |
| 8 | 소규모 편성 | practice | striker-first | 사용 | lost | 180 | 9.99 | 0 | 2 / 4 | 46 | 11.36 |
| 8 | 소규모 편성 | practice | scout-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 38 | 9.00 |
| 8 | 소규모 편성 | practice | scout-first | 사용 | lost | 180 | 9.99 | 0 | 2 / 4 | 45 | 11.53 |
| 8 | 균형 편성 | standard | guard-first | 없음 | won | 45.6 | 0.00 | 9 | 4 / 4 | 45 | 13.95 |
| 8 | 균형 편성 | standard | guard-first | 사용 | won | 45.6 | 0.00 | 10 | 4 / 4 | 45 | 14.16 |
| 8 | 균형 편성 | standard | striker-first | 없음 | won | 42.6 | 0.00 | 9 | 4 / 4 | 43 | 13.37 |
| 8 | 균형 편성 | standard | striker-first | 사용 | won | 42.6 | 0.00 | 10 | 4 / 4 | 43 | 13.52 |
| 8 | 균형 편성 | standard | scout-first | 없음 | won | 42.3 | 0.00 | 9 | 4 / 4 | 43 | 13.44 |
| 8 | 균형 편성 | standard | scout-first | 사용 | won | 42.3 | 0.00 | 10 | 4 / 4 | 43 | 13.69 |
| 8 | 정찰 지원 편성 | standard | guard-first | 없음 | won | 36 | 0.00 | 11 | 4 / 4 | 35 | 11.09 |
| 8 | 정찰 지원 편성 | standard | guard-first | 사용 | won | 34.1 | 0.00 | 11 | 4 / 4 | 33 | 9.47 |
| 8 | 정찰 지원 편성 | standard | striker-first | 없음 | won | 34.7 | 0.00 | 11 | 4 / 4 | 34 | 9.40 |
| 8 | 정찰 지원 편성 | standard | striker-first | 사용 | won | 36.5 | 0.00 | 11 | 4 / 4 | 35 | 10.32 |
| 8 | 정찰 지원 편성 | standard | scout-first | 없음 | won | 38.5 | 0.00 | 11 | 4 / 4 | 37 | 9.91 |
| 8 | 정찰 지원 편성 | standard | scout-first | 사용 | won | 40.3 | 0.00 | 11 | 4 / 4 | 38 | 10.83 |
| 8 | 돌격 중심 편성 | standard | guard-first | 없음 | won | 49.7 | 0.00 | 6 | 4 / 4 | 54 | 15.88 |
| 8 | 돌격 중심 편성 | standard | guard-first | 사용 | won | 49.7 | 0.00 | 7 | 4 / 4 | 55 | 17.33 |
| 8 | 돌격 중심 편성 | standard | striker-first | 없음 | won | 50.7 | 0.00 | 6 | 4 / 4 | 55 | 17.20 |
| 8 | 돌격 중심 편성 | standard | striker-first | 사용 | won | 44.7 | 0.00 | 9 | 4 / 4 | 44 | 13.11 |
| 8 | 돌격 중심 편성 | standard | scout-first | 없음 | won | 56.2 | 0.00 | 6 | 4 / 4 | 58 | 17.71 |
| 8 | 돌격 중심 편성 | standard | scout-first | 사용 | won | 56.2 | 0.00 | 7 | 4 / 4 | 59 | 18.36 |
| 8 | 방패 중심 편성 | standard | guard-first | 없음 | won | 55.3 | 0.00 | 8 | 4 / 4 | 57 | 18.03 |
| 8 | 방패 중심 편성 | standard | guard-first | 사용 | won | 55.3 | 0.00 | 9 | 4 / 4 | 57 | 18.83 |
| 8 | 방패 중심 편성 | standard | striker-first | 없음 | won | 53.9 | 0.00 | 9 | 4 / 4 | 56 | 17.98 |
| 8 | 방패 중심 편성 | standard | striker-first | 사용 | won | 53.9 | 0.00 | 9 | 4 / 4 | 56 | 18.90 |
| 8 | 방패 중심 편성 | standard | scout-first | 없음 | won | 58 | 0.00 | 8 | 4 / 4 | 59 | 18.88 |
| 8 | 방패 중심 편성 | standard | scout-first | 사용 | won | 58 | 0.00 | 9 | 4 / 4 | 59 | 19.24 |
| 8 | 정찰 중심 편성 | standard | guard-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 78 | 18.60 |
| 8 | 정찰 중심 편성 | standard | guard-first | 사용 | lost | 180 | 9.99 | 0 | 2 / 4 | 81 | 20.40 |
| 8 | 정찰 중심 편성 | standard | striker-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 78 | 18.60 |
| 8 | 정찰 중심 편성 | standard | striker-first | 사용 | lost | 180 | 9.99 | 0 | 2 / 4 | 81 | 20.40 |
| 8 | 정찰 중심 편성 | standard | scout-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 77 | 18.60 |
| 8 | 정찰 중심 편성 | standard | scout-first | 사용 | lost | 180 | 9.99 | 0 | 2 / 4 | 82 | 20.40 |
| 8 | 소규모 편성 | standard | guard-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 39 | 9.00 |
| 8 | 소규모 편성 | standard | guard-first | 사용 | lost | 180 | 9.99 | 0 | 3 / 4 | 48 | 11.19 |
| 8 | 소규모 편성 | standard | striker-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 39 | 9.00 |
| 8 | 소규모 편성 | standard | striker-first | 사용 | lost | 180 | 9.99 | 0 | 2 / 4 | 47 | 11.53 |
| 8 | 소규모 편성 | standard | scout-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 39 | 9.00 |
| 8 | 소규모 편성 | standard | scout-first | 사용 | lost | 180 | 9.99 | 0 | 3 / 4 | 49 | 11.70 |
| 8 | 균형 편성 | challenge | guard-first | 없음 | won | 51.6 | 0.00 | 7 | 4 / 4 | 64 | 19.04 |
| 8 | 균형 편성 | challenge | guard-first | 사용 | won | 51.6 | 0.00 | 9 | 4 / 4 | 64 | 20.15 |
| 8 | 균형 편성 | challenge | striker-first | 없음 | won | 48.6 | 0.00 | 8 | 4 / 4 | 61 | 18.92 |
| 8 | 균형 편성 | challenge | striker-first | 사용 | won | 42.6 | 0.00 | 9 | 4 / 4 | 54 | 16.50 |
| 8 | 균형 편성 | challenge | scout-first | 없음 | won | 48.3 | 0.00 | 8 | 4 / 4 | 61 | 19.43 |
| 8 | 균형 편성 | challenge | scout-first | 사용 | won | 42.3 | 0.00 | 9 | 4 / 4 | 54 | 16.63 |
| 8 | 정찰 지원 편성 | challenge | guard-first | 없음 | won | 40.8 | 0.00 | 8 | 4 / 4 | 50 | 15.60 |
| 8 | 정찰 지원 편성 | challenge | guard-first | 사용 | won | 36 | 0.00 | 11 | 4 / 4 | 45 | 13.77 |
| 8 | 정찰 지원 편성 | challenge | striker-first | 없음 | won | 39 | 0.00 | 9 | 4 / 4 | 48 | 14.52 |
| 8 | 정찰 지원 편성 | challenge | striker-first | 사용 | won | 34.7 | 0.00 | 11 | 4 / 4 | 42 | 12.25 |
| 8 | 정찰 지원 편성 | challenge | scout-first | 없음 | won | 42.8 | 0.00 | 9 | 4 / 4 | 51 | 15.37 |
| 8 | 정찰 지원 편성 | challenge | scout-first | 사용 | won | 38.5 | 0.00 | 11 | 4 / 4 | 45 | 12.94 |
| 8 | 돌격 중심 편성 | challenge | guard-first | 없음 | won | 55.7 | 0.00 | 4 | 4 / 4 | 68 | 20.68 |
| 8 | 돌격 중심 편성 | challenge | guard-first | 사용 | won | 49.7 | 0.00 | 5 | 4 / 4 | 66 | 19.42 |
| 8 | 돌격 중심 편성 | challenge | striker-first | 없음 | won | 50.7 | 0.00 | 4 | 4 / 4 | 66 | 19.80 |
| 8 | 돌격 중심 편성 | challenge | striker-first | 사용 | won | 50.7 | 0.00 | 5 | 4 / 4 | 68 | 20.96 |
| 8 | 돌격 중심 편성 | challenge | scout-first | 없음 | lost | 180 | 0.43 | 0 | 4 / 4 | 87 | 27.00 |
| 8 | 돌격 중심 편성 | challenge | scout-first | 사용 | won | 56.2 | 0.00 | 5 | 4 / 4 | 72 | 20.74 |
| 8 | 방패 중심 편성 | challenge | guard-first | 없음 | won | 55.9 | 0.00 | 8 | 4 / 4 | 71 | 23.26 |
| 8 | 방패 중심 편성 | challenge | guard-first | 사용 | won | 55.3 | 0.00 | 8 | 4 / 4 | 71 | 22.42 |
| 8 | 방패 중심 편성 | challenge | striker-first | 없음 | lost | 84.9 | 3.09 | 0 | 4 / 4 | 110 | 39.60 |
| 8 | 방패 중심 편성 | challenge | striker-first | 사용 | won | 53.9 | 0.00 | 8 | 4 / 4 | 70 | 22.22 |
| 8 | 방패 중심 편성 | challenge | scout-first | 없음 | won | 58.6 | 0.00 | 8 | 4 / 4 | 74 | 24.28 |
| 8 | 방패 중심 편성 | challenge | scout-first | 사용 | won | 58 | 0.00 | 8 | 4 / 4 | 74 | 23.44 |
| 8 | 정찰 중심 편성 | challenge | guard-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 84 | 18.60 |
| 8 | 정찰 중심 편성 | challenge | guard-first | 사용 | lost | 180 | 9.99 | 0 | 2 / 4 | 85 | 20.57 |
| 8 | 정찰 중심 편성 | challenge | striker-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 84 | 18.60 |
| 8 | 정찰 중심 편성 | challenge | striker-first | 사용 | lost | 180 | 9.99 | 0 | 2 / 4 | 85 | 20.57 |
| 8 | 정찰 중심 편성 | challenge | scout-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 83 | 18.60 |
| 8 | 정찰 중심 편성 | challenge | scout-first | 사용 | lost | 180 | 9.99 | 0 | 2 / 4 | 87 | 20.96 |
| 8 | 소규모 편성 | challenge | guard-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 43 | 9.00 |
| 8 | 소규모 편성 | challenge | guard-first | 사용 | lost | 180 | 9.99 | 0 | 2 / 4 | 49 | 11.02 |
| 8 | 소규모 편성 | challenge | striker-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 43 | 9.00 |
| 8 | 소규모 편성 | challenge | striker-first | 사용 | lost | 180 | 9.99 | 0 | 2 / 4 | 53 | 11.70 |
| 8 | 소규모 편성 | challenge | scout-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 43 | 9.00 |
| 8 | 소규모 편성 | challenge | scout-first | 사용 | lost | 180 | 9.99 | 0 | 2 / 4 | 52 | 11.87 |
| 9 | 균형 편성 | practice | guard-first | 없음 | won | 42.1 | 0.00 | 10 | 4 / 4 | 33 | 10.54 |
| 9 | 균형 편성 | practice | guard-first | 사용 | won | 42.1 | 0.00 | 10 | 4 / 4 | 33 | 10.60 |
| 9 | 균형 편성 | practice | striker-first | 없음 | won | 40.7 | 0.00 | 9 | 4 / 4 | 32 | 10.10 |
| 9 | 균형 편성 | practice | striker-first | 사용 | won | 40.7 | 0.00 | 10 | 4 / 4 | 32 | 10.22 |
| 9 | 균형 편성 | practice | scout-first | 없음 | won | 43.1 | 0.00 | 10 | 4 / 4 | 33 | 10.57 |
| 9 | 균형 편성 | practice | scout-first | 사용 | won | 43.1 | 0.00 | 10 | 4 / 4 | 33 | 10.58 |
| 9 | 정찰 지원 편성 | practice | guard-first | 없음 | won | 37.3 | 0.00 | 11 | 4 / 4 | 29 | 9.26 |
| 9 | 정찰 지원 편성 | practice | guard-first | 사용 | won | 36.8 | 0.00 | 11 | 4 / 4 | 28 | 9.27 |
| 9 | 정찰 지원 편성 | practice | striker-first | 없음 | won | 33.8 | 0.00 | 11 | 4 / 4 | 26 | 8.93 |
| 9 | 정찰 지원 편성 | practice | striker-first | 사용 | won | 35.6 | 0.00 | 11 | 4 / 4 | 27 | 9.34 |
| 9 | 정찰 지원 편성 | practice | scout-first | 없음 | won | 39.4 | 0.00 | 11 | 4 / 4 | 29 | 9.47 |
| 9 | 정찰 지원 편성 | practice | scout-first | 사용 | won | 39.4 | 0.00 | 11 | 4 / 4 | 29 | 9.43 |
| 9 | 돌격 중심 편성 | practice | guard-first | 없음 | won | 65.6 | 0.00 | 4 | 4 / 4 | 59 | 19.80 |
| 9 | 돌격 중심 편성 | practice | guard-first | 사용 | won | 59.6 | 0.00 | 7 | 4 / 4 | 51 | 16.93 |
| 9 | 돌격 중심 편성 | practice | striker-first | 없음 | won | 61.1 | 0.00 | 4 | 4 / 4 | 57 | 20.26 |
| 9 | 돌격 중심 편성 | practice | striker-first | 사용 | won | 49.1 | 0.00 | 8 | 4 / 4 | 42 | 13.78 |
| 9 | 돌격 중심 편성 | practice | scout-first | 없음 | won | 65.8 | 0.00 | 5 | 4 / 4 | 60 | 20.06 |
| 9 | 돌격 중심 편성 | practice | scout-first | 사용 | won | 53.8 | 0.00 | 8 | 4 / 4 | 45 | 13.77 |
| 9 | 방패 중심 편성 | practice | guard-first | 없음 | won | 56.5 | 0.00 | 9 | 4 / 4 | 46 | 16.04 |
| 9 | 방패 중심 편성 | practice | guard-first | 사용 | won | 56.5 | 0.00 | 9 | 4 / 4 | 46 | 16.46 |
| 9 | 방패 중심 편성 | practice | striker-first | 없음 | won | 55.1 | 0.00 | 9 | 4 / 4 | 45 | 16.12 |
| 9 | 방패 중심 편성 | practice | striker-first | 사용 | won | 55.1 | 0.00 | 9 | 4 / 4 | 45 | 16.08 |
| 9 | 방패 중심 편성 | practice | scout-first | 없음 | won | 56.2 | 0.00 | 9 | 4 / 4 | 46 | 16.30 |
| 9 | 방패 중심 편성 | practice | scout-first | 사용 | won | 56.2 | 0.00 | 9 | 4 / 4 | 46 | 16.26 |
| 9 | 정찰 중심 편성 | practice | guard-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 72 | 18.60 |
| 9 | 정찰 중심 편성 | practice | guard-first | 사용 | lost | 180 | 9.99 | 0 | 3 / 4 | 78 | 20.58 |
| 9 | 정찰 중심 편성 | practice | striker-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 72 | 18.60 |
| 9 | 정찰 중심 편성 | practice | striker-first | 사용 | lost | 180 | 9.99 | 0 | 3 / 4 | 78 | 20.58 |
| 9 | 정찰 중심 편성 | practice | scout-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 73 | 18.60 |
| 9 | 정찰 중심 편성 | practice | scout-first | 사용 | lost | 180 | 9.99 | 0 | 3 / 4 | 82 | 21.48 |
| 9 | 소규모 편성 | practice | guard-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 38 | 9.00 |
| 9 | 소규모 편성 | practice | guard-first | 사용 | lost | 180 | 9.99 | 0 | 2 / 4 | 44 | 11.03 |
| 9 | 소규모 편성 | practice | striker-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 38 | 9.00 |
| 9 | 소규모 편성 | practice | striker-first | 사용 | lost | 180 | 9.99 | 0 | 2 / 4 | 44 | 11.57 |
| 9 | 소규모 편성 | practice | scout-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 37 | 9.00 |
| 9 | 소규모 편성 | practice | scout-first | 사용 | lost | 180 | 9.99 | 0 | 2 / 4 | 43 | 11.57 |
| 9 | 균형 편성 | standard | guard-first | 없음 | won | 42.1 | 0.00 | 9 | 4 / 4 | 41 | 13.64 |
| 9 | 균형 편성 | standard | guard-first | 사용 | won | 42.1 | 0.00 | 10 | 4 / 4 | 41 | 14.08 |
| 9 | 균형 편성 | standard | striker-first | 없음 | won | 50.9 | 0.00 | 8 | 4 / 4 | 54 | 18.72 |
| 9 | 균형 편성 | standard | striker-first | 사용 | won | 40.7 | 0.00 | 10 | 4 / 4 | 41 | 13.38 |
| 9 | 균형 편성 | standard | scout-first | 없음 | won | 43.1 | 0.00 | 8 | 4 / 4 | 42 | 13.74 |
| 9 | 균형 편성 | standard | scout-first | 사용 | won | 43.1 | 0.00 | 10 | 4 / 4 | 42 | 13.59 |
| 9 | 정찰 지원 편성 | standard | guard-first | 없음 | won | 37.3 | 0.00 | 11 | 4 / 4 | 39 | 12.28 |
| 9 | 정찰 지원 편성 | standard | guard-first | 사용 | won | 36.8 | 0.00 | 11 | 4 / 4 | 37 | 12.34 |
| 9 | 정찰 지원 편성 | standard | striker-first | 없음 | won | 33.8 | 0.00 | 10 | 4 / 4 | 35 | 11.48 |
| 9 | 정찰 지원 편성 | standard | striker-first | 사용 | won | 33.8 | 0.00 | 11 | 4 / 4 | 35 | 12.00 |
| 9 | 정찰 지원 편성 | standard | scout-first | 없음 | won | 39.4 | 0.00 | 10 | 4 / 4 | 38 | 12.61 |
| 9 | 정찰 지원 편성 | standard | scout-first | 사용 | won | 39.4 | 0.00 | 11 | 4 / 4 | 38 | 12.67 |
| 9 | 돌격 중심 편성 | standard | guard-first | 없음 | lost | 180 | 9.02 | 0 | 4 / 4 | 79 | 27.00 |
| 9 | 돌격 중심 편성 | standard | guard-first | 사용 | lost | 180 | 6.62 | 0 | 4 / 4 | 84 | 29.03 |
| 9 | 돌격 중심 편성 | standard | striker-first | 없음 | lost | 180 | 7.44 | 0 | 4 / 4 | 79 | 27.00 |
| 9 | 돌격 중심 편성 | standard | striker-first | 사용 | won | 55.1 | 0.00 | 5 | 4 / 4 | 65 | 22.70 |
| 9 | 돌격 중심 편성 | standard | scout-first | 없음 | lost | 180 | 7.48 | 0 | 4 / 4 | 82 | 27.00 |
| 9 | 돌격 중심 편성 | standard | scout-first | 사용 | won | 59.8 | 0.00 | 5 | 4 / 4 | 69 | 23.34 |
| 9 | 방패 중심 편성 | standard | guard-first | 없음 | won | 57.3 | 0.00 | 8 | 4 / 4 | 62 | 21.80 |
| 9 | 방패 중심 편성 | standard | guard-first | 사용 | won | 56.5 | 0.00 | 8 | 4 / 4 | 61 | 21.76 |
| 9 | 방패 중심 편성 | standard | striker-first | 없음 | won | 90.5 | 0.00 | 2 | 4 / 4 | 98 | 37.20 |
| 9 | 방패 중심 편성 | standard | striker-first | 사용 | won | 55.1 | 0.00 | 8 | 4 / 4 | 60 | 21.38 |
| 9 | 방패 중심 편성 | standard | scout-first | 없음 | won | 56.2 | 0.00 | 8 | 4 / 4 | 61 | 21.32 |
| 9 | 방패 중심 편성 | standard | scout-first | 사용 | won | 56.2 | 0.00 | 8 | 4 / 4 | 61 | 21.28 |
| 9 | 정찰 중심 편성 | standard | guard-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 78 | 18.60 |
| 9 | 정찰 중심 편성 | standard | guard-first | 사용 | lost | 180 | 9.99 | 0 | 2 / 4 | 80 | 20.40 |
| 9 | 정찰 중심 편성 | standard | striker-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 78 | 18.60 |
| 9 | 정찰 중심 편성 | standard | striker-first | 사용 | lost | 180 | 9.99 | 0 | 2 / 4 | 80 | 20.40 |
| 9 | 정찰 중심 편성 | standard | scout-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 77 | 18.60 |
| 9 | 정찰 중심 편성 | standard | scout-first | 사용 | lost | 180 | 9.99 | 0 | 2 / 4 | 82 | 20.58 |
| 9 | 소규모 편성 | standard | guard-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 40 | 9.00 |
| 9 | 소규모 편성 | standard | guard-first | 사용 | lost | 180 | 9.99 | 0 | 2 / 4 | 47 | 10.80 |
| 9 | 소규모 편성 | standard | striker-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 40 | 9.00 |
| 9 | 소규모 편성 | standard | striker-first | 사용 | lost | 180 | 9.99 | 0 | 2 / 4 | 47 | 11.57 |
| 9 | 소규모 편성 | standard | scout-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 40 | 9.00 |
| 9 | 소규모 편성 | standard | scout-first | 사용 | lost | 180 | 9.99 | 0 | 2 / 4 | 48 | 11.75 |
| 9 | 균형 편성 | challenge | guard-first | 없음 | won | 48.3 | 0.00 | 7 | 4 / 4 | 58 | 19.52 |
| 9 | 균형 편성 | challenge | guard-first | 사용 | won | 42.1 | 0.00 | 8 | 4 / 4 | 52 | 16.61 |
| 9 | 균형 편성 | challenge | striker-first | 없음 | won | 50.9 | 0.00 | 6 | 4 / 4 | 66 | 22.84 |
| 9 | 균형 편성 | challenge | striker-first | 사용 | won | 40.7 | 0.00 | 8 | 4 / 4 | 51 | 16.06 |
| 9 | 균형 편성 | challenge | scout-first | 없음 | won | 53.3 | 0.00 | 6 | 4 / 4 | 69 | 23.10 |
| 9 | 균형 편성 | challenge | scout-first | 사용 | won | 43.1 | 0.00 | 8 | 4 / 4 | 54 | 16.43 |
| 9 | 정찰 지원 편성 | challenge | guard-first | 없음 | won | 37.4 | 0.00 | 9 | 4 / 4 | 43 | 14.12 |
| 9 | 정찰 지원 편성 | challenge | guard-first | 사용 | won | 39.7 | 0.00 | 9 | 4 / 4 | 49 | 16.15 |
| 9 | 정찰 지원 편성 | challenge | striker-first | 없음 | won | 39.1 | 0.00 | 8 | 4 / 4 | 52 | 16.06 |
| 9 | 정찰 지원 편성 | challenge | striker-first | 사용 | won | 33.8 | 0.00 | 11 | 4 / 4 | 43 | 14.56 |
| 9 | 정찰 지원 편성 | challenge | scout-first | 없음 | won | 42.3 | 0.00 | 9 | 4 / 4 | 52 | 15.48 |
| 9 | 정찰 지원 편성 | challenge | scout-first | 사용 | won | 39.4 | 0.00 | 11 | 4 / 4 | 48 | 15.64 |
| 9 | 돌격 중심 편성 | challenge | guard-first | 없음 | lost | 180 | 9.99 | 0 | 3 / 4 | 88 | 27.00 |
| 9 | 돌격 중심 편성 | challenge | guard-first | 사용 | lost | 180 | 9.99 | 0 | 4 / 4 | 90 | 29.03 |
| 9 | 돌격 중심 편성 | challenge | striker-first | 없음 | lost | 180 | 9.99 | 0 | 3 / 4 | 82 | 27.00 |
| 9 | 돌격 중심 편성 | challenge | striker-first | 사용 | lost | 180 | 9.93 | 0 | 4 / 4 | 88 | 29.63 |
| 9 | 돌격 중심 편성 | challenge | scout-first | 없음 | lost | 180 | 9.99 | 0 | 3 / 4 | 86 | 27.00 |
| 9 | 돌격 중심 편성 | challenge | scout-first | 사용 | lost | 180 | 9.93 | 0 | 4 / 4 | 93 | 30.23 |
| 9 | 방패 중심 편성 | challenge | guard-first | 없음 | lost | 85.5 | 0.85 | 0 | 4 / 4 | 108 | 39.60 |
| 9 | 방패 중심 편성 | challenge | guard-first | 사용 | won | 75.7 | 0.00 | 5 | 4 / 4 | 96 | 35.11 |
| 9 | 방패 중심 편성 | challenge | striker-first | 없음 | lost | 78.7 | 6.35 | 0 | 4 / 4 | 109 | 39.60 |
| 9 | 방패 중심 편성 | challenge | striker-first | 사용 | won | 74.3 | 0.00 | 5 | 4 / 4 | 95 | 35.83 |
| 9 | 방패 중심 편성 | challenge | scout-first | 없음 | lost | 77.2 | 8.09 | 0 | 4 / 4 | 112 | 39.60 |
| 9 | 방패 중심 편성 | challenge | scout-first | 사용 | won | 72.4 | 0.00 | 5 | 4 / 4 | 93 | 34.01 |
| 9 | 정찰 중심 편성 | challenge | guard-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 85 | 18.60 |
| 9 | 정찰 중심 편성 | challenge | guard-first | 사용 | lost | 180 | 9.99 | 0 | 2 / 4 | 87 | 20.58 |
| 9 | 정찰 중심 편성 | challenge | striker-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 85 | 18.60 |
| 9 | 정찰 중심 편성 | challenge | striker-first | 사용 | lost | 180 | 9.99 | 0 | 2 / 4 | 87 | 20.58 |
| 9 | 정찰 중심 편성 | challenge | scout-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 87 | 18.60 |
| 9 | 정찰 중심 편성 | challenge | scout-first | 사용 | lost | 180 | 9.99 | 0 | 2 / 4 | 89 | 20.94 |
| 9 | 소규모 편성 | challenge | guard-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 41 | 9.00 |
| 9 | 소규모 편성 | challenge | guard-first | 사용 | lost | 180 | 9.99 | 0 | 2 / 4 | 50 | 10.80 |
| 9 | 소규모 편성 | challenge | striker-first | 없음 | lost | 180 | 9.99 | 0 | 1 / 4 | 45 | 9.00 |
| 9 | 소규모 편성 | challenge | striker-first | 사용 | lost | 180 | 9.99 | 0 | 2 / 4 | 52 | 11.52 |
| 9 | 소규모 편성 | challenge | scout-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 44 | 9.00 |
| 9 | 소규모 편성 | challenge | scout-first | 사용 | lost | 180 | 9.99 | 0 | 2 / 4 | 52 | 11.93 |
| 10 | 균형 편성 | practice | guard-first | 없음 | lost | 109.2 | 9.99 | 0 | 4 / 4 | 50 | 33.00 |
| 10 | 균형 편성 | practice | guard-first | 사용 | lost | 109.2 | 9.99 | 0 | 4 / 4 | 50 | 34.80 |
| 10 | 균형 편성 | practice | striker-first | 없음 | lost | 106.2 | 9.99 | 0 | 4 / 4 | 49 | 33.00 |
| 10 | 균형 편성 | practice | striker-first | 사용 | lost | 110.7 | 9.99 | 0 | 4 / 4 | 50 | 36.13 |
| 10 | 균형 편성 | practice | scout-first | 없음 | lost | 106.5 | 9.99 | 0 | 4 / 4 | 49 | 33.00 |
| 10 | 균형 편성 | practice | scout-first | 사용 | lost | 111 | 9.99 | 0 | 4 / 4 | 50 | 36.13 |
| 10 | 정찰 지원 편성 | practice | guard-first | 없음 | lost | 180 | 9.99 | 0 | 4 / 4 | 41 | 28.80 |
| 10 | 정찰 지원 편성 | practice | guard-first | 사용 | lost | 180 | 9.99 | 0 | 4 / 4 | 42 | 30.60 |
| 10 | 정찰 지원 편성 | practice | striker-first | 없음 | lost | 180 | 9.99 | 0 | 4 / 4 | 41 | 28.80 |
| 10 | 정찰 지원 편성 | practice | striker-first | 사용 | lost | 180 | 0.04 | 0 | 4 / 4 | 47 | 31.74 |
| 10 | 정찰 지원 편성 | practice | scout-first | 없음 | lost | 180 | 9.99 | 0 | 4 / 4 | 43 | 28.80 |
| 10 | 정찰 지원 편성 | practice | scout-first | 사용 | lost | 180 | 9.99 | 0 | 4 / 4 | 43 | 32.12 |
| 10 | 돌격 중심 편성 | practice | guard-first | 없음 | lost | 180 | 9.99 | 0 | 4 / 4 | 55 | 27.00 |
| 10 | 돌격 중심 편성 | practice | guard-first | 사용 | lost | 180 | 9.99 | 0 | 4 / 4 | 51 | 28.80 |
| 10 | 돌격 중심 편성 | practice | striker-first | 없음 | lost | 180 | 9.99 | 0 | 4 / 4 | 57 | 27.00 |
| 10 | 돌격 중심 편성 | practice | striker-first | 사용 | lost | 180 | 9.99 | 0 | 4 / 4 | 54 | 29.75 |
| 10 | 돌격 중심 편성 | practice | scout-first | 없음 | lost | 180 | 9.99 | 0 | 4 / 4 | 56 | 27.00 |
| 10 | 돌격 중심 편성 | practice | scout-first | 사용 | lost | 180 | 9.99 | 0 | 4 / 4 | 54 | 29.94 |
| 10 | 방패 중심 편성 | practice | guard-first | 없음 | lost | 167.9 | 9.99 | 0 | 4 / 4 | 73 | 39.60 |
| 10 | 방패 중심 편성 | practice | guard-first | 사용 | lost | 176.3 | 9.99 | 0 | 4 / 4 | 74 | 41.40 |
| 10 | 방패 중심 편성 | practice | striker-first | 없음 | lost | 179.4 | 9.99 | 0 | 4 / 4 | 74 | 39.60 |
| 10 | 방패 중심 편성 | practice | striker-first | 사용 | lost | 175 | 9.99 | 0 | 4 / 4 | 74 | 41.97 |
| 10 | 방패 중심 편성 | practice | scout-first | 없음 | lost | 180 | 9.99 | 1 | 4 / 4 | 75 | 39.52 |
| 10 | 방패 중심 편성 | practice | scout-first | 사용 | lost | 178.1 | 9.99 | 0 | 4 / 4 | 75 | 42.16 |
| 10 | 정찰 중심 편성 | practice | guard-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 73 | 18.60 |
| 10 | 정찰 중심 편성 | practice | guard-first | 사용 | lost | 180 | 9.99 | 0 | 2 / 4 | 78 | 20.59 |
| 10 | 정찰 중심 편성 | practice | striker-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 73 | 18.60 |
| 10 | 정찰 중심 편성 | practice | striker-first | 사용 | lost | 180 | 9.99 | 0 | 2 / 4 | 78 | 20.59 |
| 10 | 정찰 중심 편성 | practice | scout-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 73 | 18.60 |
| 10 | 정찰 중심 편성 | practice | scout-first | 사용 | lost | 180 | 9.99 | 0 | 2 / 4 | 80 | 21.54 |
| 10 | 소규모 편성 | practice | guard-first | 없음 | lost | 180 | 9.99 | 0 | 1 / 4 | 39 | 9.00 |
| 10 | 소규모 편성 | practice | guard-first | 사용 | lost | 180 | 9.99 | 0 | 2 / 4 | 42 | 10.80 |
| 10 | 소규모 편성 | practice | striker-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 36 | 9.00 |
| 10 | 소규모 편성 | practice | striker-first | 사용 | lost | 180 | 9.99 | 0 | 2 / 4 | 42 | 11.37 |
| 10 | 소규모 편성 | practice | scout-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 35 | 9.00 |
| 10 | 소규모 편성 | practice | scout-first | 사용 | lost | 180 | 9.99 | 0 | 2 / 4 | 41 | 11.37 |
| 10 | 균형 편성 | standard | guard-first | 없음 | lost | 104.8 | 9.99 | 0 | 4 / 4 | 60 | 33.00 |
| 10 | 균형 편성 | standard | guard-first | 사용 | lost | 105.8 | 9.99 | 0 | 4 / 4 | 61 | 35.04 |
| 10 | 균형 편성 | standard | striker-first | 없음 | lost | 101.8 | 9.99 | 0 | 4 / 4 | 58 | 33.00 |
| 10 | 균형 편성 | standard | striker-first | 사용 | lost | 106.2 | 9.99 | 0 | 4 / 4 | 59 | 36.56 |
| 10 | 균형 편성 | standard | scout-first | 없음 | lost | 103.4 | 9.99 | 0 | 4 / 4 | 59 | 33.00 |
| 10 | 균형 편성 | standard | scout-first | 사용 | lost | 106.5 | 9.99 | 0 | 4 / 4 | 59 | 36.63 |
| 10 | 정찰 지원 편성 | standard | guard-first | 없음 | lost | 180 | 9.99 | 0 | 4 / 4 | 50 | 28.80 |
| 10 | 정찰 지원 편성 | standard | guard-first | 사용 | lost | 180 | 9.99 | 0 | 4 / 4 | 50 | 30.84 |
| 10 | 정찰 지원 편성 | standard | striker-first | 없음 | lost | 180 | 9.99 | 0 | 4 / 4 | 48 | 28.80 |
| 10 | 정찰 지원 편성 | standard | striker-first | 사용 | lost | 180 | 9.99 | 0 | 4 / 4 | 49 | 32.17 |
| 10 | 정찰 지원 편성 | standard | scout-first | 없음 | lost | 180 | 9.99 | 0 | 4 / 4 | 51 | 28.80 |
| 10 | 정찰 지원 편성 | standard | scout-first | 사용 | lost | 180 | 9.99 | 0 | 4 / 4 | 52 | 32.57 |
| 10 | 돌격 중심 편성 | standard | guard-first | 없음 | lost | 180 | 9.99 | 0 | 4 / 4 | 63 | 27.00 |
| 10 | 돌격 중심 편성 | standard | guard-first | 사용 | lost | 180 | 9.99 | 0 | 4 / 4 | 61 | 29.04 |
| 10 | 돌격 중심 편성 | standard | striker-first | 없음 | lost | 180 | 9.99 | 0 | 4 / 4 | 68 | 27.00 |
| 10 | 돌격 중심 편성 | standard | striker-first | 사용 | lost | 180 | 9.99 | 0 | 4 / 4 | 67 | 30.34 |
| 10 | 돌격 중심 편성 | standard | scout-first | 없음 | lost | 180 | 9.99 | 0 | 4 / 4 | 67 | 27.00 |
| 10 | 돌격 중심 편성 | standard | scout-first | 사용 | lost | 180 | 9.99 | 0 | 4 / 4 | 66 | 30.34 |
| 10 | 방패 중심 편성 | standard | guard-first | 없음 | lost | 162 | 9.99 | 0 | 4 / 4 | 86 | 39.60 |
| 10 | 방패 중심 편성 | standard | guard-first | 사용 | lost | 170.3 | 9.99 | 0 | 4 / 4 | 85 | 41.64 |
| 10 | 방패 중심 편성 | standard | striker-first | 없음 | lost | 162 | 9.99 | 0 | 4 / 4 | 84 | 39.60 |
| 10 | 방패 중심 편성 | standard | striker-first | 사용 | lost | 170.6 | 9.99 | 0 | 4 / 4 | 86 | 42.21 |
| 10 | 방패 중심 편성 | standard | scout-first | 없음 | lost | 165.1 | 9.99 | 0 | 4 / 4 | 86 | 39.60 |
| 10 | 방패 중심 편성 | standard | scout-first | 사용 | lost | 173.7 | 9.99 | 0 | 4 / 4 | 88 | 42.59 |
| 10 | 정찰 중심 편성 | standard | guard-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 79 | 18.60 |
| 10 | 정찰 중심 편성 | standard | guard-first | 사용 | lost | 180 | 9.99 | 0 | 2 / 4 | 83 | 20.40 |
| 10 | 정찰 중심 편성 | standard | striker-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 79 | 18.60 |
| 10 | 정찰 중심 편성 | standard | striker-first | 사용 | lost | 180 | 9.99 | 0 | 2 / 4 | 83 | 20.40 |
| 10 | 정찰 중심 편성 | standard | scout-first | 없음 | lost | 180 | 9.99 | 0 | 1 / 4 | 81 | 18.60 |
| 10 | 정찰 중심 편성 | standard | scout-first | 사용 | lost | 180 | 9.99 | 0 | 2 / 4 | 85 | 20.83 |
| 10 | 소규모 편성 | standard | guard-first | 없음 | lost | 180 | 9.99 | 0 | 1 / 4 | 40 | 9.00 |
| 10 | 소규모 편성 | standard | guard-first | 사용 | lost | 180 | 9.99 | 0 | 1 / 4 | 46 | 10.80 |
| 10 | 소규모 편성 | standard | striker-first | 없음 | lost | 180 | 9.99 | 0 | 1 / 4 | 38 | 9.00 |
| 10 | 소규모 편성 | standard | striker-first | 사용 | lost | 180 | 9.99 | 0 | 2 / 4 | 44 | 11.61 |
| 10 | 소규모 편성 | standard | scout-first | 없음 | lost | 180 | 9.99 | 0 | 1 / 4 | 39 | 9.00 |
| 10 | 소규모 편성 | standard | scout-first | 사용 | lost | 180 | 9.99 | 0 | 2 / 4 | 43 | 11.80 |
| 10 | 균형 편성 | challenge | guard-first | 없음 | lost | 97.3 | 9.99 | 0 | 4 / 4 | 71 | 33.00 |
| 10 | 균형 편성 | challenge | guard-first | 사용 | lost | 101.2 | 9.99 | 0 | 4 / 4 | 71 | 35.04 |
| 10 | 균형 편성 | challenge | striker-first | 없음 | lost | 98.2 | 9.99 | 0 | 4 / 4 | 68 | 33.00 |
| 10 | 균형 편성 | challenge | striker-first | 사용 | lost | 101.1 | 9.99 | 0 | 4 / 4 | 70 | 36.37 |
| 10 | 균형 편성 | challenge | scout-first | 없음 | lost | 98.5 | 9.99 | 0 | 4 / 4 | 68 | 33.00 |
| 10 | 균형 편성 | challenge | scout-first | 사용 | lost | 101.4 | 9.99 | 0 | 4 / 4 | 70 | 36.77 |
| 10 | 정찰 지원 편성 | challenge | guard-first | 없음 | lost | 180 | 9.99 | 0 | 4 / 4 | 61 | 28.80 |
| 10 | 정찰 지원 편성 | challenge | guard-first | 사용 | lost | 180 | 9.99 | 0 | 4 / 4 | 58 | 30.84 |
| 10 | 정찰 지원 편성 | challenge | striker-first | 없음 | lost | 180 | 9.99 | 0 | 4 / 4 | 57 | 28.80 |
| 10 | 정찰 지원 편성 | challenge | striker-first | 사용 | lost | 180 | 9.99 | 0 | 4 / 4 | 57 | 32.17 |
| 10 | 정찰 지원 편성 | challenge | scout-first | 없음 | lost | 180 | 9.99 | 0 | 4 / 4 | 60 | 28.80 |
| 10 | 정찰 지원 편성 | challenge | scout-first | 사용 | lost | 180 | 9.99 | 0 | 4 / 4 | 60 | 32.14 |
| 10 | 돌격 중심 편성 | challenge | guard-first | 없음 | lost | 180 | 9.99 | 0 | 4 / 4 | 74 | 27.00 |
| 10 | 돌격 중심 편성 | challenge | guard-first | 사용 | lost | 180 | 9.99 | 0 | 4 / 4 | 75 | 29.04 |
| 10 | 돌격 중심 편성 | challenge | striker-first | 없음 | lost | 180 | 9.99 | 0 | 4 / 4 | 80 | 27.00 |
| 10 | 돌격 중심 편성 | challenge | striker-first | 사용 | lost | 180 | 9.99 | 0 | 4 / 4 | 83 | 30.34 |
| 10 | 돌격 중심 편성 | challenge | scout-first | 없음 | lost | 180 | 9.99 | 0 | 4 / 4 | 79 | 27.00 |
| 10 | 돌격 중심 편성 | challenge | scout-first | 사용 | lost | 180 | 9.99 | 0 | 4 / 4 | 82 | 30.34 |
| 10 | 방패 중심 편성 | challenge | guard-first | 없음 | lost | 140.4 | 9.99 | 0 | 4 / 4 | 97 | 39.60 |
| 10 | 방패 중심 편성 | challenge | guard-first | 사용 | lost | 150.6 | 9.99 | 0 | 4 / 4 | 100 | 41.64 |
| 10 | 방패 중심 편성 | challenge | striker-first | 없음 | lost | 140.3 | 9.99 | 0 | 4 / 4 | 100 | 39.60 |
| 10 | 방패 중심 편성 | challenge | striker-first | 사용 | lost | 149.3 | 9.99 | 0 | 4 / 4 | 99 | 42.40 |
| 10 | 방패 중심 편성 | challenge | scout-first | 없음 | lost | 143.5 | 9.99 | 0 | 4 / 4 | 100 | 39.60 |
| 10 | 방패 중심 편성 | challenge | scout-first | 사용 | lost | 152.4 | 9.99 | 0 | 4 / 4 | 102 | 42.94 |
| 10 | 정찰 중심 편성 | challenge | guard-first | 없음 | lost | 180 | 9.99 | 0 | 1 / 4 | 84 | 18.60 |
| 10 | 정찰 중심 편성 | challenge | guard-first | 사용 | lost | 180 | 9.99 | 0 | 1 / 4 | 90 | 20.59 |
| 10 | 정찰 중심 편성 | challenge | striker-first | 없음 | lost | 180 | 9.99 | 0 | 1 / 4 | 84 | 18.60 |
| 10 | 정찰 중심 편성 | challenge | striker-first | 사용 | lost | 180 | 9.99 | 0 | 1 / 4 | 90 | 20.59 |
| 10 | 정찰 중심 편성 | challenge | scout-first | 없음 | lost | 180 | 9.99 | 0 | 1 / 4 | 84 | 18.60 |
| 10 | 정찰 중심 편성 | challenge | scout-first | 사용 | lost | 180 | 9.99 | 0 | 1 / 4 | 92 | 20.97 |
| 10 | 소규모 편성 | challenge | guard-first | 없음 | lost | 180 | 9.99 | 0 | 1 / 4 | 43 | 9.00 |
| 10 | 소규모 편성 | challenge | guard-first | 사용 | lost | 180 | 9.99 | 0 | 2 / 4 | 48 | 10.80 |
| 10 | 소규모 편성 | challenge | striker-first | 없음 | lost | 180 | 9.99 | 0 | 1 / 4 | 40 | 9.00 |
| 10 | 소규모 편성 | challenge | striker-first | 사용 | lost | 180 | 9.99 | 0 | 1 / 4 | 50 | 11.80 |
| 10 | 소규모 편성 | challenge | scout-first | 없음 | lost | 180 | 9.99 | 0 | 1 / 4 | 39 | 9.00 |
| 10 | 소규모 편성 | challenge | scout-first | 사용 | lost | 180 | 9.99 | 0 | 1 / 4 | 49 | 11.99 |

</details>

재현: `npx tsx tools/simulate-secret-siege.ts`
