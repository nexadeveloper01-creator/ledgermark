import { NextRequest, NextResponse } from "next/server";
import { recordAudit } from "@/lib/audit/log";
import { authErrorResponse, requireUser } from "@/lib/auth/guards";
import { revokeSessions } from "@/lib/accounts/accountService";
import { AccountAccessError } from "@/lib/accounts/policy";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const actor = await requireUser();
    const result = await revokeSessions(actor, params.id);

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
    if (err instanceof AccountAccessError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    throw err;
  }
}
