import { NextRequest, NextResponse } from "next/server";
import { recordAudit } from "@/lib/audit/log";
import { signupConsumer } from "@/lib/accounts/accountService";
import { AccountPolicyError } from "@/lib/accounts/policy";
import { createSession } from "@/lib/auth/session";
import { issueToken } from "@/lib/accounts/tokens";
import { appBaseUrl, getMailer } from "@/lib/mail";
import { verificationEmail } from "@/lib/mail/templates";
import { clientIp, consumeRateLimit, SIGNUP_PER_IP } from "@/lib/security/rateLimit";

// 공개 엔드포인트. 요청 본문의 role·organizationId·isOrgManager는 읽지 않으며,
// 생성되는 계정은 항상 소비자다.
export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const limit = await consumeRateLimit(`signup:ip:${ip}`, SIGNUP_PER_IP);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "가입 시도가 너무 많습니다. 잠시 후 다시 시도해주세요." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } }
    );
  }

  const body = await req.json();

  try {
    const user = await signupConsumer({
      email: body?.email,
      displayName: body?.displayName,
      password: body?.password,
      country: body?.country ?? null,
    });

    // 가입 직후 바로 앱을 쓸 수 있도록 세션을 발급한다.
    await createSession(user.id);

    const { raw } = await issueToken(user.id, "EMAIL_VERIFY");
    const link = `${appBaseUrl()}/verify-email?token=${encodeURIComponent(raw)}`;
    await getMailer().send(
      verificationEmail({ to: user.email, displayName: user.displayName, link })
    );

    await recordAudit({
      action: "EMAIL_VERIFY_SENT",
      actorEmail: user.email,
      req,
      targetType: "User",
      targetId: user.id,
    });

    await recordAudit({
      action: "USER_SIGNUP",
      actorEmail: user.email,
      req,
      targetType: "User",
      targetId: user.id,
      detail: { self: true },
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (err) {
    if (err instanceof AccountPolicyError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    throw err;
  }
}
