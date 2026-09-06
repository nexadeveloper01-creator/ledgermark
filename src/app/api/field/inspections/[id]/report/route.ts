import { NextResponse } from "next/server";
import { authErrorResponse, requireRole } from "@/lib/auth/guards";
import { issueReport } from "@/lib/field/fieldService";
import { LedgerError } from "@/lib/ledger/stateMachine";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    await requireRole("FIELD_OFFICER", "ADMIN");
    const inspection = await issueReport(params.id);
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
