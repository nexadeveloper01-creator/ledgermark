import { prisma } from "../src/lib/prisma";
import { mintLot, transferUid } from "../src/lib/ledger/ledgerService";
import { commitRequest, createRetailSaleRequest } from "../src/lib/requests/transferRequestService";

// 시연용 소매 판매 큐 채우기.
//
// 배경: ensure-demo-stock 의 300개 UID는 전부 "총판(DISTRIBUTOR)" 소유의 WHOLESALE 상태다.
// 그런데 소매점 직원(store@)의 이전 큐는 fromOrgId=자기 매장(RETAILER) 요청만 본다.
// 또한 WHOLESALE_TRANSFER 는 EXPORTED 상태에서만 가능하므로 총판→소매점 재이동이 불가능하다.
// 따라서 소매점 시연을 위해서는 (1) 소매점 소유의 판매 가능 재고와 (2) 대기 중 판매요청이
// 별도로 필요하다. 이 시드가 둘 다 멱등하게 보장한다:
//   - 소매점 재고 LOT(PH-2026-STORE) 40개를 생산→수입→소매점(WHOLESALE)까지 태워 둔다.
//   - 대기 중 RETAIL_SALE 요청을 최소 3건 유지한다(시연에서 커밋해도 재부팅 시 다시 채워짐).
const STORE_LOT_CODE = "PH-2026-STORE";
const STORE_QTY = 40;
const MIN_PENDING = 3;

// 시연 큐가 실제 필리핀 소비자처럼 보이도록 이름을 부여한다(계정 없는 Consumer 레코드).
const DEMO_BUYERS = ["Maria Santos", "Juan dela Cruz", "Andrea Reyes"];

async function orgByType(type: string) {
  const orgs = await prisma.organization.findMany({ where: { type: type as never } });
  return orgs[0] ?? null;
}

async function ensureStoreInventory(): Promise<void> {
  const existing = await prisma.lot.findUnique({ where: { code: STORE_LOT_CODE } });
  if (existing) {
    console.log(`[ensure-demo-requests] 소매 재고 LOT(${STORE_LOT_CODE}) 이미 존재 — 건너뜀`);
    return;
  }

  const producer = await orgByType("PRODUCER");
  const importer = await orgByType("IMPORTER");
  const retailer = await orgByType("RETAILER");
  if (!producer || !importer || !retailer) {
    console.warn(
      `[ensure-demo-requests] 조직 미존재로 재고 시드 건너뜀: producer=${!!producer} importer=${!!importer} retailer=${!!retailer}`
    );
    return;
  }

  const { uidCodes } = await mintLot({
    code: STORE_LOT_CODE,
    productName: "Series V · Sky Blue (Store Demo)",
    quantity: STORE_QTY,
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
      // 소매점 직원이 팔 수 있도록 소유권을 소매점(RETAILER)까지 이동한다.
      await transferUid(code, {
        txType: "WHOLESALE_TRANSFER",
        from: { type: "ORG", orgId: importer.id },
        to: { type: "ORG", orgId: retailer.id },
      });
      advanced++;
    } catch (e) {
      console.warn(`[ensure-demo-requests] ${code} 전이 실패:`, (e as Error).message);
    }
  }
  console.log(`[ensure-demo-requests] 소매 재고 ${advanced}/${uidCodes.length}개 준비 (LOT ${STORE_LOT_CODE})`);
}

async function ensureDemoBuyers(): Promise<string[]> {
  const ids: string[] = [];
  for (const name of DEMO_BUYERS) {
    const found = await prisma.consumer.findFirst({ where: { displayName: name } });
    if (found) {
      ids.push(found.id);
    } else {
      const c = await prisma.consumer.create({ data: { displayName: name, country: "PH" } });
      ids.push(c.id);
    }
  }
  return ids;
}

async function ensurePendingQueue(buyerIds: string[]): Promise<void> {
  const retailer = await orgByType("RETAILER");
  if (!retailer) return;

  const pending = await prisma.transferRequest.count({
    where: { type: "RETAIL_SALE", status: "PENDING", fromOrgId: retailer.id },
  });
  if (pending >= MIN_PENDING) {
    console.log(`[ensure-demo-requests] 대기 판매요청 ${pending}건 — 충분(건너뜀)`);
    return;
  }

  // 소매점 소유 + WHOLESALE + 대기요청 없는 UID를 찾는다.
  const candidates = await prisma.uid.findMany({
    where: {
      ownerOrgId: retailer.id,
      status: "WHOLESALE",
      requests: { none: { status: "PENDING" } },
    },
    take: MIN_PENDING - pending,
  });

  let created = 0;
  for (let i = 0; i < candidates.length; i++) {
    const uid = candidates[i]!;
    const consumerId = buyerIds[i % buyerIds.length]!;
    try {
      await createRetailSaleRequest({
        uidCode: uid.code,
        consumerId,
        ageVerified: true,
        requireVerifiedEmail: false,
      });
      created++;
    } catch (e) {
      console.warn(`[ensure-demo-requests] 요청 생성 실패(${uid.code}):`, (e as Error).message);
    }
  }
  console.log(`[ensure-demo-requests] 대기 판매요청 ${created}건 신규 생성 (기존 ${pending}건)`);
}

// 시연용 소비자 앱은 로그인 직후 "내 제품"에 등록된 기기가 보여야 한다(교환권·만료 시연).
// consumer@ledgermark.com 계정이 아직 아무 UID도 보유하지 않을 때만, 소매점 재고 2개를
// 실제 소매 판매 흐름(요청 생성 → 커밋)으로 태워 소유권을 넘긴다. 교환권 AVAILABLE 2건이
// 생긴다(하나는 교환 시연에 소진해도 하나는 남음).
async function ensureConsumerProducts(): Promise<void> {
  const account = await prisma.user.findUnique({ where: { email: "consumer@ledgermark.com" } });
  if (!account?.consumerId) {
    console.log("[ensure-demo-requests] consumer@ 계정/consumerId 없음 — 소비자 보유 시드 건너뜀");
    return;
  }
  const owned = await prisma.uid.count({ where: { ownerConsumerId: account.consumerId } });
  if (owned > 0) {
    console.log(`[ensure-demo-requests] consumer@ 이미 ${owned}개 보유 — 건너뜀`);
    return;
  }

  const retailer = await orgByType("RETAILER");
  if (!retailer) return;

  const candidates = await prisma.uid.findMany({
    where: {
      ownerOrgId: retailer.id,
      status: "WHOLESALE",
      requests: { none: { status: "PENDING" } },
    },
    take: 2,
  });

  let done = 0;
  for (const uid of candidates) {
    try {
      const req = await createRetailSaleRequest({
        uidCode: uid.code,
        consumerId: account.consumerId,
        ageVerified: true,
        requireVerifiedEmail: false,
      });
      await commitRequest(req.id);
      done++;
    } catch (e) {
      console.warn(`[ensure-demo-requests] 소비자 보유 시드 실패(${uid.code}):`, (e as Error).message);
    }
  }
  console.log(`[ensure-demo-requests] consumer@ 보유 제품 ${done}건 등록(교환권 AVAILABLE)`);
}

export async function ensureDemoRequests(): Promise<void> {
  await ensureStoreInventory();
  const buyerIds = await ensureDemoBuyers();
  await ensurePendingQueue(buyerIds);
  await ensureConsumerProducts();
}
