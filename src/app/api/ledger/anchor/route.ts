import { NextResponse } from "next/server";
import { runAnchorCycle } from "@/lib/ledger/ledgerService";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const anchors = await prisma.anchor.findMany({ orderBy: { toSequence: "desc" }, take: 20 });
  return NextResponse.json({ anchors });
}

export async function POST() {
  const anchor = await runAnchorCycle();
  if (!anchor) {
    return NextResponse.json({ message: "앵커링할 신규 트랜잭션이 없습니다." }, { status: 200 });
  }
  return NextResponse.json({ anchor }, { status: 201 });
}
