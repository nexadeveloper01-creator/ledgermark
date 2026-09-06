import { NextRequest, NextResponse } from "next/server";
import { recordAudit } from "@/lib/audit/log";
import { authErrorResponse, requireUser } from "@/lib/auth/guards";
import { createUser, listUsers } from "@/lib/accounts/accountService";
import { AccountAccessError, AccountPolicyError } from "@/lib/accounts/policy";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const actor = await requireUser();
    return NextResponse.json({ users: await listUsers(actor) });
  } catch (err) {
    const authResponse = authErrorResponse(err);
    if (authResponse) return authResponse;
    if (err instanceof AccountAccessError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    throw err;
  }
}

export async function POST(req: NextRequest) {
  try {
    const actor = await requireUser();
    const body = await req.json();

    const { user, tempPassword } = await createUser(actor, {
      email: body?.email,
      displayName: body?.displayName,
      role: body?.role,
      organizationId: body?.organizationId ?? null,
      country: body?.country ?? null,
      isOrgManager: body?.isOrgManager === true,
    });

    await recordAudit({
      action: "USER_CREATED",
      actor,
      req,
      targetType: "User",
      targetId: user.id,
      // 임시 비밀번호는 감사 로그에 남기지 않는다.
      detail: { email: user.email, role: user.role, isOrgManager: user.isOrgManager },
    });

    // 임시 비밀번호는 이 응답에서 한 번만 노출되고 저장되지 않는다.
    return NextResponse.json({ user, tempPassword }, { status: 201 });
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
