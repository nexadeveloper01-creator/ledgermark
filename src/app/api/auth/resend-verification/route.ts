import { NextRequest, NextResponse } from "next/server";
import { recordAudit } from "@/lib/audit/log";
import { issueToken } from "@/lib/accounts/tokens";
import { authErrorResponse, requireUser } from "@/lib/auth/guards";
import { appBaseUrl, getMailer } from "@/lib/mail";
import { verificationEmail } from "@/lib/mail/templates";
import { consumeRateLimit, VERIFY_RESEND_PER_USER } from "@/lib/security/rateLimit";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const actor = await requireUser();

    const limit = await consumeRateLimit(`verify:user:${actor.id}`, VERIFY_RESEND_PER_USER);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "재발송 요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } }
      );
    }

    const user = await prisma.user.findUnique({ where: { id: actor.id } });
    if (!user) return NextResponse.json({ error: "계정을 찾을 수 없습니다." }, { status: 404 });
    if (user.emailVerifiedAt) {
      return NextResponse.json({ message: "이미 인증된 이메일입니다." });
    }

    const { raw } = await issueToken(user.id, "EMAIL_VERIFY");
    const link = `${appBaseUrl()}/verify-email?token=${encodeURIComponent(raw)}`;
    await getMailer().send(
      verificationEmail({ to: user.email, displayName: user.displayName, link })
    );

    await recordAudit({
      action: "EMAIL_VERIFY_SENT",
      actor,
      req,
      targetType: "User",
      targetId: user.id,
    });

    return NextResponse.json({ message: "인증 메일을 다시 보냈습니다." });
  } catch (err) {
    const authResponse = authErrorResponse(err);
    if (authResponse) return authResponse;
    throw err;
  }
}
