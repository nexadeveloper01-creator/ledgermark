import { NextRequest, NextResponse } from "next/server";
import { inspectUid } from "@/lib/field/fieldService";
import { LedgerError } from "@/lib/ledger/stateMachine";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { uidCode, officerName, location } = body ?? {};

  if (!uidCode) {
    return NextResponse.json({ error: "uidCode는 필수입니다." }, { status: 400 });
  }

  try {
    const inspection = await inspectUid({
      uidCode,
      officerName: officerName || "미지정",
      location: location || "미지정",
    });
    return NextResponse.json({ inspection }, { status: 201 });
  } catch (err) {
    if (err instanceof LedgerError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    throw err;
  }
}
