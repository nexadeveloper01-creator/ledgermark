import { NextRequest, NextResponse } from "next/server";
import { recordAudit } from "@/lib/audit/log";
import { authErrorResponse, requireRole } from "@/lib/auth/guards";
import { runAnchorCycle } from "@/lib/ledger/ledgerService";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireRole("GOV_INSPECTOR", "ADMIN");
    const anchors = await prisma.anchor.findMany({ orderBy: { toSequence: "desc" }, take: 20 });
    return NextResponse.json({ anchors });
  } catch (err) {
    const authResponse = authErrorResponse(err);
    if (authResponse) return authResponse;
    throw err;
  }
}

export async function POST(req: NextRequest) {
  try {
    // 앵커링은 원장 운영 주체(블록체인 신뢰 레이어)의 작업이다.
    const user = await requireRole("ADMIN");
    const anchor = await runAnchorCycle();
    if (!anchor) {
      return NextResponse.json({ message: "앵커링할 신규 트랜잭션이 없습니다." }, { status: 200 });
    }
    await recordAudit({
      action: "ANCHOR_RUN",
      actor: user,
      req,
      targetType: "Anchor",
      targetId: anchor.id,
      detail: { merkleRoot: anchor.merkleRoot, txCount: anchor.txCount },
    });

    return NextResponse.json({ anchor }, { status: 201 });
  } catch (err) {
    const authResponse = authErrorResponse(err);
    if (authResponse) return authResponse;
    throw err;
  }
}
