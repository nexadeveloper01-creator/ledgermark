# 외부 테스트용 배포 (Railway)

이 스택은 Next.js(SSR) + PostgreSQL + Prisma입니다. Railway는 앱과 Postgres를 한
프로젝트에서 제공하므로 외부 접속 https URL을 가장 빠르게 얻을 수 있습니다.

## 역할 구분

- **회원님만 가능(계정 인증):** 최초 `railway login` 한 번. 브라우저로 Railway 계정을
  승인합니다. 이 인증은 이 PC에 저장됩니다.
- **그 이후는 전부 자동화 가능:** 프로젝트 생성 · Postgres 추가 · 환경변수 · 배포 ·
  마이그레이션 · 시드 · 공개 URL 확인 · APK 재빌드. 로그인만 끝내주시면 이어서 진행합니다.

## 준비된 것 (커밋 완료)

- `railway.json` — Nixpacks 빌드, 시작 명령 `npm run start:prod`
- `package.json`
  - `postinstall: prisma generate` — 설치 시 Prisma 클라이언트 생성
  - `start:prod: prisma migrate deploy && next start` — 배포마다 대기 마이그레이션 적용 후 기동
- `next start`는 Railway가 주는 `PORT`를 자동으로 사용합니다.

## 배포 순서

### 1. (회원님) Railway 로그인 — 한 번만

터미널에서:

```bash
railway login
```

브라우저가 열리면 승인. 완료 후 저에게 알려주세요.

### 2. (제가 실행) 프로젝트·DB·환경변수·배포

로그인 확인 후 제가 순서대로 실행합니다:

```bash
railway init --name ledgermark              # 프로젝트 생성
railway add --database postgres             # 관리형 Postgres 추가 (DATABASE_URL 자동 주입)
railway variables --set ANCHOR_MODE=simulated \
                  --set DEVELOPER_EMAILS=nexadeveloper01@gmail.com
railway up                                  # 이 폴더를 업로드·빌드·배포
railway domain                              # 공개 https URL 발급
railway run npm run prisma:seed             # 데모 데이터 1회 시드
```

> 환경변수 `APP_BASE_URL`은 도메인 발급 후 그 URL로 설정합니다(메일 인증 링크용).

### 3. (제가 실행) 공개 URL로 APK 재빌드

발급된 URL(예: `https://ledgermark-production.up.railway.app`)로 소비자 앱을 다시 빌드해
드립니다. 이제 폰이 어느 네트워크에 있든(LTE 포함) 접속됩니다:

```bash
cd mobile
flutter build apk --release --dart-define=API_BASE=https://<railway-url>
```

## 주의점

- **메일**: SMTP 미설정이라 인증·재설정 메일은 실제로 발송되지 않고 서버 로그에 링크가
  찍힙니다. 외부 테스터가 자가 가입 후 이메일 인증까지 하려면 SMTP를 설정해야 합니다.
  시드된 소비자 계정(`a@consumer.test` 등)은 인증 완료 상태라 바로 로그인·등록됩니다.
- **앵커링**: `ANCHOR_MODE=simulated` — 퍼블릭 체인에 실제 게시하지 않습니다(데모).
- **비용**: Railway는 무료 체험 크레딧이 있으나 소진 후에는 유료입니다. 테스트가 끝나면
  `railway down` 또는 대시보드에서 프로젝트를 삭제해 과금을 멈추세요.
- **개발자 모드**: 외부 노출 서버에서 `DEVELOPER_EMAILS`가 설정돼 있으면 해당 계정이
  `/dev`에 접근합니다. 공개 데모라면 배포 전에 비우는 것을 고려하세요.
