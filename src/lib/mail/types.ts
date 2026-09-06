// 메일 발송 계층. 공급자에 종속되지 않도록 인터페이스로 분리한다.
// SMTP는 SendGrid·SES·Mailgun 등 대부분의 공급자가 제공하므로 표준 경로로 쓴다.

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
}

export interface Mailer {
  readonly name: string;
  send(message: MailMessage): Promise<void>;
}

export class MailError extends Error {}
