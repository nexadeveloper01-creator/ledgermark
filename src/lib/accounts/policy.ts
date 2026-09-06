// 계정 관리 규칙 (DB 비의존 순수 함수).

export type Role = "ADMIN" | "GOV_INSPECTOR" | "FIELD_OFFICER" | "PARTNER_STAFF" | "CONSUMER";

/** 입력값이 규칙에 맞지 않을 때 (422) */
export class AccountPolicyError extends Error {}

/** 권한 밖의 계정을 다루려 할 때 (403) — 호출자가 두 경우를 구분할 수 있어야 한다. */
export class AccountAccessError extends AccountPolicyError {}

const STAFF_ROLES: Role[] = ["ADMIN", "GOV_INSPECTOR", "FIELD_OFFICER", "PARTNER_STAFF"];

export function isStaffRole(role: Role): boolean {
  return STAFF_ROLES.includes(role);
}

export interface CreateUserInput {
  email: string;
  displayName: string;
  role: Role;
  organizationId?: string | null;
  country?: string | null;
}

export function validateCreateUser(input: CreateUserInput): {
  email: string;
  displayName: string;
  role: Role;
  organizationId: string | null;
  country: string;
} {
  const email = (input.email ?? "").toLowerCase().trim();
  const displayName = (input.displayName ?? "").trim();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new AccountPolicyError("올바른 이메일 형식이 아닙니다.");
  }
  if (displayName.length < 1) {
    throw new AccountPolicyError("표시 이름을 입력해주세요.");
  }
  if (!STAFF_ROLES.includes(input.role) && input.role !== "CONSUMER") {
    throw new AccountPolicyError(`알 수 없는 역할입니다: ${input.role}`);
  }

  // 직원 계정은 소속 기관이 있어야 권한 검사(누구를 대신해 행동하는가)가 성립한다.
  if (isStaffRole(input.role) && !input.organizationId) {
    throw new AccountPolicyError("직원 계정은 소속 기관을 지정해야 합니다.");
  }
  if (input.role === "CONSUMER" && input.organizationId) {
    throw new AccountPolicyError("소비자 계정에는 소속 기관을 지정할 수 없습니다.");
  }

  return {
    email,
    displayName,
    role: input.role,
    organizationId: isStaffRole(input.role) ? input.organizationId! : null,
    country: (input.country ?? "PH").trim() || "PH",
  };
}

// ── 위임 관리 (매장·기관 관리자) ─────────────────────────────────────────
//
// 운영자는 모든 계정을 관리한다. 기관 관리자는 "자기 기관 안에서, 자기와 같은 역할만"
// 관리할 수 있다. 이 두 제약이 권한 상승 경로를 막는다 — 매장 관리자가 심사관이나
// 운영자 계정을 만들거나, 다른 매장의 계정을 건드릴 수 없다.

export interface AccountActor {
  id: string;
  role: Role;
  organizationId: string | null;
  isOrgManager: boolean;
}

export interface AccountTarget {
  id: string;
  role: Role;
  organizationId: string | null;
  isOrgManager: boolean;
}

export function assertCanManageAccounts(actor: AccountActor): void {
  if (actor.role === "ADMIN") return;
  if (actor.isOrgManager && isStaffRole(actor.role) && actor.organizationId) return;
  throw new AccountAccessError("계정을 관리할 권한이 없습니다.");
}

export function assertCanCreateAccount(
  actor: AccountActor,
  input: { role: Role; organizationId: string | null; isOrgManager?: boolean }
): void {
  assertCanManageAccounts(actor);
  if (actor.role === "ADMIN") return;

  if (input.role !== actor.role) {
    throw new AccountAccessError("소속 기관의 동일 역할 계정만 생성할 수 있습니다.");
  }
  if (input.organizationId !== actor.organizationId) {
    throw new AccountAccessError("소속 기관의 계정만 생성할 수 있습니다.");
  }
  // 관리자 권한 부여는 운영자만 할 수 있다 — 위임이 무한히 번지지 않게 한다.
  if (input.isOrgManager) {
    throw new AccountAccessError("관리자 권한 부여는 운영자만 할 수 있습니다.");
  }
}

export function assertCanManageTarget(actor: AccountActor, target: AccountTarget): void {
  assertCanManageAccounts(actor);
  if (actor.role === "ADMIN") return;

  if (!target.organizationId || target.organizationId !== actor.organizationId) {
    throw new AccountAccessError("소속 기관의 계정만 관리할 수 있습니다.");
  }
  if (target.role !== actor.role) {
    throw new AccountAccessError("동일 역할 계정만 관리할 수 있습니다.");
  }
  if (target.isOrgManager) {
    throw new AccountAccessError("다른 관리자 계정은 운영자만 관리할 수 있습니다.");
  }
}

export interface DisableCheck {
  targetUserId: string;
  targetRole: Role;
  targetAlreadyDisabled: boolean;
  actorUserId: string;
  /** 대상 계정을 제외한 활성 ADMIN 수 */
  otherActiveAdminCount: number;
}

// 관리자가 스스로를 잠그거나 마지막 관리자를 없애 시스템에 아무도 접근할 수 없게 되는
// 상황을 막는다. 두 경우 모두 복구하려면 DB를 직접 건드려야 한다.
export function assertCanDisable(check: DisableCheck): void {
  if (check.targetAlreadyDisabled) {
    throw new AccountPolicyError("이미 비활성화된 계정입니다.");
  }
  if (check.targetUserId === check.actorUserId) {
    throw new AccountPolicyError("본인 계정은 비활성화할 수 없습니다.");
  }
  if (check.targetRole === "ADMIN" && check.otherActiveAdminCount === 0) {
    throw new AccountPolicyError("마지막 운영자 계정은 비활성화할 수 없습니다.");
  }
}
