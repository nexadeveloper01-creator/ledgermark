import { NextRequest, NextResponse } from "next/server";
import { recordAudit } from "@/lib/audit/log";
import { authErrorResponse, requireRole } from "@/lib/auth/guards";
import { revokeSessions } from "@/lib/accounts/accountService";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const actor = await requireRole("ADMIN");
    const result = await revokeSessions(params.id);

    await recordAudit({
      action: "USER_SESSIONS_REVOKED",
      actor,
      req,
      targetType: "User",
      targetId: params.id,
      detail: { revoked: result.revoked },
    });

    return NextResponse.json(result);
  } catch (err) {
    const authResponse = authErrorResponse(err);
    if (authResponse) return authResponse;
    throw err;
  }
}
