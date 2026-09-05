import { NextResponse } from "next/server";
import { getUidTrace } from "@/lib/ledger/ledgerService";

export async function GET(_req: Request, { params }: { params: { code: string } }) {
  const uid = await getUidTrace(params.code);
  if (!uid) {
    return NextResponse.json({ error: "UID를 찾을 수 없습니다." }, { status: 404 });
  }
  return NextResponse.json({ uid });
}
