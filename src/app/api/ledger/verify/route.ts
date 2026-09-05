import { NextResponse } from "next/server";
import { verifyLedgerIntegrity } from "@/lib/ledger/ledgerService";

// 무결성 검증은 매 요청마다 원장을 재계산해야 하므로 정적 프리렌더를 금지한다.
export const dynamic = "force-dynamic";

export async function GET() {
  const result = await verifyLedgerIntegrity();
  return NextResponse.json(result);
}
