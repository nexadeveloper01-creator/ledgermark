import { NextResponse } from "next/server";
import { issueReport } from "@/lib/field/fieldService";
import { LedgerError } from "@/lib/ledger/stateMachine";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const inspection = await issueReport(params.id);
    return NextResponse.json({ inspection });
  } catch (err) {
    if (err instanceof LedgerError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    throw err;
  }
}
