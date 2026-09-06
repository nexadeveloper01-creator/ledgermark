import { describe, expect, it } from "vitest";
import { AccountPolicyError, assertCanDisable, validateCreateUser } from "./policy";

describe("계정 생성 검증", () => {
  it("직원 계정은 소속 기관이 필요하다", () => {
    expect(() =>
      validateCreateUser({ email: "a@b.com", displayName: "홍길동", role: "PARTNER_STAFF" })
    ).toThrow(AccountPolicyError);
  });

  it("소비자 계정에는 소속 기관을 붙일 수 없다", () => {
    expect(() =>
      validateCreateUser({
        email: "a@b.com",
        displayName: "소비자",
        role: "CONSUMER",
        organizationId: "org-1",
      })
    ).toThrow(AccountPolicyError);
  });

  it("이메일을 소문자로 정규화한다", () => {
    const v = validateCreateUser({
      email: "  Admin@Example.COM ",
      displayName: "운영자",
      role: "CONSUMER",
    });
    expect(v.email).toBe("admin@example.com");
  });

  it("잘못된 이메일과 빈 이름을 거부한다", () => {
    expect(() =>
      validateCreateUser({ email: "not-an-email", displayName: "이름", role: "CONSUMER" })
    ).toThrow(AccountPolicyError);
    expect(() =>
      validateCreateUser({ email: "a@b.com", displayName: "   ", role: "CONSUMER" })
    ).toThrow(AccountPolicyError);
  });
});

describe("계정 비활성화 가드", () => {
  const base = {
    targetUserId: "u-2",
    targetRole: "PARTNER_STAFF" as const,
    targetAlreadyDisabled: false,
    actorUserId: "u-1",
    otherActiveAdminCount: 1,
  };

  it("일반 계정은 비활성화할 수 있다", () => {
    expect(() => assertCanDisable(base)).not.toThrow();
  });

  it("본인 계정은 비활성화할 수 없다 (자기 락아웃 방지)", () => {
    expect(() => assertCanDisable({ ...base, targetUserId: "u-1" })).toThrow(AccountPolicyError);
  });

  it("마지막 운영자는 비활성화할 수 없다 (전체 락아웃 방지)", () => {
    expect(() =>
      assertCanDisable({ ...base, targetRole: "ADMIN", otherActiveAdminCount: 0 })
    ).toThrow(AccountPolicyError);
  });

  it("다른 운영자가 남아있으면 운영자도 비활성화할 수 있다", () => {
    expect(() =>
      assertCanDisable({ ...base, targetRole: "ADMIN", otherActiveAdminCount: 1 })
    ).not.toThrow();
  });

  it("이미 비활성화된 계정은 거부한다", () => {
    expect(() => assertCanDisable({ ...base, targetAlreadyDisabled: true })).toThrow(
      AccountPolicyError
    );
  });
});
