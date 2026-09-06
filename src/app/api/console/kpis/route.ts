import { NextResponse } from "next/server";
import { authErrorResponse, requireRole } from "@/lib/auth/guards";
import { verifyLedgerIntegrity } from "@/lib/ledger/ledgerService";
import { prisma } from "@/lib/prisma";

// 요청 인자가 없어 Next.js가 빌드 시점에 정적 프리렌더하는 것을 막는다 — 항상 원장 실시간 집계를 반환해야 한다.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireRole("GOV_INSPECTOR", "ADMIN");

    const [statusCounts, totalUids, openAlerts, lastAnchor, ledgerIntegrity] = await Promise.all([
      prisma.uid.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.uid.count(),
      prisma.smuggleAlert.count({ where: { status: "OPEN" } }),
      prisma.anchor.findFirst({ orderBy: { toSequence: "desc" } }),
      verifyLedgerIntegrity(),
    ]);

    return NextResponse.json({
      totalUids,
      byStatus: Object.fromEntries(statusCounts.map((row) => [row.status, row._count._all])),
      openAlerts,
      lastAnchor,
      ledgerIntegrity,
    });
  } catch (err) {
    const authResponse = authErrorResponse(err);
    if (authResponse) return authResponse;
    throw err;
  }
}
