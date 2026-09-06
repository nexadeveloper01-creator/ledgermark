import { NextResponse } from "next/server";
import { authErrorResponse, requireUser } from "@/lib/auth/guards";
import { getUidTrace } from "@/lib/ledger/ledgerService";

export async function GET(_req: Request, { params }: { params: { code: string } }) {
  try {
    const user = await requireUser();
    const uid = await getUidTrace(params.code);
    if (!uid) {
      return NextResponse.json({ error: "UID를 찾을 수 없습니다." }, { status: 404 });
    }

    // 소비자에게는 정품 확인에 필요한 정보만 노출한다 — 이전 소유자의 신원이
    // 스캔만으로 드러나면 안 되므로 소유자 식별자와 상대방 정보를 제거한다.
    if (user.role === "CONSUMER") {
      return NextResponse.json({
        uid: {
          code: uid.code,
          status: uid.status,
          voucherState: uid.ownerConsumerId === user.consumerId ? uid.voucherState : null,
          lot: { code: uid.lot.code, productName: uid.lot.productName },
          ownedByMe: uid.ownerConsumerId === user.consumerId,
          transactions: uid.transactions.map((tx) => ({
            id: tx.id,
            sequence: tx.sequence,
            txType: tx.txType,
            createdAt: tx.createdAt,
          })),
        },
      });
    }

    return NextResponse.json({ uid });
  } catch (err) {
    const authResponse = authErrorResponse(err);
    if (authResponse) return authResponse;
    throw err;
  }
}
