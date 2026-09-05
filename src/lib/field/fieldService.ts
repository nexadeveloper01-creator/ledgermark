import { prisma } from "@/lib/prisma";
import { LedgerError } from "@/lib/ledger/stateMachine";
import { judge, reportNumberPrefix, type VerdictResult } from "./verdict";

export interface InspectionRow {
  k: string;
  v: string;
}

export interface InspectionResult {
  id: string;
  uidCode: string;
  verdict: VerdictResult;
  rows: InspectionRow[];
  ledgerSnapshot: string | null;
  reportNumber: string | null;
  reportedAt: Date | null;
  officerName: string;
  location: string;
  createdAt: Date;
}

export async function inspectUid(args: {
  uidCode: string;
  officerName: string;
  location: string;
}): Promise<InspectionResult> {
  const code = args.uidCode.trim();
  if (!code) throw new LedgerError("UID 코드가 필요합니다.");

  const uid = await prisma.uid.findUnique({
    where: { code },
    include: {
      lot: true,
      ownerOrg: { select: { name: true } },
      ownerConsumer: { select: { id: true, displayName: true } },
      transactions: { orderBy: { sequence: "asc" } },
    },
  });

  const hasCustomsRecord = uid
    ? uid.transactions.some((tx) => tx.txType === "EXPORT_TRANSFER")
    : false;
  const lastTx = uid?.transactions[uid.transactions.length - 1] ?? null;

  const verdict = judge({
    uid: uid ? { status: uid.status, hasCustomsRecord, lastTxType: lastTx?.txType ?? null } : null,
  });

  // 조서에 첨부할 원장 스냅샷 — 마지막 앵커의 Merkle Root
  const lastAnchor = await prisma.anchor.findFirst({ orderBy: { toSequence: "desc" } });
  const ledgerSnapshot = lastAnchor?.merkleRoot ?? null;

  const rows: InspectionRow[] = [];

  if (!uid) {
    // 위조 의심 — 같은 LOT 접두사를 쓰는 유사 코드가 원장에 있는지 확인한다.
    const prefix = code.split("-").slice(0, 2).join("-");
    const similar = prefix.length > 2 ? await prisma.uid.count({ where: { code: { startsWith: prefix } } }) : 0;

    rows.push(
      { k: "원장 조회", v: "결과 없음" },
      { k: "MINT 기록", v: "없음" },
      { k: "판정 규칙", v: verdict.rule },
      { k: "유사 코드", v: similar > 0 ? `${similar}건 (동일 접두사)` : "없음" }
    );
  } else {
    const owner = uid.ownerOrg?.name ?? uid.ownerConsumer?.displayName ?? "—";

    let ageVerifiedLabel = "해당 없음";
    if (uid.ownerConsumerId) {
      const verification = await prisma.ageVerification.findFirst({
        where: { consumerId: uid.ownerConsumerId, verified: true },
        orderBy: { verifiedAt: "desc" },
      });
      ageVerifiedLabel = verification ? `완료 (${verification.method})` : "기록 없음";
    }

    if (hasCustomsRecord) {
      rows.push(
        { k: "통관 배치", v: "확인됨 (EXPORT_TRANSFER)" },
        { k: "최종 트랜잭션", v: lastTx?.txType ?? "—" },
        { k: "현재 소유자", v: owner },
        { k: "연령인증", v: ageVerifiedLabel }
      );
    } else {
      // 동일 LOT에서 같은 문제(통관 기록 없음)를 가진 UID 수 — 현장 확대 조사 근거
      const sameLotUids = await prisma.uid.findMany({
        where: { lotId: uid.lotId, id: { not: uid.id } },
        select: { id: true, transactions: { select: { txType: true } } },
      });
      const watchCount = sameLotUids.filter(
        (u) => !u.transactions.some((tx) => tx.txType === "EXPORT_TRANSFER")
      ).length;

      rows.push(
        { k: "통관 배치", v: "미포함" },
        { k: "최종 트랜잭션", v: lastTx?.txType ?? "—" },
        { k: "판정 규칙", v: verdict.rule },
        { k: "동일 LOT 감시", v: `${watchCount}건` }
      );
    }
  }

  const inspection = await prisma.fieldInspection.create({
    data: {
      uidCode: code,
      uidId: uid?.id ?? null,
      verdict: verdict.verdict,
      rule: verdict.rule,
      basis: verdict.basis,
      officerName: args.officerName,
      location: args.location,
      ledgerSnapshot,
    },
  });

  return {
    id: inspection.id,
    uidCode: code,
    verdict,
    rows,
    ledgerSnapshot,
    reportNumber: null,
    reportedAt: null,
    officerName: args.officerName,
    location: args.location,
    createdAt: inspection.createdAt,
  };
}

export async function issueReport(id: string) {
  const inspection = await prisma.fieldInspection.findUnique({ where: { id } });
  if (!inspection) throw new LedgerError("조회 기록을 찾을 수 없습니다.");
  if (inspection.verdict === "VERIFIED") {
    throw new LedgerError("정상 판정 건은 조서를 발행하지 않습니다.");
  }
  if (inspection.reportNumber) return inspection;

  const prefix = reportNumberPrefix(inspection.verdict);
  const year = String(new Date().getFullYear()).slice(2);
  const issuedCount = await prisma.fieldInspection.count({
    where: { verdict: inspection.verdict, reportNumber: { not: null } },
  });
  const reportNumber = `${prefix}-PH-${year}-${String(issuedCount + 1).padStart(5, "0")}`;

  return prisma.fieldInspection.update({
    where: { id },
    data: { reportNumber, reportedAt: new Date() },
  });
}

// 관제 콘솔 전송 — 밀수/위조 의심 알림으로 승격한다.
export async function escalateToConsole(id: string) {
  const inspection = await prisma.fieldInspection.findUnique({ where: { id } });
  if (!inspection) throw new LedgerError("조회 기록을 찾을 수 없습니다.");
  if (inspection.verdict === "VERIFIED") {
    throw new LedgerError("정상 판정 건은 콘솔로 승격하지 않습니다.");
  }

  const existing = await prisma.smuggleAlert.findFirst({
    where: { uidCode: inspection.uidCode, status: "OPEN" },
  });
  if (existing) return existing;

  return prisma.smuggleAlert.create({
    data: {
      uidCode: inspection.uidCode,
      uidId: inspection.uidId,
      reason: `현장 단속 판정 ${inspection.rule} — ${inspection.basis} (담당관 ${inspection.officerName} · ${inspection.location})`,
    },
  });
}
