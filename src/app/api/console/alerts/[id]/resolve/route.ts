import { NextRequest, NextResponse } from "next/server";
import { recordAudit } from "@/lib/audit/log";
import { authErrorResponse, requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireRole("GOV_INSPECTOR", "ADMIN");

    const alert = await prisma.smuggleAlert.update({
      where: { id: params.id },
      data: { status: "RESOLVED", resolvedAt: new Date() },
    });
    await recordAudit({
      action: "ALERT_RESOLVED",
      actor: user,
      req,
      targetType: "SmuggleAlert",
      targetId: alert.id,
      detail: { uidCode: alert.uidCode },
    });

    return NextResponse.json({ alert });
  } catch (err) {
    const authResponse = authErrorResponse(err);
    if (authResponse) return authResponse;
    throw err;
  }
}
