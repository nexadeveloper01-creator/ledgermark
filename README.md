# LEDGERMARK

전자담배 유통 공정관리 플랫폼 — UID 기반 소유권 상태머신과 허가형 원장(해시체인)으로
생산부터 소비자 소유권 이전까지 전 유통 단계를 추적합니다.

기획 문서: [`전자담배_유통공정관리_플랫폼_기획서_v1.md`](전자담배_유통공정관리_플랫폼_기획서_v1.md)
디자인 프로토타입: `LEDGERMARK.dc.html` (Industry 디자인 시스템 `_ds/industry-*`)

## 이번 단계의 구현 범위

| 영역 | 상태 |
|---|---|
| UID 소유권 상태머신 (6종 트랜잭션) | 구현 완료 |
| 허가형 원장 — append-only + 해시체인 무결성 검증 | 구현 완료 |
| 주기적 Merkle 앵커링 + 퍼블릭 체인 게시·검증 | 구현 완료 (기본값은 시뮬레이션 모드) |
| 연령인증 AVP 라우터 + 필리핀(RA 11900) 모듈 | 구현 완료 |
| 랜딩 페이지 | 구현 완료 |
| 정부 관제 콘솔 (대시보드 / UID 조회 / 밀수 알림 / 원장 상태) | 구현 완료 |
| 소비자 앱 (스캔 / 연령인증 / 등록 상태 / 내 제품·교환·중고거래) | 구현 완료 |
| 매장·총판 웹 (소유권 이전 대기 큐 / 커밋) | 구현 완료 |
| 통관 미확인 UID 판매 차단 + 밀수 알림 자동 승격 | 구현 완료 |
| 단속 현장 단말 (판정 3종 / 조서 자동 생성 / 콘솔 승격) | 구현 완료 |
| 인증·권한 (세션 로그인, 역할·소속 기반 접근 제어) | 구현 완료 |
| 레이트 리밋 (로그인 브루트포스·이메일 열거 방어) | 구현 완료 |
| 감사 로그 (append-only, 관제 콘솔에서 열람) | 구현 완료 |

## 실행 방법

```bash
npm install
cp .env.example .env
```

### 1. 데이터베이스 기동

Docker가 있는 환경:

```bash
npm run db:up
```

Docker가 없는 로컬 개발 환경(Windows 등) — 별도 터미널에서 실행한 채로 둡니다:

```bash
npm run db:local
```

### 2. 스키마 적용 + 데모 데이터

```bash
npx prisma migrate dev --name init
npm run prisma:seed
```

### 3. 개발 서버

```bash
npm run dev
```

- 랜딩 페이지: http://localhost:3000
- 정부 관제 콘솔: http://localhost:3000/console
- 소비자 앱: http://localhost:3000/app
- 매장·총판 웹: http://localhost:3000/partner
- 단속 현장 단말: http://localhost:3000/field

### 데모 계정

모든 계정의 비밀번호는 `ledgermark1234`입니다. 로그인하면 역할에 맞는 화면으로 이동합니다.

| 이메일 | 역할 | 도착 화면 |
|---|---|---|
| `admin@ledgermark.test` | 운영자 (원장 운영·LOT 발급·앵커링) | 관제 콘솔 |
| `inspector@boc.test` | 관세청 심사관 | 관제 콘솔 |
| `officer@pnp.test` | 단속관 | 단속 현장 단말 |
| `staff@mm014.test` | 매장·총판 직원 | 매장 웹 |
| `a@consumer.test` / `b@consumer.test` | 소비자 | 소비자 앱 |

시드 데이터로 바로 확인할 수 있는 UID:

| UID | 확인 내용 |
|---|---|
| `PH-2609-A-000010` | 정상 유통 — 소비자 앱 스캔, 단속 현장 정상 판정 |
| `GRAY-2609-Z-000002` | 통관 미확인 — 단속 현장 압수 근거 판정 |
| 아무 미등록 코드 | 원장 미존재 — 단속 현장 위조 의심 판정 |

