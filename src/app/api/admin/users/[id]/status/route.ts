import { NextRequest, NextResponse } from "next/server";
import { recordAudit } from "@/lib/audit/log";
import { authErrorResponse, requireUser } from "@/lib/auth/guards";
import { setDisabled } from "@/lib/accounts/accountService";
import { AccountAccessError, AccountPolicyError } from "@/lib/accounts/policy";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const actor = await requireUser();
    const body = await req.json();
    const disabled = body?.disabled === true;

    const result = await setDisabled({ actor, targetUserId: params.id, disabled });

    await recordAudit({
      action: result.disabled ? "USER_DISABLED" : "USER_ENABLED",
      actor,
      req,
      targetType: "User",
      targetId: params.id,
    });

    return NextResponse.json(result);
  } catch (err) {
    const authResponse = authErrorResponse(err);
    if (authResponse) return authResponse;
    if (err instanceof AccountAccessError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    if (err instanceof AccountPolicyError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    throw err;
  }
}
