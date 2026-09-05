import { NextResponse } from "next/server";
import { LedgerError } from "@/lib/ledger/stateMachine";
import { commitRequest } from "@/lib/requests/transferRequestService";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const request = await commitRequest(params.id);
    return NextResponse.json({ request });
  } catch (err) {
    if (err instanceof LedgerError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    throw err;
  }
}
