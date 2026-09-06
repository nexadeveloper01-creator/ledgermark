import { NextRequest, NextResponse } from "next/server";
import { recordAudit } from "@/lib/audit/log";
import { verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import {
  clearRateLimit,
  clientIp,
  consumeRateLimit,
  LOGIN_PER_EMAIL,
  LOGIN_PER_IP,
} from "@/lib/security/rateLimit";
import { prisma } from "@/lib/prisma";

function tooManyAttempts(retryAfterSec: number) {
  return NextResponse.json(
    { error: `로그인 시도가 너무 많습니다. ${Math.ceil(retryAfterSec / 60)}분 후 다시 시도해주세요.` },
    { status: 429, headers: { "Retry-After": String(retryAfterSec) } }
  );
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { email, password } = body ?? {};

  if (typeof email !== "string" || typeof password !== "string") {
    return NextResponse.json({ error: "이메일과 비밀번호를 입력해주세요." }, { status: 400 });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const ip = clientIp(req);

  // 계정별 제한이 실질적 방어선이고, IP 제한은 계정을 바꿔가며 시도하는 경우의 보조 수단이다.
  const byIp = await consumeRateLimit(`login:ip:${ip}`, LOGIN_PER_IP);
  const byEmail = await consumeRateLimit(`login:email:${normalizedEmail}`, LOGIN_PER_EMAIL);

  if (!byIp.allowed || !byEmail.allowed) {
    await recordAudit({
      action: "LOGIN_BLOCKED",
      actorEmail: normalizedEmail,
      req,
      detail: { reason: !byEmail.allowed ? "email" : "ip" },
    });
    return tooManyAttempts(Math.max(byIp.retryAfterSec, byEmail.retryAfterSec));
  }

  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

  // 계정 존재 여부가 응답으로 드러나지 않도록 동일한 메시지를 사용한다.
  const invalid = NextResponse.json(
    { error: "이메일 또는 비밀번호가 올바르지 않습니다." },
    { status: 401 }
  );

  if (!user) {
    // 존재하지 않는 계정에서도 해시 검증과 비슷한 시간을 소모해 타이밍 차이를 줄인다.
    await verifyPassword(password, "scrypt$65536$8$2$AAAAAAAAAAAAAAAAAAAAAA==$AAAA");
    await recordAudit({ action: "LOGIN_FAILED", actorEmail: normalizedEmail, req });
    return invalid;
  }

  if (user.disabledAt) {
    // 계정 존재 여부가 드러나지 않도록 자격증명 오류와 동일한 응답을 준다.
    await verifyPassword(password, user.passwordHash);
    await recordAudit({
      action: "LOGIN_FAILED",
      actorEmail: normalizedEmail,
      req,
      detail: { userId: user.id, reason: "disabled" },
    });
    return invalid;
  }

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    await recordAudit({
      action: "LOGIN_FAILED",
      actorEmail: normalizedEmail,
      req,
      detail: { userId: user.id },
    });
    return invalid;
  }

  await createSession(user.id);

  // 정상 로그인으로 확인되었으므로 해당 계정의 실패 카운터를 비운다.
  await clearRateLimit(`login:email:${normalizedEmail}`);

  await recordAudit({
    action: "LOGIN_SUCCESS",
    actorEmail: user.email,
    actor: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      organizationId: user.organizationId,
      organizationName: null,
      consumerId: user.consumerId,
      isOrgManager: user.isOrgManager,
    },
    req,
  });

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
    },
  });
}
