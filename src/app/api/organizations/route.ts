import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const organizations = await prisma.organization.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json({ organizations });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, type, country } = body ?? {};
  if (!name || !type || !country) {
    return NextResponse.json({ error: "name, type, country는 필수입니다." }, { status: 400 });
  }
  const org = await prisma.organization.create({ data: { name, type, country } });
  return NextResponse.json({ organization: org }, { status: 201 });
}
