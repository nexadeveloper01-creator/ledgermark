// 개발자 모드 허용 목록. 이메일에 특권을 하드코딩하면 백도어가 되므로 환경변수로만 둔다.
// 운영 배포에서는 DEVELOPER_EMAILS를 비워 이 경로 자체를 끈다.
//
// 주의: 이 목록에 있어도 정상 로그인(비밀번호)을 거쳐야 한다. 이메일 일치만으로는
// 아무 권한도 주지 않으며, 로그인 성공 후 대시보드 진입 경로만 바꾼다.
export function developerEmails(): string[] {
  return (process.env.DEVELOPER_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isDeveloperEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return developerEmails().includes(email.toLowerCase());
}
