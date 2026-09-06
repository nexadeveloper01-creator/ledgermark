import nodemailer from "nodemailer";
import { MailError, type Mailer, type MailMessage } from "./types";

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  pass?: string;
  from: string;
}

export function createSmtpMailer(config: SmtpConfig): Mailer {
  const transport = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    // 인증이 없는 내부 릴레이도 지원한다.
    auth: config.user ? { user: config.user, pass: config.pass } : undefined,
  });

  return {
    name: "smtp",
    async send(message: MailMessage) {
      try {
        await transport.sendMail({
          from: config.from,
          to: message.to,
          subject: message.subject,
          text: message.text,
        });
      } catch (err) {
        // 원인 메시지에 자격증명이 섞이지 않도록 요약만 남긴다.
        throw new MailError(`메일 발송에 실패했습니다: ${(err as Error).message}`);
      }
    },
  };
}
