# 교실 와이파이 접속 점검과 공식 주소

## 확인한 사실과 확인하지 못한 부분

2026-10-15 외부망에서 기존 `https://sosoo-defence.vercel.app/?mode=adventure`는 HTTP 200과 정상 TLS 인증서로 응답했다. 새 Chrome 브라우저에서 시작 화면과 스토리 모드를 각각 일반 연결/모든 외부 출처 차단 조건으로 실행했다. 각각 13/40개의 요청은 모두 게임과 같은 출처이며 실패 요청과 페이지 오류가 없었다. 스토리 모드의 첫 진입은 Firebase 로그인·Google CDN·WebRTC에 의존하지 않는다.

특정 교실 와이파이에 직접 연결하지 못했고 당시 오류 문구도 확인되지 않았다. 따라서 학교의 DNS·도메인·IP 필터인지, 장치 설정인지, 일시적인 장애인지 확정하지 않는다. Vercel도 학교 등 관리되는 네트워크의 정책으로 사이트 접근이 제한될 수 있다고 안내한다. 앱 코드만으로 학교망의 접속 정책을 해제할 수는 없다. [Vercel 공식 접속 장애 안내](https://vercel.com/kb/guide/how-to-resolve-ip-blocking-issues)

실행 파일 요청이 차단되거나 지연될 때 화면이 비어 있고, 저장된 계정 복구가 늦어져도 안내가 없었던 점은 앱에서 개선했다. 초기 HTML 자체가 도착하지 않는 경우에는 그 안의 복구 안내도 표시할 수 없다.

## 제공하는 공식 접속 주소

- 교실용: <https://sosoo-defense-20261005.web.app/?mode=adventure>
- 추가 주소: <https://sosoo-defense-20261005.firebaseapp.com/?mode=adventure>
- 기존 주소: <https://sosoo-defence.vercel.app/?mode=adventure>

같은 게임 빌드를 Vercel과 기존 Firebase 프로젝트의 Hosting에 함께 배포한다. Firebase 주소는 Vercel로 리다이렉트하지 않는다. 기존 Hosting 기본 사이트와 인증 허용 도메인을 사용하며 새 프로젝트·계정·유료 도메인을 만들지 않는다. [Firebase Hosting 공식 안내](https://firebase.google.com/docs/hosting/quickstart)

스토리 진행·별·재료·음향 설정은 브라우저의 접속 주소별 저장이다. 다른 주소로 옮기면 처음 시작하는 것으로 보일 수 있고 이전 주소의 자료를 삭제하지 않는다. 이메일 계정은 같은 Firebase 프로젝트를 사용하므로 로그인 후 서버의 누적 경험치·전적·학습지 기록에 접근한다. 새 주소에서는 다시 로그인해야 한다. 익명 순위 등록의 브라우저 UID도 주소별로 다르다.

## 연결 실패 때의 화면

게임 파일을 8초 안에 받지 못하거나 초기 script/stylesheet 오류가 발생하면 외부 파일 없이 작성된 복구 안내를 표시한다. 재시도, 시작 화면, 연결 확인, 공식 추가 주소를 제공한다. 늦게 정상 화면이 준비되면 지연 안내는 사라진다. 이미 동작하는 게임의 선택적 이미지·음원 오류로 복구 화면을 덮지 않는다.

1:1 대전·학습지의 계정 준비는 최대 10초 후 연결 안내로 전환한다. 인증에 실패했거나 아직 준비되지 않은 계정으로 보호된 화면을 열거나 인쇄하지 않는다. 늦은 계정 복구도 실패한 진입을 자동으로 재개하지 않는다. 스토리·튜토리얼·시작 화면은 계속 로그인 없이 실행한다.

각 주소의 `/network-check.html`은 게임 엔진이나 외부 CDN 없이 열리며 사용자가 버튼을 누르면 게임 실행 파일과 로그인·기록 서버의 연결을 확인한다. 결과를 자동 전송하지 않고 계정·비밀번호를 조회하지 않는다. 외부 서버 검사는 연결 가능성만 확인하며 로그인 성공이나 학교망 차단 사유를 판정하지 않는다.

## 학교 전산 담당자용

초등 수학 수업용 HTTPS(443) 웹 학습 게임이다. 스토리 수업에는 공식 접속 주소 중 하나와 그 주소의 `/assets/` 연결이 필요하다. 학교가 주소를 제한하면 교육용 사용 여부를 확인하고 허용을 요청한다.

로그인·학습지·기록·순위에는 아래 서버가 추가로 필요하다.

- `identitytoolkit.googleapis.com`
- `securetoken.googleapis.com`
- `firestore.googleapis.com`
- `sosoo-defense-20261005.firebaseapp.com`
- `asia-northeast3-sosoo-defense-20261005.cloudfunctions.net`

친구와의 대전은 WebRTC 직접 연결도 사용하므로 두 장치의 연결 정책에 영향을 받는다. 컴퓨터 대전과 스토리 모드에는 WebRTC가 필요 없다. 네트워크 보안 설정 해제나 임의의 VPN 사용을 요구하지 않는다.

## 배포와 검증

현재 로컬 Firebase 설정을 유지한 채 `npm test`, `npm run build`, `npm run check:bundle`을 실행한다. 소스 커밋을 `main`에 올리면 기존 Git 연동 Vercel 배포가 진행된다. 동일 `dist`로 다음 명령도 실행하여 교실용 두 주소를 최신으로 유지한다.

```powershell
node_modules/.bin/firebase.cmd deploy --project sosoo-defense-20261005 --only hosting
```

`--only hosting`으로 함수·Firestore 규칙·인증 설정을 변경하지 않는다. `tools/firebase-project-setup.cjs`를 다시 실행하여 기존 인증 도메인을 덮어쓰지 않는다. Hosting의 `**/.*` 제외 규칙에 따라 `.vite/manifest.json`은 공개하지 않으므로, 운영 검증은 로컬 manifest의 파일 목록으로 실제 HTML·JS·CSS·이미지·음원·폰트와 연결 확인 페이지의 SHA-256을 비교한다. HTML과 연결 확인 페이지는 `no-cache`, 내용 해시가 있는 JS/CSS는 장기 캐시한다.

추가 확인은 실제 브라우저로 세 주소에서 시작 화면·스토리 모드·로그인 화면과 파일 차단/지연 복구를 실행한다. 실제 교실망에서 최종 접속이 되는지는 해당 기기에서 교실용 주소를 열어 확인해야 한다.

이번 수정의 전체 단위·회귀 테스트 690개, TypeScript/Vite 빌드와 번들 검사를 통과했다. 실제 Chrome에서 수정 전 초기 JS 차단 시 빈 화면을 재현했고, 수정 후 시작/모험/대전 로그인/학습지 로그인 정상 진입, PC·모바일 파일 차단 안내, 8초 이상 지연 후 정상 회복, CSS 차단 안내, 외부 서버 차단 시 연결 확인의 구분 표시 등 9조건을 확인했다. 계정 로그인·경기 기록 작성은 수행하지 않았다.