### 테스트

```bash
npm test
```

상태머신·해시체인·Merkle·연령인증 모듈의 순수 로직 단위 테스트가 실행됩니다(DB 불필요).

## 아키텍처

```
src/lib/ledger/stateMachine.ts   UID 소유권 상태머신 (DB 비의존 순수 함수)
src/lib/ledger/hashChain.ts      원장 해시체인 계산·검증
src/lib/ledger/merkle.ts         앵커링용 Merkle 루트
src/lib/ledger/ledgerService.ts  상태머신 + Prisma 트랜잭션 결합 (원장 쓰기)
src/lib/avp/                     국가별 연령인증 Provider 계층
src/lib/auth/                    비밀번호 해시·세션·권한 가드
src/lib/security/                레이트 리밋 정책·카운터
src/lib/audit/                   감사 로그 기록
src/lib/anchor/                  퍼블릭 체인 앵커 페이로드·게시·검증
src/lib/requests/                소유권 이전 요청 큐 + 소매 판매 적격성 판정
src/lib/field/                   현장 단속 판정 엔진 + 조서 발행
src/app/api/                     REST API 라우트
src/app/page.tsx                 랜딩 페이지
src/app/console/page.tsx         정부 관제 콘솔
src/app/app/page.tsx             소비자 앱
src/app/partner/page.tsx         매장·총판 웹
src/app/field/page.tsx           단속 현장 단말
```

### 인증·권한

이메일/비밀번호 로그인 후 세션 쿠키(httpOnly)로 인증합니다. 비밀번호는 scrypt
(N=2^16, r=8, p=2)로 해시하고, 세션 토큰은 원문이 아니라 SHA-256 해시만 DB에
보관합니다. 세션 유효기간은 8시간입니다.

권한은 **역할(무엇을 할 수 있는가)** 과 **소속(누구를 대신해 할 수 있는가)** 두 축으로
검사합니다. 역할만으로는 부족한데, 매장 직원이라도 다른 매장이 보유한 UID를 처리해서는
안 되기 때문입니다.

| 자원 | 접근 가능 |
|---|---|
| 관제 콘솔 API (KPI·알림·원장 검증) | 심사관, 운영자 |
| LOT 발급(MINT), 앵커링 실행 | 운영자 |
| 소유권 이전 커밋 | **UID를 보유한 조직**의 직원 |
| 등록·교환 신청 | 본인 계정의 소비자 |
| 중고거래(RESALE) | UID를 보유한 본인 |
| 현장 판정·조서 발행 | 단속관, 운영자 |

몇 가지 설계 판단:

- **요청 본문의 신원은 신뢰하지 않습니다.** 등록 신청의 `consumerId`는 무시하고 세션
  신원으로 덮어쓰며, 조서의 담당관 이름도 서버가 세션에서 채웁니다.
- **소비자 스캔 응답에서 소유자 신원을 제거합니다.** 제품 스캔만으로 이전 소유자가
  누구인지 알 수 있으면 안 되므로, 소비자에게는 정품 확인에 필요한 정보만 내려갑니다.
- **소비자 명부 전체 조회는 감독기관 전용입니다.** 중고거래 상대 지정은 이메일 단건
  조회(`/api/consumers/lookup`)로 처리합니다.
- 미들웨어는 Edge 런타임이라 DB를 못 보므로 쿠키 유무만 확인해 로그인 화면으로
  보냅니다. 실제 권한 검사는 모든 API 라우트에서 다시 수행합니다.

### 레이트 리밋

카운터를 프로세스 메모리가 아니라 DB에 둡니다. 메모리에 두면 서버를 재시작할 때마다
시도 횟수가 초기화되어 공격자에게 무료 재시도를 주기 때문입니다.

| 대상 | 한도 | 잠금 |
|---|---|---|
| 로그인 (계정별) | 15분간 5회 | 15분 |
| 로그인 (IP별) | 15분간 20회 | 15분 |
| 소비자 이메일 조회 (계정별) | 10분간 20회 | 10분 |

