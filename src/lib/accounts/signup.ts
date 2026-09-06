// 소비자 자가 가입 검증 (DB 비의존 순수 함수).
//
// 공개 엔드포인트가 사용하는 규칙이므로, 요청 본문에서 역할이나 소속을 받지 않는다.
// 가입으로 만들 수 있는 계정은 항상 CONSUMER 하나뿐이다.

import { AccountPolicyError } from "./policy";

const MIN_PASSWORD_LENGTH = 10;

// 자주 쓰이는 비밀번호를 막는다. 운영에서는 유출 비밀번호 목록(HIBP 등) 연동으로 대체한다.
const COMMON_PASSWORDS = new Set([
  "password",
  "password1",
  "password123",
  "12345678",
  "123456789",
  "1234567890",
  "qwertyuiop",
  "letmein123",
  "iloveyou1",
  "admin12345",
  "ledgermark",
  "ledgermark1234",
]);

export function validatePassword(password: string): void {
  if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
    throw new AccountPolicyError(`비밀번호는 ${MIN_PASSWORD_LENGTH}자 이상이어야 합니다.`);
  }
  // 구성 규칙(대문자·특수문자 강제)보다 길이와 차단 목록이 효과적이라는 NIST 권고를 따른다.
  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    throw new AccountPolicyError("너무 흔한 비밀번호입니다. 다른 비밀번호를 사용해주세요.");
  }
  if (new Set(password).size < 4) {
    throw new AccountPolicyError("비밀번호에 서로 다른 문자를 4종류 이상 사용해주세요.");
  }
}

export interface SignupInput {
  email: string;
  displayName: string;
  password: string;
  country?: string | null;
}

export function validateSignup(input: SignupInput): {
  email: string;
  displayName: string;
  password: string;
  country: string;
} {
  const email = (input.email ?? "").toLowerCase().trim();
  const displayName = (input.displayName ?? "").trim();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new AccountPolicyError("올바른 이메일 형식이 아닙니다.");
  }
  if (displayName.length < 1) {
    throw new AccountPolicyError("이름을 입력해주세요.");
  }
  if (displayName.length > 50) {
    throw new AccountPolicyError("이름이 너무 깁니다.");
  }

  validatePassword(input.password);

  return {
    email,
    displayName,
    password: input.password,
    country: (input.country ?? "PH").trim().toUpperCase() || "PH",
  };
}
