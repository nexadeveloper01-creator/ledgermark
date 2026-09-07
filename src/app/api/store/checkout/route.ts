import { NextRequest, NextResponse } from "next/server";
import { authErrorResponse, requireRole } from "@/lib/auth/guards";
import { recordAudit } from "@/lib/audit/log";
import { checkout } from "@/lib/store/checkoutService";
import { PointsError } from "@/lib/points/pointsService";

// 매장 결제 확정 — 쿠폰 차감 + 결제 기록.
export async function POST(req: NextRequest) {
  try {
    const user = await requireRole("PARTNER_STAFF", "ADMIN");
    const body = await req.json();
    const receipt = await checkout({
      orgId: user.organizationId,
      staffUserId: user.id,
      amount: body?.amount,
      couponCode: body?.couponCode ?? null,
    });
    await recordAudit({
      action: "REQUEST_COMMITTED", // 결제 이벤트를 감사 로그에 남긴다(별도 액션 없이 재사용)
      actor: user,
      req,
      targetType: "StoreCheckout",
      targetId: receipt.checkoutId,
      detail: { amount: receipt.amount, discount: receipt.discount, total: receipt.total, coupon: receipt.coupon?.code },
    });
    return NextResponse.json(receipt);
  } catch (err) {
    const res = authErrorResponse(err);
    if (res) return res;
    if (err instanceof PointsError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    throw err;
  }
}
