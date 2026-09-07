import { NextRequest, NextResponse } from "next/server";
import { authErrorResponse, requireUser } from "@/lib/auth/guards";
import { getConsent, setConsent, CONSENT_SCOPES, type ConsentScope } from "@/lib/consent/consentService";

export const dynamic = "force-dynamic";

async function requireConsumer() {
  const user = await requireUser();
  if (user.role !== "CONSUMER" || !user.consumerId) {
    return { error: NextResponse.json({ error: "소비자 계정만 이용할 수 있습니다." }, { status: 403 }) };
  }
  return { consumerId: user.consumerId };
}

export async function GET() {
  try {
    const c = await requireConsumer();
    if ("error" in c) return c.error;
    return NextResponse.json(await getConsent(c.consumerId));
  } catch (err) {
    const res = authErrorResponse(err);
    if (res) return res;
    throw err;
  }
}

export async function POST(req: NextRequest) {
  try {
    const c = await requireConsumer();
    if ("error" in c) return c.error;
    const body = await req.json();
    const raw = (body?.scopes ?? {}) as Record<string, unknown>;
    const next: Partial<Record<ConsentScope, boolean>> = {};
    for (const scope of CONSENT_SCOPES) {
      if (typeof raw[scope] === "boolean") next[scope] = raw[scope] as boolean;
    }
    const result = await setConsent(c.consumerId, next);
    return NextResponse.json(result);
  } catch (err) {
    const res = authErrorResponse(err);
    if (res) return res;
    throw err;
  }
}
