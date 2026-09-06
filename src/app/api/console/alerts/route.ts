import { NextRequest, NextResponse } from "next/server";
import { authErrorResponse, requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireRole("GOV_INSPECTOR", "ADMIN");

    const status = req.nextUrl.searchParams.get("status");
    const alerts = await prisma.smuggleAlert.findMany({
      where: status ? { status: status as "OPEN" | "RESOLVED" } : undefined,
      orderBy: { detectedAt: "desc" },
      include: { uid: { select: { code: true, status: true } } },
    });
    return NextResponse.json({ alerts });
  } catch (err) {
    const authResponse = authErrorResponse(err);
    if (authResponse) return authResponse;
    throw err;
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireRole("GOV_INSPECTOR", "ADMIN");

    const body = await req.json();
    const { uidCode, reason } = body ?? {};
    if (!uidCode || !reason) {
      return NextResponse.json({ error: "uidCode, reason은 필수입니다." }, { status: 400 });
    }

    // 원장에 없는 UID(위조 의심)도 알림 대상이므로 존재하지 않아도 등록을 허용한다.
    const uid = await prisma.uid.findUnique({ where: { code: uidCode } });

    const alert = await prisma.smuggleAlert.create({
      data: { uidCode, uidId: uid?.id ?? null, reason },
    });
    return NextResponse.json({ alert }, { status: 201 });
  } catch (err) {
    const authResponse = authErrorResponse(err);
    if (authResponse) return authResponse;
    throw err;
  }
}
