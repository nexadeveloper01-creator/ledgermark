import { prisma } from "../src/lib/prisma";
import { mintLot, transferUid } from "../src/lib/ledger/ledgerService";

// 시연용 재고: 제품 UID 300개를 발급하고 수입→총판 단계까지 태워 둔다.
// 부팅 시 데모 LOT이 없을 때만 1회 실행(멱등). 이렇게 두면:
//  - 관세청: 수입 수량 300 반영
//  - 현장 단속: 모든 UID가 정품으로 스캔됨
//  - 소비자/소매: 총판 재고 상태라 판매·등록·교환 시연 가능
const DEMO_LOT_CODE = "PH-2026-DEMO";
const DEMO_QTY = 300;

async function orgByType(type: string, nameLike?: string) {
  const orgs = await prisma.organization.findMany({ where: { type: type as never } });
  if (nameLike) {
    const m = orgs.find((o) => o.name.includes(nameLike));
    if (m) return m;
  }
  return orgs[0] ?? null;
}

export async function ensureDemoStock() {
  const existing = await prisma.lot.findUnique({ where: { code: DEMO_LOT_CODE } });
  if (existing) {
    console.log(`[ensure-demo-stock] 데모 LOT(${DEMO_LOT_CODE}) 이미 존재 — 건너뜀`);
    return;
  }

  const producer = await orgByType("PRODUCER");
  const importer = await orgByType("IMPORTER");
  const distributor = await orgByType("DISTRIBUTOR");
  if (!producer || !importer || !distributor) {
    console.warn(
      `[ensure-demo-stock] 조직 미존재로 건너뜀: producer=${!!producer} importer=${!!importer} distributor=${!!distributor}`
    );
    return;
  }

  const { uidCodes } = await mintLot({
    code: DEMO_LOT_CODE,
    productName: "Series V · Graphite (Demo)",
    quantity: DEMO_QTY,
    producerOrgId: producer.id,
  });
  console.log(`[ensure-demo-stock] ${uidCodes.length}개 UID 발급 (LOT ${DEMO_LOT_CODE})`);

  // 수입(EXPORT) → 총판 배분(WHOLESALE)까지 진행. 개별 실패는 무시하고 계속.
  let advanced = 0;
  for (const code of uidCodes) {
    try {
      await transferUid(code, {
        txType: "EXPORT_TRANSFER",
        from: { type: "ORG", orgId: producer.id },
        to: { type: "ORG", orgId: importer.id },
      });
      await transferUid(code, {
        txType: "WHOLESALE_TRANSFER",
        from: { type: "ORG", orgId: importer.id },
        to: { type: "ORG", orgId: distributor.id },
      });
      advanced++;
    } catch (e) {
      // 상태 전이 실패(중복 등)는 시연에 치명적이지 않으므로 로그만 남긴다.
      console.warn(`[ensure-demo-stock] ${code} 전이 실패:`, (e as Error).message);
    }
  }
  console.log(`[ensure-demo-stock] 수입→총판 진행 ${advanced}/${uidCodes.length}. 예시 코드: ${uidCodes.slice(0, 3).join(", ")}`);
}
