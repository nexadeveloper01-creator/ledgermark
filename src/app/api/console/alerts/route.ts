import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get("status");
  const alerts = await prisma.smuggleAlert.findMany({
    where: status ? { status: status as "OPEN" | "RESOLVED" } : undefined,
    orderBy: { detectedAt: "desc" },
    include: { uid: { select: { code: true, status: true } } },
  });
  return NextResponse.json({ alerts });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { uidCode, reason } = body ?? {};
  if (!uidCode || !reason) {
    return NextResponse.json({ error: "uidCode, reason은 필수입니다." }, { status: 400 });
  }

  const uid = await prisma.uid.findUnique({ where: { code: uidCode } });
  if (!uid) {
    return NextResponse.json({ error: "UID를 찾을 수 없습니다." }, { status: 404 });
  }

  const alert = await prisma.smuggleAlert.create({
    data: { uidId: uid.id, reason },
  });
  return NextResponse.json({ alert }, { status: 201 });
}
