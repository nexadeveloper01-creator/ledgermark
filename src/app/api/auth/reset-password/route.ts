import { NextRequest, NextResponse } from "next/server";
import { recordAudit } from "@/lib/audit/log";
import { AccountPolicyError } from "@/lib/accounts/policy";
import { validatePassword } from "@/lib/accounts/signup";
import { CONSUME_FAILURE_MESSAGE, consumeToken } from "@/lib/accounts/tokens";
import { hashPassword } from "@/lib/auth/password";
import { clearRateLimit } from "@/lib/security/rateLimit";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const token = typeof body?.token === "string" ? body.token : "";
  const password = typeof body?.password === "string" ? body.password : "";

  try {
    validatePassword(password);
  } catch (err) {
    if (err instanceof AccountPolicyError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    throw err;
  }

  const result = await consumeToken(token, "PASSWORD_RESET");
  if (!result.ok) {
    return NextResponse.json({ error: CONSUME_FAILURE_MESSAGE[result.reason] }, { status: 422 });
  }

  const user = await prisma.user.findUnique({ where: { id: result.userId } });
  if (!user) {
    return NextResponse.json({ error: "계정을 찾을 수 없습니다." }, { status: 404 });
  }

  const passwordHash = await hashPassword(password);

  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { passwordHash } }),
    // 재설정은 계정 탈취 복구 수단이므로 기존 세션을 전부 끊는다.
    prisma.session.deleteMany({ where: { userId: user.id } }),
  ]);

  // 잠겨 있던 로그인 카운터를 풀어 바로 로그인할 수 있게 한다.
  await clearRateLimit(`login:email:${user.email}`);

  await recordAudit({
    action: "PASSWORD_RESET_COMPLETED",
    actorEmail: user.email,
    req,
    targetType: "User",
    targetId: user.id,
  });

  return NextResponse.json({ ok: true });
}
