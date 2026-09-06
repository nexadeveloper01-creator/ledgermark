import { NextRequest, NextResponse } from "next/server";
import { authErrorResponse, requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// 한 시트가 다룰 라벨 수 상한. LOT은 최대 1만 개까지 가능하지만, 한 번에 수천 장의 QR을
// 브라우저에서 렌더·인쇄하는 것은 비현실적이므로 페이지 단위로 끊어 제공한다.
const MAX_LABELS = 500;

// LOT의 UID 코드 목록 — 생산 단계 QR 라벨 생성에 사용한다.
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireRole("ADMIN", "GOV_INSPECTOR");

    const take = Math.min(Number(req.nextUrl.searchParams.get("take") ?? MAX_LABELS), MAX_LABELS);
    const skip = Math.max(Number(req.nextUrl.searchParams.get("skip") ?? 0), 0);

    const lot = await prisma.lot.findUnique({
      where: { id: params.id },
      select: { id: true, code: true, productName: true, quantity: true },
    });
    if (!lot) {
      return NextResponse.json({ error: "LOT을 찾을 수 없습니다." }, { status: 404 });
    }

    const total = await prisma.uid.count({ where: { lotId: lot.id } });
    const uids = await prisma.uid.findMany({
      where: { lotId: lot.id },
      orderBy: { code: "asc" },
      skip,
      take,
      select: { code: true },
    });

    return NextResponse.json({
      lot,
      total,
      skip,
      take,
      codes: uids.map((u) => u.code),
    });
  } catch (err) {
    const authResponse = authErrorResponse(err);
    if (authResponse) return authResponse;
    throw err;
  }
}
