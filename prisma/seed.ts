import { prisma } from "../src/lib/prisma";
import { mintLot, transferUid } from "../src/lib/ledger/ledgerService";

async function main() {
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
  await prisma.organization.create({
    data: { name: "필리핀 관세청 (BOC)", type: "GOVERNMENT", country: "PH" },
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

  // 데모용 밀수 의심 알림 하나 등록 (통관 이력 없이 소매 판매 시도된 것으로 가정)
  const uidForAlert = await prisma.uid.findUnique({ where: { code: uidCodes[uidCodes.length - 1] } });
  if (uidForAlert) {
    await prisma.smuggleAlert.create({
      data: {
        uidId: uidForAlert.id,
        reason: "통관 이력 없는 UID 소매 판매 시도 (판정 규칙 CU-02)",
      },
    });
  }

  console.log("Seed complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
