import { NextResponse } from "next/server";
import { authErrorResponse, requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    await requireRole("GOV_INSPECTOR", "ADMIN");

    const alert = await prisma.smuggleAlert.update({
      where: { id: params.id },
      data: { status: "RESOLVED", resolvedAt: new Date() },
    });
    return NextResponse.json({ alert });
  } catch (err) {
    const authResponse = authErrorResponse(err);
    if (authResponse) return authResponse;
    throw err;
  }
}
