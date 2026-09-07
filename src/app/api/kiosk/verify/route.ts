import { NextRequest, NextResponse } from "next/server";
import { verifyForKiosk } from "@/lib/kiosk/kioskService";

// 공개 — 무인 자판기 정품 확인(스캔/선택한 UID).
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (!code) return NextResponse.json({ error: "코드가 필요합니다." }, { status: 400 });
  return NextResponse.json(await verifyForKiosk(code));
}
