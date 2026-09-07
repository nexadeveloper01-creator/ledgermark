import { NextRequest, NextResponse } from "next/server";
import { recordAudit } from "@/lib/audit/log";
import { issueToken } from "@/lib/accounts/tokens";
import { appBaseUrl, getMailer } from "@/lib/mail";
import { passwordResetEmail } from "@/lib/mail/templates";
import { clientIp, consumeRateLimit, PASSWORD_RESET_PER_IP } from "@/lib/security/rateLimit";
import { prisma } from "@/lib/prisma";

// 계정 존재 여부가 드러나지 않도록 어떤 경우에도 동일한 응답을 준다.
const GENERIC_RESPONSE = {
  message: "해당 이메일로 가입된 계정이 있다면 재설정 링크를 보냈습니다.",
};

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const limit = await consumeRateLimit(`reset:ip:${ip}`, PASSWORD_RESET_PER_IP);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } }
    );
  }

  const body = await req.json();
  const email = typeof body?.email === "string" ? body.email.toLowerCase().trim() : "";
  if (!email) {
    return NextResponse.json({ error: "이메일을 입력해주세요." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });

  // 비활성 계정에도 링크를 보내지 않지만, 응답은 동일하게 유지한다.
  if (user && !user.disabledAt) {
    const { raw } = await issueToken(user.id, "PASSWORD_RESET");
    const link = `${appBaseUrl()}/reset-password?token=${encodeURIComponent(raw)}`;

    // 응답은 계정 존재 여부와 무관하게 동일해야 하므로 메일 실패도 삼킨다(열거 방지).
    try {
      await getMailer().send(
        passwordResetEmail({ to: user.email, displayName: user.displayName, link })
      );
      await recordAudit({
        action: "PASSWORD_RESET_REQUESTED",
        actorEmail: user.email,
        req,
        targetType: "User",
        targetId: user.id,
      });
    } catch (mailErr) {
      console.error("[forgot-password] 재설정 메일 발송 실패:", mailErr);
    }
  }

  return NextResponse.json(GENERIC_RESPONSE);
}
