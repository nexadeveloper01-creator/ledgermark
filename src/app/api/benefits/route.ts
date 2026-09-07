import { NextResponse } from "next/server";
import { authErrorResponse, requireUser } from "@/lib/auth/guards";
import { benefitsSummary } from "@/lib/coupons/couponService";

export const dynamic = "force-dynamic";

// 동의로 받은 혜택 · 할인 누계 요약 (앱 혜택 탭 상단 가시화).
export async function GET() {
  try {
    const user = await requireUser();
    if (user.role !== "CONSUMER" || !user.consumerId) {
      return NextResponse.json({ error: "소비자 계정만 이용할 수 있습니다." }, { status: 403 });
    }
    return NextResponse.json(await benefitsSummary(user.consumerId));
  } catch (err) {
    const res = authErrorResponse(err);
    if (res) return res;
    throw err;
  }
}
