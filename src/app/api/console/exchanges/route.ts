import { NextResponse } from "next/server";
import { authErrorResponse, requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

// 총판(코니아랩 제품 독점판매 유통사)용 하자·교체 현황.
// EXCHANGE_TRANSFER = 불량/색상 교환 1회 발생 = 사실상 제품 하자 건수.
// 독점 총판은 유통 전 제품을 취급하므로 전체 교환 이력을 집계해 보여준다.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireRole("PARTNER_STAFF", "ADMIN");

    const txs = await prisma.ledgerTransaction.findMany({
      where: { txType: "EXCHANGE_TRANSFER" },
      select: {
        createdAt: true,
        uid: { select: { code: true, lot: { select: { productName: true, code: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });

    const byProduct: Record<string, number> = {};
    for (const t of txs) {
      const name = t.uid?.lot?.productName ?? "—";
      byProduct[name] = (byProduct[name] ?? 0) + 1;
    }

    const products = Object.entries(byProduct)
      .map(([productName, count]) => ({ productName, count }))
      .sort((a, b) => b.count - a.count);

    const totalUids = await prisma.uid.count();
    const recent = txs.slice(0, 20).map((t) => ({
      product: t.uid?.lot?.productName ?? "—",
      lot: t.uid?.lot?.code ?? "—",
      at: t.createdAt,
    }));

    return NextResponse.json({
      totalExchanges: txs.length,
      totalUids,
      products,
      recent,
    });
  } catch (err) {
    const res = authErrorResponse(err);
    if (res) return res;
    throw err;
  }
}
