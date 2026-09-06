import type { AuditAction, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/lib/auth/session";
import { clientIp } from "@/lib/security/rateLimit";

export interface AuditInput {
  action: AuditAction;
  actor?: SessionUser | null;
  /** 로그인 실패처럼 계정이 특정되지 않는 경우 시도된 이메일 */
  actorEmail?: string | null;
  targetType?: string;
  targetId?: string;
  detail?: Prisma.InputJsonValue;
  req?: Request;
}

// 감사 기록 실패가 본래 작업을 되돌리게 해서는 안 되므로 예외를 삼키고 로그만 남긴다.
export async function recordAudit(input: AuditInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action: input.action,
        actorUserId: input.actor?.id ?? null,
        actorEmail: input.actorEmail ?? input.actor?.email ?? null,
        actorRole: input.actor?.role ?? null,
        targetType: input.targetType ?? null,
        targetId: input.targetId ?? null,
        ip: input.req ? clientIp(input.req) : null,
        userAgent: input.req?.headers.get("user-agent")?.slice(0, 300) ?? null,
        detail: input.detail,
      },
    });
  } catch (err) {
    console.error("[audit] 기록 실패", input.action, err);
  }
}
