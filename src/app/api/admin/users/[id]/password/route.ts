import { NextRequest, NextResponse } from "next/server";
import { recordAudit } from "@/lib/audit/log";
import { authErrorResponse, requireUser } from "@/lib/auth/guards";
import { resetPassword } from "@/lib/accounts/accountService";
import { AccountAccessError, AccountPolicyError } from "@/lib/accounts/policy";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const actor = await requireUser();
    const { tempPassword } = await resetPassword(actor, params.id);

    await recordAudit({
      action: "USER_PASSWORD_RESET",
      actor,
      req,
      targetType: "User",
      targetId: params.id,
    });

    // 임시 비밀번호는 이 응답에서 한 번만 노출된다.
    return NextResponse.json({ tempPassword });
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
