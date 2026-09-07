import { prisma } from "@/lib/prisma";
import { getUidTrace } from "@/lib/ledger/ledgerService";

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
