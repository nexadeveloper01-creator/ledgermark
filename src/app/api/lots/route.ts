import { NextRequest, NextResponse } from "next/server";
import { mintLot } from "@/lib/ledger/ledgerService";
import { LedgerError } from "@/lib/ledger/stateMachine";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const lots = await prisma.lot.findMany({
    orderBy: { producedAt: "desc" },
    include: { producer: true, _count: { select: { uids: true } } },
  });
  return NextResponse.json({ lots });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { code, productName, quantity, producerOrgId } = body ?? {};

  if (!code || !productName || !quantity || !producerOrgId) {
    return NextResponse.json(
      { error: "code, productName, quantity, producerOrgId는 필수입니다." },
      { status: 400 }
    );
  }

  try {
    const result = await mintLot({ code, productName, quantity: Number(quantity), producerOrgId });
    return NextResponse.json(
      { lotId: result.lot.id, uidCount: result.uidCodes.length, sampleUids: result.uidCodes.slice(0, 5) },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof LedgerError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    throw err;
  }
}
