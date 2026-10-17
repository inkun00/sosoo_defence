# 비밀 원정 10단계 역공격 밸런스 검증

총 1,674회 = 기본 1080회 + 보스 회복 타이밍 486회 + 최종 갱신 간격·반응 지연 27회 + 1~9단계 갱신 간격 81회입니다.
모든 실행은 공개 API로 정확한 모집 뺄셈과 회복 덧셈에 답하고, 실제 보유 군대만 출격시킵니다. 돈·체력·시간·명중 판정 주입이나 전투 중 수치 변경은 없습니다. 자동 전략 결과이며 실제 어린이의 성공률을 뜻하지 않습니다.

## 모집가 누적 인상

시작 코인 9.90, 동시 보유 한도 12명, 제한 시간 180초, 회복 지원 3회는 유지합니다. 병사를 한 명 확보할 때마다 모든 병종의 다음 모집가가 0.01코인씩 올라갑니다. 기본가는 방패 1.20 / 돌격 0.90 / 정찰 0.45이며, n명을 이미 모집했다면 다음 가격은 기본가 + n × 0.01입니다. 총 n명의 가격에는 0.01 × n × (n−1) / 2가 더해집니다.
모집할 때 출격 비용을 선납하므로 준비 중 대량 비축해도 인상을 우회할 수 없습니다. 전투의 출격 버튼에서는 비축 병력만 소모하고 다시 차감하지 않습니다. 오답·취소에는 가격이 오르지 않고, 병사가 전사해도 누적 모집 수는 줄지 않습니다. 재도전은 코인 9.90과 기본 가격으로 새로 시작합니다.
준비 중에는 다음 인상분까지 포함한 필수 정찰병·다른 병종의 코인과 자리를 남깁니다. 견적의 잔액·가격·정답을 실제 상태와 다시 검증하므로 오래된 가격으로 구매할 수 없습니다. 모집 가격은 9.99 이하이며 실제 가능한 모집·회복 문제의 피연산자와 답은 10 미만·소수 두 자리 범위를 유지합니다.
기존 3방패·6돌격·2정찰 11명은 인상 후 10.45코인이라 새 규칙에서 불법입니다. 이를 코인 주입이나 가격 할인으로 유지하지 않고, 아래의 새 합법 편성을 검증했습니다.

| 편성 | 방패 | 돌격 | 정찰 | 인상 포함 총 코인 |
|---|---:|---:|---:|---:|
| 균형 편성 | 3 | 4 | 2 | 8.46 |
| 최종 결전 편성 | 4 | 4 | 2 | 9.75 |
| 돌격 중심 편성 | 1 | 8 | 2 | 9.85 |
| 방패 중심 편성 | 6 | 1 | 2 | 9.36 |
| 정찰 중심 편성 | 1 | 0 | 11 | 6.81 |
| 소규모 편성 | 1 | 1 | 1 | 2.58 |

## 10단계의 수비진

마력탑·독탑 네 기를 경로 거리 240 / 430 / 620 / 800에서 차례로 파괴합니다. 타워 체력·공격력·사거리·사격 빈도는 단계마다 증가하며 성 체력은 9.99입니다. 아군의 초과 공격은 무효이므로 0.01 정찰병이 작은 나머지를 마무리해야 합니다.
이번 변경은 병력의 체력·공격력·이동 속도·사격 간격과 적의 모든 능력치를 바꾸지 않았습니다. 실제 발사체는 직전 변경의 20% 빠른 이동 속도를 유지하며 도착 시 피해를 줍니다. 파괴된 타워의 비행 중 공격은 취소됩니다.
최종 단계는 네 타워 → 부활한 저주 마법사 119.90 → 성 순서입니다. 본편 11단계의 99.90보다 높은 보스 체력과 직접 마력탄·암흑 파동·영혼의 속박·격노를 유지합니다. 서로 다른 모드의 실제 사람 성공률을 수치로 비교한 것은 아닙니다.
보스의 기본 마력탄은 공격 0.26, 사거리 240이며 격노 후 0.34로 강해집니다. 암흑 파동은 2.8초 예고 후 고정 범위에 0.44 피해, 영혼의 속박은 0.20 피해와 3.5초 공격 간격 증가를 줍니다. 시전 중 기본 사격은 쉬며, 보스가 살아 있는 동안 성은 사격·피격 모두 보호막으로 정지합니다.
문제를 푸는 동안 전투·발사체·마법 예고·속박·제한 시간은 함께 멈춥니다. 보스의 큰 체력은 학습 문제로 출제하지 않습니다.

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

## 기본 전략 탐색

10단계 × 3난이도 × 6편성 × 3출격 순서 × 회복 여부입니다. 병력은 약 0.7초마다 출격하고, 기본 회복 전략은 전체 결손 체력 1.80 이상일 때 바로 사용합니다.

| 단계 | 연습 성공 / 36 | 표준 성공 / 36 | 도전 성공 / 36 |
|---:|---:|---:|---:|
| 1 | 24 | 24 | 24 |
| 2 | 24 | 24 | 24 |
| 3 | 24 | 24 | 24 |
| 4 | 24 | 24 | 24 |
| 5 | 24 | 24 | 24 |
| 6 | 24 | 24 | 22 |
| 7 | 24 | 24 | 17 |
| 8 | 24 | 24 | 20 |
| 9 | 24 | 18 | 11 |
| 10 | 0 | 0 | 0 |

## 최종 결전의 실제 공략과 회복 시점

새 최종 편성은 방패 4 / 돌격 4 / 정찰 2이며 인상분 0.45를 포함해 총 9.75코인입니다. 방패 → 돌격 → 정찰 순서로 약 1.6초마다 출격하고, 보스의 첫째·둘째·넷째 광역 마법이 명중한 뒤 회복합니다. 셋째 마법에는 회복을 아껴 둡니다.
기본 전략과 별도로 6편성 × 3난이도 × 3순서 × 출격 간격 0.7 / 1.0 / 1.6초 × 마법 후 반응 지연 0 / 0.5 / 1초를 탐색했습니다. 회복은 첫째·둘째·넷째 마법 뒤 사용합니다.

| 난이도 | 타이밍 전략 성공 / 162 |
|---|---:|
| practice | 78 |
| standard | 30 |
| challenge | 9 |

최종 대표 편성은 3난이도 × 갱신 간격 0.1 / 0.05 / 1/60초 × 반응 지연 0 / 0.5 / 1초에서 모두 합법적으로 클리어합니다. 타워 구간에서 회복을 소진하거나 회복 없이 진행한 같은 편성은 세 난이도 모두 실패합니다.

| 난이도 | 갱신 간격 | 회복 반응 초 | 결과 | 경과 초 | 생존 | 보스 마법 | 받은 피해 |
|---|---:|---:|---|---:|---:|---:|---:|
| practice | 0.1000 | 0 | won | 99.5 | 8 | 6 | 32.19 |
| practice | 0.1000 | 0.5 | won | 99.5 | 8 | 6 | 32.19 |
| practice | 0.1000 | 1 | won | 99.5 | 8 | 6 | 32.19 |
| practice | 0.0500 | 0 | won | 103.1 | 7 | 6 | 32.94 |
| practice | 0.0500 | 0.5 | won | 103.1 | 7 | 6 | 32.94 |
| practice | 0.0500 | 1 | won | 103.1 | 7 | 6 | 32.94 |
| practice | 0.0167 | 0 | won | 100.8 | 8 | 5 | 31.35 |
| practice | 0.0167 | 0.5 | won | 100.8 | 8 | 5 | 31.35 |
| practice | 0.0167 | 1 | won | 100.8 | 8 | 5 | 31.35 |
| standard | 0.1000 | 0 | won | 100.7 | 7 | 6 | 34.45 |
| standard | 0.1000 | 0.5 | won | 100.7 | 7 | 6 | 34.45 |
| standard | 0.1000 | 1 | won | 100.7 | 7 | 6 | 34.45 |
| standard | 0.0500 | 0 | won | 103.1 | 7 | 6 | 35.85 |
| standard | 0.0500 | 0.5 | won | 103.1 | 7 | 6 | 35.85 |
| standard | 0.0500 | 1 | won | 103.1 | 7 | 6 | 35.85 |
| standard | 0.0167 | 0 | won | 102.9 | 7 | 6 | 35.85 |
| standard | 0.0167 | 0.5 | won | 102.9 | 7 | 6 | 35.85 |
| standard | 0.0167 | 1 | won | 102.9 | 7 | 6 | 35.85 |
| challenge | 0.1000 | 0 | won | 110 | 4 | 6 | 41.60 |
| challenge | 0.1000 | 0.5 | won | 110 | 4 | 6 | 41.60 |
| challenge | 0.1000 | 1 | won | 110 | 4 | 6 | 41.60 |
| challenge | 0.0500 | 0 | won | 109 | 4 | 6 | 40.04 |
| challenge | 0.0500 | 0.5 | won | 109 | 4 | 6 | 40.04 |
| challenge | 0.0500 | 1 | won | 109 | 4 | 6 | 40.04 |
| challenge | 0.0167 | 0 | won | 108.7 | 4 | 6 | 40.04 |
| challenge | 0.0167 | 0.5 | won | 108.7 | 4 | 6 | 40.04 |
| challenge | 0.0167 | 1 | won | 108.7 | 4 | 6 | 40.04 |

1~9단계의 대표 3방패·4돌격·2정찰 편성은 총 8.46코인입니다. 약 0.7초마다 출격하고 전체 결손 체력이 1.80 이상이면 회복합니다. 3난이도 × 9단계 × 3갱신 간격의 81회 모두 승리합니다. 아래는 0.1초 갱신 결과입니다.

| 단계 | 난이도 | 결과 | 경과 초 | 적 발사 | 받은 피해 | 생존 / 9 |
|---:|---|---|---:|---:|---:|---:|
| 1 | practice | won | 38.4 | 22 | 4.45 | 9 |
| 2 | practice | won | 44.1 | 27 | 5.55 | 9 |
| 3 | practice | won | 38.6 | 26 | 6.68 | 9 |
| 4 | practice | won | 39.7 | 26 | 6.17 | 9 |
| 5 | practice | won | 38.5 | 30 | 8.68 | 9 |
| 6 | practice | won | 41.1 | 30 | 9.30 | 8 |
| 7 | practice | won | 43.9 | 33 | 9.88 | 8 |
| 8 | practice | won | 47.4 | 37 | 12.11 | 8 |
| 9 | practice | won | 45.1 | 38 | 12.80 | 8 |
| 1 | standard | won | 38.4 | 29 | 5.75 | 9 |
| 2 | standard | won | 44.1 | 34 | 7.06 | 9 |
| 3 | standard | won | 38.6 | 34 | 8.52 | 9 |
| 4 | standard | won | 39.7 | 32 | 7.77 | 9 |
| 5 | standard | won | 39.7 | 41 | 11.04 | 8 |
| 6 | standard | won | 41.1 | 42 | 12.00 | 8 |
| 7 | standard | won | 44.1 | 42 | 12.67 | 8 |
| 8 | standard | won | 48.7 | 51 | 15.75 | 7 |
| 9 | standard | won | 51.1 | 53 | 18.66 | 7 |
| 1 | challenge | won | 38.4 | 35 | 7.05 | 9 |
| 2 | challenge | won | 44.1 | 43 | 8.65 | 8 |
| 3 | challenge | won | 39.8 | 42 | 10.62 | 8 |
| 4 | challenge | won | 40.9 | 43 | 10.47 | 8 |
| 5 | challenge | won | 39.7 | 50 | 13.93 | 8 |
| 6 | challenge | won | 41.1 | 52 | 14.65 | 7 |
| 7 | challenge | won | 44.1 | 52 | 15.60 | 7 |
| 8 | challenge | won | 54.7 | 71 | 22.38 | 5 |
| 9 | challenge | won | 51.1 | 66 | 22.93 | 5 |

<details><summary>기본 자동 전략 전체 결과</summary>

