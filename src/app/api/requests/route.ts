import { NextRequest, NextResponse } from "next/server";
import { authErrorResponse, requireUser } from "@/lib/auth/guards";
import { LedgerError } from "@/lib/ledger/stateMachine";
import {
  createExchangeRequest,
  createRetailSaleRequest,
  createWholesaleRequest,
} from "@/lib/requests/transferRequestService";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const status = req.nextUrl.searchParams.get("status");

    // 매장 직원은 자기 매장이 보유한 UID의 요청만 본다. 교환 요청은 소비자가
    // 처리 매장을 지정하지 않으므로(현장 AS 데스크에서 접수) 매장 공통으로 노출한다.
    let scope = {};
    if (user.role === "CONSUMER") {
      scope = { requestedConsumerId: user.consumerId };
    } else if (user.role === "PARTNER_STAFF") {
      scope = {
        OR: [{ fromOrgId: user.organizationId }, { type: "EXCHANGE_TRANSFER" as const }],
      };
    }

    const requests = await prisma.transferRequest.findMany({
      where: {
        ...scope,
        ...(status ? { status: status as "PENDING" | "COMMITTED" | "BLOCKED" | "REJECTED" } : {}),
      },
      orderBy: { createdAt: "desc" },
      include: {
        uid: {
          select: {
            code: true,
            status: true,
            voucherState: true,
            lot: { select: { code: true, productName: true } },
          },
        },
        requestedConsumer: { select: { displayName: true } },
        fromOrg: { select: { name: true } },
        toOrg: { select: { name: true } },
      },
    });

    return NextResponse.json({ requests });
  } catch (err) {
    const authResponse = authErrorResponse(err);
    if (authResponse) return authResponse;
    throw err;
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const { type } = body ?? {};

    if (type === "RETAIL_SALE" || type === "EXCHANGE_TRANSFER") {
      if (user.role !== "CONSUMER" || !user.consumerId) {
        return NextResponse.json(
          { error: "소비자 계정만 등록·교환을 신청할 수 있습니다." },
          { status: 403 }
        );
      }

      // 요청 본문의 consumerId는 신뢰하지 않고 세션 신원을 사용한다.
      const request =
        type === "RETAIL_SALE"
          ? await createRetailSaleRequest({
              uidCode: body.uidCode,
              consumerId: user.consumerId,
              ageVerified: body.ageVerified === true,
            })
          : await createExchangeRequest({
              uidCode: body.uidCode,
              consumerId: user.consumerId,
            });

      return NextResponse.json({ request }, { status: 201 });
    }

    if (type === "WHOLESALE_TRANSFER") {
      if (user.role !== "PARTNER_STAFF" && user.role !== "ADMIN") {
        return NextResponse.json({ error: "총판 배분 권한이 없습니다." }, { status: 403 });
      }
      const request = await createWholesaleRequest({
        uidCode: body.uidCode,
        fromOrgId: user.role === "ADMIN" ? body.fromOrgId : user.organizationId!,
        toOrgId: body.toOrgId,
      });
      return NextResponse.json({ request }, { status: 201 });
    }

    return NextResponse.json({ error: `지원하지 않는 type: ${type}` }, { status: 400 });
  } catch (err) {
    const authResponse = authErrorResponse(err);
    if (authResponse) return authResponse;
    if (err instanceof LedgerError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    throw err;
  }
}