계정별 제한이 실질적인 방어선입니다. IP는 프록시 헤더(`x-forwarded-for`)에서 읽으므로
신뢰할 수 있는 프록시가 앞단에 없으면 위조될 수 있어, 보조 수단으로만 두고 한도를
넉넉하게 잡았습니다. **배포 시 프록시가 이 헤더를 덮어쓰도록 설정해야 합니다.**

잠금은 올바른 비밀번호에도 적용됩니다 — 그렇지 않으면 잠금의 의미가 없습니다.
로그인에 성공하면 해당 계정의 카운터를 비웁니다.

### 감사 로그

로그인·소유권 이전·조서 발행·앵커링 등 보안·규제상 의미 있는 동작을 append-only로
기록합니다. 수정·삭제 엔드포인트를 두지 않으며, 열람은 감독기관·운영자로 제한합니다
(관제 콘솔 → 감사 로그 탭).

기록 항목은 동작, 수행자(계정·역할), 대상, IP, User-Agent, 시각입니다.
**민감정보는 담지 않습니다** — 연령인증은 생년월일이나 ID 스캔 원본이 아니라
검증 방식과 결과만 남깁니다.

감사 기록 실패가 본래 작업을 되돌리지는 않습니다. 기록보다 업무 연속성이 우선이라는
판단이며, 실패는 서버 로그로 남깁니다.

### 현장 단속 판정

현장 단말은 관제 콘솔과 달리 단일 제품의 "압수 근거 성립 여부"만 판정합니다.

| 판정 | 조건 | 규칙 | 조서 |
|---|---|---|---|
| 정품 · 정상 유통 | 원장에 존재하고 `EXPORT_TRANSFER`(통관) 기록 있음 | — | 조회 로그만 남김 |
| 압수 근거 성립 | 원장에 존재하나 통관 기록 없음 | CU-02 | 압수 조서 발행 |
| 위조 의심 | 원장에 UID 자체가 없음 | UN-01 | 위조 신고 조서 발행 |

조서에는 마지막 앵커의 **Merkle Root가 원장 스냅샷으로 첨부**되므로, 조서 작성 이후
데이터가 변경되지 않았음을 제3자가 검증할 수 있습니다. 적용 법조는 국가별 검토
사항이므로 플랫폼이 확정하지 않고 "확인 필요"로 표기합니다.

### 소비자 앱 ↔ 매장 웹 2단 구조

UID는 판매 시점까지 매장/총판이 보유하므로, 소비자가 직접 소유권을 이전할 수 없습니다.
따라서 소비자 앱은 **스캔 + 연령인증까지 수행해 이전 요청을 큐에 올리고**, 실제 원장
트랜잭션은 **매장 웹에서 커밋**할 때 기록됩니다.

```
[소비자 앱] UID 스캔 → 연령인증(AVP) → 등록 신청
     → TransferRequest(PENDING)          ← 원장에는 아직 아무것도 기록되지 않음
[매장 웹]  대기 큐에서 확인 → COMMIT
     → RETAIL_SALE 트랜잭션 원장 기록 + 교환권 발급
```

교환(EXCHANGE_TRANSFER)도 같은 경로를 따릅니다. 반면 중고거래(RESALE_TRANSFER)는
소비자가 UID를 직접 보유한 상태이므로 앱에서 바로 원장에 기록됩니다.

### 통관 미확인 UID 판매 차단

정상 유통 제품은 매장 도달 시점에 `WHOLESALE` 상태여야 합니다. 통관·배분 이력이 없는
UID(`MINTED`/`EXPORTED`)로 판매를 시도하면 요청이 `BLOCKED` 처리되고, 관제 콘솔에
밀수 의심 알림이 자동 등록됩니다.

### UID 소유권 상태머신

