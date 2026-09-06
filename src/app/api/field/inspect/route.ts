import { NextRequest, NextResponse } from "next/server";
import { recordAudit } from "@/lib/audit/log";
import { authErrorResponse, requireRole } from "@/lib/auth/guards";
import { inspectUid } from "@/lib/field/fieldService";
import { LedgerError } from "@/lib/ledger/stateMachine";

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole("FIELD_OFFICER", "ADMIN");
    const body = await req.json();
    const { uidCode, location } = body ?? {};

    if (!uidCode) {
      return NextResponse.json({ error: "uidCode는 필수입니다." }, { status: 400 });
    }

    // 담당관은 조서의 법적 근거가 되므로 요청 본문이 아니라 세션 신원에서 가져온다.
    const inspection = await inspectUid({
      uidCode,
      officerName: user.organizationName
        ? `${user.organizationName} ${user.displayName}`
        : user.displayName,
      location: location || "미지정",
    });
    await recordAudit({
      action: "FIELD_INSPECTION",
      actor: user,
      req,
      targetType: "FieldInspection",
      targetId: inspection.id,
      detail: { uidCode: inspection.uidCode, verdict: inspection.verdict.verdict, location },
    });

    return NextResponse.json({ inspection }, { status: 201 });
  } catch (err) {
    const authResponse = authErrorResponse(err);
    if (authResponse) return authResponse;
    if (err instanceof LedgerError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    throw err;
  }
}
