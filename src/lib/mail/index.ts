import { createSmtpMailer } from "./smtp";
import type { Mailer, MailMessage } from "./types";

// SMTP를 설정하지 않은 환경(로컬 개발·데모)에서는 실제로 보내지 않고 서버 로그에 남긴다.
// 인증 링크를 로그에서 복사해 흐름을 그대로 따라갈 수 있다.
export function createConsoleMailer(sink?: (m: MailMessage) => void): Mailer {
  return {
    name: "console",
    async send(message: MailMessage) {
      sink?.(message);
      console.info(
        `\n[mail:console] 실제로 발송되지 않았습니다 (SMTP 미설정)\n` +
          `  받는 사람: ${message.to}\n` +
          `  제목: ${message.subject}\n` +
          `${message.text}\n`
      );
    },
  };
}

let cached: Mailer | null = null;

export function getMailer(): Mailer {
  if (cached) return cached;

  const host = process.env.SMTP_HOST;
  if (!host) {
    cached = createConsoleMailer();
    return cached;
  }

  cached = createSmtpMailer({
    host,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    user: process.env.SMTP_USER || undefined,
    pass: process.env.SMTP_PASS || undefined,
    from: process.env.MAIL_FROM || "LEDGERMARK <no-reply@ledgermark.local>",
  });
  return cached;
}

export function appBaseUrl(): string {
  return (process.env.APP_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
}

export type { Mailer, MailMessage } from "./types";
export { MailError } from "./types";
