import { NextResponse } from "next/server";
import { authErrorResponse, requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();

    const isSelf = user.role === "CONSUMER" && user.consumerId === params.id;
    const isSupervisor = user.role === "GOV_INSPECTOR" || user.role === "ADMIN";
    if (!isSelf && !isSupervisor) {
      return NextResponse.json({ error: "본인 보유 제품만 조회할 수 있습니다." }, { status: 403 });
    }

    const uids = await prisma.uid.findMany({
      // 교환으로 폐기된 구UID는 보유 제품이 아니다 — 이력은 원장 조회에서만 확인한다.
      where: { ownerConsumerId: params.id, status: { not: "EXCHANGED" } },
      orderBy: { updatedAt: "desc" },
      include: { lot: { select: { code: true, productName: true } } },
    });
    return NextResponse.json({ uids });
  } catch (err) {
    const authResponse = authErrorResponse(err);
    if (authResponse) return authResponse;
    throw err;
  }
}
