import { NextResponse } from "next/server";
import { getSessionUser, type SessionUser } from "./session";

export type Role = SessionUser["role"];

export class AuthError extends Error {
  constructor(
    message: string,
    readonly status: 401 | 403
  ) {
    super(message);
  }
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new AuthError("로그인이 필요합니다.", 401);
  return user;
}

export async function requireRole(...roles: Role[]): Promise<SessionUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) {
    throw new AuthError("이 작업을 수행할 권한이 없습니다.", 403);
  }
  return user;
}

// 직원 계정이 특정 조직을 대신해 행동할 수 있는지 확인한다.
// 예: 매장 직원은 자기 매장이 보유한 UID의 소유권만 이전할 수 있다.
export function assertActsForOrg(user: SessionUser, orgId: string | null | undefined) {
  if (user.role === "ADMIN") return;
  if (!orgId || user.organizationId !== orgId) {
    throw new AuthError("소속 기관이 보유한 UID에 대해서만 처리할 수 있습니다.", 403);
  }
}

// 소비자 계정이 본인 자원에만 접근하도록 강제한다.
export function assertIsSelf(user: SessionUser, consumerId: string | null | undefined) {
  if (user.role === "CONSUMER" && user.consumerId === consumerId) return;
  throw new AuthError("본인 계정의 자원에만 접근할 수 있습니다.", 403);
}

export function authErrorResponse(err: unknown): NextResponse | null {
  if (err instanceof AuthError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  return null;
}
