import { describe, expect, it } from "vitest";
import { AccountPolicyError } from "./policy";
import { validatePassword, validateSignup } from "./signup";

describe("비밀번호 정책", () => {
  it("10자 이상을 요구한다", () => {
    expect(() => validatePassword("short1")).toThrow(AccountPolicyError);
    expect(() => validatePassword("longenough123")).not.toThrow();
  });

  it("흔한 비밀번호를 거부한다", () => {
    expect(() => validatePassword("password123")).toThrow(AccountPolicyError);
    expect(() => validatePassword("ledgermark1234")).toThrow(AccountPolicyError);
  });

  it("반복 문자만으로 길이를 채우는 것을 거부한다", () => {
    expect(() => validatePassword("aaaaaaaaaaaa")).toThrow(AccountPolicyError);
    expect(() => validatePassword("ababababab")).toThrow(AccountPolicyError);
  });
});

describe("가입 입력 검증", () => {
  const valid = {
    email: "New@Example.com ",
    displayName: "  신규 소비자 ",
    password: "verysafepassword",
  };

  it("이메일과 이름을 정규화한다", () => {
    const v = validateSignup(valid);
    expect(v.email).toBe("new@example.com");
    expect(v.displayName).toBe("신규 소비자");
    expect(v.country).toBe("PH");
  });

  it("잘못된 이메일을 거부한다", () => {
    expect(() => validateSignup({ ...valid, email: "nope" })).toThrow(AccountPolicyError);
  });

  it("빈 이름과 과도하게 긴 이름을 거부한다", () => {
    expect(() => validateSignup({ ...valid, displayName: "  " })).toThrow(AccountPolicyError);
    expect(() => validateSignup({ ...valid, displayName: "가".repeat(51) })).toThrow(
      AccountPolicyError
    );
  });

  it("약한 비밀번호를 거부한다", () => {
    expect(() => validateSignup({ ...valid, password: "123" })).toThrow(AccountPolicyError);
  });

  it("역할이나 소속을 입력으로 받지 않는다 (권한 상승 차단)", () => {
    // 타입상으로도 받을 수 없고, 여분의 필드를 넣어도 결과에 반영되지 않는다.
    const v = validateSignup({
      ...valid,
      // @ts-expect-error 가입 입력에는 role이 존재하지 않는다
      role: "ADMIN",
      organizationId: "org-1",
    });
    expect(v).not.toHaveProperty("role");
    expect(v).not.toHaveProperty("organizationId");
  });
});
