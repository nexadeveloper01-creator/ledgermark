import { NextRequest, NextResponse } from "next/server";
import { recordAudit } from "@/lib/audit/log";
import { assertActsForOrg, authErrorResponse, requireRole } from "@/lib/auth/guards";
import { LedgerError } from "@/lib/ledger/stateMachine";
import { commitRequest } from "@/lib/requests/transferRequestService";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireRole("PARTNER_STAFF", "ADMIN");

    const request = await prisma.transferRequest.findUnique({
      where: { id: params.id },
      include: { uid: true },
    });
    if (!request) {
      return NextResponse.json({ error: "요청을 찾을 수 없습니다." }, { status: 404 });
    }

    // 커밋은 UID를 실제로 보유한 조직만 할 수 있다. 교환 요청은 소비자가 보유한
    // UID를 대상으로 하므로 조직 보유 검사가 성립하지 않아 매장 직원에게 허용한다.
    if (request.uid.ownerType === "ORG") {
      assertActsForOrg(user, request.uid.ownerOrgId);
    }

    const committed = await commitRequest(params.id);

    await recordAudit({
      action: "REQUEST_COMMITTED",
      actor: user,
      req,
      targetType: "TransferRequest",
      targetId: committed.id,
      detail: { uidCode: committed.uid.code, type: committed.type },
    });

    return NextResponse.json({ request: committed });
  } catch (err) {
    const authResponse = authErrorResponse(err);
    if (authResponse) return authResponse;
    if (err instanceof LedgerError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    throw err;
  }
}
