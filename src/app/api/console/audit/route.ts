import { NextRequest, NextResponse } from "next/server";
import type { AuditAction } from "@prisma/client";
import { authErrorResponse, requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// 감사 로그는 열람만 가능하다 — 수정·삭제 엔드포인트를 의도적으로 두지 않는다.
export async function GET(req: NextRequest) {
  try {
    await requireRole("GOV_INSPECTOR", "ADMIN");

    const action = req.nextUrl.searchParams.get("action");
    const take = Math.min(Number(req.nextUrl.searchParams.get("take") ?? 100), 300);

    const logs = await prisma.auditLog.findMany({
      where: action ? { action: action as AuditAction } : undefined,
      orderBy: { createdAt: "desc" },
      take,
      include: { actorUser: { select: { displayName: true, email: true } } },
    });

    return NextResponse.json({ logs });
  } catch (err) {
    const authResponse = authErrorResponse(err);
    if (authResponse) return authResponse;
    throw err;
  }
}
