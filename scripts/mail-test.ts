import nodemailer from "nodemailer";
import { createSmtpMailer } from "../src/lib/mail/smtp";
import { verificationEmail } from "../src/lib/mail/templates";

// 메일 발송 파이프라인 점검용.
//   - SMTP_HOST가 설정돼 있으면 그 실제 SMTP로 발송한다(운영/스테이징 자격증명 검증).
//   - 없으면 Ethereal(자격증명 불필요한 실제 테스트 SMTP) 계정을 즉석 생성해 발송하고
//     웹에서 열어볼 수 있는 미리보기 URL을 출력한다(코드 경로 실증).
//
// 사용: npm run mail:test -- 받는사람@example.com
async function main() {
  const to = process.argv[2] || "tester@example.com";
  const msg = verificationEmail({
    to,
    displayName: "테스터",
    link: "https://app-production-daca.up.railway.app/verify-email?token=TEST-TOKEN",
  });

  if (process.env.SMTP_HOST) {
    const mailer = createSmtpMailer({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === "true",
      user: process.env.SMTP_USER || undefined,
      pass: process.env.SMTP_PASS || undefined,
      from: process.env.MAIL_FROM || "LEDGERMARK <no-reply@ledgermark.local>",
    });
    await mailer.send(msg);
    console.log(`✔ 실제 SMTP(${process.env.SMTP_HOST})로 ${to} 에게 발송 완료.`);
    return;
  }

  console.log("SMTP_HOST 미설정 — Ethereal 테스트 SMTP로 실증합니다.");
  const acc = await nodemailer.createTestAccount();
  const transport = nodemailer.createTransport({
    host: acc.smtp.host,
    port: acc.smtp.port,
    secure: acc.smtp.secure,
    auth: { user: acc.user, pass: acc.pass },
  });
  const info = await transport.sendMail({
    from: "LEDGERMARK <no-reply@ledgermark.test>",
    to,
    subject: msg.subject,
    text: msg.text,
  });
  console.log("✔ Ethereal 발송 성공");
  console.log("  messageId:", info.messageId);
  console.log("  accepted:", info.accepted);
  console.log("  미리보기 URL:", nodemailer.getTestMessageUrl(info));
}

main().catch((err) => {
  console.error("메일 발송 실패:", err);
  process.exit(1);
});
