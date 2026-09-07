import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { authErrorResponse, requireUser } from "@/lib/auth/guards";
import { recordAudit } from "@/lib/audit/log";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/prisma";

// 인앱 계정 삭제(구글플레이/애플 요구사항). 개인정보를 제거하고 로그인을 차단한다.
// 허가형 원장 기록은 무결성상 삭제하지 않고 소유자 표시를 익명화한다(개인정보 처리방침에 고지).
export async function DELETE(req: NextRequest) {
  try {
    const user = await requireUser();
    if (user.role !== "CONSUMER" || !user.consumerId) {
      return NextResponse.json({ error: "소비자 계정만 삭제할 수 있습니다." }, { status: 403 });
    }
    const body = await req.json().catch(() => ({}));
    const password = typeof body?.password === "string" ? body.password : "";

    const account = await prisma.user.findUnique({ where: { id: user.id } });
    if (!account) return NextResponse.json({ error: "계정을 찾을 수 없습니다." }, { status: 404 });

    const ok = await verifyPassword(password, account.passwordHash);
    if (!ok) return NextResponse.json({ error: "비밀번호가 올바르지 않습니다." }, { status: 422 });

    const consumerId = user.consumerId;
    const scrubbedEmail = `deleted+${account.id}@deleted.local`;
    const scrambled = await hashPassword(randomBytes(24).toString("hex"));

    await prisma.$transaction(async (tx) => {
      // 세션·일회용 토큰·동의 이력 제거
      await tx.session.deleteMany({ where: { userId: account.id } });
      await tx.verificationToken.deleteMany({ where: { userId: account.id } });
      await tx.consentEvent.deleteMany({ where: { consumerId } });
      await tx.consentRecord.deleteMany({ where: { consumerId } });

      // 개인정보 익명화 + 로그인 차단
      await tx.user.update({
        where: { id: account.id },
        data: {
          email: scrubbedEmail,
          displayName: "삭제된 사용자",
          passwordHash: scrambled,
          emailVerifiedAt: null,
          disabledAt: new Date(),
        },
      });
      await tx.consumer.update({
        where: { id: consumerId },
        data: { displayName: "삭제된 사용자", country: "XX" },
      });
    });

    await recordAudit({
      action: "USER_DISABLED",
      actorEmail: scrubbedEmail,
      req,
      targetType: "User",
      targetId: account.id,
      detail: { selfDelete: true },
    });

    return NextResponse.json({ deleted: true });
  } catch (err) {
    const res = authErrorResponse(err);
    if (res) return res;
    throw err;
  }
}
