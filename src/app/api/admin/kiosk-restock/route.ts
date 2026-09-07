import { NextRequest, NextResponse } from "next/server";
import { authErrorResponse, requireRole } from "@/lib/auth/guards";
import { restock } from "@/lib/kiosk/kioskService";

// 관리자 전용 — 자판기 재고 복구(미클레임 예약 정리). 시연 리셋용.
export async function POST(req: NextRequest) {
  try {
    await requireRole("ADMIN");
    const body = await req.json().catch(() => ({}));
    const result = await restock(typeof body?.lotCode === "string" ? body.lotCode : undefined);
    return NextResponse.json(result);
  } catch (err) {
    const res = authErrorResponse(err);
    if (res) return res;
    throw err;
  }
}
