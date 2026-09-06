import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { recordAudit } from "@/lib/audit/log";
import { assertActsForOrg, authErrorResponse, requireUser } from "@/lib/auth/guards";
import { getAgeVerificationProvider } from "@/lib/avp/router";
import { UnsupportedCountryError } from "@/lib/avp/types";
import { transferUid } from "@/lib/ledger/ledgerService";
import { LedgerError, type OwnerRef, type TransitionInput } from "@/lib/ledger/stateMachine";
import { prisma } from "@/lib/prisma";

function parseOwner(raw: unknown, field: string): OwnerRef {
  const r = raw as { type?: string; orgId?: string; consumerId?: string } | null | undefined;
  if (!r || (r.type !== "ORG" && r.type !== "CONSUMER")) {
    throw new LedgerError(
      `${field}는 {type:'ORG',orgId} 또는 {type:'CONSUMER',consumerId} 형식이어야 합니다.`
    );
  }
  if (r.type === "ORG") {
    if (!r.orgId) throw new LedgerError(`${field}.orgId가 필요합니다.`);
    return { type: "ORG", orgId: r.orgId };
  }
  if (!r.consumerId) throw new LedgerError(`${field}.consumerId가 필요합니다.`);
  return { type: "CONSUMER", consumerId: r.consumerId };
}

export async function POST(req: NextRequest, { params }: { params: { code: string } }) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const { txType } = body ?? {};

    const uid = await prisma.uid.findUnique({ where: { code: params.code } });
    if (!uid) {
      return NextResponse.json({ error: "UID를 찾을 수 없습니다." }, { status: 404 });
    }

    // 현재 소유자를 대신해 행동할 권한이 있는지 먼저 확인한다 —
    // 조직 보유 UID는 해당 조직 직원만, 소비자 보유 UID는 본인만 이전할 수 있다.
    if (uid.ownerType === "ORG") {
      if (user.role !== "PARTNER_STAFF" && user.role !== "ADMIN") {
        return NextResponse.json(
          { error: "매장·총판 직원만 처리할 수 있는 트랜잭션입니다." },
          { status: 403 }
        );
      }
      assertActsForOrg(user, uid.ownerOrgId);
    } else {
      if (user.role !== "CONSUMER" || user.consumerId !== uid.ownerConsumerId) {
        return NextResponse.json(
          { error: "본인이 보유한 제품만 이전할 수 있습니다." },
          { status: 403 }
        );
      }
    }

    let input: TransitionInput;

    switch (txType) {
      case "EXPORT_TRANSFER":
      case "WHOLESALE_TRANSFER": {
        input = {
          txType,
          from: parseOwner(body.from, "from"),
          to: parseOwner(body.to, "to"),
        };
        break;
      }

      case "RESALE_TRANSFER": {
        const from = parseOwner(body.from, "from");
        // 양수인은 조작 가능한 입력이므로, 본인이 양도인인지 다시 확인한다.
        if (from.type !== "CONSUMER" || from.consumerId !== user.consumerId) {
          return NextResponse.json({ error: "본인 명의로만 양도할 수 있습니다." }, { status: 403 });
        }
        input = { txType, from, to: parseOwner(body.to, "to") };
        break;
      }

      case "EXCHANGE_TRANSFER": {
        input = { txType, from: parseOwner(body.from, "from") };
        break;
      }

      case "RETAIL_SALE": {
        const from = parseOwner(body.from, "from");
        const to = parseOwner(body.to, "to");
        if (to.type !== "CONSUMER") {
          return NextResponse.json(
            { error: "RETAIL_SALE의 to는 CONSUMER여야 합니다." },
            { status: 400 }
          );
        }

        let ageVerified = false;

        if (body.ageVerification?.country && body.ageVerification?.input) {
          const provider = getAgeVerificationProvider(body.ageVerification.country);
          const result = await provider.verify(body.ageVerification.input);
          ageVerified = result.verified;

          // 원본 신분정보는 저장하지 않고 해시(크리덴셜)만 남긴다 (기획서 3.3).
          const credentialHash = createHash("sha256")
            .update(JSON.stringify(body.ageVerification.input))
            .digest("hex");

          await prisma.ageVerification.create({
            data: {
              consumerId: to.consumerId,
              country: body.ageVerification.country,
              method: result.method,
              verified: result.verified,
              credentialHash,
            },
          });
        } else if (typeof body.ageVerified === "boolean") {
          ageVerified = body.ageVerified;
        }

        input = { txType, from, to, ageVerified };
        break;
      }

      default:
        return NextResponse.json({ error: `지원하지 않는 txType: ${txType}` }, { status: 400 });
    }

    const result = await transferUid(params.code, input, body.metadata);

    await recordAudit({
      action: "UID_TRANSFERRED",
      actor: user,
      req,
      targetType: "Uid",
      targetId: result.uid.id,
      detail: {
        uidCode: result.uid.code,
        txType,
        newStatus: result.uid.status,
        issuedUidCode: result.newUid?.code ?? null,
      },
    });

    return NextResponse.json({ uid: result.uid, newUid: result.newUid });
  } catch (err) {
    const authResponse = authErrorResponse(err);
    if (authResponse) return authResponse;
    if (err instanceof UnsupportedCountryError || err instanceof LedgerError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    throw err;
  }
}
