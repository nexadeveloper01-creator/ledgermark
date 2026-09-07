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
  // 이미 배출(예약)됐거나 판매된 UID는 판매 불가로 본다.
  const reserved = await prisma.kioskSale.count({ where: { uidId: uid.id } });
  let verdict: KioskVerdict;
  switch (uid.status) {
    case "WHOLESALE":
      verdict = reserved > 0 ? "ALREADY_SOLD" : "SELLABLE";
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

// 결제/배출 시점: 재고 UID를 예약(소진) 처리하고 클레임을 발급한다. 원장 소유권은 아직
// 바꾸지 않고(소비자가 앱에서 클레임 스캔 시 이전), KioskSale 예약으로 재고에서 즉시 제외한다.
// 선택한 UID가 이미 예약/판매됐으면 같은 제품(LOT)의 다른 가용 UID로 대체 배출한다.
export async function dispenseSale(code: string): Promise<{ claimCode: string; productName: string }> {
  const uid = await prisma.uid.findUnique({ where: { code }, include: { lot: true, kioskSales: true } });
  if (!uid) throw new LedgerError("존재하지 않는 제품입니다.");

  // 이 UID에 이미 대기 클레임이 있으면 같은 세션의 재배출로 보고 재사용(중복 발급 방지).
  const pending = uid.kioskSales.find((s) => s.status === "PENDING");
  if (pending) return { claimCode: pending.claimCode, productName: uid.lot.productName };

  // 대상 UID가 판매 불가(예약/판매됨/상태부적합)면 같은 LOT의 가용 UID로 대체.
  let target = uid;
  const unavailable = uid.kioskSales.length > 0 || uid.status !== "WHOLESALE" || !uid.ownerOrgId;
  if (unavailable) {
    const alt = await prisma.uid.findFirst({
      where: { lotId: uid.lotId, status: "WHOLESALE", ownerOrgId: { not: null }, kioskSales: { none: {} } },
      include: { lot: true, kioskSales: true },
    });
    if (!alt) throw new LedgerError("해당 제품의 재고가 소진되었습니다.");
    target = alt;
  }

  const sale = await prisma.kioskSale.create({
    data: { uidId: target.id, claimCode: newClaimCode(), orgId: target.ownerOrgId },
  });
  return { claimCode: sale.claimCode, productName: target.lot.productName };
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

// 자판기 재고 — 취급 제품(현재 WHOLESALE이거나 자판기 판매이력이 있는 제품)을 모두 노출하고,
// 제품별 가용 수량(available)과 품절 여부(soldOut)를 함께 반환한다. 품절 제품도 숨기지 않는다.
export type StockItem = {
  productName: string;
  lotCode: string;
  code: string | null; // 판매 가능한 대표 UID (품절이면 null)
  available: number;
  soldOut: boolean;
};

export async function kioskStock(limit = 6): Promise<StockItem[]> {
  const uids = await prisma.uid.findMany({
    where: { OR: [{ status: "WHOLESALE" }, { kioskSales: { some: {} } }] },
    orderBy: { createdAt: "asc" },
    select: {
      code: true,
      status: true,
      ownerOrgId: true,
      lot: { select: { productName: true, code: true } },
      kioskSales: { select: { id: true } },
    },
  });
  const map = new Map<string, StockItem>();
  for (const u of uids) {
    const key = u.lot.productName;
    const sellable = u.status === "WHOLESALE" && !!u.ownerOrgId && u.kioskSales.length === 0;
    const cur =
      map.get(key) ?? { productName: key, lotCode: u.lot.code, code: null, available: 0, soldOut: true };
    if (sellable) {
      cur.available += 1;
      cur.soldOut = false;
      if (!cur.code) cur.code = u.code;
    }
    map.set(key, cur);
  }
  return [...map.values()].slice(0, limit);
}
