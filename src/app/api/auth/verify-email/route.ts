import { NextRequest, NextResponse } from "next/server";
import { recordAudit } from "@/lib/audit/log";
import { CONSUME_FAILURE_MESSAGE, consumeToken } from "@/lib/accounts/tokens";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const token = typeof body?.token === "string" ? body.token : "";

  const result = await consumeToken(token, "EMAIL_VERIFY");
  if (!result.ok) {
    return NextResponse.json({ error: CONSUME_FAILURE_MESSAGE[result.reason] }, { status: 422 });
  }

  const user = await prisma.user.update({
    where: { id: result.userId },
    data: { emailVerifiedAt: new Date() },
    select: { id: true, email: true },
  });

  await recordAudit({
    action: "EMAIL_VERIFIED",
    actorEmail: user.email,
    req,
    targetType: "User",
    targetId: user.id,
  });

  return NextResponse.json({ ok: true });
}
