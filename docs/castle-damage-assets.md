# 성 피격·파괴 애니메이션

2026-10-12, 기존 성의 `flame-loop-v1.png`를 참조해 **built-in OpenAI imagegen**으로 투명 배경 스프라이트 두 장을 생성했다. 원본 그림은 편집하지 않고 보존한다. 생성 도구, 참조 이미지와 두 자산의 **전체 프롬프트**는 [castle-damage-v1-prompts.json](../public/licenses/castle-damage-v1-prompts.json)에 기록했다.

| 용도 | 원본 PNG | 런타임 WebP | 재생 |
| --- | --- | --- | --- |
| 피격 | `public/assets/dungeon/castle-hit-v1.png` | `/assets/dungeon/castle-hit-v1.04f1f232ab79.webp` | 4×4, 16프레임, 24fps, 한 번 재생 |
| 파괴 | `public/assets/dungeon/castle-collapse-v1.png` | `/assets/dungeon/castle-collapse-v1.3c96dff2e8f1.webp` | 4×4, 16프레임, 14fps, 한 번 재생 후 잔해 유지 |

WebP는 기존 자산 최적화 파이프라인으로 생성한다. 원본 1254×1254 PNG는 보존하고 런타임은 640×640 WebP, 두 장 합계 272,592바이트로 최적화한다. 투명도는 손실 없이 유지하며 기존 핵심 이미지 7 MiB 제한을 지킨다. URL·크기·원본 해시는 [art-manifest.json](../src/art-manifest.json)에서 관리한다.

원본 그림의 프레임 경계가 균일하지 않아 [castle-damage-atlas.json](../src/castle-damage-atlas.json)에 측정한 크롭 영역과 바닥 기준점을 기록했다. 런타임은 `scaledCastleDamageAtlas`로 최적화 이미지 해상도에 맞게 좌표를 변환하고 Phaser `setTrim`으로 공통 캔버스에 정렬한다. 인접 프레임이 섞이거나 바닥 위치가 흔들리지 않도록 원본 전체를 단순히 4등분하지 않는다.

몬스터가 성에 도달해 체력이 감소하면 불꽃, 석재 조각, 먼지가 나오는 피격 애니메이션을 재생한다. 체력이 0이면 성이 내려앉고 마지막 잔해 프레임을 유지한다. 모험과 1:1 대전에 같은 [CastleDamageEffects](../src/castle-damage-effects.ts)를 사용한다. 1:1에서는 각 진영의 성이 위·아래 전장에 각각 표시되므로, 같은 진영에 속한 두 성의 체력 변화를 동기화한다. 기존 성의 위치·부모 컨테이너·표시 크기·색상을 유지하고, 피격이 끝나면 원래 불꽃 애니메이션을 다시 보여준다.

체력·승패·점수는 기존 게임 로직이 결정한다. 파괴 중에는 결과창과 큰 패배·승리 연출만 잠시 기다리며, 붕괴가 끝난 후 표시한다. 일시정지는 스프라이트 재생도 멈춘다. 동작 줄이기 설정에서는 피격 움직임을 생략하고 파괴 시 잔해를 바로 표시한다. 맵을 다시 그릴 때 진행 프레임을 유지하며, 재시작·새 단계·장면 종료 시 효과와 대기 작업을 정리한다.
