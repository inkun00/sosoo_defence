# JavaScript 초기 전송 개선 · 2026-10-09

기존 큰 묶음은 Phaser Arcade 배포본 전체와 공통 발사체 코드가 합쳐진 **1,117,807 bytes**였습니다. 게임이 사용하지 않는 물리 엔진, Phaser 음원 처리, 타일맵과 추가 게임 오브젝트까지 포함돼 있었습니다. 게임의 충돌 계산과 효과음은 이미 별도의 자체 구현을 사용합니다.

## 수정

- [Phaser 공식 custom-build 방식](https://github.com/phaserjs/custom-build)에 따라 설치된 Phaser **3.90.0** 소스에서 실제 사용되는 오브젝트 생성 함수, 이미지 로더와 씬 플러그인만 포함합니다. WebGL과 Canvas, Sprite 애니메이션, NineSlice, Graphics, Text, Container, TileSprite, Zone, Rectangle, 마스크, 타이머, Tween과 입력 처리는 유지합니다. Phaser 물리 엔진·음원 관리자·3D 카메라·Facebook 플러그인·디버그 도구를 제외합니다.
- Vite와 개발 의존성 최적화 모두에 Phaser 공식 빌드의 `typeof FLAG` 치환을 적용합니다. 설치 패키지 자체를 수정하거나 별도 버전의 엔진을 다운로드하지 않습니다.
- Phaser renderer와 renderer가 사용하는 기하·유틸리티를 한 묶음으로 두고, 씬·입력·로더·애니메이션 런타임을 다른 묶음으로 분리합니다. renderer의 의존성 전체를 포함하므로 씬 런타임에서 renderer로만 참조하며, 순환 묶음이 생기지 않습니다. 최대 용량에 맞춰 임의로 파일을 쪼개거나 Vite의 경고 한계를 늘리지 않습니다.
- 시작 화면의 스토리를 클릭 시점에 불러옵니다. 오프닝·엔딩 코드와 CSS는 시작 화면을 열기만 했을 때 다운로드되지 않습니다. 엔딩 폰트 선언도 이 CSS에 포함되며 실제 폰트는 엔딩에 사용될 때 로드됩니다. 스토리 코드 로드가 실패하면 다시 시도할 수 있는 안내를 표시합니다.
- 개발 서버의 검색 대상을 실제 엔트리와 `tools`의 검증 페이지로 한정해, 오래된 `test-results` HTML이 삭제된 개발 의존성을 참조해 시작 시 오류를 일으키지 않도록 합니다.

## 계측과 회귀 검사

개별 JavaScript 묶음이 모두 기존 **500 kB** 경고 한계 안에 있습니다. 실험 빌드에서는 엔진 약 **426 kB**, renderer 약 **207 kB**, 공통 발사체 약 **21 kB**로 감소했습니다. 공통 의존성까지 합한 대응 묶음은 약 **658 kB**로, 기존 1,118 kB보다 약 **41%** 작습니다. 압축률·네트워크·캐시 상태에 따른 실제 다운로드 시간은 별도로 달라집니다.

시작 화면의 초기 JavaScript는 약 **58 kB → 44 kB**로 줄었습니다. 추가로 스토리 CSS 약 **3 kB**가 클릭 이후로 지연됩니다. 엔딩 폰트 **55 kB**는 원래도 실제 사용 시에 다운로드되므로 이 파일 크기를 새로 절감한 초기 전송량에 합산하지 않습니다. 학습지 화면은 게임 엔진을 불러오지 않으며, PDF 라이브러리는 ‘학습지 저장’을 누를 때만 불러옵니다. 이 두 동작은 이전의 페이지별 지연 로드를 계속 보장하는 검사도 추가했습니다.

재현 명령:

```text
npm run build
node tools/check-bundle.mjs
npx tsx --test tests/phaser-build.test.ts
```

`check-bundle.mjs`는 빌드 manifest의 실제 정적 import 그래프를 따라가 모드별 초기 JavaScript 용량을 계산합니다. 500 kB 한계, 순환 import 부재, 시작 화면·학습지의 Phaser 미포함, PDF 및 스토리 지연 로드를 검사합니다. Brotli 수치는 quality 6의 재현 가능한 추정치이며 서버에서 측정한 전송량으로 표현하지 않습니다.

개발 서버에서 `tools/phaser-runtime-preview.html`과 `?renderer=canvas`는 실제 Dungeon 이미지 로딩과 등록, 렌더링, 입력, 타이머, Tween, Sprite 애니메이션, 마스크, 12종 발사체의 명중과 효과 정리를 확인하는 공개 검증 화면입니다. 자동 테스트는 빌드 플래그, renderer 의존성 경계, watch 재빌드의 의존성 갱신을 확인합니다. 실제 게임 장면의 브라우저 확인 결과는 [전체 기능 검증](full-feature-audit.md)의 후속 기록에 함께 정리합니다.
