import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const consumers = await prisma.consumer.findMany({ orderBy: { createdAt: "asc" } });
  return NextResponse.json({ consumers });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { displayName, country } = body ?? {};
  if (!displayName || !country) {
    return NextResponse.json({ error: "displayName, country는 필수입니다." }, { status: 400 });
  }
  const consumer = await prisma.consumer.create({ data: { displayName, country } });
  return NextResponse.json({ consumer }, { status: 201 });
}
