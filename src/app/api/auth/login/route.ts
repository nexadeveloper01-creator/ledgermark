import { NextRequest, NextResponse } from "next/server";
import { verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { email, password } = body ?? {};

  if (typeof email !== "string" || typeof password !== "string") {
    return NextResponse.json({ error: "이메일과 비밀번호를 입력해주세요." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });

  // 계정 존재 여부가 응답으로 드러나지 않도록 동일한 메시지를 사용한다.
  const invalid = NextResponse.json(
    { error: "이메일 또는 비밀번호가 올바르지 않습니다." },
    { status: 401 }
  );

  if (!user) {
    // 존재하지 않는 계정에서도 해시 검증과 비슷한 시간을 소모해 타이밍 차이를 줄인다.
    await verifyPassword(password, "scrypt$65536$8$2$AAAAAAAAAAAAAAAAAAAAAA==$AAAA");
    return invalid;
  }

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return invalid;

  await createSession(user.id);

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
    },
  });
}
