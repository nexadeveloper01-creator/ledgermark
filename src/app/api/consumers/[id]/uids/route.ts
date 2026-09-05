import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const uids = await prisma.uid.findMany({
    // 교환으로 폐기된 구UID는 보유 제품이 아니다 — 이력은 원장 조회에서만 확인한다.
    where: { ownerConsumerId: params.id, status: { not: "EXCHANGED" } },
    orderBy: { updatedAt: "desc" },
    include: { lot: { select: { code: true, productName: true } } },
  });
  return NextResponse.json({ uids });
}
