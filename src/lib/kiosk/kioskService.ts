import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { getUidTrace, transferUid } from "@/lib/ledger/ledgerService";
import { LedgerError } from "@/lib/ledger/stateMachine";
import { awardPoints, POINTS } from "@/lib/points/pointsService";

// 무인 자판기(키오스크)용 공개 로직. 로그인 없이 "정품·판매가능" 여부만 최소 정보로 판정한다.
// 소유자 신원 등 민감정보는 노출하지 않으며, 원장을 변경하지 않는다(판매/등록은 소비자 앱에서 완료).

export type KioskVerdict = "SELLABLE" | "ALREADY_SOLD" | "RESOLD" | "NOT_LEDGER";

const VERDICT_LABEL: Record<KioskVerdict, string> = {
  SELLABLE: "정품 · 판매 가능",
  ALREADY_SOLD: "이미 판매/등록된 제품",
  RESOLD: "중고 거래 이력 제품",
  NOT_LEDGER: "원장 미존재 · 위조 의심",
};

export async function verifyForKiosk(code: string) {
  const uid = await getUidTrace(code);
  if (!uid) {
    return { found: false, code, verdict: "NOT_LEDGER" as KioskVerdict, label: VERDICT_LABEL.NOT_LEDGER };
  }
  let verdict: KioskVerdict;
  switch (uid.status) {
    case "WHOLESALE":
      verdict = "SELLABLE";
      break;
    case "RETAIL_SOLD":
    case "EXCHANGED":
      verdict = "ALREADY_SOLD";
      break;
    case "RESOLD":
      verdict = "RESOLD";
      break;
    default:
      // MINTED/EXPORTED = 통관·총판 배분 전 → 자판기 판매 대상 아님
      verdict = "NOT_LEDGER";
  }
  return {
    found: true,
    code: uid.code,
    productName: uid.lot.productName,
    lotCode: uid.lot.code,
    verdict,
    label: VERDICT_LABEL[verdict],
    sellable: verdict === "SELLABLE",
  };
}

function newClaimCode(): string {
  const b = randomBytes(6).toString("hex").toUpperCase();
  return `LMK-${b.slice(0, 4)}-${b.slice(4, 8)}`;
}

// 결제/배출 시점: 판매 가능한 UID에 대해 클레임을 발급한다(원장은 아직 변경하지 않음 —
// 소유권은 소비자가 앱에서 클레임 스캔할 때 이전된다). QR에는 이 claimCode를 담는다.
export async function dispenseSale(code: string): Promise<{ claimCode: string; productName: string }> {
  const uid = await prisma.uid.findUnique({ where: { code }, include: { lot: true } });
  if (!uid) throw new LedgerError("존재하지 않는 제품입니다.");
  if (uid.status !== "WHOLESALE" || !uid.ownerOrgId) {
    throw new LedgerError("판매 가능한 상태의 제품이 아닙니다.");
  }
  // 이미 대기 중인 클레임이 있으면 재사용(중복 배출 방지).
  const existing = await prisma.kioskSale.findFirst({ where: { uidId: uid.id, status: "PENDING" } });
  if (existing) return { claimCode: existing.claimCode, productName: uid.lot.productName };

  const sale = await prisma.kioskSale.create({
    data: { uidId: uid.id, claimCode: newClaimCode(), orgId: uid.ownerOrgId },
  });
  return { claimCode: sale.claimCode, productName: uid.lot.productName };
}

export type ClaimResult = { productName: string; uidCode: string; awarded: number; balance: number };

// 소비자 앱에서 자판기 클레임 스캔 → 소유권 자동 이전(RETAIL_SALE 커밋) + 등록 포인트 적립.
export async function claimSale(consumerId: string, claimCode: string): Promise<ClaimResult> {
  const code = claimCode.trim().toUpperCase();
  const sale = await prisma.kioskSale.findUnique({ where: { claimCode: code } });
  if (!sale) throw new LedgerError("유효하지 않은 클레임 코드입니다.");
  if (sale.status === "CLAIMED") throw new LedgerError("이미 등록(수령)된 제품입니다.");

  const uid = await prisma.uid.findUnique({ where: { id: sale.uidId }, include: { lot: true } });
  if (!uid) throw new LedgerError("제품을 찾을 수 없습니다.");
  if (uid.status !== "WHOLESALE" || !uid.ownerOrgId) {
    throw new LedgerError("이미 판매되었거나 이전할 수 없는 제품입니다.");
  }

  // 자판기는 연령 확인을 완료한 뒤 배출하므로 ageVerified=true로 자동 커밋한다.
  await transferUid(uid.code, {
    txType: "RETAIL_SALE",
    from: { type: "ORG", orgId: uid.ownerOrgId },
    to: { type: "CONSUMER", consumerId },
    ageVerified: true,
  });

  await prisma.kioskSale.update({
    where: { id: sale.id },
    data: { status: "CLAIMED", claimedConsumerId: consumerId, claimedAt: new Date() },
  });

  // 등록 포인트(정품 1대) — UID당 1회.
  let awarded = 0;
  let balance = 0;
  try {
    const res = await awardPoints({
      consumerId,
      reason: "DEVICE_REGISTRATION",
      amount: POINTS.DEVICE_REGISTRATION,
      dedupeKey: `reg:${uid.id}`,
      memo: `자판기 정품 등록: ${uid.code}`,
      refType: "Uid",
      refId: uid.id,
    });
    awarded = res.amount;
    balance = res.balance;
  } catch {
    // 적립 실패가 소유권 이전을 되돌리지 않는다.
  }

  return { productName: uid.lot.productName, uidCode: uid.code, awarded, balance };
}

// 자판기 재고(판매 가능한 WHOLESALE UID)에서 제품별 대표 1개씩 노출.
export async function kioskStock(limit = 4) {
  const uids = await prisma.uid.findMany({
    where: { status: "WHOLESALE" },
    take: 40,
    orderBy: { createdAt: "asc" },
    select: { code: true, lot: { select: { productName: true, code: true } } },
  });
  const seen = new Set<string>();
  const items: { code: string; productName: string; lotCode: string }[] = [];
  for (const u of uids) {
    if (seen.has(u.lot.productName)) continue;
    seen.add(u.lot.productName);
    items.push({ code: u.code, productName: u.lot.productName, lotCode: u.lot.code });
    if (items.length >= limit) break;
  }
  return items;
}
