import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
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
  const body = await req.json();
  const { txType } = body ?? {};

  try {
    let input: TransitionInput;

    switch (txType) {
      case "EXPORT_TRANSFER":
      case "WHOLESALE_TRANSFER":
      case "RESALE_TRANSFER": {
        input = {
          txType,
          from: parseOwner(body.from, "from"),
          to: parseOwner(body.to, "to"),
        };
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
    return NextResponse.json({ uid: result.uid, newUid: result.newUid });
  } catch (err) {
    if (err instanceof UnsupportedCountryError || err instanceof LedgerError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    throw err;
  }
}
