import { NextRequest, NextResponse } from "next/server";
import { authErrorResponse, requireRole, requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireUser();
    const organizations = await prisma.organization.findMany({ orderBy: { name: "asc" } });
    return NextResponse.json({ organizations });
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
    const { name, type, country } = body ?? {};
    if (!name || !type || !country) {
      return NextResponse.json({ error: "name, type, country는 필수입니다." }, { status: 400 });
    }
    const org = await prisma.organization.create({ data: { name, type, country } });
    return NextResponse.json({ organization: org }, { status: 201 });
  } catch (err) {
    const authResponse = authErrorResponse(err);
    if (authResponse) return authResponse;
    throw err;
  }
}
