import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { assertIsSelf, authErrorResponse, requireUser } from "@/lib/auth/guards";
import { getAgeVerificationProvider } from "@/lib/avp/router";
import { UnsupportedCountryError } from "@/lib/avp/types";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    // 연령인증은 본인만 수행할 수 있다 — 타인 명의 인증을 원천 차단한다.
    const user = await requireUser();
    assertIsSelf(user, params.id);

    const body = await req.json();
    const { country, input } = body ?? {};

    if (!country || !input) {
      return NextResponse.json({ error: "country, input은 필수입니다." }, { status: 400 });
    }

    const provider = getAgeVerificationProvider(country);
    const result = await provider.verify(input);

    // 원본 신분정보는 저장하지 않고 검증 결과 크리덴셜만 원장 측에 남긴다 (기획서 3.3).
    const credentialHash = createHash("sha256").update(JSON.stringify(input)).digest("hex");

    const record = await prisma.ageVerification.create({
      data: {
        consumerId: params.id,
        country,
        method: result.method,
        verified: result.verified,
        credentialHash,
      },
      select: { id: true, method: true, verified: true, verifiedAt: true, country: true },
    });

    return NextResponse.json({ verification: record, reasons: result.reasons });
  } catch (err) {
    const authResponse = authErrorResponse(err);
    if (authResponse) return authResponse;
    if (err instanceof UnsupportedCountryError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    throw err;
  }
}
