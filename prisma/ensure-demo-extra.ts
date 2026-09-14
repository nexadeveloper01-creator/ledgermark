import { prisma } from "../src/lib/prisma";
import { mintLot, transferUid } from "../src/lib/ledger/ledgerService";

// 실제 시연 대비 여유 재고 100개.
//
// 시연 중 즉석 스캔·판매를 넉넉히 할 수 있도록 정품 UID 100개를 추가로 발급하고
// 소매점(RETAILER) 소유의 WHOLESALE 상태까지 태워 둔다. 이 상태면:
//  - 현장 단속/소비자 앱: 원장에 있으므로 전부 "정품"으로 스캔됨
//  - 소매점: 소비자 등록 시 store@ 큐(fromOrg=매장)에서 바로 판매 인증(커밋) 가능
// 부팅 시 LOT이 없을 때만 1회 실행(멱등).
const EXTRA_LOT_CODE = "PH-2026-LIVE";
const EXTRA_QTY = 100;

async function orgByType(type: string) {
  const orgs = await prisma.organization.findMany({ where: { type: type as never } });
  return orgs[0] ?? null;
}

export async function ensureDemoExtra(): Promise<void> {
  const existing = await prisma.lot.findUnique({ where: { code: EXTRA_LOT_CODE } });
  if (existing) {
    console.log(`[ensure-demo-extra] 여유 재고 LOT(${EXTRA_LOT_CODE}) 이미 존재 — 건너뜀`);
    return;
  }

  const producer = await orgByType("PRODUCER");
  const importer = await orgByType("IMPORTER");
  const retailer = await orgByType("RETAILER");
  if (!producer || !importer || !retailer) {
    console.warn(
      `[ensure-demo-extra] 조직 미존재로 건너뜀: producer=${!!producer} importer=${!!importer} retailer=${!!retailer}`
    );
    return;
  }

  const { uidCodes } = await mintLot({
    code: EXTRA_LOT_CODE,
    productName: "Series V · Onyx (Live Demo)",
    quantity: EXTRA_QTY,
    producerOrgId: producer.id,
  });

  let advanced = 0;
  for (const code of uidCodes) {
    try {
      await transferUid(code, {
        txType: "EXPORT_TRANSFER",
        from: { type: "ORG", orgId: producer.id },
        to: { type: "ORG", orgId: importer.id },
      });
      // 소매점에서 팔 수 있도록 소유권을 소매점(RETAILER)까지 이동한다.
      await transferUid(code, {
        txType: "WHOLESALE_TRANSFER",
        from: { type: "ORG", orgId: importer.id },
        to: { type: "ORG", orgId: retailer.id },
      });
      advanced++;
    } catch (e) {
      console.warn(`[ensure-demo-extra] ${code} 전이 실패:`, (e as Error).message);
    }
  }
  console.log(
    `[ensure-demo-extra] 여유 재고 ${advanced}/${uidCodes.length}개 준비 (LOT ${EXTRA_LOT_CODE}, 정품·소매 WHOLESALE). 예시: ${uidCodes.slice(0, 3).join(", ")}`
  );
}
