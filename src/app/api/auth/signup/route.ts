import { NextRequest, NextResponse } from "next/server";
import { recordAudit } from "@/lib/audit/log";
import { signupConsumer } from "@/lib/accounts/accountService";
import { AccountPolicyError } from "@/lib/accounts/policy";
import { createSession } from "@/lib/auth/session";
import { issueToken } from "@/lib/accounts/tokens";
import { appBaseUrl, getMailer } from "@/lib/mail";
import { verificationEmail } from "@/lib/mail/templates";
import { clientIp, consumeRateLimit, SIGNUP_PER_IP } from "@/lib/security/rateLimit";
import { awardPoints, POINTS } from "@/lib/points/pointsService";

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
    const { token } = await createSession(user.id);

    // 가입 축하 포인트(1회). 적립 실패가 가입을 막지 않도록 감싼다.
    if (user.consumerId) {
      try {
        await awardPoints({
          consumerId: user.consumerId,
          reason: "SIGNUP_BONUS",
          amount: POINTS.SIGNUP_BONUS,
          dedupeKey: `signup:${user.consumerId}`,
          memo: "가입 축하 포인트",
        });
      } catch (pointErr) {
        console.error("[signup] 가입 포인트 적립 실패(가입은 계속):", pointErr);
      }
    }

    // 인증 메일 발송이 실패해도 가입 자체는 성공시킨다(계정·세션은 이미 생성됨).
    // 사용자는 앱 상단 배너의 "재발송"으로 다시 시도할 수 있다.
    const { raw } = await issueToken(user.id, "EMAIL_VERIFY");
    const link = `${appBaseUrl()}/verify-email?token=${encodeURIComponent(raw)}`;
    try {
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
    } catch (mailErr) {
      console.error("[signup] 인증 메일 발송 실패(가입은 계속):", mailErr);
    }

    await recordAudit({
      action: "USER_SIGNUP",
      actorEmail: user.email,
      req,
      targetType: "User",
      targetId: user.id,
      detail: { self: true },
    });

    return NextResponse.json({ user, token }, { status: 201 });
  } catch (err) {
    if (err instanceof AccountPolicyError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    throw err;
  }
}
