import { NextRequest, NextResponse } from "next/server";
import { authErrorResponse, requireUser } from "@/lib/auth/guards";
import { applyExchangeBonus } from "@/lib/exchange/entitlementService";
import { LedgerError } from "@/lib/ledger/stateMachine";

// 추가 무상 교환 자격을 특정 기기에 적용(교환권 복원). 이후 일반 교환 신청 흐름 사용.
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    if (user.role !== "CONSUMER" || !user.consumerId) {
      return NextResponse.json({ error: "소비자 계정만 이용할 수 있습니다." }, { status: 403 });
    }
    const body = await req.json();
    if (!body?.uidCode) return NextResponse.json({ error: "기기 UID가 필요합니다." }, { status: 400 });
    const result = await applyExchangeBonus(user.consumerId, body.uidCode);
    return NextResponse.json(result);
  } catch (err) {
    const res = authErrorResponse(err);
    if (res) return res;
    if (err instanceof LedgerError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    throw err;
  }
}
