import { NextRequest, NextResponse } from "next/server";
import { authErrorResponse, requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// 소비자 명부는 개인정보이므로 전체 목록은 감독기관·운영자에게만 노출한다.
// 소비자 간 중고거래 상대 지정은 /api/consumers/lookup(이메일 단건 조회)을 사용한다.
export async function GET() {
  try {
    await requireRole("GOV_INSPECTOR", "ADMIN");
    const consumers = await prisma.consumer.findMany({ orderBy: { createdAt: "asc" } });
    return NextResponse.json({ consumers });
  } catch (err) {
    const authResponse = authErrorResponse(err);
    if (authResponse) return authResponse;
    throw err;
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireRole("ADMIN");
    const body = await req.json();
    const { displayName, country } = body ?? {};
    if (!displayName || !country) {
      return NextResponse.json({ error: "displayName, country는 필수입니다." }, { status: 400 });
    }
    const consumer = await prisma.consumer.create({ data: { displayName, country } });
    return NextResponse.json({ consumer }, { status: 201 });
  } catch (err) {
    const authResponse = authErrorResponse(err);
    if (authResponse) return authResponse;
    throw err;
  }
}
