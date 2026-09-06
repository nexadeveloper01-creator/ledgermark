import { NextRequest, NextResponse } from "next/server";
import { recordAudit } from "@/lib/audit/log";
import { authErrorResponse, requireRole } from "@/lib/auth/guards";
import { consumeRateLimit, LOOKUP_PER_USER } from "@/lib/security/rateLimit";
import { prisma } from "@/lib/prisma";

// 중고거래 양수인 지정을 위한 단건 조회. 명부 전체를 노출하지 않기 위해
// 정확한 이메일이 일치할 때만 표시 이름과 식별자를 돌려준다.
export async function POST(req: NextRequest) {
  try {
    const user = await requireRole("CONSUMER");
    const body = await req.json();
    const email = typeof body?.email === "string" ? body.email.toLowerCase().trim() : "";

    if (!email) {
      return NextResponse.json({ error: "이메일을 입력해주세요." }, { status: 400 });
    }

    // 단건 조회를 반복하면 가입 이메일을 열거할 수 있으므로 계정별로 제한한다.
    const limit = await consumeRateLimit(`lookup:user:${user.id}`, LOOKUP_PER_USER);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "조회 시도가 너무 많습니다. 잠시 후 다시 시도해주세요." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } }
      );
    }

    await recordAudit({ action: "CONSUMER_LOOKUP", actor: user, req, detail: { email } });

    const target = await prisma.user.findUnique({
      where: { email },
      select: { role: true, consumerId: true, consumer: { select: { displayName: true } } },
    });

    if (!target || target.role !== "CONSUMER" || !target.consumerId) {
      return NextResponse.json({ error: "해당 이메일의 소비자 계정을 찾을 수 없습니다." }, { status: 404 });
    }
    if (target.consumerId === user.consumerId) {
      return NextResponse.json({ error: "본인에게는 양도할 수 없습니다." }, { status: 400 });
    }

    return NextResponse.json({
      consumer: { id: target.consumerId, displayName: target.consumer?.displayName ?? "소비자" },
    });
  } catch (err) {
    const authResponse = authErrorResponse(err);
    if (authResponse) return authResponse;
    throw err;
  }
}
