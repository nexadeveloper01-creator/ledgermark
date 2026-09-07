import { NextResponse } from "next/server";
import { authErrorResponse, requireRole } from "@/lib/auth/guards";
import { buildMarketReport } from "@/lib/market/marketIntelligence";

// 회사 운영자용 AI 시장분석 리포트. 자사 실측 + 시장 모델 추정을 블렌딩해 매일 갱신된다.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireRole("ADMIN");
    const report = await buildMarketReport();
    return NextResponse.json(report);
  } catch (err) {
    const res = authErrorResponse(err);
    if (res) return res;
    throw err;
  }
}
