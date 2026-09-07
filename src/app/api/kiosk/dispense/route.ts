import { NextRequest, NextResponse } from "next/server";
import { dispenseSale } from "@/lib/kiosk/kioskService";
import { LedgerError } from "@/lib/ledger/stateMachine";

// 공개 — 무인 자판기 결제/배출 시 클레임 발급.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body?.code) return NextResponse.json({ error: "코드가 필요합니다." }, { status: 400 });
    return NextResponse.json(await dispenseSale(body.code));
  } catch (err) {
    if (err instanceof LedgerError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    throw err;
  }
}
