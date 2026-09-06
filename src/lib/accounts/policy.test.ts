import { describe, expect, it } from "vitest";
import {
  AccountAccessError,
  AccountPolicyError,
  assertCanCreateAccount,
  assertCanDisable,
  assertCanManageAccounts,
  assertCanManageTarget,
  validateCreateUser,
  type AccountActor,
} from "./policy";

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

describe("기관 관리자 위임", () => {
  const admin: AccountActor = {
    id: "admin-1",
    role: "ADMIN",
    organizationId: "hq",
    isOrgManager: false,
  };
  const manager: AccountActor = {
    id: "mgr-1",
    role: "PARTNER_STAFF",
    organizationId: "store-1",
    isOrgManager: true,
  };
  const plainStaff: AccountActor = {
    id: "staff-1",
    role: "PARTNER_STAFF",
    organizationId: "store-1",
    isOrgManager: false,
  };

  it("일반 직원은 계정을 관리할 수 없다", () => {
    expect(() => assertCanManageAccounts(plainStaff)).toThrow(AccountAccessError);
  });

  it("기관 관리자와 운영자는 계정을 관리할 수 있다", () => {
    expect(() => assertCanManageAccounts(manager)).not.toThrow();
    expect(() => assertCanManageAccounts(admin)).not.toThrow();
  });

  it("기관 관리자는 자기 기관의 동일 역할만 생성할 수 있다", () => {
    expect(() =>
      assertCanCreateAccount(manager, { role: "PARTNER_STAFF", organizationId: "store-1" })
    ).not.toThrow();
  });

  it("기관 관리자는 상위 역할로 권한을 상승시킬 수 없다", () => {
    for (const role of ["ADMIN", "GOV_INSPECTOR", "FIELD_OFFICER"] as const) {
      expect(() =>
        assertCanCreateAccount(manager, { role, organizationId: "store-1" })
      ).toThrow(AccountAccessError);
    }
  });

  it("기관 관리자는 다른 기관에 계정을 만들 수 없다", () => {
    expect(() =>
      assertCanCreateAccount(manager, { role: "PARTNER_STAFF", organizationId: "store-2" })
    ).toThrow(AccountAccessError);
  });

  it("기관 관리자는 관리자 권한을 부여할 수 없다 (위임 확산 차단)", () => {
    expect(() =>
      assertCanCreateAccount(manager, {
        role: "PARTNER_STAFF",
        organizationId: "store-1",
        isOrgManager: true,
      })
    ).toThrow(AccountAccessError);
  });

  it("운영자는 어떤 역할·기관이든 생성할 수 있다", () => {
    expect(() =>
      assertCanCreateAccount(admin, {
        role: "GOV_INSPECTOR",
        organizationId: "boc",
        isOrgManager: true,
      })
    ).not.toThrow();
  });

  it("기관 관리자는 다른 기관 계정을 관리할 수 없다", () => {
    expect(() =>
      assertCanManageTarget(manager, {
        id: "x",
        role: "PARTNER_STAFF",
        organizationId: "store-2",
        isOrgManager: false,
      })
    ).toThrow(AccountAccessError);
  });

  it("기관 관리자는 다른 역할 계정을 관리할 수 없다", () => {
    expect(() =>
      assertCanManageTarget(manager, {
        id: "x",
        role: "GOV_INSPECTOR",
        organizationId: "store-1",
        isOrgManager: false,
      })
    ).toThrow(AccountAccessError);
  });

  it("기관 관리자는 다른 관리자 계정을 관리할 수 없다", () => {
    expect(() =>
      assertCanManageTarget(manager, {
        id: "mgr-2",
        role: "PARTNER_STAFF",
        organizationId: "store-1",
        isOrgManager: true,
      })
    ).toThrow(AccountAccessError);
  });

  it("기관 관리자는 자기 기관의 동일 역할 일반 직원을 관리할 수 있다", () => {
    expect(() =>
      assertCanManageTarget(manager, {
        id: "staff-9",
        role: "PARTNER_STAFF",
        organizationId: "store-1",
        isOrgManager: false,
      })
    ).not.toThrow();
  });
});