| 트랜잭션 | 이전 상태 | 이후 상태 | 교환권 |
|---|---|---|---|
| `MINT` | (없음) | `MINTED` | — |
| `EXPORT_TRANSFER` | `MINTED` | `EXPORTED` | — |
| `WHOLESALE_TRANSFER` | `EXPORTED` | `WHOLESALE` | — |
| `RETAIL_SALE` | `WHOLESALE` | `RETAIL_SOLD` | 신규 발급 (연령인증 필수) |
| `EXCHANGE_TRANSFER` | `RETAIL_SOLD`/`EXCHANGED` | 구UID `EXCHANGED` + 신UID 발급 | 기존 교환권 소진 |
| `RESALE_TRANSFER` | `RETAIL_SOLD`/`EXCHANGED` | `RESOLD` | `VOID` — 재발급 없음 |

`RESALE_TRANSFER`가 교환권을 `VOID`로 강제 소거하기 때문에, 중고 구매자가 이전 소유자의
미사용 교환권으로 무상교환을 신청하는 경로가 설계상 차단됩니다.

### 원장 신뢰 구조

모든 소유권 이전은 `LedgerTransaction`에 append-only로 기록되며, 각 레코드는 직전 레코드의
해시를 포함합니다(`prevHash` → `hash`). `/api/ledger/verify`는 전체 체인을 재계산하여
사후 조작 여부를 검출하고, `/api/ledger/anchor`는 미앵커 구간의 Merkle 루트를 계산해
`Anchor` 레코드로 남긴 뒤 퍼블릭 체인 게시를 시도합니다.

### 퍼블릭 체인 앵커링

**루트 계산·저장과 체인 게시를 분리했습니다.** 체인이 내려가 있어도 원장 앵커 기록은
남아야 하므로, `Anchor`를 먼저 확정하고 게시는 별도 상태(`PENDING`/`PUBLISHED`/`FAILED`)로
추적합니다. 실패한 앵커는 `/api/ledger/anchor/[id]/publish`로 재시도할 수 있습니다.

컨트랙트를 배포하지 않고 **트랜잭션 calldata에 루트를 직접 싣습니다.** 제3자가 트랜잭션
해시만으로 루트를 복원할 수 있도록 매직 프리픽스를 붙인 자체 식별 포맷을 씁니다.

```
0x | "LMA1"(4바이트) | merkleRoot(32바이트)
```

`/api/ledger/anchor/[id]/verify`는 원장 DB가 아니라 **체인에서 트랜잭션을 다시 읽어**
calldata의 루트가 원장 계산값과 일치하는지 확인합니다. 이것이 "당사도 조작할 수 없다"는
주장의 실제 근거입니다.

| `ANCHOR_MODE` | 동작 |
|---|---|
| `simulated` (기본값) | 체인에 게시하지 않고 데모용 앵커 기록만 생성 |
| `chain` | 실제 퍼블릭 체인에 트랜잭션 전송 (가스비 있는 지갑 키 필요) |
| `disabled` | 로컬 Merkle 루트만 계산 |

> ⚠️ **시뮬레이션 모드는 실제 체인 기록이 아닙니다.** 화면과 검증 API 모두 이를 명시하며,
> 검증 결과를 성공으로 위장하지 않습니다(`found: false`). 투자자·정부기관 시연에서
> "체인에 기록됨"으로 설명해서는 안 됩니다. 실제 게시가 필요하면 `ANCHOR_MODE=chain`으로
> 전환하고 앵커링 전용 지갑에 가스비를 충전하십시오.

`ANCHOR_PRIVATE_KEY`는 **앵커링 전용 지갑**의 키여야 하며, 가스비 이외의 자산을 보관하지
않아야 합니다. 운영 단계에서는 환경변수 대신 KMS/서명 서비스로 옮기는 것을 권장합니다.

## API

