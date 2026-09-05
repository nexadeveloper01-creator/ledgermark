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
| 주기적 Merkle 앵커링 | 구현 완료 (퍼블릭 체인 연동은 스텁) |
| 연령인증 AVP 라우터 + 필리핀(RA 11900) 모듈 | 구현 완료 |
| 랜딩 페이지 | 구현 완료 |
| 정부 관제 콘솔 (대시보드 / UID 조회 / 밀수 알림 / 원장 상태) | 구현 완료 |
| 소비자 앱 · 매장/총판 웹 · 단속 현장 앱 | 미착수 (다음 단계) |

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
src/app/api/                     REST API 라우트
src/app/page.tsx                 랜딩 페이지
src/app/console/page.tsx         정부 관제 콘솔
```

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
`Anchor` 레코드로 남깁니다. 퍼블릭 L2 앵커링(`publicAnchorRef`)은 다음 단계 과제입니다.

## API

| 메서드 | 경로 | 설명 |
|---|---|---|
| `GET/POST` | `/api/organizations` | 조직 목록 / 생성 |
| `GET/POST` | `/api/lots` | LOT 목록 / LOT 생성 + UID 일괄 MINT |
| `GET` | `/api/uid/[code]` | UID 현재 상태 + 전체 유통 이력 |
| `POST` | `/api/uid/[code]/transfer` | 소유권 이전 트랜잭션 실행 |
| `GET` | `/api/console/kpis` | 콘솔 대시보드 집계 |
| `GET/POST` | `/api/console/alerts` | 밀수 의심 알림 목록 / 등록 |
| `POST` | `/api/console/alerts/[id]/resolve` | 알림 해결 처리 |
| `GET` | `/api/ledger/verify` | 원장 해시체인 무결성 검증 |
| `GET/POST` | `/api/ledger/anchor` | 앵커 이력 조회 / 앵커링 실행 |

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

- 소비자 앱 / 매장·총판 웹 / 단속 현장 화면 (디자인 프로토타입에 정의됨)
- 인증·권한 (현재 API에 인증 계층 없음 — 파일럿 전 필수)
- 퍼블릭 체인 앵커링 실연동
- 밀수 의심 UID 자동 탐지 규칙 엔진 (현재는 수동 등록)
