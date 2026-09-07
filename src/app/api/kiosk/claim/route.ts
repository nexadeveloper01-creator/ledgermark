import { NextRequest, NextResponse } from "next/server";
import { authErrorResponse, requireUser } from "@/lib/auth/guards";
import { claimSale } from "@/lib/kiosk/kioskService";
import { LedgerError } from "@/lib/ledger/stateMachine";

// 소비자 앱 — 자판기 클레임 스캔으로 소유권 자동 이전(정품 등록).
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    if (user.role !== "CONSUMER" || !user.consumerId) {
      return NextResponse.json({ error: "소비자 계정만 이용할 수 있습니다." }, { status: 403 });
    }
    const body = await req.json();
    if (!body?.claimCode) return NextResponse.json({ error: "클레임 코드가 필요합니다." }, { status: 400 });
    const result = await claimSale(user.consumerId, body.claimCode);
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