| 단계 | 편성 | 난이도 | 순서 | 회복 | 결과 | 경과 초 | 성 잔여 체력 | 생존 | 타워 파괴 | 적 발사 | 받은 피해 |
|---:|---|---|---|---|---|---:|---:|---:|---:|---:|---:|
| 1 | 균형 편성 | practice | guard-first | 없음 | won | 38.4 | 0.00 | 9 | 4 / 4 | 22 | 4.45 |
| 1 | 균형 편성 | practice | guard-first | 사용 | won | 38.4 | 0.00 | 9 | 4 / 4 | 22 | 4.45 |
| 1 | 균형 편성 | practice | striker-first | 없음 | won | 39.8 | 0.00 | 9 | 4 / 4 | 23 | 4.45 |
| 1 | 균형 편성 | practice | striker-first | 사용 | won | 39.8 | 0.00 | 9 | 4 / 4 | 23 | 4.45 |
| 1 | 균형 편성 | practice | scout-first | 없음 | won | 34.6 | 0.00 | 9 | 4 / 4 | 20 | 4.25 |
| 1 | 균형 편성 | practice | scout-first | 사용 | won | 34.6 | 0.00 | 9 | 4 / 4 | 20 | 4.25 |
| 1 | 최종 결전 편성 | practice | guard-first | 없음 | won | 35.2 | 0.00 | 10 | 4 / 4 | 20 | 3.85 |
| 1 | 최종 결전 편성 | practice | guard-first | 사용 | won | 35.2 | 0.00 | 10 | 4 / 4 | 20 | 3.85 |
| 1 | 최종 결전 편성 | practice | striker-first | 없음 | won | 38.2 | 0.00 | 10 | 4 / 4 | 22 | 4.05 |
| 1 | 최종 결전 편성 | practice | striker-first | 사용 | won | 38.2 | 0.00 | 10 | 4 / 4 | 22 | 4.05 |
| 1 | 최종 결전 편성 | practice | scout-first | 없음 | won | 32.2 | 0.00 | 10 | 4 / 4 | 19 | 3.75 |
| 1 | 최종 결전 편성 | practice | scout-first | 사용 | won | 32.2 | 0.00 | 10 | 4 / 4 | 19 | 3.75 |
| 1 | 돌격 중심 편성 | practice | guard-first | 없음 | won | 48.7 | 0.00 | 11 | 4 / 4 | 29 | 6.20 |
| 1 | 돌격 중심 편성 | practice | guard-first | 사용 | won | 48.7 | 0.00 | 11 | 4 / 4 | 29 | 6.20 |
| 1 | 돌격 중심 편성 | practice | striker-first | 없음 | won | 50.1 | 0.00 | 11 | 4 / 4 | 29 | 6.30 |
| 1 | 돌격 중심 편성 | practice | striker-first | 사용 | won | 50.1 | 0.00 | 11 | 4 / 4 | 29 | 6.30 |
| 1 | 돌격 중심 편성 | practice | scout-first | 없음 | won | 55.1 | 0.00 | 11 | 4 / 4 | 32 | 7.05 |
| 1 | 돌격 중심 편성 | practice | scout-first | 사용 | won | 55.1 | 0.00 | 11 | 4 / 4 | 32 | 7.05 |
| 1 | 방패 중심 편성 | practice | guard-first | 없음 | won | 44.6 | 0.00 | 9 | 4 / 4 | 27 | 5.55 |
| 1 | 방패 중심 편성 | practice | guard-first | 사용 | won | 44.6 | 0.00 | 9 | 4 / 4 | 27 | 5.55 |
| 1 | 방패 중심 편성 | practice | striker-first | 없음 | won | 41.6 | 0.00 | 9 | 4 / 4 | 26 | 5.45 |
| 1 | 방패 중심 편성 | practice | striker-first | 사용 | won | 41.6 | 0.00 | 9 | 4 / 4 | 26 | 5.45 |
| 1 | 방패 중심 편성 | practice | scout-first | 없음 | won | 53.7 | 0.00 | 8 | 4 / 4 | 36 | 7.80 |
| 1 | 방패 중심 편성 | practice | scout-first | 사용 | won | 48.3 | 0.00 | 9 | 4 / 4 | 33 | 7.10 |
| 1 | 정찰 중심 편성 | practice | guard-first | 없음 | lost | 180 | 5.91 | 0 | 4 / 4 | 77 | 18.60 |
| 1 | 정찰 중심 편성 | practice | guard-first | 사용 | lost | 180 | 4.32 | 0 | 4 / 4 | 83 | 20.60 |
| 1 | 정찰 중심 편성 | practice | striker-first | 없음 | lost | 180 | 5.91 | 0 | 4 / 4 | 77 | 18.60 |
| 1 | 정찰 중심 편성 | practice | striker-first | 사용 | lost | 180 | 4.32 | 0 | 4 / 4 | 83 | 20.60 |
| 1 | 정찰 중심 편성 | practice | scout-first | 없음 | lost | 180 | 6.36 | 0 | 4 / 4 | 78 | 18.60 |
| 1 | 정찰 중심 편성 | practice | scout-first | 사용 | lost | 180 | 4.02 | 0 | 4 / 4 | 86 | 21.10 |
| 1 | 소규모 편성 | practice | guard-first | 없음 | lost | 180 | 9.99 | 0 | 3 / 4 | 43 | 9.00 |
| 1 | 소규모 편성 | practice | guard-first | 사용 | lost | 180 | 6.78 | 0 | 4 / 4 | 49 | 11.15 |
| 1 | 소규모 편성 | practice | striker-first | 없음 | lost | 180 | 9.99 | 0 | 3 / 4 | 44 | 9.00 |
| 1 | 소규모 편성 | practice | striker-first | 사용 | lost | 180 | 5.22 | 0 | 4 / 4 | 52 | 11.35 |
| 1 | 소규모 편성 | practice | scout-first | 없음 | lost | 180 | 9.99 | 0 | 3 / 4 | 47 | 9.00 |
| 1 | 소규모 편성 | practice | scout-first | 사용 | lost | 180 | 6.78 | 0 | 4 / 4 | 54 | 11.35 |
| 1 | 균형 편성 | standard | guard-first | 없음 | won | 38.4 | 0.00 | 9 | 4 / 4 | 29 | 5.75 |
| 1 | 균형 편성 | standard | guard-first | 사용 | won | 38.4 | 0.00 | 9 | 4 / 4 | 29 | 5.75 |
| 1 | 균형 편성 | standard | striker-first | 없음 | won | 39.8 | 0.00 | 9 | 4 / 4 | 30 | 5.85 |
| 1 | 균형 편성 | standard | striker-first | 사용 | won | 39.8 | 0.00 | 9 | 4 / 4 | 30 | 5.85 |
| 1 | 균형 편성 | standard | scout-first | 없음 | won | 34.6 | 0.00 | 9 | 4 / 4 | 27 | 5.55 |
| 1 | 균형 편성 | standard | scout-first | 사용 | won | 34.6 | 0.00 | 9 | 4 / 4 | 27 | 5.55 |
| 1 | 최종 결전 편성 | standard | guard-first | 없음 | won | 35.2 | 0.00 | 10 | 4 / 4 | 27 | 5.15 |
| 1 | 최종 결전 편성 | standard | guard-first | 사용 | won | 35.2 | 0.00 | 10 | 4 / 4 | 27 | 5.15 |
| 1 | 최종 결전 편성 | standard | striker-first | 없음 | won | 38.2 | 0.00 | 10 | 4 / 4 | 29 | 5.35 |
| 1 | 최종 결전 편성 | standard | striker-first | 사용 | won | 38.2 | 0.00 | 10 | 4 / 4 | 29 | 5.35 |
| 1 | 최종 결전 편성 | standard | scout-first | 없음 | won | 32.2 | 0.00 | 10 | 4 / 4 | 25 | 5.05 |
| 1 | 최종 결전 편성 | standard | scout-first | 사용 | won | 32.2 | 0.00 | 10 | 4 / 4 | 25 | 5.05 |
| 1 | 돌격 중심 편성 | standard | guard-first | 없음 | won | 54.7 | 0.00 | 9 | 4 / 4 | 43 | 9.60 |
| 1 | 돌격 중심 편성 | standard | guard-first | 사용 | won | 48.7 | 0.00 | 10 | 4 / 4 | 38 | 8.10 |
| 1 | 돌격 중심 편성 | standard | striker-first | 없음 | won | 50.1 | 0.00 | 9 | 4 / 4 | 39 | 8.10 |
| 1 | 돌격 중심 편성 | standard | striker-first | 사용 | won | 50.1 | 0.00 | 11 | 4 / 4 | 39 | 8.30 |
| 1 | 돌격 중심 편성 | standard | scout-first | 없음 | won | 61.1 | 0.00 | 8 | 4 / 4 | 48 | 10.40 |
| 1 | 돌격 중심 편성 | standard | scout-first | 사용 | won | 55.1 | 0.00 | 10 | 4 / 4 | 43 | 9.10 |
| 1 | 방패 중심 편성 | standard | guard-first | 없음 | won | 50 | 0.00 | 8 | 4 / 4 | 40 | 8.40 |
| 1 | 방패 중심 편성 | standard | guard-first | 사용 | won | 44.6 | 0.00 | 9 | 4 / 4 | 35 | 7.10 |
| 1 | 방패 중심 편성 | standard | striker-first | 없음 | won | 47 | 0.00 | 8 | 4 / 4 | 38 | 8.40 |
| 1 | 방패 중심 편성 | standard | striker-first | 사용 | won | 41.6 | 0.00 | 9 | 4 / 4 | 33 | 6.90 |
| 1 | 방패 중심 편성 | standard | scout-first | 없음 | won | 55.5 | 0.00 | 8 | 4 / 4 | 50 | 11.10 |
| 1 | 방패 중심 편성 | standard | scout-first | 사용 | won | 53.7 | 0.00 | 8 | 4 / 4 | 49 | 10.50 |
| 1 | 정찰 중심 편성 | standard | guard-first | 없음 | lost | 180 | 8.37 | 0 | 4 / 4 | 83 | 18.60 |
| 1 | 정찰 중심 편성 | standard | guard-first | 사용 | lost | 180 | 7.35 | 0 | 4 / 4 | 89 | 20.65 |
| 1 | 정찰 중심 편성 | standard | striker-first | 없음 | lost | 180 | 8.37 | 0 | 4 / 4 | 83 | 18.60 |
| 1 | 정찰 중심 편성 | standard | striker-first | 사용 | lost | 180 | 7.35 | 0 | 4 / 4 | 89 | 20.65 |
| 1 | 정찰 중심 편성 | standard | scout-first | 없음 | lost | 180 | 8.61 | 0 | 4 / 4 | 86 | 18.60 |
| 1 | 정찰 중심 편성 | standard | scout-first | 사용 | lost | 180 | 7.35 | 0 | 4 / 4 | 91 | 21.25 |
| 1 | 소규모 편성 | standard | guard-first | 없음 | lost | 180 | 9.99 | 0 | 3 / 4 | 46 | 9.00 |
| 1 | 소규모 편성 | standard | guard-first | 사용 | lost | 180 | 9.99 | 0 | 3 / 4 | 53 | 11.15 |
| 1 | 소규모 편성 | standard | striker-first | 없음 | lost | 180 | 9.99 | 0 | 3 / 4 | 47 | 9.00 |
| 1 | 소규모 편성 | standard | striker-first | 사용 | lost | 180 | 9.99 | 0 | 3 / 4 | 56 | 11.45 |
| 1 | 소규모 편성 | standard | scout-first | 없음 | lost | 180 | 9.99 | 0 | 3 / 4 | 50 | 9.00 |
| 1 | 소규모 편성 | standard | scout-first | 사용 | lost | 180 | 9.99 | 0 | 3 / 4 | 58 | 11.45 |
| 1 | 균형 편성 | challenge | guard-first | 없음 | won | 43.8 | 0.00 | 8 | 4 / 4 | 41 | 8.55 |
| 1 | 균형 편성 | challenge | guard-first | 사용 | won | 38.4 | 0.00 | 9 | 4 / 4 | 35 | 7.05 |
| 1 | 균형 편성 | challenge | striker-first | 없음 | won | 40 | 0.00 | 8 | 4 / 4 | 37 | 6.95 |
| 1 | 균형 편성 | challenge | striker-first | 사용 | won | 39.8 | 0.00 | 9 | 4 / 4 | 37 | 7.15 |
| 1 | 균형 편성 | challenge | scout-first | 없음 | won | 34.6 | 0.00 | 9 | 4 / 4 | 33 | 6.85 |
| 1 | 균형 편성 | challenge | scout-first | 사용 | won | 34.6 | 0.00 | 9 | 4 / 4 | 33 | 6.85 |
| 1 | 최종 결전 편성 | challenge | guard-first | 없음 | won | 35.2 | 0.00 | 10 | 4 / 4 | 33 | 6.35 |
| 1 | 최종 결전 편성 | challenge | guard-first | 사용 | won | 35.2 | 0.00 | 10 | 4 / 4 | 33 | 6.35 |
| 1 | 최종 결전 편성 | challenge | striker-first | 없음 | won | 38.2 | 0.00 | 10 | 4 / 4 | 35 | 6.55 |
| 1 | 최종 결전 편성 | challenge | striker-first | 사용 | won | 38.2 | 0.00 | 10 | 4 / 4 | 35 | 6.55 |
| 1 | 최종 결전 편성 | challenge | scout-first | 없음 | won | 32.2 | 0.00 | 10 | 4 / 4 | 31 | 6.15 |
| 1 | 최종 결전 편성 | challenge | scout-first | 사용 | won | 32.2 | 0.00 | 10 | 4 / 4 | 31 | 6.15 |
| 1 | 돌격 중심 편성 | challenge | guard-first | 없음 | won | 43.9 | 0.00 | 9 | 4 / 4 | 43 | 8.40 |
| 1 | 돌격 중심 편성 | challenge | guard-first | 사용 | won | 48.7 | 0.00 | 10 | 4 / 4 | 48 | 9.75 |
| 1 | 돌격 중심 편성 | challenge | striker-first | 없음 | won | 62.1 | 0.00 | 7 | 4 / 4 | 61 | 13.20 |
| 1 | 돌격 중심 편성 | challenge | striker-first | 사용 | won | 50.1 | 0.00 | 10 | 4 / 4 | 49 | 9.85 |
| 1 | 돌격 중심 편성 | challenge | scout-first | 없음 | won | 50.3 | 0.00 | 9 | 4 / 4 | 49 | 9.60 |
| 1 | 돌격 중심 편성 | challenge | scout-first | 사용 | won | 55.1 | 0.00 | 10 | 4 / 4 | 54 | 11.00 |
| 1 | 방패 중심 편성 | challenge | guard-first | 없음 | won | 51.8 | 0.00 | 8 | 4 / 4 | 51 | 10.95 |
| 1 | 방패 중심 편성 | challenge | guard-first | 사용 | won | 50 | 0.00 | 8 | 4 / 4 | 49 | 10.35 |
| 1 | 방패 중심 편성 | challenge | striker-first | 없음 | won | 42.8 | 0.00 | 8 | 4 / 4 | 43 | 8.85 |
| 1 | 방패 중심 편성 | challenge | striker-first | 사용 | won | 41.6 | 0.00 | 9 | 4 / 4 | 42 | 8.40 |
| 1 | 방패 중심 편성 | challenge | scout-first | 없음 | won | 55.5 | 0.00 | 7 | 4 / 4 | 60 | 13.75 |
| 1 | 방패 중심 편성 | challenge | scout-first | 사용 | won | 55.5 | 0.00 | 8 | 4 / 4 | 60 | 13.45 |
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
| 2 | 균형 편성 | practice | guard-first | 없음 | won | 44.1 | 0.00 | 9 | 4 / 4 | 27 | 5.55 |
| 2 | 균형 편성 | practice | guard-first | 사용 | won | 44.1 | 0.00 | 9 | 4 / 4 | 27 | 5.55 |
| 2 | 균형 편성 | practice | striker-first | 없음 | won | 45.7 | 0.00 | 9 | 4 / 4 | 27 | 5.66 |
| 2 | 균형 편성 | practice | striker-first | 사용 | won | 45.7 | 0.00 | 9 | 4 / 4 | 27 | 5.66 |
| 2 | 균형 편성 | practice | scout-first | 없음 | won | 46.6 | 0.00 | 9 | 4 / 4 | 28 | 5.77 |
| 2 | 균형 편성 | practice | scout-first | 사용 | won | 46.6 | 0.00 | 9 | 4 / 4 | 28 | 5.77 |
| 2 | 최종 결전 편성 | practice | guard-first | 없음 | won | 44.3 | 0.00 | 10 | 4 / 4 | 27 | 5.34 |
| 2 | 최종 결전 편성 | practice | guard-first | 사용 | won | 44.3 | 0.00 | 10 | 4 / 4 | 27 | 5.34 |
| 2 | 최종 결전 편성 | practice | striker-first | 없음 | won | 45.9 | 0.00 | 10 | 4 / 4 | 28 | 5.45 |
| 2 | 최종 결전 편성 | practice | striker-first | 사용 | won | 45.9 | 0.00 | 10 | 4 / 4 | 28 | 5.45 |
| 2 | 최종 결전 편성 | practice | scout-first | 없음 | won | 46 | 0.00 | 10 | 4 / 4 | 28 | 5.45 |
| 2 | 최종 결전 편성 | practice | scout-first | 사용 | won | 46 | 0.00 | 10 | 4 / 4 | 28 | 5.45 |
| 2 | 돌격 중심 편성 | practice | guard-first | 없음 | won | 47 | 0.00 | 10 | 4 / 4 | 31 | 7.01 |
| 2 | 돌격 중심 편성 | practice | guard-first | 사용 | won | 47 | 0.00 | 11 | 4 / 4 | 31 | 7.10 |
| 2 | 돌격 중심 편성 | practice | striker-first | 없음 | won | 52.7 | 0.00 | 10 | 4 / 4 | 33 | 7.24 |
| 2 | 돌격 중심 편성 | practice | striker-first | 사용 | won | 52.7 | 0.00 | 11 | 4 / 4 | 33 | 7.54 |
| 2 | 돌격 중심 편성 | practice | scout-first | 없음 | won | 52 | 0.00 | 10 | 4 / 4 | 33 | 7.24 |
| 2 | 돌격 중심 편성 | practice | scout-first | 사용 | won | 52 | 0.00 | 11 | 4 / 4 | 33 | 7.54 |
| 2 | 방패 중심 편성 | practice | guard-first | 없음 | won | 52.3 | 0.00 | 8 | 4 / 4 | 33 | 7.33 |
| 2 | 방패 중심 편성 | practice | guard-first | 사용 | won | 46.9 | 0.00 | 9 | 4 / 4 | 29 | 6.58 |
| 2 | 방패 중심 편성 | practice | striker-first | 없음 | won | 43.8 | 0.00 | 9 | 4 / 4 | 27 | 6.52 |
| 2 | 방패 중심 편성 | practice | striker-first | 사용 | won | 43.8 | 0.00 | 9 | 4 / 4 | 27 | 6.52 |
| 2 | 방패 중심 편성 | practice | scout-first | 없음 | won | 56.2 | 0.00 | 8 | 4 / 4 | 35 | 7.66 |
| 2 | 방패 중심 편성 | practice | scout-first | 사용 | won | 50.8 | 0.00 | 9 | 4 / 4 | 31 | 6.95 |
| 2 | 정찰 중심 편성 | practice | guard-first | 없음 | lost | 180 | 6.58 | 0 | 4 / 4 | 79 | 18.60 |
| 2 | 정찰 중심 편성 | practice | guard-first | 사용 | lost | 180 | 5.40 | 0 | 4 / 4 | 84 | 20.62 |
| 2 | 정찰 중심 편성 | practice | striker-first | 없음 | lost | 180 | 6.58 | 0 | 4 / 4 | 79 | 18.60 |
| 2 | 정찰 중심 편성 | practice | striker-first | 사용 | lost | 180 | 5.40 | 0 | 4 / 4 | 84 | 20.62 |
| 2 | 정찰 중심 편성 | practice | scout-first | 없음 | lost | 180 | 7.21 | 0 | 4 / 4 | 79 | 18.60 |
| 2 | 정찰 중심 편성 | practice | scout-first | 사용 | lost | 180 | 5.40 | 0 | 4 / 4 | 86 | 21.17 |
| 2 | 소규모 편성 | practice | guard-first | 없음 | lost | 180 | 9.99 | 0 | 3 / 4 | 44 | 9.00 |
| 2 | 소규모 편성 | practice | guard-first | 사용 | lost | 180 | 3.69 | 0 | 4 / 4 | 49 | 11.18 |
| 2 | 소규모 편성 | practice | striker-first | 없음 | lost | 180 | 9.99 | 0 | 3 / 4 | 44 | 9.00 |
| 2 | 소규모 편성 | practice | striker-first | 사용 | lost | 180 | 3.69 | 0 | 4 / 4 | 49 | 11.40 |
| 2 | 소규모 편성 | practice | scout-first | 없음 | lost | 180 | 9.99 | 0 | 3 / 4 | 45 | 9.00 |
| 2 | 소규모 편성 | practice | scout-first | 사용 | lost | 180 | 2.71 | 0 | 4 / 4 | 50 | 11.40 |
| 2 | 균형 편성 | standard | guard-first | 없음 | won | 45.3 | 0.00 | 8 | 4 / 4 | 35 | 7.33 |
| 2 | 균형 편성 | standard | guard-first | 사용 | won | 44.1 | 0.00 | 9 | 4 / 4 | 34 | 7.06 |
| 2 | 균형 편성 | standard | striker-first | 없음 | won | 51.1 | 0.00 | 8 | 4 / 4 | 39 | 8.73 |
| 2 | 균형 편성 | standard | striker-first | 사용 | won | 45.7 | 0.00 | 9 | 4 / 4 | 35 | 7.17 |
| 2 | 균형 편성 | standard | scout-first | 없음 | won | 52 | 0.00 | 8 | 4 / 4 | 40 | 8.84 |
| 2 | 균형 편성 | standard | scout-first | 사용 | won | 46.6 | 0.00 | 9 | 4 / 4 | 36 | 7.28 |
| 2 | 최종 결전 편성 | standard | guard-first | 없음 | won | 44.9 | 0.00 | 9 | 4 / 4 | 35 | 7.01 |
| 2 | 최종 결전 편성 | standard | guard-first | 사용 | won | 44.3 | 0.00 | 10 | 4 / 4 | 34 | 7.06 |
| 2 | 최종 결전 편성 | standard | striker-first | 없음 | won | 46.5 | 0.00 | 9 | 4 / 4 | 36 | 7.13 |
| 2 | 최종 결전 편성 | standard | striker-first | 사용 | won | 45.9 | 0.00 | 10 | 4 / 4 | 35 | 7.17 |
| 2 | 최종 결전 편성 | standard | scout-first | 없음 | won | 46.6 | 0.00 | 9 | 4 / 4 | 36 | 7.24 |
| 2 | 최종 결전 편성 | standard | scout-first | 사용 | won | 46 | 0.00 | 10 | 4 / 4 | 35 | 7.28 |
| 2 | 돌격 중심 편성 | standard | guard-first | 없음 | won | 42.2 | 0.00 | 9 | 4 / 4 | 34 | 7.80 |
| 2 | 돌격 중심 편성 | standard | guard-first | 사용 | won | 47 | 0.00 | 10 | 4 / 4 | 38 | 9.13 |
| 2 | 돌격 중심 편성 | standard | striker-first | 없음 | won | 47.9 | 0.00 | 9 | 4 / 4 | 38 | 8.12 |
| 2 | 돌격 중심 편성 | standard | striker-first | 사용 | won | 52.7 | 0.00 | 10 | 4 / 4 | 42 | 9.47 |
| 2 | 돌격 중심 편성 | standard | scout-first | 없음 | won | 47.2 | 0.00 | 9 | 4 / 4 | 38 | 8.34 |
| 2 | 돌격 중심 편성 | standard | scout-first | 사용 | won | 52 | 0.00 | 10 | 4 / 4 | 42 | 9.58 |
| 2 | 방패 중심 편성 | standard | guard-first | 없음 | won | 54.1 | 0.00 | 8 | 4 / 4 | 43 | 10.53 |
| 2 | 방패 중심 편성 | standard | guard-first | 사용 | won | 52.3 | 0.00 | 8 | 4 / 4 | 42 | 9.77 |
| 2 | 방패 중심 편성 | standard | striker-first | 없음 | won | 51 | 0.00 | 8 | 4 / 4 | 42 | 10.22 |
| 2 | 방패 중심 편성 | standard | striker-first | 사용 | won | 49.2 | 0.00 | 8 | 4 / 4 | 41 | 9.78 |
| 2 | 방패 중심 편성 | standard | scout-first | 없음 | won | 58 | 0.00 | 8 | 4 / 4 | 46 | 10.97 |
| 2 | 방패 중심 편성 | standard | scout-first | 사용 | won | 56.2 | 0.00 | 8 | 4 / 4 | 45 | 10.21 |
| 2 | 정찰 중심 편성 | standard | guard-first | 없음 | lost | 180 | 8.94 | 0 | 4 / 4 | 83 | 18.60 |
| 2 | 정찰 중심 편성 | standard | guard-first | 사용 | lost | 180 | 8.24 | 0 | 4 / 4 | 89 | 20.51 |
| 2 | 정찰 중심 편성 | standard | striker-first | 없음 | lost | 180 | 8.94 | 0 | 4 / 4 | 83 | 18.60 |
| 2 | 정찰 중심 편성 | standard | striker-first | 사용 | lost | 180 | 8.24 | 0 | 4 / 4 | 89 | 20.51 |
| 2 | 정찰 중심 편성 | standard | scout-first | 없음 | lost | 180 | 9.31 | 0 | 4 / 4 | 85 | 18.60 |
| 2 | 정찰 중심 편성 | standard | scout-first | 사용 | lost | 180 | 8.24 | 0 | 4 / 4 | 91 | 21.17 |
| 2 | 소규모 편성 | standard | guard-first | 없음 | lost | 180 | 9.99 | 0 | 3 / 4 | 46 | 9.00 |
| 2 | 소규모 편성 | standard | guard-first | 사용 | lost | 180 | 9.99 | 0 | 3 / 4 | 55 | 11.18 |
| 2 | 소규모 편성 | standard | striker-first | 없음 | lost | 180 | 9.99 | 0 | 3 / 4 | 46 | 9.00 |
| 2 | 소규모 편성 | standard | striker-first | 사용 | lost | 180 | 9.99 | 0 | 3 / 4 | 55 | 11.51 |
| 2 | 소규모 편성 | standard | scout-first | 없음 | lost | 180 | 9.99 | 0 | 3 / 4 | 49 | 9.00 |
| 2 | 소규모 편성 | standard | scout-first | 사용 | lost | 180 | 9.99 | 0 | 3 / 4 | 57 | 11.51 |
| 2 | 균형 편성 | challenge | guard-first | 없음 | won | 45.3 | 0.00 | 8 | 4 / 4 | 44 | 9.09 |
| 2 | 균형 편성 | challenge | guard-first | 사용 | won | 44.1 | 0.00 | 8 | 4 / 4 | 43 | 8.65 |
| 2 | 균형 편성 | challenge | striker-first | 없음 | won | 46.9 | 0.00 | 8 | 4 / 4 | 45 | 9.32 |
| 2 | 균형 편성 | challenge | striker-first | 사용 | won | 45.7 | 0.00 | 9 | 4 / 4 | 44 | 9.06 |
| 2 | 균형 편성 | challenge | scout-first | 없음 | won | 47.8 | 0.00 | 8 | 4 / 4 | 46 | 9.43 |
| 2 | 균형 편성 | challenge | scout-first | 사용 | won | 46.6 | 0.00 | 9 | 4 / 4 | 45 | 9.17 |
| 2 | 최종 결전 편성 | challenge | guard-first | 없음 | won | 44.9 | 0.00 | 9 | 4 / 4 | 43 | 8.77 |
| 2 | 최종 결전 편성 | challenge | guard-first | 사용 | won | 44.3 | 0.00 | 9 | 4 / 4 | 42 | 8.65 |
| 2 | 최종 결전 편성 | challenge | striker-first | 없음 | won | 46.5 | 0.00 | 9 | 4 / 4 | 45 | 9.00 |
| 2 | 최종 결전 편성 | challenge | striker-first | 사용 | won | 45.9 | 0.00 | 10 | 4 / 4 | 44 | 9.06 |
| 2 | 최종 결전 편성 | challenge | scout-first | 없음 | won | 46.6 | 0.00 | 9 | 4 / 4 | 45 | 9.11 |
| 2 | 최종 결전 편성 | challenge | scout-first | 사용 | won | 46 | 0.00 | 10 | 4 / 4 | 44 | 9.17 |
| 2 | 돌격 중심 편성 | challenge | guard-first | 없음 | won | 42.2 | 0.00 | 9 | 4 / 4 | 42 | 9.72 |
| 2 | 돌격 중심 편성 | challenge | guard-first | 사용 | won | 53 | 0.00 | 8 | 4 / 4 | 53 | 12.86 |
| 2 | 돌격 중심 편성 | challenge | striker-first | 없음 | won | 47.9 | 0.00 | 9 | 4 / 4 | 46 | 10.04 |
| 2 | 돌격 중심 편성 | challenge | striker-first | 사용 | won | 52.7 | 0.00 | 9 | 4 / 4 | 51 | 11.50 |
| 2 | 돌격 중심 편성 | challenge | scout-first | 없음 | won | 47.2 | 0.00 | 9 | 4 / 4 | 46 | 10.05 |
| 2 | 돌격 중심 편성 | challenge | scout-first | 사용 | won | 52 | 0.00 | 9 | 4 / 4 | 51 | 11.61 |
| 2 | 방패 중심 편성 | challenge | guard-first | 없음 | won | 54.1 | 0.00 | 7 | 4 / 4 | 54 | 12.25 |
| 2 | 방패 중심 편성 | challenge | guard-first | 사용 | won | 48.1 | 0.00 | 8 | 4 / 4 | 48 | 10.57 |
| 2 | 방패 중심 편성 | challenge | striker-first | 없음 | won | 51 | 0.00 | 7 | 4 / 4 | 51 | 12.58 |
| 2 | 방패 중심 편성 | challenge | striker-first | 사용 | won | 49.2 | 0.00 | 8 | 4 / 4 | 49 | 11.86 |
| 2 | 방패 중심 편성 | challenge | scout-first | 없음 | won | 58 | 0.00 | 7 | 4 / 4 | 57 | 13.01 |
| 2 | 방패 중심 편성 | challenge | scout-first | 사용 | won | 52 | 0.00 | 8 | 4 / 4 | 51 | 11.33 |
| 2 | 정찰 중심 편성 | challenge | guard-first | 없음 | lost | 180 | 9.99 | 0 | 3 / 4 | 89 | 18.60 |
| 2 | 정찰 중심 편성 | challenge | guard-first | 사용 | lost | 180 | 9.98 | 0 | 4 / 4 | 96 | 20.51 |
| 2 | 정찰 중심 편성 | challenge | striker-first | 없음 | lost | 180 | 9.99 | 0 | 3 / 4 | 89 | 18.60 |
| 2 | 정찰 중심 편성 | challenge | striker-first | 사용 | lost | 180 | 9.98 | 0 | 4 / 4 | 96 | 20.51 |
| 2 | 정찰 중심 편성 | challenge | scout-first | 없음 | lost | 180 | 9.99 | 0 | 3 / 4 | 92 | 18.60 |
| 2 | 정찰 중심 편성 | challenge | scout-first | 사용 | lost | 180 | 9.88 | 0 | 4 / 4 | 100 | 21.39 |
| 2 | 소규모 편성 | challenge | guard-first | 없음 | lost | 180 | 9.99 | 0 | 3 / 4 | 50 | 9.00 |
| 2 | 소규모 편성 | challenge | guard-first | 사용 | lost | 180 | 9.99 | 0 | 3 / 4 | 56 | 11.12 |
| 2 | 소규모 편성 | challenge | striker-first | 없음 | lost | 180 | 9.99 | 0 | 3 / 4 | 50 | 9.00 |
| 2 | 소규모 편성 | challenge | striker-first | 사용 | lost | 180 | 9.99 | 0 | 3 / 4 | 58 | 11.45 |
| 2 | 소규모 편성 | challenge | scout-first | 없음 | lost | 180 | 9.99 | 0 | 3 / 4 | 48 | 9.00 |
| 2 | 소규모 편성 | challenge | scout-first | 사용 | lost | 180 | 9.99 | 0 | 3 / 4 | 57 | 11.56 |
| 3 | 균형 편성 | practice | guard-first | 없음 | won | 38.6 | 0.00 | 8 | 4 / 4 | 26 | 6.49 |
| 3 | 균형 편성 | practice | guard-first | 사용 | won | 38.6 | 0.00 | 9 | 4 / 4 | 26 | 6.68 |
| 3 | 균형 편성 | practice | striker-first | 없음 | won | 40.2 | 0.00 | 9 | 4 / 4 | 27 | 6.80 |
| 3 | 균형 편성 | practice | striker-first | 사용 | won | 40.2 | 0.00 | 9 | 4 / 4 | 27 | 6.80 |
| 3 | 균형 편성 | practice | scout-first | 없음 | won | 41.1 | 0.00 | 9 | 4 / 4 | 27 | 6.80 |
| 3 | 균형 편성 | practice | scout-first | 사용 | won | 41.1 | 0.00 | 9 | 4 / 4 | 27 | 6.80 |
| 3 | 최종 결전 편성 | practice | guard-first | 없음 | won | 35.6 | 0.00 | 9 | 4 / 4 | 25 | 6.49 |
| 3 | 최종 결전 편성 | practice | guard-first | 사용 | won | 35.6 | 0.00 | 10 | 4 / 4 | 25 | 6.51 |
| 3 | 최종 결전 편성 | practice | striker-first | 없음 | won | 38.6 | 0.00 | 10 | 4 / 4 | 26 | 6.63 |
| 3 | 최종 결전 편성 | practice | striker-first | 사용 | won | 38.6 | 0.00 | 10 | 4 / 4 | 26 | 6.63 |
| 3 | 최종 결전 편성 | practice | scout-first | 없음 | won | 38.7 | 0.00 | 10 | 4 / 4 | 26 | 6.63 |
| 3 | 최종 결전 편성 | practice | scout-first | 사용 | won | 38.7 | 0.00 | 10 | 4 / 4 | 26 | 6.63 |
| 3 | 돌격 중심 편성 | practice | guard-first | 없음 | won | 45.7 | 0.00 | 10 | 4 / 4 | 28 | 6.83 |
| 3 | 돌격 중심 편성 | practice | guard-first | 사용 | won | 45.7 | 0.00 | 11 | 4 / 4 | 28 | 6.85 |
| 3 | 돌격 중심 편성 | practice | striker-first | 없음 | won | 45.7 | 0.00 | 11 | 4 / 4 | 28 | 6.97 |
| 3 | 돌격 중심 편성 | practice | striker-first | 사용 | won | 45.7 | 0.00 | 11 | 4 / 4 | 28 | 6.97 |
| 3 | 돌격 중심 편성 | practice | scout-first | 없음 | won | 50.8 | 0.00 | 11 | 4 / 4 | 30 | 7.19 |
| 3 | 돌격 중심 편성 | practice | scout-first | 사용 | won | 50.8 | 0.00 | 11 | 4 / 4 | 30 | 7.19 |
| 3 | 방패 중심 편성 | practice | guard-first | 없음 | won | 48.5 | 0.00 | 8 | 4 / 4 | 32 | 7.85 |
| 3 | 방패 중심 편성 | practice | guard-first | 사용 | won | 47.3 | 0.00 | 9 | 4 / 4 | 31 | 7.72 |
| 3 | 방패 중심 편성 | practice | striker-first | 없음 | won | 49.7 | 0.00 | 8 | 4 / 4 | 33 | 8.43 |
| 3 | 방패 중심 편성 | practice | striker-first | 사용 | won | 44.3 | 0.00 | 9 | 4 / 4 | 29 | 7.60 |
| 3 | 방패 중심 편성 | practice | scout-first | 없음 | won | 58.1 | 0.00 | 8 | 4 / 4 | 38 | 9.57 |
| 3 | 방패 중심 편성 | practice | scout-first | 사용 | won | 50.9 | 0.00 | 9 | 4 / 4 | 33 | 8.32 |
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
| 3 | 균형 편성 | standard | guard-first | 없음 | won | 39.8 | 0.00 | 8 | 4 / 4 | 35 | 8.82 |
| 3 | 균형 편성 | standard | guard-first | 사용 | won | 38.6 | 0.00 | 9 | 4 / 4 | 34 | 8.52 |
| 3 | 균형 편성 | standard | striker-first | 없음 | won | 41.4 | 0.00 | 8 | 4 / 4 | 36 | 8.96 |
| 3 | 균형 편성 | standard | striker-first | 사용 | won | 40.2 | 0.00 | 9 | 4 / 4 | 35 | 8.64 |
| 3 | 균형 편성 | standard | scout-first | 없음 | won | 42.3 | 0.00 | 8 | 4 / 4 | 37 | 9.08 |
| 3 | 균형 편성 | standard | scout-first | 사용 | won | 41.1 | 0.00 | 9 | 4 / 4 | 36 | 8.76 |
| 3 | 최종 결전 편성 | standard | guard-first | 없음 | won | 36.2 | 0.00 | 9 | 4 / 4 | 33 | 7.80 |
| 3 | 최종 결전 편성 | standard | guard-first | 사용 | won | 35.6 | 0.00 | 10 | 4 / 4 | 33 | 7.77 |
| 3 | 최종 결전 편성 | standard | striker-first | 없음 | won | 39.2 | 0.00 | 9 | 4 / 4 | 35 | 8.28 |
| 3 | 최종 결전 편성 | standard | striker-first | 사용 | won | 38.6 | 0.00 | 10 | 4 / 4 | 35 | 8.01 |
| 3 | 최종 결전 편성 | standard | scout-first | 없음 | won | 39.3 | 0.00 | 9 | 4 / 4 | 35 | 8.06 |
| 3 | 최종 결전 편성 | standard | scout-first | 사용 | won | 38.7 | 0.00 | 10 | 4 / 4 | 35 | 8.01 |
| 3 | 돌격 중심 편성 | standard | guard-first | 없음 | won | 45.7 | 0.00 | 9 | 4 / 4 | 35 | 8.48 |
| 3 | 돌격 중심 편성 | standard | guard-first | 사용 | won | 45.7 | 0.00 | 10 | 4 / 4 | 35 | 8.58 |
| 3 | 돌격 중심 편성 | standard | striker-first | 없음 | won | 45.7 | 0.00 | 9 | 4 / 4 | 35 | 8.48 |
| 3 | 돌격 중심 편성 | standard | striker-first | 사용 | won | 45.7 | 0.00 | 11 | 4 / 4 | 35 | 8.81 |
| 3 | 돌격 중심 편성 | standard | scout-first | 없음 | won | 50.8 | 0.00 | 9 | 4 / 4 | 39 | 9.06 |
| 3 | 돌격 중심 편성 | standard | scout-first | 사용 | won | 50.8 | 0.00 | 11 | 4 / 4 | 39 | 9.32 |
| 3 | 방패 중심 편성 | standard | guard-first | 없음 | won | 54.5 | 0.00 | 8 | 4 / 4 | 47 | 11.20 |
| 3 | 방패 중심 편성 | standard | guard-first | 사용 | won | 48.5 | 0.00 | 8 | 4 / 4 | 42 | 9.94 |
| 3 | 방패 중심 편성 | standard | striker-first | 없음 | won | 51.5 | 0.00 | 8 | 4 / 4 | 45 | 11.22 |
| 3 | 방패 중심 편성 | standard | striker-first | 사용 | won | 49.7 | 0.00 | 8 | 4 / 4 | 43 | 10.98 |
| 3 | 방패 중심 편성 | standard | scout-first | 없음 | won | 58.1 | 0.00 | 8 | 4 / 4 | 50 | 12.31 |
| 3 | 방패 중심 편성 | standard | scout-first | 사용 | won | 52.1 | 0.00 | 8 | 4 / 4 | 45 | 10.76 |
| 3 | 정찰 중심 편성 | standard | guard-first | 없음 | lost | 180 | 9.99 | 0 | 3 / 4 | 82 | 18.60 |
| 3 | 정찰 중심 편성 | standard | guard-first | 사용 | lost | 180 | 9.99 | 0 | 3 / 4 | 88 | 20.52 |
| 3 | 정찰 중심 편성 | standard | striker-first | 없음 | lost | 180 | 9.99 | 0 | 3 / 4 | 82 | 18.60 |
| 3 | 정찰 중심 편성 | standard | striker-first | 사용 | lost | 180 | 9.99 | 0 | 3 / 4 | 88 | 20.52 |
| 3 | 정찰 중심 편성 | standard | scout-first | 없음 | lost | 180 | 9.99 | 0 | 3 / 4 | 82 | 18.60 |
| 3 | 정찰 중심 편성 | standard | scout-first | 사용 | lost | 180 | 9.99 | 0 | 3 / 4 | 92 | 21.24 |
| 3 | 소규모 편성 | standard | guard-first | 없음 | lost | 180 | 9.99 | 0 | 3 / 4 | 48 | 9.00 |
| 3 | 소규모 편성 | standard | guard-first | 사용 | lost | 180 | 9.99 | 0 | 3 / 4 | 54 | 10.97 |
| 3 | 소규모 편성 | standard | striker-first | 없음 | lost | 180 | 9.99 | 0 | 3 / 4 | 48 | 9.00 |
| 3 | 소규모 편성 | standard | striker-first | 사용 | lost | 180 | 9.99 | 0 | 3 / 4 | 56 | 11.33 |
| 3 | 소규모 편성 | standard | scout-first | 없음 | lost | 180 | 9.99 | 0 | 3 / 4 | 47 | 9.00 |
| 3 | 소규모 편성 | standard | scout-first | 사용 | lost | 180 | 9.99 | 0 | 3 / 4 | 55 | 11.33 |
| 3 | 균형 편성 | challenge | guard-first | 없음 | won | 39.8 | 0.00 | 8 | 4 / 4 | 42 | 10.42 |
| 3 | 균형 편성 | challenge | guard-first | 사용 | won | 39.8 | 0.00 | 8 | 4 / 4 | 42 | 10.62 |
| 3 | 균형 편성 | challenge | striker-first | 없음 | won | 41.4 | 0.00 | 8 | 4 / 4 | 44 | 10.39 |
| 3 | 균형 편성 | challenge | striker-first | 사용 | won | 41.4 | 0.00 | 8 | 4 / 4 | 44 | 10.54 |
| 3 | 균형 편성 | challenge | scout-first | 없음 | won | 42.3 | 0.00 | 8 | 4 / 4 | 45 | 10.51 |
| 3 | 균형 편성 | challenge | scout-first | 사용 | won | 42.3 | 0.00 | 8 | 4 / 4 | 45 | 10.66 |
| 3 | 최종 결전 편성 | challenge | guard-first | 없음 | won | 36.2 | 0.00 | 9 | 4 / 4 | 40 | 9.45 |
| 3 | 최종 결전 편성 | challenge | guard-first | 사용 | won | 36.2 | 0.00 | 9 | 4 / 4 | 40 | 9.60 |
| 3 | 최종 결전 편성 | challenge | striker-first | 없음 | won | 39.2 | 0.00 | 9 | 4 / 4 | 42 | 9.71 |
| 3 | 최종 결전 편성 | challenge | striker-first | 사용 | won | 39.2 | 0.00 | 9 | 4 / 4 | 42 | 9.86 |
| 3 | 최종 결전 편성 | challenge | scout-first | 없음 | won | 39.3 | 0.00 | 9 | 4 / 4 | 43 | 9.83 |
| 3 | 최종 결전 편성 | challenge | scout-first | 사용 | won | 39.3 | 0.00 | 9 | 4 / 4 | 43 | 9.64 |
| 3 | 돌격 중심 편성 | challenge | guard-first | 없음 | won | 40.9 | 0.00 | 9 | 4 / 4 | 38 | 8.82 |
| 3 | 돌격 중심 편성 | challenge | guard-first | 사용 | won | 45.7 | 0.00 | 9 | 4 / 4 | 43 | 10.35 |
| 3 | 돌격 중심 편성 | challenge | striker-first | 없음 | won | 57.7 | 0.00 | 7 | 4 / 4 | 55 | 13.96 |
| 3 | 돌격 중심 편성 | challenge | striker-first | 사용 | won | 45.7 | 0.00 | 10 | 4 / 4 | 43 | 10.44 |
| 3 | 돌격 중심 편성 | challenge | scout-first | 없음 | won | 62.8 | 0.00 | 7 | 4 / 4 | 60 | 14.32 |
| 3 | 돌격 중심 편성 | challenge | scout-first | 사용 | won | 50.8 | 0.00 | 9 | 4 / 4 | 48 | 11.05 |
| 3 | 방패 중심 편성 | challenge | guard-first | 없음 | won | 54.5 | 0.00 | 7 | 4 / 4 | 56 | 13.88 |
| 3 | 방패 중심 편성 | challenge | guard-first | 사용 | won | 54.5 | 0.00 | 7 | 4 / 4 | 56 | 13.98 |
| 3 | 방패 중심 편성 | challenge | striker-first | 없음 | won | 51.5 | 0.00 | 7 | 4 / 4 | 54 | 13.56 |
| 3 | 방패 중심 편성 | challenge | striker-first | 사용 | won | 51.5 | 0.00 | 8 | 4 / 4 | 54 | 14.04 |
| 3 | 방패 중심 편성 | challenge | scout-first | 없음 | won | 58.1 | 0.00 | 7 | 4 / 4 | 59 | 15.04 |
| 3 | 방패 중심 편성 | challenge | scout-first | 사용 | won | 58.1 | 0.00 | 7 | 4 / 4 | 59 | 14.80 |
| 3 | 정찰 중심 편성 | challenge | guard-first | 없음 | lost | 180 | 9.99 | 0 | 3 / 4 | 83 | 18.60 |
| 3 | 정찰 중심 편성 | challenge | guard-first | 사용 | lost | 180 | 9.99 | 0 | 3 / 4 | 90 | 20.52 |
| 3 | 정찰 중심 편성 | challenge | striker-first | 없음 | lost | 180 | 9.99 | 0 | 3 / 4 | 83 | 18.60 |
| 3 | 정찰 중심 편성 | challenge | striker-first | 사용 | lost | 180 | 9.99 | 0 | 3 / 4 | 90 | 20.52 |
| 3 | 정찰 중심 편성 | challenge | scout-first | 없음 | lost | 180 | 9.99 | 0 | 3 / 4 | 86 | 18.60 |
| 3 | 정찰 중심 편성 | challenge | scout-first | 사용 | lost | 180 | 9.99 | 0 | 3 / 4 | 94 | 21.48 |
| 3 | 소규모 편성 | challenge | guard-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 51 | 9.00 |
| 3 | 소규모 편성 | challenge | guard-first | 사용 | lost | 180 | 9.99 | 0 | 3 / 4 | 57 | 10.97 |
| 3 | 소규모 편성 | challenge | striker-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 51 | 9.00 |
| 3 | 소규모 편성 | challenge | striker-first | 사용 | lost | 180 | 9.99 | 0 | 3 / 4 | 58 | 11.33 |
| 3 | 소규모 편성 | challenge | scout-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 51 | 9.00 |
| 3 | 소규모 편성 | challenge | scout-first | 사용 | lost | 180 | 9.99 | 0 | 3 / 4 | 59 | 11.45 |
| 4 | 균형 편성 | practice | guard-first | 없음 | won | 39.7 | 0.00 | 9 | 4 / 4 | 26 | 6.17 |
| 4 | 균형 편성 | practice | guard-first | 사용 | won | 39.7 | 0.00 | 9 | 4 / 4 | 26 | 6.17 |
| 4 | 균형 편성 | practice | striker-first | 없음 | won | 33 | 0.00 | 9 | 4 / 4 | 22 | 5.73 |
| 4 | 균형 편성 | practice | striker-first | 사용 | won | 33 | 0.00 | 9 | 4 / 4 | 22 | 5.73 |
| 4 | 균형 편성 | practice | scout-first | 없음 | won | 41.9 | 0.00 | 9 | 4 / 4 | 27 | 6.30 |
| 4 | 균형 편성 | practice | scout-first | 사용 | won | 41.9 | 0.00 | 9 | 4 / 4 | 27 | 6.30 |
| 4 | 최종 결전 편성 | practice | guard-first | 없음 | won | 37 | 0.00 | 10 | 4 / 4 | 24 | 5.50 |
| 4 | 최종 결전 편성 | practice | guard-first | 사용 | won | 37 | 0.00 | 10 | 4 / 4 | 24 | 5.50 |
| 4 | 최종 결전 편성 | practice | striker-first | 없음 | won | 31.3 | 0.00 | 10 | 4 / 4 | 21 | 5.06 |
| 4 | 최종 결전 편성 | practice | striker-first | 사용 | won | 31.3 | 0.00 | 10 | 4 / 4 | 21 | 5.06 |
| 4 | 최종 결전 편성 | practice | scout-first | 없음 | won | 40 | 0.00 | 10 | 4 / 4 | 25 | 5.63 |
| 4 | 최종 결전 편성 | practice | scout-first | 사용 | won | 40 | 0.00 | 10 | 4 / 4 | 25 | 5.63 |
| 4 | 돌격 중심 편성 | practice | guard-first | 없음 | won | 65.1 | 0.00 | 8 | 4 / 4 | 42 | 10.56 |
| 4 | 돌격 중심 편성 | practice | guard-first | 사용 | won | 53.1 | 0.00 | 10 | 4 / 4 | 34 | 8.36 |
| 4 | 돌격 중심 편성 | practice | striker-first | 없음 | won | 48.6 | 0.00 | 9 | 4 / 4 | 31 | 8.16 |
| 4 | 돌격 중심 편성 | practice | striker-first | 사용 | won | 48.6 | 0.00 | 11 | 4 / 4 | 31 | 8.51 |
| 4 | 돌격 중심 편성 | practice | scout-first | 없음 | won | 59.3 | 0.00 | 9 | 4 / 4 | 41 | 9.86 |
| 4 | 돌격 중심 편성 | practice | scout-first | 사용 | won | 76.1 | 0.00 | 8 | 4 / 4 | 51 | 13.58 |
| 4 | 방패 중심 편성 | practice | guard-first | 없음 | won | 61.3 | 0.00 | 8 | 4 / 4 | 42 | 10.16 |
| 4 | 방패 중심 편성 | practice | guard-first | 사용 | won | 59.5 | 0.00 | 8 | 4 / 4 | 40 | 10.16 |
| 4 | 방패 중심 편성 | practice | striker-first | 없음 | won | 58.3 | 0.00 | 8 | 4 / 4 | 40 | 10.42 |
| 4 | 방패 중심 편성 | practice | striker-first | 사용 | won | 56.5 | 0.00 | 8 | 4 / 4 | 38 | 10.06 |
| 4 | 방패 중심 편성 | practice | scout-first | 없음 | won | 59.2 | 0.00 | 8 | 4 / 4 | 41 | 10.55 |
| 4 | 방패 중심 편성 | practice | scout-first | 사용 | won | 57.4 | 0.00 | 8 | 4 / 4 | 39 | 10.19 |
| 4 | 정찰 중심 편성 | practice | guard-first | 없음 | lost | 180 | 9.99 | 0 | 3 / 4 | 76 | 18.60 |
| 4 | 정찰 중심 편성 | practice | guard-first | 사용 | lost | 180 | 9.99 | 0 | 3 / 4 | 83 | 20.58 |
| 4 | 정찰 중심 편성 | practice | striker-first | 없음 | lost | 180 | 9.99 | 0 | 3 / 4 | 76 | 18.60 |
| 4 | 정찰 중심 편성 | practice | striker-first | 사용 | lost | 180 | 9.99 | 0 | 3 / 4 | 83 | 20.58 |
| 4 | 정찰 중심 편성 | practice | scout-first | 없음 | lost | 180 | 9.99 | 0 | 3 / 4 | 77 | 18.60 |
| 4 | 정찰 중심 편성 | practice | scout-first | 사용 | lost | 180 | 9.99 | 0 | 3 / 4 | 85 | 21.36 |
| 4 | 소규모 편성 | practice | guard-first | 없음 | lost | 180 | 9.99 | 0 | 3 / 4 | 37 | 9.00 |
| 4 | 소규모 편성 | practice | guard-first | 사용 | lost | 180 | 9.99 | 0 | 3 / 4 | 45 | 11.24 |
| 4 | 소규모 편성 | practice | striker-first | 없음 | lost | 180 | 9.99 | 0 | 3 / 4 | 38 | 9.00 |
| 4 | 소규모 편성 | practice | striker-first | 사용 | lost | 180 | 9.99 | 0 | 3 / 4 | 45 | 11.50 |
| 4 | 소규모 편성 | practice | scout-first | 없음 | lost | 180 | 9.99 | 0 | 3 / 4 | 37 | 9.00 |
| 4 | 소규모 편성 | practice | scout-first | 사용 | lost | 180 | 9.94 | 0 | 4 / 4 | 47 | 11.63 |
| 4 | 균형 편성 | standard | guard-first | 없음 | won | 40.9 | 0.00 | 8 | 4 / 4 | 33 | 8.41 |
| 4 | 균형 편성 | standard | guard-first | 사용 | won | 39.7 | 0.00 | 9 | 4 / 4 | 32 | 7.77 |
| 4 | 균형 편성 | standard | striker-first | 없음 | won | 33 | 0.00 | 9 | 4 / 4 | 27 | 7.20 |
| 4 | 균형 편성 | standard | striker-first | 사용 | won | 33 | 0.00 | 9 | 4 / 4 | 27 | 7.20 |
| 4 | 균형 편성 | standard | scout-first | 없음 | won | 43.1 | 0.00 | 8 | 4 / 4 | 35 | 8.70 |
| 4 | 균형 편성 | standard | scout-first | 사용 | won | 41.9 | 0.00 | 9 | 4 / 4 | 34 | 8.03 |
| 4 | 최종 결전 편성 | standard | guard-first | 없음 | won | 37.6 | 0.00 | 9 | 4 / 4 | 31 | 6.97 |
| 4 | 최종 결전 편성 | standard | guard-first | 사용 | won | 37 | 0.00 | 10 | 4 / 4 | 30 | 7.10 |
| 4 | 최종 결전 편성 | standard | striker-first | 없음 | won | 31.3 | 0.00 | 10 | 4 / 4 | 25 | 6.53 |
| 4 | 최종 결전 편성 | standard | striker-first | 사용 | won | 31.3 | 0.00 | 10 | 4 / 4 | 25 | 6.53 |
| 4 | 최종 결전 편성 | standard | scout-first | 없음 | won | 40.6 | 0.00 | 9 | 4 / 4 | 33 | 7.26 |
| 4 | 최종 결전 편성 | standard | scout-first | 사용 | won | 40 | 0.00 | 10 | 4 / 4 | 32 | 7.36 |
| 4 | 돌격 중심 편성 | standard | guard-first | 없음 | won | 54.1 | 0.00 | 8 | 4 / 4 | 48 | 11.64 |
| 4 | 돌격 중심 편성 | standard | guard-first | 사용 | won | 59.1 | 0.00 | 8 | 4 / 4 | 48 | 12.54 |
| 4 | 돌격 중심 편성 | standard | striker-first | 없음 | won | 60.6 | 0.00 | 7 | 4 / 4 | 50 | 13.68 |
| 4 | 돌격 중심 편성 | standard | striker-first | 사용 | won | 48.6 | 0.00 | 10 | 4 / 4 | 40 | 10.54 |
| 4 | 돌격 중심 편성 | standard | scout-first | 없음 | won | 59.3 | 0.00 | 8 | 4 / 4 | 52 | 12.62 |
| 4 | 돌격 중심 편성 | standard | scout-first | 사용 | won | 59.3 | 0.00 | 9 | 4 / 4 | 52 | 12.85 |
| 4 | 방패 중심 편성 | standard | guard-first | 없음 | won | 63.1 | 0.00 | 7 | 4 / 4 | 55 | 14.17 |
| 4 | 방패 중심 편성 | standard | guard-first | 사용 | won | 61.3 | 0.00 | 7 | 4 / 4 | 52 | 13.81 |
| 4 | 방패 중심 편성 | standard | striker-first | 없음 | won | 58.3 | 0.00 | 7 | 4 / 4 | 50 | 13.12 |
| 4 | 방패 중심 편성 | standard | striker-first | 사용 | won | 58.3 | 0.00 | 7 | 4 / 4 | 50 | 13.84 |
| 4 | 방패 중심 편성 | standard | scout-first | 없음 | won | 59.2 | 0.00 | 7 | 4 / 4 | 51 | 13.25 |
| 4 | 방패 중심 편성 | standard | scout-first | 사용 | won | 59.2 | 0.00 | 7 | 4 / 4 | 51 | 13.97 |
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
| 4 | 균형 편성 | challenge | guard-first | 없음 | won | 40.9 | 0.00 | 8 | 4 / 4 | 43 | 10.42 |
| 4 | 균형 편성 | challenge | guard-first | 사용 | won | 40.9 | 0.00 | 8 | 4 / 4 | 43 | 10.47 |
| 4 | 균형 편성 | challenge | striker-first | 없음 | won | 38.4 | 0.00 | 7 | 4 / 4 | 42 | 11.40 |
| 4 | 균형 편성 | challenge | striker-first | 사용 | won | 33 | 0.00 | 9 | 4 / 4 | 36 | 9.16 |
| 4 | 균형 편성 | challenge | scout-first | 없음 | won | 43.1 | 0.00 | 8 | 4 / 4 | 45 | 10.53 |
| 4 | 균형 편성 | challenge | scout-first | 사용 | won | 47.3 | 0.00 | 8 | 4 / 4 | 50 | 12.69 |
| 4 | 최종 결전 편성 | challenge | guard-first | 없음 | won | 37.9 | 0.00 | 9 | 4 / 4 | 40 | 9.03 |
| 4 | 최종 결전 편성 | challenge | guard-first | 사용 | won | 37 | 0.00 | 9 | 4 / 4 | 39 | 8.67 |
| 4 | 최종 결전 편성 | challenge | striker-first | 없음 | won | 36.1 | 0.00 | 8 | 4 / 4 | 38 | 9.96 |
| 4 | 최종 결전 편성 | challenge | striker-first | 사용 | won | 31.3 | 0.00 | 10 | 4 / 4 | 33 | 8.13 |
| 4 | 최종 결전 편성 | challenge | scout-first | 없음 | won | 40.6 | 0.00 | 9 | 4 / 4 | 42 | 9.45 |
| 4 | 최종 결전 편성 | challenge | scout-first | 사용 | won | 40 | 0.00 | 10 | 4 / 4 | 41 | 9.27 |
| 4 | 돌격 중심 편성 | challenge | guard-first | 없음 | won | 60.1 | 0.00 | 5 | 4 / 4 | 74 | 17.76 |
| 4 | 돌격 중심 편성 | challenge | guard-first | 사용 | won | 54.1 | 0.00 | 7 | 4 / 4 | 61 | 15.33 |
| 4 | 돌격 중심 편성 | challenge | striker-first | 없음 | won | 49.6 | 0.00 | 6 | 4 / 4 | 57 | 15.36 |
| 4 | 돌격 중심 편성 | challenge | striker-first | 사용 | won | 60.6 | 0.00 | 7 | 4 / 4 | 65 | 18.12 |
| 4 | 돌격 중심 편성 | challenge | scout-first | 없음 | won | 65.3 | 0.00 | 5 | 4 / 4 | 78 | 18.87 |
| 4 | 돌격 중심 편성 | challenge | scout-first | 사용 | won | 59.3 | 0.00 | 7 | 4 / 4 | 65 | 16.37 |
| 4 | 방패 중심 편성 | challenge | guard-first | 없음 | won | 63.1 | 0.00 | 6 | 4 / 4 | 71 | 19.11 |
| 4 | 방패 중심 편성 | challenge | guard-first | 사용 | won | 63.1 | 0.00 | 6 | 4 / 4 | 71 | 19.47 |
| 4 | 방패 중심 편성 | challenge | striker-first | 없음 | won | 60.1 | 0.00 | 6 | 4 / 4 | 68 | 19.14 |
| 4 | 방패 중심 편성 | challenge | striker-first | 사용 | won | 58.3 | 0.00 | 7 | 4 / 4 | 65 | 17.70 |
| 4 | 방패 중심 편성 | challenge | scout-first | 없음 | won | 61 | 0.00 | 6 | 4 / 4 | 69 | 19.40 |
| 4 | 방패 중심 편성 | challenge | scout-first | 사용 | won | 59.2 | 0.00 | 7 | 4 / 4 | 66 | 17.24 |
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
| 5 | 균형 편성 | practice | guard-first | 없음 | won | 39.7 | 0.00 | 8 | 4 / 4 | 31 | 8.48 |
| 5 | 균형 편성 | practice | guard-first | 사용 | won | 38.5 | 0.00 | 9 | 4 / 4 | 30 | 8.68 |
| 5 | 균형 편성 | practice | striker-first | 없음 | won | 41 | 0.00 | 8 | 4 / 4 | 31 | 8.90 |
| 5 | 균형 편성 | practice | striker-first | 사용 | won | 39.8 | 0.00 | 9 | 4 / 4 | 30 | 8.82 |
| 5 | 균형 편성 | practice | scout-first | 없음 | won | 41.8 | 0.00 | 8 | 4 / 4 | 32 | 9.04 |
| 5 | 균형 편성 | practice | scout-first | 사용 | won | 40.6 | 0.00 | 9 | 4 / 4 | 31 | 8.96 |
| 5 | 최종 결전 편성 | practice | guard-first | 없음 | won | 43.1 | 0.00 | 9 | 4 / 4 | 32 | 8.81 |
| 5 | 최종 결전 편성 | practice | guard-first | 사용 | won | 42.5 | 0.00 | 9 | 4 / 4 | 32 | 8.76 |
| 5 | 최종 결전 편성 | practice | striker-first | 없음 | won | 40.1 | 0.00 | 9 | 4 / 4 | 31 | 8.52 |
| 5 | 최종 결전 편성 | practice | striker-first | 사용 | won | 39.5 | 0.00 | 10 | 4 / 4 | 31 | 8.96 |
| 5 | 최종 결전 편성 | practice | scout-first | 없음 | won | 40.4 | 0.00 | 9 | 4 / 4 | 31 | 8.66 |
| 5 | 최종 결전 편성 | practice | scout-first | 사용 | won | 39.8 | 0.00 | 10 | 4 / 4 | 31 | 8.96 |
| 5 | 돌격 중심 편성 | practice | guard-first | 없음 | won | 42.1 | 0.00 | 9 | 4 / 4 | 30 | 8.18 |
| 5 | 돌격 중심 편성 | practice | guard-first | 사용 | won | 46.9 | 0.00 | 10 | 4 / 4 | 33 | 9.57 |
| 5 | 돌격 중심 편성 | practice | striker-first | 없음 | won | 48.1 | 0.00 | 9 | 4 / 4 | 33 | 8.56 |
| 5 | 돌격 중심 편성 | practice | striker-first | 사용 | won | 52.9 | 0.00 | 10 | 4 / 4 | 36 | 10.27 |
| 5 | 돌격 중심 편성 | practice | scout-first | 없음 | won | 47.3 | 0.00 | 9 | 4 / 4 | 33 | 8.84 |
| 5 | 돌격 중심 편성 | practice | scout-first | 사용 | won | 52.1 | 0.00 | 10 | 4 / 4 | 36 | 10.03 |
| 5 | 방패 중심 편성 | practice | guard-first | 없음 | won | 58 | 0.00 | 8 | 4 / 4 | 41 | 11.47 |
| 5 | 방패 중심 편성 | practice | guard-first | 사용 | won | 58 | 0.00 | 8 | 4 / 4 | 41 | 11.80 |
| 5 | 방패 중심 편성 | practice | striker-first | 없음 | won | 50.8 | 0.00 | 8 | 4 / 4 | 38 | 11.04 |
| 5 | 방패 중심 편성 | practice | striker-first | 사용 | won | 49 | 0.00 | 8 | 4 / 4 | 37 | 10.94 |
| 5 | 방패 중심 편성 | practice | scout-first | 없음 | won | 61.6 | 0.00 | 8 | 4 / 4 | 43 | 11.89 |
| 5 | 방패 중심 편성 | practice | scout-first | 사용 | won | 61.6 | 0.00 | 8 | 4 / 4 | 43 | 12.22 |
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
| 5 | 균형 편성 | standard | guard-first | 없음 | won | 39.7 | 0.00 | 8 | 4 / 4 | 41 | 11.37 |
| 5 | 균형 편성 | standard | guard-first | 사용 | won | 39.7 | 0.00 | 8 | 4 / 4 | 41 | 11.04 |
| 5 | 균형 편성 | standard | striker-first | 없음 | won | 41 | 0.00 | 8 | 4 / 4 | 42 | 11.60 |
| 5 | 균형 편성 | standard | striker-first | 사용 | won | 41 | 0.00 | 8 | 4 / 4 | 42 | 11.60 |
| 5 | 균형 편성 | standard | scout-first | 없음 | won | 41.8 | 0.00 | 8 | 4 / 4 | 42 | 11.74 |
| 5 | 균형 편성 | standard | scout-first | 사용 | won | 41.8 | 0.00 | 8 | 4 / 4 | 42 | 11.74 |
| 5 | 최종 결전 편성 | standard | guard-first | 없음 | won | 43.1 | 0.00 | 9 | 4 / 4 | 43 | 10.99 |
| 5 | 최종 결전 편성 | standard | guard-first | 사용 | won | 43.1 | 0.00 | 9 | 4 / 4 | 43 | 10.99 |
| 5 | 최종 결전 편성 | standard | striker-first | 없음 | won | 40.1 | 0.00 | 9 | 4 / 4 | 41 | 10.46 |
| 5 | 최종 결전 편성 | standard | striker-first | 사용 | won | 40.1 | 0.00 | 9 | 4 / 4 | 41 | 10.46 |
| 5 | 최종 결전 편성 | standard | scout-first | 없음 | won | 40.4 | 0.00 | 9 | 4 / 4 | 41 | 10.98 |
| 5 | 최종 결전 편성 | standard | scout-first | 사용 | won | 40.4 | 0.00 | 9 | 4 / 4 | 41 | 10.98 |
| 5 | 돌격 중심 편성 | standard | guard-first | 없음 | won | 42.1 | 0.00 | 8 | 4 / 4 | 39 | 10.58 |
| 5 | 돌격 중심 편성 | standard | guard-first | 사용 | won | 42.1 | 0.00 | 9 | 4 / 4 | 39 | 10.83 |
| 5 | 돌격 중심 편성 | standard | striker-first | 없음 | won | 48.1 | 0.00 | 8 | 4 / 4 | 43 | 11.72 |
| 5 | 돌격 중심 편성 | standard | striker-first | 사용 | won | 48.1 | 0.00 | 9 | 4 / 4 | 43 | 11.67 |
| 5 | 돌격 중심 편성 | standard | scout-first | 없음 | won | 47.3 | 0.00 | 8 | 4 / 4 | 42 | 11.38 |
| 5 | 돌격 중심 편성 | standard | scout-first | 사용 | won | 47.3 | 0.00 | 9 | 4 / 4 | 42 | 11.43 |
| 5 | 방패 중심 편성 | standard | guard-first | 없음 | won | 58 | 0.00 | 7 | 4 / 4 | 55 | 15.02 |
| 5 | 방패 중심 편성 | standard | guard-first | 사용 | won | 58 | 0.00 | 7 | 4 / 4 | 55 | 14.92 |
| 5 | 방패 중심 편성 | standard | striker-first | 없음 | won | 50.8 | 0.00 | 7 | 4 / 4 | 50 | 14.68 |
| 5 | 방패 중심 편성 | standard | striker-first | 사용 | won | 50.8 | 0.00 | 8 | 4 / 4 | 50 | 14.45 |
| 5 | 방패 중심 편성 | standard | scout-first | 없음 | won | 61.6 | 0.00 | 7 | 4 / 4 | 57 | 15.96 |
| 5 | 방패 중심 편성 | standard | scout-first | 사용 | won | 61.6 | 0.00 | 7 | 4 / 4 | 57 | 15.48 |
| 5 | 정찰 중심 편성 | standard | guard-first | 없음 | lost | 180 | 9.99 | 0 | 3 / 4 | 81 | 18.60 |
| 5 | 정찰 중심 편성 | standard | guard-first | 사용 | lost | 180 | 9.99 | 0 | 3 / 4 | 87 | 20.54 |
| 5 | 정찰 중심 편성 | standard | striker-first | 없음 | lost | 180 | 9.99 | 0 | 3 / 4 | 81 | 18.60 |
| 5 | 정찰 중심 편성 | standard | striker-first | 사용 | lost | 180 | 9.99 | 0 | 3 / 4 | 87 | 20.54 |
| 5 | 정찰 중심 편성 | standard | scout-first | 없음 | lost | 180 | 9.99 | 0 | 3 / 4 | 84 | 18.60 |
| 5 | 정찰 중심 편성 | standard | scout-first | 사용 | lost | 180 | 9.99 | 0 | 3 / 4 | 92 | 21.52 |
| 5 | 소규모 편성 | standard | guard-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 42 | 9.00 |
| 5 | 소규모 편성 | standard | guard-first | 사용 | lost | 180 | 9.99 | 0 | 2 / 4 | 49 | 10.99 |
| 5 | 소규모 편성 | standard | striker-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 43 | 9.00 |
| 5 | 소규모 편성 | standard | striker-first | 사용 | lost | 180 | 9.99 | 0 | 2 / 4 | 51 | 11.41 |
| 5 | 소규모 편성 | standard | scout-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 42 | 9.00 |
| 5 | 소규모 편성 | standard | scout-first | 사용 | lost | 180 | 9.99 | 0 | 2 / 4 | 50 | 11.41 |
| 5 | 균형 편성 | challenge | guard-first | 없음 | won | 39.7 | 0.00 | 7 | 4 / 4 | 50 | 13.88 |
| 5 | 균형 편성 | challenge | guard-first | 사용 | won | 39.7 | 0.00 | 8 | 4 / 4 | 50 | 13.93 |
| 5 | 균형 편성 | challenge | striker-first | 없음 | won | 41 | 0.00 | 7 | 4 / 4 | 51 | 14.20 |
| 5 | 균형 편성 | challenge | striker-first | 사용 | won | 41 | 0.00 | 8 | 4 / 4 | 51 | 13.92 |
| 5 | 균형 편성 | challenge | scout-first | 없음 | won | 41.8 | 0.00 | 7 | 4 / 4 | 52 | 14.10 |
| 5 | 균형 편성 | challenge | scout-first | 사용 | won | 41.8 | 0.00 | 8 | 4 / 4 | 52 | 14.20 |
| 5 | 최종 결전 편성 | challenge | guard-first | 없음 | won | 44.3 | 0.00 | 8 | 4 / 4 | 53 | 14.26 |
| 5 | 최종 결전 편성 | challenge | guard-first | 사용 | won | 43.1 | 0.00 | 9 | 4 / 4 | 51 | 13.93 |
| 5 | 최종 결전 편성 | challenge | striker-first | 없음 | won | 45.5 | 0.00 | 8 | 4 / 4 | 55 | 16.10 |
| 5 | 최종 결전 편성 | challenge | striker-first | 사용 | won | 40.1 | 0.00 | 9 | 4 / 4 | 49 | 13.54 |
| 5 | 최종 결전 편성 | challenge | scout-first | 없음 | won | 40.4 | 0.00 | 8 | 4 / 4 | 50 | 13.72 |
| 5 | 최종 결전 편성 | challenge | scout-first | 사용 | won | 40.4 | 0.00 | 9 | 4 / 4 | 50 | 13.82 |
| 5 | 돌격 중심 편성 | challenge | guard-first | 없음 | won | 42.1 | 0.00 | 7 | 4 / 4 | 49 | 13.74 |
| 5 | 돌격 중심 편성 | challenge | guard-first | 사용 | won | 42.1 | 0.00 | 8 | 4 / 4 | 49 | 13.61 |
| 5 | 돌격 중심 편성 | challenge | striker-first | 없음 | won | 48.1 | 0.00 | 7 | 4 / 4 | 54 | 13.74 |
| 5 | 돌격 중심 편성 | challenge | striker-first | 사용 | won | 48.1 | 0.00 | 8 | 4 / 4 | 54 | 14.35 |
| 5 | 돌격 중심 편성 | challenge | scout-first | 없음 | won | 47.3 | 0.00 | 7 | 4 / 4 | 54 | 14.16 |
| 5 | 돌격 중심 편성 | challenge | scout-first | 사용 | won | 47.3 | 0.00 | 8 | 4 / 4 | 54 | 14.45 |
| 5 | 방패 중심 편성 | challenge | guard-first | 없음 | won | 59.3 | 0.00 | 6 | 4 / 4 | 74 | 21.18 |
| 5 | 방패 중심 편성 | challenge | guard-first | 사용 | won | 58 | 0.00 | 6 | 4 / 4 | 67 | 19.18 |
| 5 | 방패 중심 편성 | challenge | striker-first | 없음 | won | 50.8 | 0.00 | 6 | 4 / 4 | 61 | 18.18 |
| 5 | 방패 중심 편성 | challenge | striker-first | 사용 | won | 50.8 | 0.00 | 7 | 4 / 4 | 61 | 18.76 |
| 5 | 방패 중심 편성 | challenge | scout-first | 없음 | won | 62.9 | 0.00 | 6 | 4 / 4 | 77 | 21.88 |
| 5 | 방패 중심 편성 | challenge | scout-first | 사용 | won | 61.6 | 0.00 | 6 | 4 / 4 | 70 | 19.88 |
| 5 | 정찰 중심 편성 | challenge | guard-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 87 | 18.60 |
| 5 | 정찰 중심 편성 | challenge | guard-first | 사용 | lost | 180 | 9.99 | 0 | 3 / 4 | 92 | 20.54 |
| 5 | 정찰 중심 편성 | challenge | striker-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 87 | 18.60 |
| 5 | 정찰 중심 편성 | challenge | striker-first | 사용 | lost | 180 | 9.99 | 0 | 3 / 4 | 92 | 20.54 |
| 5 | 정찰 중심 편성 | challenge | scout-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 89 | 18.60 |
| 5 | 정찰 중심 편성 | challenge | scout-first | 사용 | lost | 180 | 9.99 | 0 | 2 / 4 | 95 | 20.40 |
| 5 | 소규모 편성 | challenge | guard-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 45 | 9.00 |
| 5 | 소규모 편성 | challenge | guard-first | 사용 | lost | 180 | 9.99 | 0 | 2 / 4 | 52 | 10.99 |
| 5 | 소규모 편성 | challenge | striker-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 44 | 9.00 |
| 5 | 소규모 편성 | challenge | striker-first | 사용 | lost | 180 | 9.99 | 0 | 2 / 4 | 52 | 11.41 |
| 5 | 소규모 편성 | challenge | scout-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 44 | 9.00 |
| 5 | 소규모 편성 | challenge | scout-first | 사용 | lost | 180 | 9.99 | 0 | 3 / 4 | 53 | 11.55 |
| 6 | 균형 편성 | practice | guard-first | 없음 | won | 41.1 | 0.00 | 8 | 4 / 4 | 30 | 9.05 |
| 6 | 균형 편성 | practice | guard-first | 사용 | won | 41.1 | 0.00 | 8 | 4 / 4 | 30 | 9.30 |
| 6 | 균형 편성 | practice | striker-first | 없음 | won | 44.1 | 0.00 | 8 | 4 / 4 | 32 | 9.50 |
| 6 | 균형 편성 | practice | striker-first | 사용 | won | 48.3 | 0.00 | 8 | 4 / 4 | 35 | 10.55 |
| 6 | 균형 편성 | practice | scout-first | 없음 | won | 40.4 | 0.00 | 8 | 4 / 4 | 30 | 9.15 |
| 6 | 균형 편성 | practice | scout-first | 사용 | won | 39.2 | 0.00 | 8 | 4 / 4 | 29 | 8.85 |
| 6 | 최종 결전 편성 | practice | guard-first | 없음 | won | 39.4 | 0.00 | 9 | 4 / 4 | 30 | 8.25 |
| 6 | 최종 결전 편성 | practice | guard-first | 사용 | won | 38.8 | 0.00 | 9 | 4 / 4 | 30 | 8.45 |
| 6 | 최종 결전 편성 | practice | striker-first | 없음 | won | 42.4 | 0.00 | 9 | 4 / 4 | 31 | 8.30 |
| 6 | 최종 결전 편성 | practice | striker-first | 사용 | won | 41.8 | 0.00 | 10 | 4 / 4 | 31 | 8.65 |
| 6 | 최종 결전 편성 | practice | scout-first | 없음 | won | 37.9 | 0.00 | 9 | 4 / 4 | 29 | 7.90 |
| 6 | 최종 결전 편성 | practice | scout-first | 사용 | won | 37.3 | 0.00 | 10 | 4 / 4 | 29 | 8.20 |
| 6 | 돌격 중심 편성 | practice | guard-first | 없음 | won | 54.1 | 0.00 | 8 | 4 / 4 | 43 | 12.20 |
| 6 | 돌격 중심 편성 | practice | guard-first | 사용 | won | 48.1 | 0.00 | 9 | 4 / 4 | 36 | 10.10 |
| 6 | 돌격 중심 편성 | practice | striker-first | 없음 | won | 49.5 | 0.00 | 8 | 4 / 4 | 37 | 10.20 |
| 6 | 돌격 중심 편성 | practice | striker-first | 사용 | won | 49.5 | 0.00 | 10 | 4 / 4 | 37 | 10.45 |
| 6 | 돌격 중심 편성 | practice | scout-first | 없음 | won | 66.8 | 0.00 | 6 | 4 / 4 | 59 | 17.30 |
| 6 | 돌격 중심 편성 | practice | scout-first | 사용 | won | 54.8 | 0.00 | 9 | 4 / 4 | 45 | 11.95 |
| 6 | 방패 중심 편성 | practice | guard-first | 없음 | won | 58.7 | 0.00 | 7 | 4 / 4 | 45 | 13.65 |
| 6 | 방패 중심 편성 | practice | guard-first | 사용 | won | 58.5 | 0.00 | 8 | 4 / 4 | 45 | 13.60 |
| 6 | 방패 중심 편성 | practice | striker-first | 없음 | won | 55.5 | 0.00 | 7 | 4 / 4 | 44 | 13.15 |
| 6 | 방패 중심 편성 | practice | striker-first | 사용 | won | 55.5 | 0.00 | 8 | 4 / 4 | 44 | 13.15 |
| 6 | 방패 중심 편성 | practice | scout-first | 없음 | won | 56.3 | 0.00 | 7 | 4 / 4 | 44 | 13.30 |
| 6 | 방패 중심 편성 | practice | scout-first | 사용 | won | 56.3 | 0.00 | 8 | 4 / 4 | 44 | 13.30 |
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
| 6 | 균형 편성 | standard | guard-first | 없음 | won | 41.1 | 0.00 | 8 | 4 / 4 | 42 | 12.10 |
| 6 | 균형 편성 | standard | guard-first | 사용 | won | 41.1 | 0.00 | 8 | 4 / 4 | 42 | 12.00 |
| 6 | 균형 편성 | standard | striker-first | 없음 | won | 44.1 | 0.00 | 8 | 4 / 4 | 44 | 12.70 |
| 6 | 균형 편성 | standard | striker-first | 사용 | won | 44.1 | 0.00 | 8 | 4 / 4 | 44 | 12.60 |
| 6 | 균형 편성 | standard | scout-first | 없음 | won | 40.4 | 0.00 | 8 | 4 / 4 | 42 | 11.60 |
| 6 | 균형 편성 | standard | scout-first | 사용 | won | 40.4 | 0.00 | 8 | 4 / 4 | 42 | 11.85 |
| 6 | 최종 결전 편성 | standard | guard-first | 없음 | won | 39.4 | 0.00 | 9 | 4 / 4 | 39 | 10.95 |
| 6 | 최종 결전 편성 | standard | guard-first | 사용 | won | 39.4 | 0.00 | 9 | 4 / 4 | 39 | 11.25 |
| 6 | 최종 결전 편성 | standard | striker-first | 없음 | won | 42.4 | 0.00 | 9 | 4 / 4 | 41 | 11.55 |
| 6 | 최종 결전 편성 | standard | striker-first | 사용 | won | 42.4 | 0.00 | 9 | 4 / 4 | 41 | 11.45 |
| 6 | 최종 결전 편성 | standard | scout-first | 없음 | won | 37.9 | 0.00 | 9 | 4 / 4 | 39 | 10.80 |
| 6 | 최종 결전 편성 | standard | scout-first | 사용 | won | 37.9 | 0.00 | 9 | 4 / 4 | 39 | 11.05 |
| 6 | 돌격 중심 편성 | standard | guard-first | 없음 | won | 60.1 | 0.00 | 5 | 4 / 4 | 69 | 19.40 |
| 6 | 돌격 중심 편성 | standard | guard-first | 사용 | won | 54.1 | 0.00 | 7 | 4 / 4 | 58 | 16.50 |
| 6 | 돌격 중심 편성 | standard | striker-first | 없음 | won | 55.5 | 0.00 | 6 | 4 / 4 | 59 | 16.20 |
| 6 | 돌격 중심 편성 | standard | striker-first | 사용 | won | 49.5 | 0.00 | 8 | 4 / 4 | 50 | 13.80 |
| 6 | 돌격 중심 편성 | standard | scout-first | 없음 | won | 50.6 | 0.00 | 7 | 4 / 4 | 51 | 13.85 |
| 6 | 돌격 중심 편성 | standard | scout-first | 사용 | won | 50.6 | 0.00 | 8 | 4 / 4 | 51 | 14.30 |
| 6 | 방패 중심 편성 | standard | guard-first | 없음 | won | 58.8 | 0.00 | 6 | 4 / 4 | 59 | 18.25 |
| 6 | 방패 중심 편성 | standard | guard-first | 사용 | won | 58.7 | 0.00 | 7 | 4 / 4 | 59 | 17.85 |
| 6 | 방패 중심 편성 | standard | striker-first | 없음 | won | 55.7 | 0.00 | 6 | 4 / 4 | 57 | 17.90 |
| 6 | 방패 중심 편성 | standard | striker-first | 사용 | won | 55.7 | 0.00 | 7 | 4 / 4 | 57 | 18.30 |
| 6 | 방패 중심 편성 | standard | scout-first | 없음 | won | 58.1 | 0.00 | 6 | 4 / 4 | 63 | 19.65 |
| 6 | 방패 중심 편성 | standard | scout-first | 사용 | won | 56.3 | 0.00 | 7 | 4 / 4 | 57 | 17.25 |
| 6 | 정찰 중심 편성 | standard | guard-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 75 | 18.60 |
| 6 | 정찰 중심 편성 | standard | guard-first | 사용 | lost | 180 | 9.99 | 0 | 3 / 4 | 84 | 20.55 |
| 6 | 정찰 중심 편성 | standard | striker-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 75 | 18.60 |
| 6 | 정찰 중심 편성 | standard | striker-first | 사용 | lost | 180 | 9.99 | 0 | 3 / 4 | 84 | 20.55 |
| 6 | 정찰 중심 편성 | standard | scout-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 77 | 18.60 |
| 6 | 정찰 중심 편성 | standard | scout-first | 사용 | lost | 180 | 9.99 | 0 | 2 / 4 | 82 | 20.40 |
| 6 | 소규모 편성 | standard | guard-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 37 | 9.00 |
| 6 | 소규모 편성 | standard | guard-first | 사용 | lost | 180 | 9.99 | 0 | 3 / 4 | 44 | 11.30 |
| 6 | 소규모 편성 | standard | striker-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 36 | 9.00 |
| 6 | 소규모 편성 | standard | striker-first | 사용 | lost | 180 | 9.99 | 0 | 3 / 4 | 45 | 11.75 |
| 6 | 소규모 편성 | standard | scout-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 40 | 9.00 |
| 6 | 소규모 편성 | standard | scout-first | 사용 | lost | 180 | 9.99 | 0 | 3 / 4 | 48 | 11.45 |
| 6 | 균형 편성 | challenge | guard-first | 없음 | won | 47.1 | 0.00 | 7 | 4 / 4 | 58 | 17.25 |
| 6 | 균형 편성 | challenge | guard-first | 사용 | won | 41.1 | 0.00 | 7 | 4 / 4 | 52 | 14.65 |
| 6 | 균형 편성 | challenge | striker-first | 없음 | won | 44.1 | 0.00 | 6 | 4 / 4 | 55 | 14.80 |
| 6 | 균형 편성 | challenge | striker-first | 사용 | won | 44.1 | 0.00 | 8 | 4 / 4 | 55 | 14.70 |
| 6 | 균형 편성 | challenge | scout-first | 없음 | won | 44.6 | 0.00 | 6 | 4 / 4 | 55 | 16.05 |
| 6 | 균형 편성 | challenge | scout-first | 사용 | won | 40.4 | 0.00 | 8 | 4 / 4 | 51 | 14.35 |
| 6 | 최종 결전 편성 | challenge | guard-first | 없음 | won | 44.8 | 0.00 | 8 | 4 / 4 | 54 | 16.05 |
| 6 | 최종 결전 편성 | challenge | guard-first | 사용 | won | 39.4 | 0.00 | 9 | 4 / 4 | 48 | 13.55 |
| 6 | 최종 결전 편성 | challenge | striker-first | 없음 | won | 46.6 | 0.00 | 7 | 4 / 4 | 55 | 16.00 |
| 6 | 최종 결전 편성 | challenge | striker-first | 사용 | won | 42.4 | 0.00 | 9 | 4 / 4 | 50 | 14.30 |
| 6 | 최종 결전 편성 | challenge | scout-first | 없음 | won | 40.3 | 0.00 | 7 | 4 / 4 | 48 | 14.05 |
| 6 | 최종 결전 편성 | challenge | scout-first | 사용 | won | 37.9 | 0.00 | 9 | 4 / 4 | 46 | 13.20 |
| 6 | 돌격 중심 편성 | challenge | guard-first | 없음 | won | 43.9 | 0.00 | 7 | 4 / 4 | 51 | 13.00 |
| 6 | 돌격 중심 편성 | challenge | guard-first | 사용 | lost | 71.1 | 0.44 | 0 | 4 / 4 | 96 | 29.00 |
| 6 | 돌격 중심 편성 | challenge | striker-first | 없음 | lost | 68 | 3.59 | 0 | 4 / 4 | 92 | 27.00 |
| 6 | 돌격 중심 편성 | challenge | striker-first | 사용 | won | 55.5 | 0.00 | 6 | 4 / 4 | 72 | 20.50 |
| 6 | 돌격 중심 편성 | challenge | scout-first | 없음 | won | 50.6 | 0.00 | 6 | 4 / 4 | 60 | 15.85 |
| 6 | 돌격 중심 편성 | challenge | scout-first | 사용 | won | 50.6 | 0.00 | 7 | 4 / 4 | 62 | 16.45 |
| 6 | 방패 중심 편성 | challenge | guard-first | 없음 | won | 54.5 | 0.00 | 6 | 4 / 4 | 69 | 19.85 |
| 6 | 방패 중심 편성 | challenge | guard-first | 사용 | won | 58.9 | 0.00 | 6 | 4 / 4 | 74 | 21.65 |
| 6 | 방패 중심 편성 | challenge | striker-first | 없음 | won | 55.7 | 0.00 | 6 | 4 / 4 | 71 | 21.50 |
| 6 | 방패 중심 편성 | challenge | striker-first | 사용 | won | 55.7 | 0.00 | 6 | 4 / 4 | 71 | 21.70 |
| 6 | 방패 중심 편성 | challenge | scout-first | 없음 | won | 63.5 | 0.00 | 5 | 4 / 4 | 85 | 26.00 |
| 6 | 방패 중심 편성 | challenge | scout-first | 사용 | won | 58.1 | 0.00 | 6 | 4 / 4 | 79 | 24.00 |
| 6 | 정찰 중심 편성 | challenge | guard-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 78 | 18.60 |
| 6 | 정찰 중심 편성 | challenge | guard-first | 사용 | lost | 180 | 9.99 | 0 | 2 / 4 | 84 | 20.60 |
| 6 | 정찰 중심 편성 | challenge | striker-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 78 | 18.60 |
| 6 | 정찰 중심 편성 | challenge | striker-first | 사용 | lost | 180 | 9.99 | 0 | 2 / 4 | 84 | 20.60 |
| 6 | 정찰 중심 편성 | challenge | scout-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 80 | 18.60 |
| 6 | 정찰 중심 편성 | challenge | scout-first | 사용 | lost | 180 | 9.99 | 0 | 2 / 4 | 87 | 20.75 |
| 6 | 소규모 편성 | challenge | guard-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 39 | 9.00 |
| 6 | 소규모 편성 | challenge | guard-first | 사용 | lost | 180 | 9.99 | 0 | 2 / 4 | 45 | 11.00 |
| 6 | 소규모 편성 | challenge | striker-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 39 | 9.00 |
| 6 | 소규모 편성 | challenge | striker-first | 사용 | lost | 180 | 9.99 | 0 | 2 / 4 | 47 | 11.45 |
| 6 | 소규모 편성 | challenge | scout-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 43 | 9.00 |
| 6 | 소규모 편성 | challenge | scout-first | 사용 | lost | 180 | 9.99 | 0 | 2 / 4 | 51 | 11.60 |
| 7 | 균형 편성 | practice | guard-first | 없음 | won | 44.1 | 0.00 | 8 | 4 / 4 | 33 | 9.71 |
| 7 | 균형 편성 | practice | guard-first | 사용 | won | 43.9 | 0.00 | 8 | 4 / 4 | 33 | 9.88 |
| 7 | 균형 편성 | practice | striker-first | 없음 | won | 47.1 | 0.00 | 8 | 4 / 4 | 34 | 10.35 |
| 7 | 균형 편성 | practice | striker-first | 사용 | won | 46.9 | 0.00 | 8 | 4 / 4 | 34 | 10.10 |
| 7 | 균형 편성 | practice | scout-first | 없음 | won | 53.8 | 0.00 | 7 | 4 / 4 | 43 | 13.28 |
| 7 | 균형 편성 | practice | scout-first | 사용 | won | 47.8 | 0.00 | 8 | 4 / 4 | 35 | 10.10 |
| 7 | 최종 결전 편성 | practice | guard-first | 없음 | won | 43.5 | 0.00 | 9 | 4 / 4 | 32 | 9.29 |
| 7 | 최종 결전 편성 | practice | guard-first | 사용 | won | 47.7 | 0.00 | 9 | 4 / 4 | 38 | 11.88 |
| 7 | 최종 결전 편성 | practice | striker-first | 없음 | won | 50.7 | 0.00 | 9 | 4 / 4 | 40 | 12.30 |
| 7 | 최종 결전 편성 | practice | striker-first | 사용 | won | 50.7 | 0.00 | 9 | 4 / 4 | 40 | 12.10 |
| 7 | 최종 결전 편성 | practice | scout-first | 없음 | won | 50.8 | 0.00 | 9 | 4 / 4 | 40 | 12.30 |
| 7 | 최종 결전 편성 | practice | scout-first | 사용 | won | 50.8 | 0.00 | 9 | 4 / 4 | 40 | 12.10 |
| 7 | 돌격 중심 편성 | practice | guard-first | 없음 | won | 54.2 | 0.00 | 6 | 4 / 4 | 49 | 15.00 |
| 7 | 돌격 중심 편성 | practice | guard-first | 사용 | won | 42.2 | 0.00 | 9 | 4 / 4 | 34 | 10.65 |
| 7 | 돌격 중심 편성 | practice | striker-first | 없음 | won | 53.9 | 0.00 | 7 | 4 / 4 | 45 | 13.44 |
| 7 | 돌격 중심 편성 | practice | striker-first | 사용 | won | 47.9 | 0.00 | 9 | 4 / 4 | 37 | 11.03 |
| 7 | 돌격 중심 편성 | practice | scout-first | 없음 | won | 53.2 | 0.00 | 7 | 4 / 4 | 45 | 12.92 |
| 7 | 돌격 중심 편성 | practice | scout-first | 사용 | won | 47.2 | 0.00 | 9 | 4 / 4 | 37 | 11.19 |
| 7 | 방패 중심 편성 | practice | guard-first | 없음 | won | 62.4 | 0.00 | 7 | 4 / 4 | 49 | 15.63 |
| 7 | 방패 중심 편성 | practice | guard-first | 사용 | won | 60.6 | 0.00 | 7 | 4 / 4 | 47 | 14.49 |
| 7 | 방패 중심 편성 | practice | striker-first | 없음 | won | 59.4 | 0.00 | 7 | 4 / 4 | 48 | 15.11 |
| 7 | 방패 중심 편성 | practice | striker-first | 사용 | won | 57.6 | 0.00 | 7 | 4 / 4 | 46 | 13.97 |
| 7 | 방패 중심 편성 | practice | scout-first | 없음 | won | 60.3 | 0.00 | 7 | 4 / 4 | 48 | 15.27 |
| 7 | 방패 중심 편성 | practice | scout-first | 사용 | won | 58.5 | 0.00 | 7 | 4 / 4 | 46 | 14.13 |
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
| 7 | 균형 편성 | standard | guard-first | 없음 | won | 44.1 | 0.00 | 7 | 4 / 4 | 42 | 12.54 |
| 7 | 균형 편성 | standard | guard-first | 사용 | won | 44.1 | 0.00 | 8 | 4 / 4 | 42 | 12.67 |
| 7 | 균형 편성 | standard | striker-first | 없음 | won | 47.1 | 0.00 | 7 | 4 / 4 | 44 | 12.76 |
| 7 | 균형 편성 | standard | striker-first | 사용 | won | 46.9 | 0.00 | 8 | 4 / 4 | 43 | 12.52 |
| 7 | 균형 편성 | standard | scout-first | 없음 | won | 59.8 | 0.00 | 5 | 4 / 4 | 60 | 19.08 |
| 7 | 균형 편성 | standard | scout-first | 사용 | won | 47.8 | 0.00 | 8 | 4 / 4 | 44 | 12.68 |
| 7 | 최종 결전 편성 | standard | guard-first | 없음 | won | 43.5 | 0.00 | 9 | 4 / 4 | 40 | 11.98 |
| 7 | 최종 결전 편성 | standard | guard-first | 사용 | won | 53.1 | 0.00 | 8 | 4 / 4 | 53 | 16.44 |
| 7 | 최종 결전 편성 | standard | striker-first | 없음 | won | 46.5 | 0.00 | 9 | 4 / 4 | 43 | 12.25 |
| 7 | 최종 결전 편성 | standard | striker-first | 사용 | won | 50.7 | 0.00 | 9 | 4 / 4 | 51 | 14.47 |
| 7 | 최종 결전 편성 | standard | scout-first | 없음 | won | 46.6 | 0.00 | 9 | 4 / 4 | 43 | 12.04 |
| 7 | 최종 결전 편성 | standard | scout-first | 사용 | won | 50.8 | 0.00 | 9 | 4 / 4 | 51 | 14.63 |
| 7 | 돌격 중심 편성 | standard | guard-first | 없음 | won | 54.2 | 0.00 | 4 | 4 / 4 | 64 | 20.22 |
| 7 | 돌격 중심 편성 | standard | guard-first | 사용 | won | 48.2 | 0.00 | 7 | 4 / 4 | 54 | 16.61 |
| 7 | 돌격 중심 편성 | standard | striker-first | 없음 | won | 59.9 | 0.00 | 4 | 4 / 4 | 68 | 20.64 |
| 7 | 돌격 중심 편성 | standard | striker-first | 사용 | won | 47.9 | 0.00 | 8 | 4 / 4 | 48 | 13.91 |
| 7 | 돌격 중심 편성 | standard | scout-first | 없음 | won | 59.2 | 0.00 | 4 | 4 / 4 | 68 | 20.28 |
| 7 | 돌격 중심 편성 | standard | scout-first | 사용 | won | 47.2 | 0.00 | 8 | 4 / 4 | 48 | 14.21 |
| 7 | 방패 중심 편성 | standard | guard-first | 없음 | won | 62.4 | 0.00 | 6 | 4 / 4 | 63 | 19.62 |
| 7 | 방패 중심 편성 | standard | guard-first | 사용 | won | 60.6 | 0.00 | 7 | 4 / 4 | 60 | 18.96 |
| 7 | 방패 중심 편성 | standard | striker-first | 없음 | won | 59.4 | 0.00 | 6 | 4 / 4 | 61 | 19.68 |
| 7 | 방패 중심 편성 | standard | striker-first | 사용 | won | 57.6 | 0.00 | 7 | 4 / 4 | 58 | 18.60 |
| 7 | 방패 중심 편성 | standard | scout-first | 없음 | won | 60.3 | 0.00 | 6 | 4 / 4 | 62 | 19.84 |
| 7 | 방패 중심 편성 | standard | scout-first | 사용 | won | 58.5 | 0.00 | 7 | 4 / 4 | 59 | 18.76 |
| 7 | 정찰 중심 편성 | standard | guard-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 74 | 18.60 |
| 7 | 정찰 중심 편성 | standard | guard-first | 사용 | lost | 180 | 9.99 | 0 | 2 / 4 | 80 | 20.56 |
| 7 | 정찰 중심 편성 | standard | striker-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 74 | 18.60 |
| 7 | 정찰 중심 편성 | standard | striker-first | 사용 | lost | 180 | 9.99 | 0 | 2 / 4 | 80 | 20.56 |
| 7 | 정찰 중심 편성 | standard | scout-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 76 | 18.60 |
| 7 | 정찰 중심 편성 | standard | scout-first | 사용 | lost | 180 | 9.99 | 0 | 2 / 4 | 82 | 20.40 |
| 7 | 소규모 편성 | standard | guard-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 37 | 9.00 |
| 7 | 소규모 편성 | standard | guard-first | 사용 | lost | 180 | 9.99 | 0 | 3 / 4 | 45 | 11.01 |
| 7 | 소규모 편성 | standard | striker-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 39 | 9.00 |
| 7 | 소규모 편성 | standard | striker-first | 사용 | lost | 180 | 9.99 | 0 | 2 / 4 | 47 | 11.49 |
| 7 | 소규모 편성 | standard | scout-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 41 | 9.00 |
| 7 | 소규모 편성 | standard | scout-first | 사용 | lost | 180 | 9.99 | 0 | 2 / 4 | 49 | 11.49 |
| 7 | 균형 편성 | challenge | guard-first | 없음 | won | 50.1 | 0.00 | 6 | 4 / 4 | 58 | 18.36 |
| 7 | 균형 편성 | challenge | guard-first | 사용 | won | 44.1 | 0.00 | 7 | 4 / 4 | 52 | 15.60 |
| 7 | 균형 편성 | challenge | striker-first | 없음 | won | 53.1 | 0.00 | 6 | 4 / 4 | 61 | 18.66 |
| 7 | 균형 편성 | challenge | striker-first | 사용 | won | 47.1 | 0.00 | 7 | 4 / 4 | 55 | 15.98 |
| 7 | 균형 편성 | challenge | scout-first | 없음 | lost | 180 | 0.02 | 0 | 4 / 4 | 89 | 28.20 |
| 7 | 균형 편성 | challenge | scout-first | 사용 | won | 59.8 | 0.00 | 5 | 4 / 4 | 75 | 23.41 |
| 7 | 최종 결전 편성 | challenge | guard-first | 없음 | won | 44.7 | 0.00 | 8 | 4 / 4 | 53 | 15.48 |
| 7 | 최종 결전 편성 | challenge | guard-first | 사용 | won | 48.9 | 0.00 | 8 | 4 / 4 | 57 | 18.12 |
| 7 | 최종 결전 편성 | challenge | striker-first | 없음 | won | 51.9 | 0.00 | 7 | 4 / 4 | 60 | 17.82 |
| 7 | 최종 결전 편성 | challenge | striker-first | 사용 | won | 46.8 | 0.00 | 8 | 4 / 4 | 55 | 15.56 |
| 7 | 최종 결전 편성 | challenge | scout-first | 없음 | won | 52 | 0.00 | 7 | 4 / 4 | 60 | 17.88 |
| 7 | 최종 결전 편성 | challenge | scout-first | 사용 | won | 52.1 | 0.00 | 8 | 4 / 4 | 60 | 18.40 |
| 7 | 돌격 중심 편성 | challenge | guard-first | 없음 | lost | 61.8 | 2.80 | 0 | 4 / 4 | 86 | 27.00 |
| 7 | 돌격 중심 편성 | challenge | guard-first | 사용 | lost | 66.3 | 0.40 | 0 | 4 / 4 | 94 | 29.33 |
| 7 | 돌격 중심 편성 | challenge | striker-first | 없음 | lost | 64.8 | 5.89 | 0 | 4 / 4 | 88 | 27.00 |
| 7 | 돌격 중심 편성 | challenge | striker-first | 사용 | lost | 72 | 0.40 | 0 | 4 / 4 | 98 | 30.60 |
| 7 | 돌격 중심 편성 | challenge | scout-first | 없음 | lost | 65 | 3.61 | 0 | 4 / 4 | 89 | 27.00 |
| 7 | 돌격 중심 편성 | challenge | scout-first | 사용 | lost | 71.3 | 0.40 | 0 | 4 / 4 | 98 | 30.65 |
| 7 | 방패 중심 편성 | challenge | guard-first | 없음 | won | 63.6 | 0.00 | 5 | 4 / 4 | 80 | 25.86 |
| 7 | 방패 중심 편성 | challenge | guard-first | 사용 | won | 58.2 | 0.00 | 6 | 4 / 4 | 74 | 22.68 |
| 7 | 방패 중심 편성 | challenge | striker-first | 없음 | won | 55.2 | 0.00 | 6 | 4 / 4 | 72 | 22.36 |
| 7 | 방패 중심 편성 | challenge | striker-first | 사용 | won | 54.6 | 0.00 | 6 | 4 / 4 | 71 | 21.64 |
| 7 | 방패 중심 편성 | challenge | scout-first | 없음 | won | 56.1 | 0.00 | 6 | 4 / 4 | 72 | 22.52 |
| 7 | 방패 중심 편성 | challenge | scout-first | 사용 | won | 55.5 | 0.00 | 6 | 4 / 4 | 71 | 21.80 |
| 7 | 정찰 중심 편성 | challenge | guard-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 80 | 18.60 |
| 7 | 정찰 중심 편성 | challenge | guard-first | 사용 | lost | 180 | 9.99 | 0 | 2 / 4 | 84 | 20.40 |
| 7 | 정찰 중심 편성 | challenge | striker-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 80 | 18.60 |
| 7 | 정찰 중심 편성 | challenge | striker-first | 사용 | lost | 180 | 9.99 | 0 | 2 / 4 | 84 | 20.40 |
| 7 | 정찰 중심 편성 | challenge | scout-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 80 | 18.60 |
| 7 | 정찰 중심 편성 | challenge | scout-first | 사용 | lost | 180 | 9.99 | 0 | 2 / 4 | 88 | 20.77 |
| 7 | 소규모 편성 | challenge | guard-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 39 | 9.00 |
| 7 | 소규모 편성 | challenge | guard-first | 사용 | lost | 180 | 9.99 | 0 | 2 / 4 | 46 | 11.01 |
| 7 | 소규모 편성 | challenge | striker-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 40 | 9.00 |
| 7 | 소규모 편성 | challenge | striker-first | 사용 | lost | 180 | 9.99 | 0 | 2 / 4 | 49 | 11.65 |
| 7 | 소규모 편성 | challenge | scout-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 45 | 9.00 |
| 7 | 소규모 편성 | challenge | scout-first | 사용 | lost | 180 | 9.99 | 0 | 2 / 4 | 53 | 11.65 |
| 8 | 균형 편성 | practice | guard-first | 없음 | won | 54.7 | 0.00 | 7 | 4 / 4 | 43 | 14.93 |
| 8 | 균형 편성 | practice | guard-first | 사용 | won | 47.4 | 0.00 | 8 | 4 / 4 | 37 | 12.11 |
| 8 | 균형 편성 | practice | striker-first | 없음 | won | 45.7 | 0.00 | 7 | 4 / 4 | 38 | 12.53 |
| 8 | 균형 편성 | practice | striker-first | 사용 | won | 43.9 | 0.00 | 8 | 4 / 4 | 36 | 11.13 |
| 8 | 균형 편성 | practice | scout-first | 없음 | won | 46.6 | 0.00 | 7 | 4 / 4 | 38 | 12.53 |
| 8 | 균형 편성 | practice | scout-first | 사용 | won | 44.8 | 0.00 | 8 | 4 / 4 | 36 | 11.13 |
| 8 | 최종 결전 편성 | practice | guard-first | 없음 | won | 43.6 | 0.00 | 9 | 4 / 4 | 36 | 11.14 |
| 8 | 최종 결전 편성 | practice | guard-first | 사용 | won | 43.6 | 0.00 | 9 | 4 / 4 | 36 | 11.28 |
| 8 | 최종 결전 편성 | practice | striker-first | 없음 | won | 42.2 | 0.00 | 9 | 4 / 4 | 35 | 10.99 |
| 8 | 최종 결전 편성 | practice | striker-first | 사용 | won | 42.2 | 0.00 | 9 | 4 / 4 | 35 | 11.13 |
| 8 | 최종 결전 편성 | practice | scout-first | 없음 | won | 42.3 | 0.00 | 9 | 4 / 4 | 35 | 10.99 |
| 8 | 최종 결전 편성 | practice | scout-first | 사용 | won | 42.3 | 0.00 | 9 | 4 / 4 | 35 | 11.13 |
| 8 | 돌격 중심 편성 | practice | guard-first | 없음 | won | 49.7 | 0.00 | 7 | 4 / 4 | 42 | 12.60 |
| 8 | 돌격 중심 편성 | practice | guard-first | 사용 | won | 49.7 | 0.00 | 8 | 4 / 4 | 42 | 13.10 |
| 8 | 돌격 중심 편성 | practice | striker-first | 없음 | won | 51.1 | 0.00 | 7 | 4 / 4 | 42 | 13.48 |
| 8 | 돌격 중심 편성 | practice | striker-first | 사용 | won | 45.1 | 0.00 | 9 | 4 / 4 | 35 | 10.67 |
| 8 | 돌격 중심 편성 | practice | scout-first | 없음 | won | 56.2 | 0.00 | 7 | 4 / 4 | 45 | 13.82 |
| 8 | 돌격 중심 편성 | practice | scout-first | 사용 | won | 56.2 | 0.00 | 8 | 4 / 4 | 45 | 14.18 |
| 8 | 방패 중심 편성 | practice | guard-first | 없음 | won | 67.5 | 0.00 | 7 | 4 / 4 | 54 | 16.69 |
| 8 | 방패 중심 편성 | practice | guard-first | 사용 | won | 67.5 | 0.00 | 7 | 4 / 4 | 54 | 18.05 |
| 8 | 방패 중심 편성 | practice | striker-first | 없음 | won | 64.5 | 0.00 | 7 | 4 / 4 | 52 | 17.03 |
| 8 | 방패 중심 편성 | practice | striker-first | 사용 | won | 64.5 | 0.00 | 7 | 4 / 4 | 52 | 17.51 |
| 8 | 방패 중심 편성 | practice | scout-first | 없음 | won | 65.3 | 0.00 | 7 | 4 / 4 | 53 | 17.20 |
| 8 | 방패 중심 편성 | practice | scout-first | 사용 | won | 65.3 | 0.00 | 7 | 4 / 4 | 53 | 17.68 |
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
| 8 | 균형 편성 | standard | guard-first | 없음 | won | 54.7 | 0.00 | 7 | 4 / 4 | 56 | 17.91 |
| 8 | 균형 편성 | standard | guard-first | 사용 | won | 48.7 | 0.00 | 7 | 4 / 4 | 51 | 15.75 |
| 8 | 균형 편성 | standard | striker-first | 없음 | won | 51.7 | 0.00 | 6 | 4 / 4 | 53 | 18.04 |
| 8 | 균형 편성 | standard | striker-first | 사용 | won | 44.4 | 0.00 | 8 | 4 / 4 | 46 | 15.01 |
| 8 | 균형 편성 | standard | scout-first | 없음 | won | 52.6 | 0.00 | 7 | 4 / 4 | 54 | 18.49 |
| 8 | 균형 편성 | standard | scout-first | 사용 | won | 45.3 | 0.00 | 8 | 4 / 4 | 47 | 15.18 |
| 8 | 최종 결전 편성 | standard | guard-first | 없음 | won | 44.8 | 0.00 | 8 | 4 / 4 | 46 | 14.83 |
| 8 | 최종 결전 편성 | standard | guard-first | 사용 | won | 43.6 | 0.00 | 8 | 4 / 4 | 45 | 14.43 |
| 8 | 최종 결전 편성 | standard | striker-first | 없음 | won | 43.4 | 0.00 | 8 | 4 / 4 | 45 | 14.80 |
| 8 | 최종 결전 편성 | standard | striker-first | 사용 | won | 42.2 | 0.00 | 9 | 4 / 4 | 44 | 14.57 |
| 8 | 최종 결전 편성 | standard | scout-first | 없음 | won | 47.7 | 0.00 | 8 | 4 / 4 | 49 | 16.29 |
| 8 | 최종 결전 편성 | standard | scout-first | 사용 | won | 42.3 | 0.00 | 9 | 4 / 4 | 44 | 13.91 |
| 8 | 돌격 중심 편성 | standard | guard-first | 없음 | won | 49.7 | 0.00 | 6 | 4 / 4 | 54 | 15.88 |
| 8 | 돌격 중심 편성 | standard | guard-first | 사용 | won | 49.7 | 0.00 | 7 | 4 / 4 | 55 | 17.33 |
| 8 | 돌격 중심 편성 | standard | striker-first | 없음 | won | 51.1 | 0.00 | 6 | 4 / 4 | 56 | 17.20 |
| 8 | 돌격 중심 편성 | standard | striker-first | 사용 | won | 45.1 | 0.00 | 9 | 4 / 4 | 45 | 13.11 |
| 8 | 돌격 중심 편성 | standard | scout-first | 없음 | won | 56.2 | 0.00 | 6 | 4 / 4 | 58 | 17.71 |
| 8 | 돌격 중심 편성 | standard | scout-first | 사용 | won | 56.2 | 0.00 | 7 | 4 / 4 | 58 | 18.31 |
| 8 | 방패 중심 편성 | standard | guard-first | 없음 | won | 63.3 | 0.00 | 6 | 4 / 4 | 66 | 20.67 |
| 8 | 방패 중심 편성 | standard | guard-first | 사용 | won | 62.7 | 0.00 | 6 | 4 / 4 | 65 | 21.15 |
| 8 | 방패 중심 편성 | standard | striker-first | 없음 | won | 60.3 | 0.00 | 6 | 4 / 4 | 63 | 20.30 |
| 8 | 방패 중심 편성 | standard | striker-first | 사용 | won | 64.5 | 0.00 | 6 | 4 / 4 | 67 | 22.54 |
| 8 | 방패 중심 편성 | standard | scout-first | 없음 | won | 61.1 | 0.00 | 6 | 4 / 4 | 64 | 20.47 |
| 8 | 방패 중심 편성 | standard | scout-first | 사용 | won | 65.3 | 0.00 | 6 | 4 / 4 | 68 | 22.71 |
| 8 | 정찰 중심 편성 | standard | guard-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 77 | 18.60 |
| 8 | 정찰 중심 편성 | standard | guard-first | 사용 | lost | 180 | 9.99 | 0 | 2 / 4 | 80 | 20.40 |
| 8 | 정찰 중심 편성 | standard | striker-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 77 | 18.60 |
| 8 | 정찰 중심 편성 | standard | striker-first | 사용 | lost | 180 | 9.99 | 0 | 2 / 4 | 80 | 20.40 |
| 8 | 정찰 중심 편성 | standard | scout-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 77 | 18.60 |
| 8 | 정찰 중심 편성 | standard | scout-first | 사용 | lost | 180 | 9.99 | 0 | 2 / 4 | 82 | 20.40 |
| 8 | 소규모 편성 | standard | guard-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 39 | 9.00 |
| 8 | 소규모 편성 | standard | guard-first | 사용 | lost | 180 | 9.99 | 0 | 3 / 4 | 48 | 11.19 |
| 8 | 소규모 편성 | standard | striker-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 39 | 9.00 |
| 8 | 소규모 편성 | standard | striker-first | 사용 | lost | 180 | 9.99 | 0 | 2 / 4 | 47 | 11.53 |
| 8 | 소규모 편성 | standard | scout-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 39 | 9.00 |
| 8 | 소규모 편성 | standard | scout-first | 사용 | lost | 180 | 9.99 | 0 | 3 / 4 | 49 | 11.70 |
| 8 | 균형 편성 | challenge | guard-first | 없음 | won | 60.7 | 0.00 | 3 | 4 / 4 | 77 | 24.72 |
| 8 | 균형 편성 | challenge | guard-first | 사용 | won | 54.7 | 0.00 | 5 | 4 / 4 | 71 | 22.38 |
| 8 | 균형 편성 | challenge | striker-first | 없음 | lost | 180 | 0.41 | 0 | 4 / 4 | 84 | 28.20 |
| 8 | 균형 편성 | challenge | striker-first | 사용 | won | 51.7 | 0.00 | 6 | 4 / 4 | 68 | 21.73 |
| 8 | 균형 편성 | challenge | scout-first | 없음 | won | 52.6 | 0.00 | 4 | 4 / 4 | 69 | 21.51 |
| 8 | 균형 편성 | challenge | scout-first | 사용 | won | 52.6 | 0.00 | 6 | 4 / 4 | 69 | 21.90 |
| 8 | 최종 결전 편성 | challenge | guard-first | 없음 | won | 44.8 | 0.00 | 8 | 4 / 4 | 58 | 17.81 |
| 8 | 최종 결전 편성 | challenge | guard-first | 사용 | won | 44.8 | 0.00 | 8 | 4 / 4 | 58 | 17.51 |
| 8 | 최종 결전 편성 | challenge | striker-first | 없음 | won | 47.6 | 0.00 | 7 | 4 / 4 | 62 | 19.36 |
| 8 | 최종 결전 편성 | challenge | striker-first | 사용 | won | 43.4 | 0.00 | 8 | 4 / 4 | 57 | 18.09 |
| 8 | 최종 결전 편성 | challenge | scout-first | 없음 | won | 47.7 | 0.00 | 7 | 4 / 4 | 62 | 19.43 |
| 8 | 최종 결전 편성 | challenge | scout-first | 사용 | won | 43.5 | 0.00 | 8 | 4 / 4 | 57 | 18.26 |
| 8 | 돌격 중심 편성 | challenge | guard-first | 없음 | won | 55.7 | 0.00 | 4 | 4 / 4 | 68 | 20.68 |
| 8 | 돌격 중심 편성 | challenge | guard-first | 사용 | won | 49.7 | 0.00 | 5 | 4 / 4 | 66 | 19.42 |
| 8 | 돌격 중심 편성 | challenge | striker-first | 없음 | won | 51.1 | 0.00 | 4 | 4 / 4 | 67 | 19.80 |
| 8 | 돌격 중심 편성 | challenge | striker-first | 사용 | won | 51.1 | 0.00 | 5 | 4 / 4 | 69 | 20.79 |
| 8 | 돌격 중심 편성 | challenge | scout-first | 없음 | lost | 71.6 | 0.49 | 0 | 4 / 4 | 85 | 27.00 |
| 8 | 돌격 중심 편성 | challenge | scout-first | 사용 | won | 56.2 | 0.00 | 5 | 4 / 4 | 72 | 20.91 |
| 8 | 방패 중심 편성 | challenge | guard-first | 없음 | won | 70.7 | 0.00 | 4 | 4 / 4 | 91 | 29.71 |
| 8 | 방패 중심 편성 | challenge | guard-first | 사용 | won | 68.7 | 0.00 | 5 | 4 / 4 | 89 | 28.75 |
| 8 | 방패 중심 편성 | challenge | striker-first | 없음 | lost | 180 | 6.02 | 0 | 4 / 4 | 109 | 37.20 |
| 8 | 방패 중심 편성 | challenge | striker-first | 사용 | won | 65.7 | 0.00 | 5 | 4 / 4 | 87 | 28.55 |
| 8 | 방패 중심 편성 | challenge | scout-first | 없음 | lost | 180 | 1.24 | 0 | 4 / 4 | 109 | 37.20 |
| 8 | 방패 중심 편성 | challenge | scout-first | 사용 | won | 66.5 | 0.00 | 5 | 4 / 4 | 87 | 28.72 |
| 8 | 정찰 중심 편성 | challenge | guard-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 83 | 18.60 |
| 8 | 정찰 중심 편성 | challenge | guard-first | 사용 | lost | 180 | 9.99 | 0 | 2 / 4 | 85 | 20.57 |
| 8 | 정찰 중심 편성 | challenge | striker-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 83 | 18.60 |
| 8 | 정찰 중심 편성 | challenge | striker-first | 사용 | lost | 180 | 9.99 | 0 | 2 / 4 | 85 | 20.57 |
| 8 | 정찰 중심 편성 | challenge | scout-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 83 | 18.60 |
| 8 | 정찰 중심 편성 | challenge | scout-first | 사용 | lost | 180 | 9.99 | 0 | 2 / 4 | 87 | 20.96 |
| 8 | 소규모 편성 | challenge | guard-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 43 | 9.00 |
| 8 | 소규모 편성 | challenge | guard-first | 사용 | lost | 180 | 9.99 | 0 | 2 / 4 | 49 | 11.02 |
| 8 | 소규모 편성 | challenge | striker-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 43 | 9.00 |
| 8 | 소규모 편성 | challenge | striker-first | 사용 | lost | 180 | 9.99 | 0 | 2 / 4 | 53 | 11.70 |
| 8 | 소규모 편성 | challenge | scout-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 43 | 9.00 |
| 8 | 소규모 편성 | challenge | scout-first | 사용 | lost | 180 | 9.99 | 0 | 2 / 4 | 52 | 11.87 |
| 9 | 균형 편성 | practice | guard-first | 없음 | won | 45.1 | 0.00 | 7 | 4 / 4 | 38 | 12.36 |
| 9 | 균형 편성 | practice | guard-first | 사용 | won | 45.1 | 0.00 | 8 | 4 / 4 | 38 | 12.80 |
| 9 | 균형 편성 | practice | striker-first | 없음 | won | 42.4 | 0.00 | 8 | 4 / 4 | 37 | 12.23 |
| 9 | 균형 편성 | practice | striker-first | 사용 | won | 42.4 | 0.00 | 8 | 4 / 4 | 37 | 11.83 |
| 9 | 균형 편성 | practice | scout-first | 없음 | won | 47.3 | 0.00 | 8 | 4 / 4 | 39 | 12.77 |
| 9 | 균형 편성 | practice | scout-first | 사용 | won | 47.3 | 0.00 | 8 | 4 / 4 | 39 | 12.83 |
| 9 | 최종 결전 편성 | practice | guard-first | 없음 | won | 48.5 | 0.00 | 8 | 4 / 4 | 41 | 14.25 |
| 9 | 최종 결전 편성 | practice | guard-first | 사용 | won | 48.5 | 0.00 | 8 | 4 / 4 | 41 | 14.67 |
| 9 | 최종 결전 편성 | practice | striker-first | 없음 | won | 43.1 | 0.00 | 8 | 4 / 4 | 39 | 13.64 |
| 9 | 최종 결전 편성 | practice | striker-first | 사용 | won | 40.7 | 0.00 | 9 | 4 / 4 | 37 | 12.70 |
| 9 | 최종 결전 편성 | practice | scout-first | 없음 | won | 51.5 | 0.00 | 8 | 4 / 4 | 43 | 14.69 |
| 9 | 최종 결전 편성 | practice | scout-first | 사용 | won | 55.7 | 0.00 | 8 | 4 / 4 | 46 | 15.57 |
| 9 | 돌격 중심 편성 | practice | guard-first | 없음 | won | 66.1 | 0.00 | 4 | 4 / 4 | 60 | 19.80 |
| 9 | 돌격 중심 편성 | practice | guard-first | 사용 | won | 60.1 | 0.00 | 7 | 4 / 4 | 52 | 16.93 |
| 9 | 돌격 중심 편성 | practice | striker-first | 없음 | won | 61.6 | 0.00 | 4 | 4 / 4 | 57 | 20.26 |
| 9 | 돌격 중심 편성 | practice | striker-first | 사용 | won | 49.6 | 0.00 | 8 | 4 / 4 | 42 | 13.78 |
| 9 | 돌격 중심 편성 | practice | scout-first | 없음 | won | 71.3 | 0.00 | 4 | 4 / 4 | 63 | 20.62 |
| 9 | 돌격 중심 편성 | practice | scout-first | 사용 | won | 65.3 | 0.00 | 7 | 4 / 4 | 55 | 18.01 |
| 9 | 방패 중심 편성 | practice | guard-first | 없음 | won | 65.4 | 0.00 | 6 | 4 / 4 | 54 | 18.73 |
| 9 | 방패 중심 편성 | practice | guard-first | 사용 | won | 63.8 | 0.00 | 7 | 4 / 4 | 50 | 16.97 |
| 9 | 방패 중심 편성 | practice | striker-first | 없음 | won | 56.4 | 0.00 | 7 | 4 / 4 | 46 | 16.17 |
| 9 | 방패 중심 편성 | practice | striker-first | 사용 | won | 56.4 | 0.00 | 7 | 4 / 4 | 46 | 16.13 |
| 9 | 방패 중심 편성 | practice | scout-first | 없음 | won | 68.8 | 0.00 | 6 | 4 / 4 | 57 | 19.73 |
| 9 | 방패 중심 편성 | practice | scout-first | 사용 | won | 68.8 | 0.00 | 6 | 4 / 4 | 57 | 20.61 |
| 9 | 정찰 중심 편성 | practice | guard-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 72 | 18.60 |
| 9 | 정찰 중심 편성 | practice | guard-first | 사용 | lost | 180 | 9.99 | 0 | 3 / 4 | 78 | 20.58 |
| 9 | 정찰 중심 편성 | practice | striker-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 72 | 18.60 |
| 9 | 정찰 중심 편성 | practice | striker-first | 사용 | lost | 180 | 9.99 | 0 | 3 / 4 | 78 | 20.58 |
| 9 | 정찰 중심 편성 | practice | scout-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 73 | 18.60 |
| 9 | 정찰 중심 편성 | practice | scout-first | 사용 | lost | 180 | 9.99 | 0 | 2 / 4 | 79 | 20.40 |
| 9 | 소규모 편성 | practice | guard-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 38 | 9.00 |
| 9 | 소규모 편성 | practice | guard-first | 사용 | lost | 180 | 9.99 | 0 | 2 / 4 | 44 | 11.03 |
| 9 | 소규모 편성 | practice | striker-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 38 | 9.00 |
| 9 | 소규모 편성 | practice | striker-first | 사용 | lost | 180 | 9.99 | 0 | 2 / 4 | 44 | 11.57 |
| 9 | 소규모 편성 | practice | scout-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 37 | 9.00 |
| 9 | 소규모 편성 | practice | scout-first | 사용 | lost | 180 | 9.99 | 0 | 2 / 4 | 43 | 11.57 |
| 9 | 균형 편성 | standard | guard-first | 없음 | won | 51.1 | 0.00 | 6 | 4 / 4 | 53 | 18.58 |
| 9 | 균형 편성 | standard | guard-first | 사용 | won | 51.1 | 0.00 | 7 | 4 / 4 | 53 | 18.66 |
| 9 | 균형 편성 | standard | striker-first | 없음 | won | 47.4 | 0.00 | 6 | 4 / 4 | 50 | 17.80 |
| 9 | 균형 편성 | standard | striker-first | 사용 | won | 42.4 | 0.00 | 7 | 4 / 4 | 47 | 16.02 |
| 9 | 균형 편성 | standard | scout-first | 없음 | won | 53.3 | 0.00 | 5 | 4 / 4 | 55 | 19.14 |
| 9 | 균형 편성 | standard | scout-first | 사용 | won | 47.3 | 0.00 | 7 | 4 / 4 | 50 | 16.98 |
| 9 | 최종 결전 편성 | standard | guard-first | 없음 | won | 48.5 | 0.00 | 7 | 4 / 4 | 54 | 18.58 |
| 9 | 최종 결전 편성 | standard | guard-first | 사용 | won | 48.5 | 0.00 | 8 | 4 / 4 | 54 | 19.07 |
| 9 | 최종 결전 편성 | standard | striker-first | 없음 | won | 47.3 | 0.00 | 6 | 4 / 4 | 55 | 18.60 |
| 9 | 최종 결전 편성 | standard | striker-first | 사용 | won | 46.1 | 0.00 | 8 | 4 / 4 | 53 | 18.45 |
| 9 | 최종 결전 편성 | standard | scout-first | 없음 | won | 55.7 | 0.00 | 6 | 4 / 4 | 60 | 20.52 |
| 9 | 최종 결전 편성 | standard | scout-first | 사용 | won | 51.5 | 0.00 | 8 | 4 / 4 | 56 | 19.69 |
| 9 | 돌격 중심 편성 | standard | guard-first | 없음 | lost | 67.6 | 9.02 | 0 | 4 / 4 | 80 | 27.00 |
| 9 | 돌격 중심 편성 | standard | guard-first | 사용 | lost | 72 | 6.62 | 0 | 4 / 4 | 85 | 29.03 |
| 9 | 돌격 중심 편성 | standard | striker-first | 없음 | lost | 65.3 | 7.44 | 0 | 4 / 4 | 79 | 27.00 |
| 9 | 돌격 중심 편성 | standard | striker-first | 사용 | won | 55.6 | 0.00 | 5 | 4 / 4 | 65 | 22.70 |
| 9 | 돌격 중심 편성 | standard | scout-first | 없음 | lost | 71.7 | 9.05 | 0 | 4 / 4 | 83 | 27.00 |
| 9 | 돌격 중심 편성 | standard | scout-first | 사용 | lost | 79.4 | 4.30 | 0 | 4 / 4 | 90 | 30.23 |
| 9 | 방패 중심 편성 | standard | guard-first | 없음 | won | 70.8 | 0.00 | 5 | 4 / 4 | 78 | 27.20 |
| 9 | 방패 중심 편성 | standard | guard-first | 사용 | won | 70.8 | 0.00 | 5 | 4 / 4 | 78 | 27.16 |
| 9 | 방패 중심 편성 | standard | striker-first | 없음 | lost | 180 | 3.73 | 0 | 4 / 4 | 99 | 37.20 |
| 9 | 방패 중심 편성 | standard | striker-first | 사용 | won | 56.4 | 0.00 | 6 | 4 / 4 | 61 | 21.84 |
| 9 | 방패 중심 편성 | standard | scout-first | 없음 | won | 85 | 0.00 | 3 | 4 / 4 | 90 | 33.16 |
| 9 | 방패 중심 편성 | standard | scout-first | 사용 | won | 70 | 0.00 | 5 | 4 / 4 | 77 | 26.96 |
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
| 9 | 균형 편성 | challenge | guard-first | 없음 | lost | 180 | 0.03 | 0 | 4 / 4 | 80 | 28.20 |
| 9 | 균형 편성 | challenge | guard-first | 사용 | won | 51.1 | 0.00 | 5 | 4 / 4 | 66 | 22.93 |
| 9 | 균형 편성 | challenge | striker-first | 없음 | won | 48.4 | 0.00 | 4 | 4 / 4 | 64 | 22.38 |
| 9 | 균형 편성 | challenge | striker-first | 사용 | won | 48.4 | 0.00 | 5 | 4 / 4 | 64 | 22.52 |
| 9 | 균형 편성 | challenge | scout-first | 없음 | won | 53.3 | 0.00 | 4 | 4 / 4 | 69 | 22.64 |
| 9 | 균형 편성 | challenge | scout-first | 사용 | won | 53.3 | 0.00 | 5 | 4 / 4 | 69 | 23.21 |
| 9 | 최종 결전 편성 | challenge | guard-first | 없음 | won | 54.5 | 0.00 | 5 | 4 / 4 | 74 | 25.38 |
| 9 | 최종 결전 편성 | challenge | guard-first | 사용 | won | 48.5 | 0.00 | 6 | 4 / 4 | 67 | 22.01 |
| 9 | 최종 결전 편성 | challenge | striker-first | 없음 | won | 46.1 | 0.00 | 6 | 4 / 4 | 65 | 22.69 |
| 9 | 최종 결전 편성 | challenge | striker-first | 사용 | won | 47.3 | 0.00 | 6 | 4 / 4 | 67 | 23.89 |
| 9 | 최종 결전 편성 | challenge | scout-first | 없음 | won | 50.3 | 0.00 | 6 | 4 / 4 | 68 | 21.16 |
| 9 | 최종 결전 편성 | challenge | scout-first | 사용 | won | 51.5 | 0.00 | 6 | 4 / 4 | 70 | 23.21 |
| 9 | 돌격 중심 편성 | challenge | guard-first | 없음 | lost | 62.2 | 9.99 | 0 | 3 / 4 | 87 | 27.00 |
| 9 | 돌격 중심 편성 | challenge | guard-first | 사용 | lost | 59.8 | 9.99 | 0 | 4 / 4 | 90 | 29.03 |
| 9 | 돌격 중심 편성 | challenge | striker-first | 없음 | lost | 52.3 | 9.99 | 0 | 3 / 4 | 83 | 27.00 |
| 9 | 돌격 중심 편성 | challenge | striker-first | 사용 | lost | 58 | 9.93 | 0 | 4 / 4 | 89 | 29.40 |
| 9 | 돌격 중심 편성 | challenge | scout-first | 없음 | lost | 62.3 | 9.99 | 0 | 3 / 4 | 90 | 27.00 |
| 9 | 돌격 중심 편성 | challenge | scout-first | 사용 | lost | 65 | 9.99 | 0 | 4 / 4 | 95 | 30.23 |
| 9 | 방패 중심 편성 | challenge | guard-first | 없음 | lost | 180 | 2.97 | 0 | 4 / 4 | 104 | 37.20 |
| 9 | 방패 중심 편성 | challenge | guard-first | 사용 | lost | 180 | 3.20 | 0 | 4 / 4 | 112 | 39.23 |
| 9 | 방패 중심 편성 | challenge | striker-first | 없음 | lost | 180 | 9.10 | 0 | 4 / 4 | 103 | 37.20 |
| 9 | 방패 중심 편성 | challenge | striker-first | 사용 | lost | 180 | 2.97 | 0 | 4 / 4 | 106 | 39.95 |
| 9 | 방패 중심 편성 | challenge | scout-first | 없음 | lost | 180 | 9.60 | 0 | 4 / 4 | 107 | 37.20 |
| 9 | 방패 중심 편성 | challenge | scout-first | 사용 | lost | 180 | 2.97 | 0 | 4 / 4 | 112 | 40.13 |
| 9 | 정찰 중심 편성 | challenge | guard-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 86 | 18.60 |
| 9 | 정찰 중심 편성 | challenge | guard-first | 사용 | lost | 180 | 9.99 | 0 | 2 / 4 | 88 | 20.58 |
| 9 | 정찰 중심 편성 | challenge | striker-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 86 | 18.60 |
| 9 | 정찰 중심 편성 | challenge | striker-first | 사용 | lost | 180 | 9.99 | 0 | 2 / 4 | 88 | 20.58 |
| 9 | 정찰 중심 편성 | challenge | scout-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 87 | 18.60 |
| 9 | 정찰 중심 편성 | challenge | scout-first | 사용 | lost | 180 | 9.99 | 0 | 2 / 4 | 89 | 20.94 |
| 9 | 소규모 편성 | challenge | guard-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 41 | 9.00 |
| 9 | 소규모 편성 | challenge | guard-first | 사용 | lost | 180 | 9.99 | 0 | 2 / 4 | 50 | 10.80 |
| 9 | 소규모 편성 | challenge | striker-first | 없음 | lost | 180 | 9.99 | 0 | 1 / 4 | 45 | 9.00 |
| 9 | 소규모 편성 | challenge | striker-first | 사용 | lost | 180 | 9.99 | 0 | 2 / 4 | 52 | 11.52 |
| 9 | 소규모 편성 | challenge | scout-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 44 | 9.00 |
| 9 | 소규모 편성 | challenge | scout-first | 사용 | lost | 180 | 9.99 | 0 | 2 / 4 | 52 | 11.93 |
| 10 | 균형 편성 | practice | guard-first | 없음 | lost | 180 | 9.99 | 0 | 4 / 4 | 53 | 28.20 |
| 10 | 균형 편성 | practice | guard-first | 사용 | lost | 180 | 9.99 | 0 | 4 / 4 | 54 | 30.00 |
| 10 | 균형 편성 | practice | striker-first | 없음 | lost | 180 | 9.99 | 0 | 4 / 4 | 51 | 28.20 |
| 10 | 균형 편성 | practice | striker-first | 사용 | lost | 180 | 9.99 | 0 | 4 / 4 | 53 | 30.76 |
| 10 | 균형 편성 | practice | scout-first | 없음 | lost | 180 | 9.99 | 0 | 4 / 4 | 52 | 28.20 |
| 10 | 균형 편성 | practice | scout-first | 사용 | lost | 180 | 9.99 | 0 | 4 / 4 | 56 | 30.95 |
| 10 | 최종 결전 편성 | practice | guard-first | 없음 | lost | 125.8 | 9.99 | 0 | 4 / 4 | 57 | 33.60 |
| 10 | 최종 결전 편성 | practice | guard-first | 사용 | lost | 133.6 | 9.99 | 0 | 4 / 4 | 58 | 35.40 |
| 10 | 최종 결전 편성 | practice | striker-first | 없음 | lost | 124.2 | 9.99 | 0 | 4 / 4 | 57 | 33.60 |
| 10 | 최종 결전 편성 | practice | striker-first | 사용 | lost | 137 | 9.99 | 0 | 4 / 4 | 59 | 36.16 |
| 10 | 최종 결전 편성 | practice | scout-first | 없음 | lost | 128.5 | 9.99 | 0 | 4 / 4 | 60 | 33.60 |
| 10 | 최종 결전 편성 | practice | scout-first | 사용 | lost | 137.8 | 9.99 | 0 | 4 / 4 | 62 | 36.35 |
| 10 | 돌격 중심 편성 | practice | guard-first | 없음 | lost | 113.2 | 9.99 | 0 | 4 / 4 | 55 | 27.00 |
| 10 | 돌격 중심 편성 | practice | guard-first | 사용 | lost | 105.6 | 9.99 | 0 | 4 / 4 | 51 | 28.80 |
| 10 | 돌격 중심 편성 | practice | striker-first | 없음 | lost | 113.2 | 9.99 | 0 | 4 / 4 | 56 | 27.00 |
| 10 | 돌격 중심 편성 | practice | striker-first | 사용 | lost | 111.6 | 9.99 | 0 | 4 / 4 | 54 | 29.94 |
| 10 | 돌격 중심 편성 | practice | scout-first | 없음 | lost | 112.4 | 9.99 | 0 | 4 / 4 | 56 | 27.00 |
| 10 | 돌격 중심 편성 | practice | scout-first | 사용 | lost | 110.8 | 9.99 | 0 | 4 / 4 | 54 | 29.94 |
| 10 | 방패 중심 편성 | practice | guard-first | 없음 | lost | 180 | 9.99 | 0 | 4 / 4 | 77 | 37.20 |
| 10 | 방패 중심 편성 | practice | guard-first | 사용 | lost | 180 | 9.99 | 0 | 4 / 4 | 73 | 39.00 |
| 10 | 방패 중심 편성 | practice | striker-first | 없음 | lost | 180 | 9.99 | 0 | 4 / 4 | 77 | 37.20 |
| 10 | 방패 중심 편성 | practice | striker-first | 사용 | lost | 180 | 9.99 | 0 | 4 / 4 | 78 | 39.57 |
| 10 | 방패 중심 편성 | practice | scout-first | 없음 | lost | 180 | 9.99 | 0 | 4 / 4 | 78 | 37.20 |
| 10 | 방패 중심 편성 | practice | scout-first | 사용 | lost | 180 | 9.99 | 1 | 4 / 4 | 79 | 39.47 |
| 10 | 정찰 중심 편성 | practice | guard-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 73 | 18.60 |
| 10 | 정찰 중심 편성 | practice | guard-first | 사용 | lost | 180 | 9.99 | 0 | 2 / 4 | 78 | 20.59 |
| 10 | 정찰 중심 편성 | practice | striker-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 73 | 18.60 |
| 10 | 정찰 중심 편성 | practice | striker-first | 사용 | lost | 180 | 9.99 | 0 | 2 / 4 | 78 | 20.59 |
| 10 | 정찰 중심 편성 | practice | scout-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 76 | 18.60 |
| 10 | 정찰 중심 편성 | practice | scout-first | 사용 | lost | 180 | 9.99 | 0 | 2 / 4 | 80 | 20.40 |
| 10 | 소규모 편성 | practice | guard-first | 없음 | lost | 180 | 9.99 | 0 | 1 / 4 | 39 | 9.00 |
| 10 | 소규모 편성 | practice | guard-first | 사용 | lost | 180 | 9.99 | 0 | 2 / 4 | 42 | 10.80 |
| 10 | 소규모 편성 | practice | striker-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 36 | 9.00 |
| 10 | 소규모 편성 | practice | striker-first | 사용 | lost | 180 | 9.99 | 0 | 2 / 4 | 42 | 11.37 |
| 10 | 소규모 편성 | practice | scout-first | 없음 | lost | 180 | 9.99 | 0 | 2 / 4 | 35 | 9.00 |
| 10 | 소규모 편성 | practice | scout-first | 사용 | lost | 180 | 9.99 | 0 | 2 / 4 | 41 | 11.37 |
| 10 | 균형 편성 | standard | guard-first | 없음 | lost | 180 | 9.99 | 0 | 4 / 4 | 65 | 28.20 |
| 10 | 균형 편성 | standard | guard-first | 사용 | lost | 180 | 9.99 | 0 | 4 / 4 | 62 | 30.24 |
| 10 | 균형 편성 | standard | striker-first | 없음 | lost | 180 | 9.99 | 0 | 4 / 4 | 60 | 28.20 |
| 10 | 균형 편성 | standard | striker-first | 사용 | lost | 180 | 9.99 | 0 | 4 / 4 | 61 | 31.19 |
| 10 | 균형 편성 | standard | scout-first | 없음 | lost | 180 | 9.99 | 0 | 4 / 4 | 61 | 28.20 |
| 10 | 균형 편성 | standard | scout-first | 사용 | lost | 180 | 9.99 | 0 | 4 / 4 | 62 | 31.38 |
| 10 | 최종 결전 편성 | standard | guard-first | 없음 | lost | 114.4 | 9.99 | 0 | 4 / 4 | 64 | 33.60 |
| 10 | 최종 결전 편성 | standard | guard-first | 사용 | lost | 116.7 | 9.99 | 0 | 4 / 4 | 66 | 35.64 |
| 10 | 최종 결전 편성 | standard | striker-first | 없음 | lost | 114.4 | 9.99 | 0 | 4 / 4 | 64 | 33.60 |
| 10 | 최종 결전 편성 | standard | striker-first | 사용 | lost | 118.9 | 9.99 | 0 | 4 / 4 | 66 | 36.59 |
| 10 | 최종 결전 편성 | standard | scout-first | 없음 | lost | 114.6 | 9.99 | 0 | 4 / 4 | 66 | 33.60 |
| 10 | 최종 결전 편성 | standard | scout-first | 사용 | lost | 114.6 | 9.99 | 0 | 4 / 4 | 67 | 36.78 |
| 10 | 돌격 중심 편성 | standard | guard-first | 없음 | lost | 101 | 9.99 | 0 | 4 / 4 | 63 | 27.00 |
| 10 | 돌격 중심 편성 | standard | guard-first | 사용 | lost | 102.7 | 9.99 | 0 | 4 / 4 | 61 | 29.04 |
| 10 | 돌격 중심 편성 | standard | striker-first | 없음 | lost | 107.6 | 9.99 | 0 | 4 / 4 | 68 | 27.00 |
| 10 | 돌격 중심 편성 | standard | striker-first | 사용 | lost | 110 | 9.99 | 0 | 4 / 4 | 67 | 30.34 |
| 10 | 돌격 중심 편성 | standard | scout-first | 없음 | lost | 106.2 | 9.99 | 0 | 4 / 4 | 67 | 27.00 |
| 10 | 돌격 중심 편성 | standard | scout-first | 사용 | lost | 109.2 | 9.99 | 0 | 4 / 4 | 66 | 30.34 |
| 10 | 방패 중심 편성 | standard | guard-first | 없음 | lost | 180 | 9.99 | 0 | 4 / 4 | 89 | 37.20 |
| 10 | 방패 중심 편성 | standard | guard-first | 사용 | lost | 180 | 9.99 | 0 | 4 / 4 | 90 | 39.24 |
| 10 | 방패 중심 편성 | standard | striker-first | 없음 | lost | 180 | 9.99 | 0 | 4 / 4 | 87 | 37.20 |
| 10 | 방패 중심 편성 | standard | striker-first | 사용 | lost | 180 | 9.99 | 0 | 4 / 4 | 91 | 39.81 |
| 10 | 방패 중심 편성 | standard | scout-first | 없음 | lost | 180 | 9.99 | 0 | 4 / 4 | 87 | 37.20 |
| 10 | 방패 중심 편성 | standard | scout-first | 사용 | lost | 180 | 9.99 | 0 | 4 / 4 | 91 | 40.00 |
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
| 10 | 균형 편성 | challenge | guard-first | 없음 | lost | 180 | 9.99 | 0 | 4 / 4 | 78 | 28.20 |
| 10 | 균형 편성 | challenge | guard-first | 사용 | lost | 180 | 9.99 | 0 | 4 / 4 | 79 | 30.24 |
| 10 | 균형 편성 | challenge | striker-first | 없음 | lost | 180 | 9.99 | 0 | 4 / 4 | 75 | 28.20 |
| 10 | 균형 편성 | challenge | striker-first | 사용 | lost | 180 | 9.99 | 0 | 4 / 4 | 71 | 31.38 |
| 10 | 균형 편성 | challenge | scout-first | 없음 | lost | 180 | 9.99 | 0 | 4 / 4 | 77 | 28.20 |
| 10 | 균형 편성 | challenge | scout-first | 사용 | lost | 180 | 9.99 | 0 | 4 / 4 | 73 | 31.57 |
| 10 | 최종 결전 편성 | challenge | guard-first | 없음 | lost | 106.1 | 9.99 | 0 | 4 / 4 | 76 | 33.60 |
| 10 | 최종 결전 편성 | challenge | guard-first | 사용 | lost | 107 | 9.99 | 0 | 4 / 4 | 77 | 35.64 |
| 10 | 최종 결전 편성 | challenge | striker-first | 없음 | lost | 109.9 | 9.99 | 0 | 4 / 4 | 79 | 33.60 |
| 10 | 최종 결전 편성 | challenge | striker-first | 사용 | lost | 108.8 | 9.99 | 0 | 4 / 4 | 77 | 36.78 |
| 10 | 최종 결전 편성 | challenge | scout-first | 없음 | lost | 106.7 | 9.99 | 0 | 4 / 4 | 77 | 33.60 |
| 10 | 최종 결전 편성 | challenge | scout-first | 사용 | lost | 110.2 | 9.99 | 0 | 4 / 4 | 80 | 36.97 |
| 10 | 돌격 중심 편성 | challenge | guard-first | 없음 | lost | 97.9 | 9.99 | 0 | 4 / 4 | 74 | 27.00 |
| 10 | 돌격 중심 편성 | challenge | guard-first | 사용 | lost | 97.9 | 9.99 | 0 | 4 / 4 | 75 | 29.04 |
| 10 | 돌격 중심 편성 | challenge | striker-first | 없음 | lost | 100.2 | 9.99 | 0 | 4 / 4 | 80 | 27.00 |
| 10 | 돌격 중심 편성 | challenge | striker-first | 사용 | lost | 103.9 | 9.99 | 0 | 4 / 4 | 81 | 30.19 |
| 10 | 돌격 중심 편성 | challenge | scout-first | 없음 | lost | 99.4 | 9.99 | 0 | 4 / 4 | 79 | 27.00 |
| 10 | 돌격 중심 편성 | challenge | scout-first | 사용 | lost | 107.5 | 9.99 | 0 | 4 / 4 | 82 | 30.34 |
| 10 | 방패 중심 편성 | challenge | guard-first | 없음 | lost | 180 | 9.99 | 0 | 4 / 4 | 101 | 37.20 |
| 10 | 방패 중심 편성 | challenge | guard-first | 사용 | lost | 180 | 9.99 | 0 | 4 / 4 | 104 | 39.24 |
| 10 | 방패 중심 편성 | challenge | striker-first | 없음 | lost | 180 | 9.99 | 0 | 4 / 4 | 99 | 37.20 |
| 10 | 방패 중심 편성 | challenge | striker-first | 사용 | lost | 180 | 9.99 | 0 | 4 / 4 | 103 | 40.00 |
| 10 | 방패 중심 편성 | challenge | scout-first | 없음 | lost | 180 | 9.99 | 0 | 4 / 4 | 99 | 37.20 |
| 10 | 방패 중심 편성 | challenge | scout-first | 사용 | lost | 180 | 9.99 | 0 | 4 / 4 | 103 | 40.19 |
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
