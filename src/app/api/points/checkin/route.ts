import { NextResponse } from "next/server";
import { authErrorResponse, requireUser } from "@/lib/auth/guards";
import { weeklyCheckin, PointsError } from "@/lib/points/pointsService";
import { consumeRateLimit, LOOKUP_PER_USER } from "@/lib/security/rateLimit";

export async function POST() {
  try {
    const user = await requireUser();
    if (user.role !== "CONSUMER" || !user.consumerId) {
      return NextResponse.json({ error: "소비자 계정만 이용할 수 있습니다." }, { status: 403 });
    }
    const limit = await consumeRateLimit(`checkin:${user.consumerId}`, LOOKUP_PER_USER);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "요청이 너무 많습니다." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } }
      );
    }
    const result = await weeklyCheckin(user.consumerId);
    return NextResponse.json(result);
  } catch (err) {
    const res = authErrorResponse(err);
    if (res) return res;
    if (err instanceof PointsError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    throw err;
  }
}
