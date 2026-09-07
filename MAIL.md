# 실 SMTP 연동 (이메일 인증 · 비밀번호 재설정)

메일 발송 코드는 완성돼 있고, 실제 SMTP 핸드셰이크로 발송되는 것까지 검증했습니다
(`npm run mail:test`). 남은 것은 **실제 SMTP 자격증명을 환경변수로 넣는 것**뿐입니다.

> 자격증명(비밀번호·앱 비밀번호)은 배포 담당자가 직접 넣습니다. 코드나 저장소에는
> 넣지 않습니다.

## 동작 방식

- `SMTP_HOST`가 **비어 있으면**: 콘솔 mailer — 실제로 보내지 않고 서버 로그에 인증/재설정
  링크를 출력합니다(로컬·데모 기본값).
- `SMTP_HOST`가 **설정되면**: 그 SMTP로 실제 발송합니다.
- 메일 발송이 실패해도 **가입·비밀번호 재설정 요청 자체는 실패하지 않습니다**(로그만 남김).
  가입자는 앱 상단 배너의 "인증 메일 다시 보내기"로 재시도할 수 있습니다.

## 발송 테스트 (자격증명 검증)

SMTP를 설정하기 전/후 언제든 파이프라인을 점검할 수 있습니다.

```bash
# SMTP 미설정 시: Ethereal(테스트 SMTP)로 보내고 미리보기 URL 출력 — 실제 수신함에는 안 감
npm run mail:test -- 받는사람@example.com

# 실제 자격증명 검증: SMTP_* 를 넣고 실행하면 그 SMTP로 실제 발송
SMTP_HOST=smtp.gmail.com SMTP_PORT=587 SMTP_USER=you@gmail.com SMTP_PASS=앱비밀번호 \
  MAIL_FROM="LEDGERMARK <you@gmail.com>" npm run mail:test -- 받는사람@example.com
```

## 환경변수

| 변수 | 예시 | 비고 |
|---|---|---|
| `SMTP_HOST` | `smtp.gmail.com` | 설정 시 실제 발송 활성화 |
| `SMTP_PORT` | `587` | STARTTLS. 465면 `SMTP_SECURE=true` |
| `SMTP_SECURE` | `false` | 465(SSL)일 때만 `true` |
| `SMTP_USER` | `you@gmail.com` | **자격증명** |
| `SMTP_PASS` | (앱 비밀번호) | **자격증명** — 저장소에 넣지 말 것 |
| `MAIL_FROM` | `LEDGERMARK <you@gmail.com>` | 보내는 사람 표기 |
| `APP_BASE_URL` | `https://app-production-daca.up.railway.app` | 메일 링크 도메인 |

### Gmail로 쓰려면
1. Google 계정 2단계 인증 켜기
2. **앱 비밀번호** 발급(일반 비밀번호는 SMTP에서 거부됨)
3. 위 표대로 설정. Gmail은 일일 발송 한도가 있어 대량 발송엔 SendGrid·SES 권장.

## Railway(배포 서버)에 적용

로컬 `railway login` 상태에서:

```bash
# 비밀 아닌 값
railway variables --service app \
  --set SMTP_HOST=smtp.gmail.com \
  --set SMTP_PORT=587 \
  --set SMTP_SECURE=false \
  --set 'MAIL_FROM=LEDGERMARK <you@gmail.com>'

# 자격증명(담당자가 직접) — 값이 로그에 남지 않게 주의
railway variables --service app --set SMTP_USER=you@gmail.com --set SMTP_PASS=앱비밀번호
```

변수를 바꾸면 Railway가 자동 재배포합니다. 이후 가입/비밀번호 찾기에서 실제 메일이 발송됩니다.

> ⚠️ 현재 배포 서버는 **콘솔 mailer 상태**로 두었습니다(자격증명 미보유). 위 변수를 넣는
> 순간 실제 발송으로 전환됩니다.
