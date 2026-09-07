import { NextResponse } from "next/server";
import { kioskStock } from "@/lib/kiosk/kioskService";

// 공개 — 무인 자판기 재고(판매 가능 제품) 목록.
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ items: await kioskStock() });
}
