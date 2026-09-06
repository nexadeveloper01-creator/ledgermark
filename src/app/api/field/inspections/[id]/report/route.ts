import { NextRequest, NextResponse } from "next/server";
import { recordAudit } from "@/lib/audit/log";
import { authErrorResponse, requireRole } from "@/lib/auth/guards";
import { issueReport } from "@/lib/field/fieldService";
import { LedgerError } from "@/lib/ledger/stateMachine";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireRole("FIELD_OFFICER", "ADMIN");
    const inspection = await issueReport(params.id);
    await recordAudit({
      action: "FIELD_REPORT_ISSUED",
      actor: user,
      req,
      targetType: "FieldInspection",
      targetId: inspection.id,
      detail: {
        uidCode: inspection.uidCode,
        reportNumber: inspection.reportNumber,
        verdict: inspection.verdict,
        ledgerSnapshot: inspection.ledgerSnapshot,
      },
    });

    return NextResponse.json({ inspection });
  } catch (err) {
    const authResponse = authErrorResponse(err);
    if (authResponse) return authResponse;
    if (err instanceof LedgerError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    throw err;
  }
}
