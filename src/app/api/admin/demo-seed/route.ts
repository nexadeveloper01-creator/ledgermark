import { NextResponse } from "next/server";
import { authErrorResponse, requireRole } from "@/lib/auth/guards";
import { seedDemoActivity } from "@/lib/demo/enrich";

// 투자자 시연용 데모 데이터 시드(멱등). 관리자만 실행할 수 있으며, 운영 DB에 직접
// 접속할 수 없는 환경에서 컨테이너 안에서 실행하기 위한 엔드포인트다.
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    await requireRole("ADMIN");
    const result = await seedDemoActivity();
    return NextResponse.json(result);
  } catch (err) {
    const res = authErrorResponse(err);
    if (res) return res;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "데모 시드 실패" },
      { status: 500 }
    );
  }
}
