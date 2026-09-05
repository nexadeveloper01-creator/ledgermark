import { prisma } from "@/lib/prisma";
import { transferUid } from "@/lib/ledger/ledgerService";
import { LedgerError } from "@/lib/ledger/stateMachine";
import { checkRetailSaleEligibility } from "./eligibility";

// 소비자 앱에서 올라온 소매 판매 요청. 매장이 커밋하기 전까지 원장에는 아무것도 기록되지 않는다.
export async function createRetailSaleRequest(args: {
  uidCode: string;
  consumerId: string;
  ageVerified: boolean;
}) {
  const uid = await prisma.uid.findUnique({ where: { code: args.uidCode } });
  if (!uid) throw new LedgerError(`UID를 찾을 수 없습니다: ${args.uidCode}`);

  const existing = await prisma.transferRequest.findFirst({
    where: { uidId: uid.id, status: "PENDING" },
  });
  if (existing) throw new LedgerError("이미 처리 대기 중인 요청이 있습니다.");

  const verdict = checkRetailSaleEligibility(uid.status);

  const request = await prisma.transferRequest.create({
    data: {
      uidId: uid.id,
      type: "RETAIL_SALE",
      status: verdict.eligible ? "PENDING" : "BLOCKED",
      requestedConsumerId: args.consumerId,
      fromOrgId: uid.ownerOrgId,
      ageVerified: args.ageVerified,
      blockedReason: verdict.reason,
    },
    include: { uid: true },
  });

  // 차단된 요청은 관제 콘솔로 승격한다 (디자인: "알림 · BOC 콘솔 전송됨").
  if (!verdict.eligible && (uid.status === "MINTED" || uid.status === "EXPORTED")) {
    await prisma.smuggleAlert.create({
      data: {
        uidCode: uid.code,
        uidId: uid.id,
        reason: `매장 판매 시도 차단 — ${verdict.reason}`,
      },
    });
  }

  return request;
}

export async function createExchangeRequest(args: { uidCode: string; consumerId: string }) {
  const uid = await prisma.uid.findUnique({ where: { code: args.uidCode } });
  if (!uid) throw new LedgerError(`UID를 찾을 수 없습니다: ${args.uidCode}`);

  if (uid.ownerConsumerId !== args.consumerId) {
    throw new LedgerError("본인이 소유한 UID만 교환 신청할 수 있습니다.");
  }
  if (uid.voucherState !== "AVAILABLE") {
    throw new LedgerError(
      uid.voucherState === "VOID"
        ? "중고로 취득한 제품은 무상교환 대상이 아닙니다."
        : "사용 가능한 교환권이 없습니다."
    );
  }

  const existing = await prisma.transferRequest.findFirst({
    where: { uidId: uid.id, status: "PENDING" },
  });
  if (existing) throw new LedgerError("이미 처리 대기 중인 요청이 있습니다.");

  return prisma.transferRequest.create({
    data: {
      uidId: uid.id,
      type: "EXCHANGE_TRANSFER",
      status: "PENDING",
      requestedConsumerId: args.consumerId,
      ageVerified: true,
    },
    include: { uid: true },
  });
}

export async function createWholesaleRequest(args: {
  uidCode: string;
  fromOrgId: string;
  toOrgId: string;
}) {
  const uid = await prisma.uid.findUnique({ where: { code: args.uidCode } });
  if (!uid) throw new LedgerError(`UID를 찾을 수 없습니다: ${args.uidCode}`);

  return prisma.transferRequest.create({
    data: {
      uidId: uid.id,
      type: "WHOLESALE_TRANSFER",
      status: "PENDING",
      fromOrgId: args.fromOrgId,
      toOrgId: args.toOrgId,
    },
    include: { uid: true },
  });
}

// 매장/총판이 큐에서 커밋 — 이 시점에 비로소 원장 트랜잭션이 기록된다.
export async function commitRequest(id: string) {
  const request = await prisma.transferRequest.findUnique({
    where: { id },
    include: { uid: true },
  });
  if (!request) throw new LedgerError("요청을 찾을 수 없습니다.");
  if (request.status !== "PENDING") {
    throw new LedgerError(`대기 중인 요청만 커밋할 수 있습니다 (현재: ${request.status}).`);
  }

  const uid = request.uid;

  if (request.type === "RETAIL_SALE") {
    if (!request.ageVerified) throw new LedgerError("연령인증이 완료되지 않은 요청입니다.");
    if (!uid.ownerOrgId) throw new LedgerError("현재 소유자가 조직이 아닙니다.");
    if (!request.requestedConsumerId) throw new LedgerError("요청 소비자가 없습니다.");

    await transferUid(uid.code, {
      txType: "RETAIL_SALE",
      from: { type: "ORG", orgId: uid.ownerOrgId },
      to: { type: "CONSUMER", consumerId: request.requestedConsumerId },
      ageVerified: true,
    });
  } else if (request.type === "EXCHANGE_TRANSFER") {
    if (!uid.ownerConsumerId) throw new LedgerError("현재 소유자가 소비자가 아닙니다.");

    await transferUid(uid.code, {
      txType: "EXCHANGE_TRANSFER",
      from: { type: "CONSUMER", consumerId: uid.ownerConsumerId },
    });
  } else {
    if (!request.fromOrgId || !request.toOrgId) {
      throw new LedgerError("총판 배분은 이전/신규 조직이 모두 필요합니다.");
    }

    await transferUid(uid.code, {
      txType: "WHOLESALE_TRANSFER",
      from: { type: "ORG", orgId: request.fromOrgId },
      to: { type: "ORG", orgId: request.toOrgId },
    });
  }

  return prisma.transferRequest.update({
    where: { id },
    data: { status: "COMMITTED", committedAt: new Date() },
    include: { uid: true },
  });
}

export async function rejectRequest(id: string) {
  return prisma.transferRequest.update({
    where: { id },
    data: { status: "REJECTED" },
  });
}
