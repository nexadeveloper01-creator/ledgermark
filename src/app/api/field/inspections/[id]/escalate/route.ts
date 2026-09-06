import { NextRequest, NextResponse } from "next/server";
import { recordAudit } from "@/lib/audit/log";
import { authErrorResponse, requireRole } from "@/lib/auth/guards";
import { escalateToConsole } from "@/lib/field/fieldService";
import { LedgerError } from "@/lib/ledger/stateMachine";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireRole("FIELD_OFFICER", "ADMIN");
    const alert = await escalateToConsole(params.id);
    await recordAudit({
      action: "ALERT_CREATED",
      actor: user,
      req,
      targetType: "SmuggleAlert",
      targetId: alert.id,
      detail: { uidCode: alert.uidCode, source: "FIELD_ESCALATION" },
    });

    return NextResponse.json({ alert });
  } catch (err) {
    const authResponse = authErrorResponse(err);
    if (authResponse) return authResponse;
    if (err instanceof LedgerError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    throw err;
  }
}
