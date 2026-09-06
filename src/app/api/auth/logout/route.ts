import { NextRequest, NextResponse } from "next/server";
import { recordAudit } from "@/lib/audit/log";
import { destroySession, getSessionUser } from "@/lib/auth/session";

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  await destroySession();
  if (user) {
    await recordAudit({ action: "LOGOUT", actor: user, req });
  }
  return NextResponse.json({ ok: true });
}