| 메서드 | 경로 | 설명 |
|---|---|---|
| `POST` | `/api/auth/login` · `/api/auth/logout` | 로그인 / 로그아웃 |
| `GET` | `/api/auth/me` | 현재 세션 사용자 |
| `POST` | `/api/consumers/lookup` | 중고거래 양수인 이메일 단건 조회 |
| `GET/POST` | `/api/organizations` | 조직 목록 / 생성 |
| `GET/POST` | `/api/consumers` | 소비자 목록 / 생성 |
| `POST` | `/api/consumers/[id]/verify-age` | 국가별 AVP 연령인증 (결과 크리덴셜만 저장) |
| `GET` | `/api/consumers/[id]/uids` | 소비자 보유 제품 목록 |
| `GET/POST` | `/api/requests` | 소유권 이전 대기 큐 조회 / 요청 생성 |
| `POST` | `/api/requests/[id]/commit` | 매장이 요청을 커밋 → 원장 기록 |
| `POST` | `/api/requests/[id]/reject` | 요청 반려 |
| `GET/POST` | `/api/lots` | LOT 목록 / LOT 생성 + UID 일괄 MINT |
| `GET` | `/api/uid/[code]` | UID 현재 상태 + 전체 유통 이력 |
| `POST` | `/api/uid/[code]/transfer` | 소유권 이전 트랜잭션 실행 |
| `GET` | `/api/console/kpis` | 콘솔 대시보드 집계 |
| `POST` | `/api/field/inspect` | 현장 UID 조회 + 판정 |
| `POST` | `/api/field/inspections/[id]/report` | 조서 발행 (조서번호 부여) |
| `POST` | `/api/field/inspections/[id]/escalate` | 관제 콘솔로 알림 승격 |
| `GET` | `/api/console/audit` | 감사 로그 열람 (감독기관·운영자 전용) |
| `GET/POST` | `/api/console/alerts` | 밀수 의심 알림 목록 / 등록 |
| `POST` | `/api/console/alerts/[id]/resolve` | 알림 해결 처리 |
| `GET` | `/api/ledger/verify` | 원장 해시체인 무결성 검증 |
| `GET/POST` | `/api/ledger/anchor` | 앵커 이력 조회 / 앵커링 실행 |
| `POST` | `/api/ledger/anchor/[id]/publish` | 게시 실패한 앵커 재시도 |
| `GET` | `/api/ledger/anchor/[id]/verify` | 체인에서 루트를 다시 읽어 검증 |

### 소유권 이전 예시

```bash
curl -X POST http://localhost:3000/api/uid/PH-2609-A-000001/transfer \
  -H "Content-Type: application/json" \
  -d '{
    "txType": "RETAIL_SALE",
    "from": { "type": "ORG", "orgId": "<총판 ID>" },
    "to": { "type": "CONSUMER", "consumerId": "<소비자 ID>" },
    "ageVerification": {
      "country": "PH",
      "input": { "idScanned": true, "livenessPassed": true, "birthDate": "2000-01-01" }
    }
  }'
```

연령인증은 국가 코드로 Provider를 선택합니다. 현재 `PH`(RA 11900)만 구현되어 있으며,
미구현 국가는 자동 통과가 아니라 명시적 오류로 실패합니다 — 기획서 2.1의 [정보공백]
국가들은 법률 검토 후 모듈을 추가해야 합니다.

## 남은 과제

- 퍼블릭 체인 실게시 검증 — 코드와 읽기·검증 경로는 실제 체인(Base Sepolia)에 대해
  확인했으나, 전송 경로는 가스비가 있는 지갑이 필요해 미검증 상태입니다.
- 앵커링 주기 자동화 (현재는 콘솔에서 수동 실행)
- 계정 관리 화면 (현재 계정 생성은 시드/DB 직접 입력만 가능)
- 만료된 세션·레이트 리밋 카운터 정리 배치 (현재는 누적만 됨)
- 감사 로그 보존 기간 정책과 외부 반출(무결성 서명 포함) 절차
- 실제 운영에서는 정부기관 SSO 연동과 소비자 휴대폰 본인확인으로 교체 검토
- 퍼블릭 체인 앵커링 실연동
- 밀수 의심 탐지 규칙 확장 (현재는 통관 미확인 판매 차단 1종 + 수동 등록)
- UID 스캔의 카메라/QR 연동 (현재는 코드 직접 입력)
