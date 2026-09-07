import { NextRequest, NextResponse } from "next/server";
import { authErrorResponse, requireRole } from "@/lib/auth/guards";
import { lookupCoupon } from "@/lib/store/checkoutService";

export const dynamic = "force-dynamic";

// 매장 직원이 결제 전 쿠폰을 조회한다.
export async function GET(req: NextRequest) {
  try {
    await requireRole("PARTNER_STAFF", "ADMIN");
    const code = req.nextUrl.searchParams.get("code");
    if (!code) return NextResponse.json({ error: "쿠폰 코드를 입력해주세요." }, { status: 400 });
    return NextResponse.json(await lookupCoupon(code));
  } catch (err) {
    const res = authErrorResponse(err);
    if (res) return res;
    throw err;
  }
}
