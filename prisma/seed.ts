import { prisma } from "../src/lib/prisma";
import { hashPassword } from "../src/lib/auth/password";
import { mintLot, transferUid } from "../src/lib/ledger/ledgerService";
import { pathToFileURL } from "url";
import { createRetailSaleRequest } from "../src/lib/requests/transferRequestService";

const DEMO_PASSWORD = "ledgermark1234";
// 시드 계정은 메일 인증을 거칠 수 없으므로 인증 완료 상태로 만든다.
const VERIFIED_AT = new Date();

export async function seed() {
  console.log("Seeding LEDGERMARK demo data...");

  const producer = await prisma.organization.create({
    data: { name: "코니아랩 생산법인", type: "PRODUCER", country: "CN" },
  });
  const importer = await prisma.organization.create({
    data: { name: "수입사 PH", type: "IMPORTER", country: "PH" },
  });
  const distributor = await prisma.organization.create({
    data: { name: "메트로마닐라 총판", type: "DISTRIBUTOR", country: "PH" },
  });
  const retailer = await prisma.organization.create({
    data: { name: "마카티 지점 MM-014", type: "RETAILER", country: "PH" },
  });
  const government = await prisma.organization.create({
    data: { name: "필리핀 관세청 (BOC)", type: "GOVERNMENT", country: "PH" },
  });
  const police = await prisma.organization.create({
    data: { name: "PNP 단속반", type: "GOVERNMENT", country: "PH" },
  });
  const ledgerOperator = await prisma.organization.create({
    data: { name: "그룹 원장 운영", type: "LEDGER_OPERATOR", country: "KR" },
  });

  const passwordHash = await hashPassword(DEMO_PASSWORD);

  await prisma.user.createMany({
    data: [
      {
        email: "admin@ledgermark.test",
        passwordHash,
        emailVerifiedAt: VERIFIED_AT,
        displayName: "운영자",
        role: "ADMIN",
        organizationId: ledgerOperator.id,
      },
      {
        // 개발자 모드 진입 계정. DEVELOPER_EMAILS에 이 이메일이 있어야 /dev로 진입한다.
        email: "nexadeveloper01@gmail.com",
        passwordHash,
        emailVerifiedAt: VERIFIED_AT,
        displayName: "개발자",
        role: "ADMIN",
        organizationId: ledgerOperator.id,
      },
      {
        email: "inspector@boc.test",
        passwordHash,
        emailVerifiedAt: VERIFIED_AT,
        displayName: "심사관 R. Delgado",
        role: "GOV_INSPECTOR",
        organizationId: government.id,
      },
      {
        email: "officer@pnp.test",
        passwordHash,
        emailVerifiedAt: VERIFIED_AT,
        displayName: "단속관 J. Reyes",
        role: "FIELD_OFFICER",
        organizationId: police.id,
      },
      {
        email: "staff@mm014.test",
        passwordHash,
        emailVerifiedAt: VERIFIED_AT,
        displayName: "지점 담당 A. Cruz",
        role: "PARTNER_STAFF",
        organizationId: distributor.id,
        // 매장이 자기 직원을 직접 관리하는 위임 구조 시연용
        isOrgManager: true,
      },
    ],
  });

  const { lot, uidCodes } = await mintLot({
    code: "PH-2609-A",
    productName: "Series V · Graphite",
    quantity: 20,
    producerOrgId: producer.id,
  });
  console.log(`Minted lot ${lot.code} with ${uidCodes.length} UIDs`);

  const consumerA = await prisma.consumer.create({
    data: { displayName: "소비자 A", country: "PH" },
  });
  const consumerB = await prisma.consumer.create({
    data: { displayName: "소비자 B", country: "PH" },
  });

  await prisma.user.createMany({
    data: [
      {
        email: "a@consumer.test",
        passwordHash,
        emailVerifiedAt: VERIFIED_AT,
        displayName: "소비자 A",
        role: "CONSUMER",
        consumerId: consumerA.id,
      },
      {
        email: "b@consumer.test",
        passwordHash,
        emailVerifiedAt: VERIFIED_AT,
        displayName: "소비자 B",
        role: "CONSUMER",
        consumerId: consumerB.id,
      },
    ],
  });

  // 대부분의 UID: 수출 -> 총판 배분까지만 진행 (파이프라인 중간 단계 시연)
  for (const code of uidCodes) {
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
  }

  // 첫 3개 UID는 소매까지 진행
  const [firstCode, secondCode, thirdCode] = uidCodes;

  await transferUid(firstCode!, {
    txType: "RETAIL_SALE",
    from: { type: "ORG", orgId: distributor.id },
    to: { type: "CONSUMER", consumerId: consumerA.id },
    ageVerified: true,
  });

  await transferUid(secondCode!, {
    txType: "RETAIL_SALE",
    from: { type: "ORG", orgId: distributor.id },
    to: { type: "CONSUMER", consumerId: consumerA.id },
    ageVerified: true,
  });
  // 두번째 UID는 불량 교환 후, 교환된 신UID를 중고거래로 재판매 (기획서 3.1 시나리오)
  const exchangeResult = await transferUid(secondCode!, { txType: "EXCHANGE_TRANSFER", from: { type: "CONSUMER", consumerId: consumerA.id } });
  if (exchangeResult.newUid) {
    await transferUid(exchangeResult.newUid.code, {
      txType: "RESALE_TRANSFER",
      from: { type: "CONSUMER", consumerId: consumerA.id },
      to: { type: "CONSUMER", consumerId: consumerB.id },
    });
  }

  await transferUid(thirdCode!, {
    txType: "RETAIL_SALE",
    from: { type: "ORG", orgId: distributor.id },
    to: { type: "CONSUMER", consumerId: consumerA.id },
    ageVerified: true,
  });

  // 매장 큐에 처리 대기 중인 소매 판매 요청 (소비자 앱에서 연령인증까지 마친 상태)
  await createRetailSaleRequest({
    uidCode: uidCodes[3]!,
    consumerId: consumerB.id,
    ageVerified: true,
  });

  // 통관을 거치지 않은 회색 유통 LOT — 매장 판매 시도가 차단되고 관제 콘솔로 승격된다.
  const gray = await mintLot({
    code: "GRAY-2609-Z",
    productName: "Series V · Graphite",
    quantity: 2,
    producerOrgId: producer.id,
  });
  await createRetailSaleRequest({
    uidCode: gray.uidCodes[0]!,
    consumerId: consumerB.id,
    ageVerified: true,
  });

  console.log("Seed complete.");
}

// 직접 실행(npm run prisma:seed)했을 때만 자동으로 돌린다. 다른 스크립트가 import할 때는
// 자동 실행하지 않는다(seed-if-empty가 조건부로 호출).
const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  seed()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
