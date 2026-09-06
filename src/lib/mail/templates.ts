import type { MailMessage } from "./types";

export function verificationEmail(args: {
  to: string;
  displayName: string;
  link: string;
}): MailMessage {
  return {
    to: args.to,
    subject: "[LEDGERMARK] 이메일 인증을 완료해주세요",
    text: [
      `${args.displayName}님, 안녕하세요.`,
      "",
      "아래 링크를 열어 이메일 인증을 완료하면 제품 정품 등록을 신청할 수 있습니다.",
      "",
      args.link,
      "",
      "이 링크는 24시간 동안 유효하며 한 번만 사용할 수 있습니다.",
      "본인이 요청하지 않았다면 이 메일을 무시하셔도 됩니다.",
    ].join("\n"),
  };
}

export function passwordResetEmail(args: {
  to: string;
  displayName: string;
  link: string;
}): MailMessage {
  return {
    to: args.to,
    subject: "[LEDGERMARK] 비밀번호 재설정 안내",
    text: [
      `${args.displayName}님, 안녕하세요.`,
      "",
      "아래 링크에서 새 비밀번호를 설정할 수 있습니다.",
      "",
      args.link,
      "",
      "이 링크는 1시간 동안 유효하며 한 번만 사용할 수 있습니다.",
      "재설정을 완료하면 기존에 로그인된 모든 기기에서 로그아웃됩니다.",
      "본인이 요청하지 않았다면 이 메일을 무시하셔도 됩니다. 비밀번호는 변경되지 않습니다.",
    ].join("\n"),
  };
}
