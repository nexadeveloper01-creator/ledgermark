import { describe, expect, it } from "vitest";
import { AuthError, assertActsForOrg, assertIsSelf } from "./guards";
import type { SessionUser } from "./session";

function user(overrides: Partial<SessionUser>): SessionUser {
  return {
    id: "u1",
    email: "u@test",
    displayName: "U",
    role: "PARTNER_STAFF",
    organizationId: "org-1",
    organizationName: "매장 1",
    consumerId: null,
    isOrgManager: false,
    emailVerified: true,
    isDeveloper: false,
    ...overrides,
  };
}

describe("조직 대리 권한", () => {
  it("자기 소속 조직에 대해서는 허용한다", () => {
    expect(() => assertActsForOrg(user({}), "org-1")).not.toThrow();
  });

  it("다른 매장이 보유한 UID는 거부한다", () => {
    expect(() => assertActsForOrg(user({}), "org-2")).toThrow(AuthError);
  });

  it("소유 조직이 없으면 거부한다", () => {
    expect(() => assertActsForOrg(user({}), null)).toThrow(AuthError);
  });

  it("운영자는 조직 제약을 받지 않는다", () => {
    expect(() => assertActsForOrg(user({ role: "ADMIN" }), "org-9")).not.toThrow();
  });
});

describe("본인 자원 접근", () => {
  const consumer = user({ role: "CONSUMER", organizationId: null, consumerId: "c-1" });

  it("본인 자원은 허용한다", () => {
    expect(() => assertIsSelf(consumer, "c-1")).not.toThrow();
  });

  it("타인 자원은 거부한다", () => {
    expect(() => assertIsSelf(consumer, "c-2")).toThrow(AuthError);
  });

  it("소비자가 아닌 계정은 소비자 자원에 접근할 수 없다", () => {
    expect(() => assertIsSelf(user({ role: "GOV_INSPECTOR" }), "c-1")).toThrow(AuthError);
  });
});
