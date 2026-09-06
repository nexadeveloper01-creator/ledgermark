// 계정 관리 규칙 (DB 비의존 순수 함수).

export type Role = "ADMIN" | "GOV_INSPECTOR" | "FIELD_OFFICER" | "PARTNER_STAFF" | "CONSUMER";

export class AccountPolicyError extends Error {}

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
