import { NextResponse } from "next/server";
import { authErrorResponse, requireUser } from "@/lib/auth/guards";
import { useCoupon } from "@/lib/coupons/couponService";
import { PointsError } from "@/lib/points/pointsService";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    if (user.role !== "CONSUMER" || !user.consumerId) {
      return NextResponse.json({ error: "소비자 계정만 이용할 수 있습니다." }, { status: 403 });
    }
    const coupon = await useCoupon(user.consumerId, params.id);
    return NextResponse.json({ coupon });
  } catch (err) {
    const res = authErrorResponse(err);
    if (res) return res;
    if (err instanceof PointsError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    throw err;
  }
}
