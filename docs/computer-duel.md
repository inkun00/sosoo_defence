# 컴퓨터와 대결

1:1 메뉴에서 **컴퓨터와 대결**을 누르면 계정 로그인 후 상대 1~10단계를 선택할 수 있습니다. 전투는 브라우저에서 실행되며 컴퓨터 전적은 온라인 계정의 승패·경험치와 별도로 저장합니다.

컴퓨터는 같은 코인, 가격, 공격력, 불꽃 체력과 합성 규칙을 사용합니다. 높은 단계는 계산 시간이 짧고 다양한 타워와 영웅을 활용합니다. 큰 공격은 입구 구간에, 작은 공격은 마무리 구간에 배치합니다. 구매 계산판이나 설정을 열어도 전투는 진행됩니다.

상대 선택 후 **게임 시작**을 눌러야 타워를 설치할 수 있습니다. 준비 중에는 양쪽 모두 타워를 구매하거나 설치하지 않으며, 컴퓨터의 행동 시간도 게임 시작 시점부터 계산합니다.

## 생성 이미지

Built-in `image_gen`으로 제작했습니다. 각 파일은 투명한 4열×3행 12프레임 시트입니다. 프레임 0~1 대기, 2~3 생각, 4~5 시전, 6~7 반동, 8~9 승리, 10~11 패배. 캐릭터별 표정과 자세가 변하며, 선택한 상대의 시트만 전투에서 불러옵니다.

원본 PNG와 최종 프롬프트:

| 단계 | 상대 | 프로젝트에 저장된 원본 |
|---|---|---|
| 1 | 이끼 견습생 | [cpu-opponent-1-v1.png](../public/assets/dungeon/cpu-opponent-1-v1.png) |
| 2 | 등불 정찰병 | [cpu-opponent-2-v1.png](../public/assets/dungeon/cpu-opponent-2-v1.png) |
| 3 | 불씨 대장장이 | [cpu-opponent-3-v1.png](../public/assets/dungeon/cpu-opponent-3-v1.png) |
| 4 | 서리 현자 | [cpu-opponent-4-v1.png](../public/assets/dungeon/cpu-opponent-4-v1.png) |
| 5 | 번개 연금술사 | [cpu-opponent-5-v1.png](../public/assets/dungeon/cpu-opponent-5-v1.png) |
| 6 | 룬 기사 | [cpu-opponent-6-v1.png](../public/assets/dungeon/cpu-opponent-6-v1.png) |
| 7 | 수정 예언자 | [cpu-opponent-7-v1.png](../public/assets/dungeon/cpu-opponent-7-v1.png) |
| 8 | 그림자 파수꾼 | [cpu-opponent-8-v1.png](../public/assets/dungeon/cpu-opponent-8-v1.png) |
| 9 | 폭풍 용 현자 | [cpu-opponent-9-v1.png](../public/assets/dungeon/cpu-opponent-9-v1.png) |
| 10 | 대마법사 | [cpu-opponent-10-v1.png](../public/assets/dungeon/cpu-opponent-10-v1.png) |

[생성 프롬프트와 프레임 배열](../public/licenses/cpu-opponents-v1-prompts.json). 배포용 WebP는 `web-public/assets/dungeon`에 저장하며 10개 합계 약 1.65 MiB입니다. 원본은 보관하고 전송 이미지의 알파와 프레임 크기를 유지합니다.

## 검증

- 10명의 전체 대전, 자동 웨이브, 합성·부화·설치, 구매 중 전투 진행, 견적 만료·취소, 종료 타이머 정리를 검사합니다.
- `tools/computer-duel-simulation.ts`로 같은 기준 전략을 5개 시드에서 비교했습니다. 기준 전략은 1~3단계를 이기고 4~6단계와 비기며 7~10단계에 졌습니다. 더 빠른 계산과 높은 레벨의 군집 영웅을 사용하는 별도 전략은 최고 단계에서 5회 모두 승리했습니다. 이는 회귀 검증이며 학생들의 실제 승률을 예측하는 결과가 아닙니다.
- 이미지 검사에서 10개 시트의 투명 여백, 프레임 12개, 서로 다른 행동 이미지, 압축 크기를 확인합니다.
- 실제 브라우저에서 상대 선택, 준비, 전투 중 하단 구매 계산, 오답 유지와 정답 설치를 확인했습니다. 현재 1:1 메뉴는 계정 로그인이 필요합니다.
