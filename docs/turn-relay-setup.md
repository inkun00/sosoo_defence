# 외부망 대전 연결 · TURN 구성

게임은 LAN/STUN 직접 연결에 더해 TURN 중계 후보를 자동으로 선택할 수 있습니다. 전투 계산은 계속 방을 만든 사람의 브라우저가 담당합니다. **TURN 서비스가 실제로 설정된 뒤에만** 방화벽/NAT로 막힌 직접 연결을 중계할 수 있습니다. 이번 수정으로 서버를 새로 만들거나 유료 서비스를 등록하지 않았습니다. 저장소와 로컬 환경에는 현재 TURN 설정이 없습니다.

## 구현과 검증

- 인증된 Firebase `duelIce`가 coturn TURN REST 방식으로 20분간 유효한 사용자명과 HMAC-SHA1 자격값을 발급합니다. 사용자명에는 계정 UID 대신 무작위 식별자를 사용합니다. 서버의 공유 비밀은 응답·브라우저 묶음·저장소·로그에 포함하지 않습니다. 브라우저가 실제 ICE 접속에 필요한 단기 자격값만 메모리에 보관합니다.
- `iceTransportPolicy: all`로 직접 연결과 UDP/TCP/TLS 중계 후보를 함께 제공합니다. 사용자에게 네트워크 종류를 선택하게 하지 않습니다.
- 설정 미지원, 함수 미배포, 서버 오류, 잘못된/만료된 응답, 4초 이상 응답 지연, 브라우저가 중계 설정을 거부하는 경우에는 기존 LAN/STUN 설정으로 돌아갑니다. 이 경로가 차단된 네트워크에서는 중계 서비스가 필요합니다.
- 계정별 발급은 1분에 20회까지이며 한도를 넘으면 거부합니다. 만료 제한 자료는 기존 시간별 정리 함수가 삭제합니다. Firestore 클라이언트가 제한 자료를 직접 읽거나 쓰지 못합니다.
- 단위 테스트는 서명·만료·서로 다른 자격값·URL/응답 검증·미설정 서버의 인증 거부·오류/지연 복구를 확인합니다. `tools/peer-network-preview.html`에서 실제 WebRTC 객체 두 개로 직접 연결과 서비스 오류/지연 복구를 확인할 수 있습니다. `중계 경로만 검증`은 설정이 없으면 검증 불가를 표시하며 성공으로 처리하지 않습니다.

## 기존 TURN 서비스 연결 절차

운영자가 이미 소유하거나 사용이 허가된 **TURN REST / coturn 호환 서버**의 주소와 공유 비밀을 준비합니다. 공급자가 이 방식 대신 자체 자격 발급 API를 사용하면 해당 공식 API에 맞는 서버 어댑터가 필요합니다. 공유 비밀을 채팅이나 프런트엔드 환경 변수에 붙여 넣지 않습니다.

1. `functions/.env.example`을 `functions/.env.sosoo-defense-20261005`로 복사하고 `TURN_URLS`에 서버가 실제 지원하는 주소만 쉼표로 입력합니다. 제한망까지 지원하려면 TCP/TLS 443 경로도 해당 서버에 설정되어 있어야 합니다.
2. Firebase Secret Manager에 서버와 동일한 32자 이상의 `TURN_SHARED_SECRET`을 운영자 환경에서 안전하게 등록합니다. 이 작업은 실제 서비스 정보와 권한이 확인됐을 때만 수행합니다. 소스나 환경 파일에 공유 비밀을 넣지 않습니다.
3. `duelIce`와 만료 정리 함수, Firestore 규칙을 배포합니다. `TURN_URLS`가 비어 있으면 비밀 바인딩 없이 배포되고 인증된 요청에 `available:false`를 반환합니다. 주소를 추가/변경할 때는 함수를 다시 배포해야 Secret Manager 바인딩이 적용됩니다.
4. 각 클라이언트가 새 방을 만들거나 참가할 때 단기 자격값을 받아 ICE 후보를 수집합니다. 이미 진행 중인 방은 새 자격값을 요청하지 않습니다. 공유 비밀을 변경하면 해당 함수를 다시 배포하고 새 방으로 검증합니다.
5. 서로 다른 네트워크의 두 계정으로 대전합니다. 먼저 검증 페이지의 `중계 경로만 검증`에서 선택된 후보가 `relay`인지 확인하고, 실제 게임의 방 생성·참가·60초 준비·전투 조작·종료를 확인합니다. 운영 경기 기록을 변경하는 검증은 별도 테스트 계정으로 진행합니다.

```powershell
# 운영자가 실제 TURN 서비스를 준비한 후에만 실행합니다.
npx firebase functions:secrets:set TURN_SHARED_SECRET --project sosoo-defense-20261005
npm --prefix functions run build
npx firebase deploy --project sosoo-defense-20261005 --only "functions:decimal-defense:duelIce,functions:decimal-defense:duelPruneRooms,firestore:rules"
```

실제 TURN 서비스가 없으므로 이번 로컬 테스트는 **외부망 중계 성공을 증명하지 않습니다**. API 발급과 자동 후보 선택 코드는 준비됐지만 실제 `relay` 후보 연결과 서로 다른 외부망의 대전은 서비스 설정 후 검증해야 합니다. 운영 비밀 메타데이터 조회 시도는 자동 승인 검토에서 자격정보 노출 위험으로 거부되어, 서버 비밀 존재 여부는 확인하지 않았습니다. Firebase 배포는 처음 자동 승인 검토에서 거부됐으나 사용자가 추가로 명시 승인하여 2026-10-09 기존 프로젝트의 `duelIce`·`duelPruneRooms`·Firestore 거부 규칙 배포를 완료했습니다. 중계 주소와 비밀 바인딩을 추가하지 않은 안전한 미설정 상태이며, 새 TURN 서비스를 생성하지 않았습니다.

근거: [coturn TURN REST 인증](https://github.com/coturn/coturn/wiki/turnserver), [Firebase 서버 환경과 Secret Manager](https://firebase.google.com/docs/functions/config-env), [Firebase 인증된 callable](https://firebase.google.com/docs/functions/callable).
