import { NextRequest, NextResponse } from "next/server";
import { LedgerError } from "@/lib/ledger/stateMachine";
import {
  createExchangeRequest,
  createRetailSaleRequest,
  createWholesaleRequest,
} from "@/lib/requests/transferRequestService";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get("status");
  const consumerId = req.nextUrl.searchParams.get("consumerId");

  const requests = await prisma.transferRequest.findMany({
    where: {
      ...(status ? { status: status as "PENDING" | "COMMITTED" | "BLOCKED" | "REJECTED" } : {}),
      ...(consumerId ? { requestedConsumerId: consumerId } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      uid: { select: { code: true, status: true, voucherState: true, lot: { select: { code: true, productName: true } } } },
      requestedConsumer: { select: { displayName: true } },
      fromOrg: { select: { name: true } },
      toOrg: { select: { name: true } },
    },
  });

  return NextResponse.json({ requests });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { type } = body ?? {};

  try {
    if (type === "RETAIL_SALE") {
      const request = await createRetailSaleRequest({
        uidCode: body.uidCode,
        consumerId: body.consumerId,
        ageVerified: body.ageVerified === true,
      });
      return NextResponse.json({ request }, { status: 201 });
    }

    if (type === "EXCHANGE_TRANSFER") {
      const request = await createExchangeRequest({
        uidCode: body.uidCode,
        consumerId: body.consumerId,
      });
      return NextResponse.json({ request }, { status: 201 });
    }

    if (type === "WHOLESALE_TRANSFER") {
      const request = await createWholesaleRequest({
        uidCode: body.uidCode,
        fromOrgId: body.fromOrgId,
        toOrgId: body.toOrgId,
      });
      return NextResponse.json({ request }, { status: 201 });
    }

    return NextResponse.json({ error: `지원하지 않는 type: ${type}` }, { status: 400 });
  } catch (err) {
    if (err instanceof LedgerError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    throw err;
  }
}
