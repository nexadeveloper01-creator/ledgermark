import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { publishAnchor } from "@/lib/anchor/publisher";
import { computeEntryHash, verifyChain, GENESIS_HASH, type ChainLink } from "./hashChain";
import { buildMerkleRoot } from "./merkle";
import {
  applyTransition,
  LedgerError,
  type OwnerRef,
  type TransitionInput,
  type UidSnapshot,
} from "./stateMachine";

type Tx = Prisma.TransactionClient | PrismaClient;

function ownerFields(owner: OwnerRef) {
  return owner.type === "ORG"
    ? { ownerType: "ORG" as const, ownerOrgId: owner.orgId, ownerConsumerId: null }
    : { ownerType: "CONSUMER" as const, ownerConsumerId: owner.consumerId, ownerOrgId: null };
}

function ownerLabel(owner: OwnerRef): string {
  return owner.type === "ORG" ? `ORG:${owner.orgId}` : `CONSUMER:${owner.consumerId}`;
}

async function lastHash(tx: Tx): Promise<{ sequence: number; hash: string }> {
  const last = await tx.ledgerTransaction.findFirst({ orderBy: { sequence: "desc" } });
  return last ? { sequence: last.sequence, hash: last.hash } : { sequence: 0, hash: GENESIS_HASH };
}

