import { NextResponse } from "next/server";
import { authErrorResponse, requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

// 관세청 요약: 수입 상품 수량 + 납부 세금.
// ⚠️ 세액은 아직 실데이터 모델이 없어 "가정값"(개당 고정 세액)으로 산출한다.
//    실제 세율/신고 세액이 정해지면 TAX_PER_UNIT_PHP 또는 산출식을 교체하면 된다.
export const dynamic = "force-dynamic";

const TAX_PER_UNIT_PHP = 15; // 가정: 수입 1개당 ₱15

export async function GET() {
  try {
    await requireRole("GOV_INSPECTOR", "ADMIN");

    const [total, minted, byStatusRows] = await Promise.all([
      prisma.uid.count(),
      // 아직 생산법인에 있는(수출 전) 물량 = MINTED. 나머지가 "수입된" 물량.
      prisma.uid.count({ where: { status: "MINTED" } }),
      prisma.uid.groupBy({ by: ["status"], _count: { _all: true } }),
    ]);

    const importedUnits = Math.max(0, total - minted);
    const taxTotalPhp = importedUnits * TAX_PER_UNIT_PHP;

    return NextResponse.json({
      importedUnits,
      totalUnits: total,
      taxPerUnitPhp: TAX_PER_UNIT_PHP,
      taxTotalPhp,
      assumption: true, // 세액은 가정값
      byStatus: Object.fromEntries(byStatusRows.map((r) => [r.status, r._count._all])),
    });
  } catch (err) {
    const res = authErrorResponse(err);
    if (res) return res;
    throw err;
  }
}
