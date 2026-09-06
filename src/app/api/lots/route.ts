import { NextRequest, NextResponse } from "next/server";
import { authErrorResponse, requireRole } from "@/lib/auth/guards";
import { mintLot } from "@/lib/ledger/ledgerService";
import { LedgerError } from "@/lib/ledger/stateMachine";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireRole("ADMIN", "GOV_INSPECTOR");
    const lots = await prisma.lot.findMany({
      orderBy: { producedAt: "desc" },
      include: { producer: true, _count: { select: { uids: true } } },
    });
    return NextResponse.json({ lots });
  } catch (err) {
    const authResponse = authErrorResponse(err);
    if (authResponse) return authResponse;
    throw err;
  }
}

export async function POST(req: NextRequest) {
  try {
    // UID 최초 발급(MINT)은 원장 운영 주체만 수행한다.
    await requireRole("ADMIN");

    const body = await req.json();
    const { code, productName, quantity, producerOrgId } = body ?? {};

    if (!code || !productName || !quantity || !producerOrgId) {
      return NextResponse.json(
        { error: "code, productName, quantity, producerOrgId는 필수입니다." },
        { status: 400 }
      );
    }

    const result = await mintLot({ code, productName, quantity: Number(quantity), producerOrgId });
    return NextResponse.json(
      {
        lotId: result.lot.id,
        uidCount: result.uidCodes.length,
        sampleUids: result.uidCodes.slice(0, 5),
      },
      { status: 201 }
    );
  } catch (err) {
    const authResponse = authErrorResponse(err);
    if (authResponse) return authResponse;
    if (err instanceof LedgerError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    throw err;
  }
}