async function appendLedgerEntry(
  tx: Tx,
  args: {
    uidId: string;
    uidCode: string;
    txType: TransitionInput["txType"];
    from: OwnerRef | null;
    to: OwnerRef;
    metadata?: unknown;
  }
) {
  const { hash: prevHash } = await lastHash(tx);
  const createdAt = new Date();
  const payload = {
    sequence: 0, // 실제 sequence는 DB autoincrement가 부여하므로 해시 계산에는 시각/내용만 사용
    uidCode: args.uidCode,
    txType: args.txType,
    fromOwner: args.from ? ownerLabel(args.from) : null,
    toOwner: ownerLabel(args.to),
    metadata: args.metadata ?? null,
    createdAt: createdAt.toISOString(),
  };
  const hash = computeEntryHash(prevHash, payload);

  const to = ownerFields(args.to);
  const from = args.from ? ownerFields(args.from) : null;

  return tx.ledgerTransaction.create({
    data: {
      uidId: args.uidId,
      txType: args.txType,
      fromOwnerType: from?.ownerType,
      fromOrgId: from?.ownerOrgId ?? undefined,
      fromConsumerId: from?.ownerConsumerId ?? undefined,
      toOwnerType: to.ownerType,
      toOrgId: to.ownerOrgId ?? undefined,
      toConsumerId: to.ownerConsumerId ?? undefined,
      metadata: (args.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      prevHash,
      hash,
      createdAt,
    },
  });
}

export interface MintLotInput {
  code: string;
  productName: string;
  quantity: number;
  producerOrgId: string;
}

const MAX_LOT_QUANTITY = 10_000;

export async function mintLot(input: MintLotInput) {
  if (input.quantity < 1 || input.quantity > MAX_LOT_QUANTITY) {
    throw new LedgerError(`quantity는 1..${MAX_LOT_QUANTITY} 사이여야 합니다.`);
  }

  return prisma.$transaction(
    async (tx) => {
      const lot = await tx.lot.create({
        data: {
          code: input.code,
          productName: input.productName,
          quantity: input.quantity,
          producerOrgId: input.producerOrgId,
        },
      });

      const producer: OwnerRef = { type: "ORG", orgId: input.producerOrgId };
      const uidCodes: string[] = [];

      for (let i = 0; i < input.quantity; i++) {
        const uidCode = `${lot.code}-${String(i + 1).padStart(6, "0")}`;
        const result = applyTransition(null, { txType: "MINT", to: producer });
        if (result.kind !== "single") throw new LedgerError("MINT은 단일 전이여야 합니다.");

        const uid = await tx.uid.create({
          data: {
            code: uidCode,
            lotId: lot.id,
            status: result.next.status,
            ...ownerFields(result.next.owner),
            voucherState: result.next.voucherState,
          },
        });

        await appendLedgerEntry(tx, {
          uidId: uid.id,
          uidCode: uid.code,
          txType: "MINT",
          from: null,
          to: producer,
        });

        uidCodes.push(uidCode);
      }

      return { lot, uidCodes };
    },
    { timeout: 120_000 }
  );
}

function toSnapshot(uid: {
  status: UidSnapshot["status"];
  ownerType: "ORG" | "CONSUMER";
  ownerOrgId: string | null;
  ownerConsumerId: string | null;
  voucherState: UidSnapshot["voucherState"];
}): UidSnapshot {
  const owner: OwnerRef =
    uid.ownerType === "ORG"
      ? { type: "ORG", orgId: uid.ownerOrgId! }
      : { type: "CONSUMER", consumerId: uid.ownerConsumerId! };
  return { status: uid.status, owner, voucherState: uid.voucherState };
}

export async function transferUid(uidCode: string, input: TransitionInput, metadata?: unknown) {
  return prisma.$transaction(async (tx) => {
    const uid = await tx.uid.findUnique({ where: { code: uidCode } });
    if (!uid) throw new LedgerError(`UID를 찾을 수 없습니다: ${uidCode}`);

    const current = toSnapshot(uid);
    const result = applyTransition(current, input);

    if (result.kind === "single") {
      const updated = await tx.uid.update({
        where: { id: uid.id },
        data: {
          status: result.next.status,
          ...ownerFields(result.next.owner),
          voucherState: result.next.voucherState,
        },
      });

      const from = "from" in input ? input.from : null;
      await appendLedgerEntry(tx, {
        uidId: uid.id,
        uidCode: uid.code,
        txType: input.txType,
        from,
        to: result.next.owner,
        metadata,
      });

      return { uid: updated, newUid: null };
    }

    // EXCHANGE_TRANSFER: 구UID 폐기 + 신UID 발급
    const retired = await tx.uid.update({
      where: { id: uid.id },
      data: {
        status: result.retiredCurrent.status,
        voucherState: result.retiredCurrent.voucherState,
      },
    });

    const newCode = `${uid.code}-X${Date.now().toString(36).toUpperCase()}`;
    const issued = await tx.uid.create({
      data: {
        code: newCode,
        lotId: uid.lotId,
        status: result.issuedNew.status,
        ...ownerFields(result.issuedNew.owner),
        voucherState: result.issuedNew.voucherState,
        replacesUidId: uid.id,
      },
    });

    const from = "from" in input ? input.from : result.retiredCurrent.owner;
    await appendLedgerEntry(tx, {
      uidId: uid.id,
      uidCode: uid.code,
      txType: "EXCHANGE_TRANSFER",
      from,
      to: result.retiredCurrent.owner,
      metadata: { ...((metadata as object) ?? {}), issuedUidCode: newCode },
    });

    return { uid: retired, newUid: issued };
  });
}

export async function getUidTrace(uidCode: string) {
  const uid = await prisma.uid.findUnique({
    where: { code: uidCode },
    include: {
      lot: true,
      transactions: { orderBy: { sequence: "asc" } },
      replacesUid: true,
      replacedBy: true,
    },
  });
  return uid;
}

export async function verifyLedgerIntegrity(): Promise<ReturnType<typeof verifyChain>> {
  const rows = await prisma.ledgerTransaction.findMany({
    orderBy: { sequence: "asc" },
    include: { uid: true },
  });

  const links: ChainLink[] = rows.map((row) => {
    const fromOwner =
      row.fromOwnerType === "ORG"
        ? `ORG:${row.fromOrgId}`
        : row.fromOwnerType === "CONSUMER"
          ? `CONSUMER:${row.fromConsumerId}`
          : null;
    const toOwner = row.toOwnerType === "ORG" ? `ORG:${row.toOrgId}` : `CONSUMER:${row.toConsumerId}`;

    return {
      sequence: row.sequence,
      prevHash: row.prevHash,
      hash: row.hash,
      payload: {
        sequence: 0,
        uidCode: row.uid.code,
        txType: row.txType,
        fromOwner,
        toOwner,
        metadata: row.metadata,
        createdAt: row.createdAt.toISOString(),
      },
    };
  });

  return verifyChain(links);
}

export async function runAnchorCycle() {
  const lastAnchor = await prisma.anchor.findFirst({ orderBy: { toSequence: "desc" } });
  const fromSequence = (lastAnchor?.toSequence ?? 0) + 1;

  const pending = await prisma.ledgerTransaction.findMany({
    where: { sequence: { gte: fromSequence } },
    orderBy: { sequence: "asc" },
  });

  if (pending.length === 0) return null;

  const merkleRoot = buildMerkleRoot(pending.map((p) => p.hash));
  const toSequence = pending[pending.length - 1]!.sequence;

  // 루트 계산·저장을 먼저 확정한다. 체인 게시가 실패해도 원장 앵커 기록 자체는 남아야 한다.
  const anchor = await prisma.anchor.create({
    data: { fromSequence, toSequence, txCount: pending.length, merkleRoot },
  });

  return publishAnchorRecord(anchor.id);
}

// 앵커의 퍼블릭 체인 게시를 시도한다. 실패는 FAILED로 기록되어 나중에 재시도할 수 있다.
export async function publishAnchorRecord(anchorId: string) {
  const anchor = await prisma.anchor.findUnique({ where: { id: anchorId } });
  if (!anchor) throw new LedgerError("앵커를 찾을 수 없습니다.");
  if (anchor.status === "PUBLISHED") return anchor;

  try {
    const result = await publishAnchor(anchor.merkleRoot);
    return await prisma.anchor.update({
      where: { id: anchor.id },
      data: {
        status: "PUBLISHED",
        publicAnchorRef: result.txHash,
        chainId: result.chainId,
        blockNumber: result.blockNumber,
        publishedAt: new Date(),
        lastError: null,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return prisma.anchor.update({
      where: { id: anchor.id },
      data: { status: "FAILED", lastError: message.slice(0, 500) },
    });
  }
}
