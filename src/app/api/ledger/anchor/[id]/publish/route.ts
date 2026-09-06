import { NextRequest, NextResponse } from "next/server";
import { recordAudit } from "@/lib/audit/log";
import { authErrorResponse, requireRole } from "@/lib/auth/guards";
import { publishAnchorRecord } from "@/lib/ledger/ledgerService";
import { LedgerError } from "@/lib/ledger/stateMachine";

// 게시에 실패한 앵커의 재시도.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireRole("ADMIN");
    const anchor = await publishAnchorRecord(params.id);

    await recordAudit({
      action: "ANCHOR_RUN",
      actor: user,
      req,
      targetType: "Anchor",
      targetId: anchor.id,
      detail: {
        merkleRoot: anchor.merkleRoot,
        status: anchor.status,
        txHash: anchor.publicAnchorRef,
        retry: true,
      },
    });

    return NextResponse.json({ anchor: { ...anchor, blockNumber: anchor.blockNumber?.toString() ?? null } });
  } catch (err) {
    const authResponse = authErrorResponse(err);
    if (authResponse) return authResponse;
    if (err instanceof LedgerError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    throw err;
  }
}
