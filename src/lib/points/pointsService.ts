import { Prisma, PointReason } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// 포인트는 현금을 대신하는 가치를 지니므로, 잔액을 직접 수정하지 않고 모든 변동을
// append-only 원장(PointLedgerEntry)으로 기록한다. 잔액은 원장을 물리화한 캐시값이며
// 중복 적립은 dedupeKey의 UNIQUE 제약으로 DB가 막는다.

export class PointsError extends Error {}

// ── 적립/차감 정책값 (한 곳에서 관리) ──────────────────────────────
export const POINTS = {
  SIGNUP_BONUS: 50, // 가입 축하
  DEVICE_REGISTRATION: 300, // 정품 1대 등록
  WEEKLY_CHECKIN: 20, // 주간 접속 출석
  STREAK_STEP: 5, // 연속 주마다 +5 (최대까지)
  STREAK_MAX_BONUS: 50, // 스트릭 보너스 상한
  PROFILE_COMPLETION: 80, // 프로필 정보 입력
} as const;

export type Account = Prisma.PointAccountGetPayload<{}>;

/** 소비자 포인트 계정을 없으면 만들고 반환한다. */
export async function getOrCreateAccount(
  consumerId: string,
  client: Prisma.TransactionClient | typeof prisma = prisma
): Promise<Account> {
  const existing = await client.pointAccount.findUnique({ where: { consumerId } });
  if (existing) return existing;
  return client.pointAccount.create({ data: { consumerId } });
}

type AwardArgs = {
  consumerId: string;
  reason: PointReason;
  amount: number; // 양수만 (차감은 spendPoints)
  dedupeKey?: string;
  memo?: string;
  refType?: string;
  refId?: string;
};

export type AwardResult =
  | { ok: true; skipped: false; amount: number; balance: number }
  | { ok: true; skipped: true; amount: 0; balance: number };

/**
 * 포인트를 적립한다. dedupeKey가 이미 존재하면 조용히 건너뛴다(멱등).
 * 트랜잭션 클라이언트를 넘기면 바깥 트랜잭션에 합류한다(등록 커밋과 원자적 적립).
 */
export async function awardPoints(
  args: AwardArgs,
  outer?: Prisma.TransactionClient
): Promise<AwardResult> {
  if (args.amount <= 0) throw new PointsError("적립 금액은 0보다 커야 합니다.");

  const run = async (tx: Prisma.TransactionClient): Promise<AwardResult> => {
    const account = await getOrCreateAccount(args.consumerId, tx);

    if (args.dedupeKey) {
      const dup = await tx.pointLedgerEntry.findUnique({ where: { dedupeKey: args.dedupeKey } });
      if (dup) return { ok: true, skipped: true, amount: 0, balance: account.balance };
    }

    const balanceAfter = account.balance + args.amount;
    try {
      await tx.pointLedgerEntry.create({
        data: {
          accountId: account.id,
          reason: args.reason,
          amount: args.amount,
          balanceAfter,
          memo: args.memo,
          dedupeKey: args.dedupeKey,
          refType: args.refType,
          refId: args.refId,
        },
      });
    } catch (err) {
      // 동시 요청이 같은 dedupeKey로 먼저 기록한 경우 — 멱등하게 건너뛴다.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        return { ok: true, skipped: true, amount: 0, balance: account.balance };
      }
      throw err;
    }

    await tx.pointAccount.update({
      where: { id: account.id },
      data: { balance: balanceAfter, lifetimeEarned: { increment: args.amount } },
    });

    return { ok: true, skipped: false, amount: args.amount, balance: balanceAfter };
  };

  return outer ? run(outer) : prisma.$transaction(run);
}

type SpendArgs = {
  consumerId: string;
  amount: number; // 양수로 전달 (차감액)
  reason?: PointReason;
  memo?: string;
  refType?: string;
  refId?: string;
};

/** 포인트를 차감한다. 잔액이 부족하면 PointsError. */
export async function spendPoints(args: SpendArgs): Promise<{ balance: number }> {
  if (args.amount <= 0) throw new PointsError("차감 금액은 0보다 커야 합니다.");

  return prisma.$transaction(async (tx) => {
    const account = await getOrCreateAccount(args.consumerId, tx);
    if (account.balance < args.amount) {
      throw new PointsError("포인트가 부족합니다.");
    }
    const balanceAfter = account.balance - args.amount;
    await tx.pointLedgerEntry.create({
      data: {
        accountId: account.id,
        reason: args.reason ?? "REWARD_REDEMPTION",
        amount: -args.amount,
        balanceAfter,
        memo: args.memo,
        refType: args.refType,
        refId: args.refId,
      },
    });
    await tx.pointAccount.update({ where: { id: account.id }, data: { balance: balanceAfter } });
    return { balance: balanceAfter };
  });
}

// ── ISO 주 계산 ("2026-W37") ────────────────────────────────────────
export function isoWeek(date = new Date()): string {
  // 목요일 기준 ISO-8601 주차. UTC 기준으로 계산해 서버 타임존에 흔들리지 않게 한다.
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7; // 월=1..일=7
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export type CheckinResult = {
  awarded: number;
  base: number;
  bonus: number;
  streak: number;
  balance: number;
  week: string;
};

/**
 * 주간 접속 출석. 같은 ISO 주에는 한 번만 적립되며(멱등), 지난 주에 이어 출석하면
 * 스트릭이 늘고 보너스가 붙는다. 한 주라도 건너뛰면 스트릭은 1로 초기화된다.
 */
export async function weeklyCheckin(consumerId: string): Promise<CheckinResult> {
  const now = new Date();
  const week = isoWeek(now);
  // 지난 주 = 7일 전이 속한 ISO 주. 문자열 파싱 없이 날짜에서 바로 구한다.
  const prevWeek = isoWeek(new Date(now.getTime() - 7 * 86400000));

  return prisma.$transaction(async (tx) => {
    const account = await getOrCreateAccount(consumerId, tx);
    if (account.lastCheckinWeek === week) {
      throw new PointsError("이번 주 출석은 이미 완료했습니다.");
    }

    const consecutive = account.lastCheckinWeek === prevWeek;
    const streak = consecutive ? account.checkinStreak + 1 : 1;
    const base = POINTS.WEEKLY_CHECKIN;
    // 연속 주 수에 비례한 보너스(첫 주는 0), 상한 적용.
    const bonus = Math.min((streak - 1) * POINTS.STREAK_STEP, POINTS.STREAK_MAX_BONUS);
    const total = base + bonus;
    const balanceAfter = account.balance + total;

    await tx.pointLedgerEntry.create({
      data: {
        accountId: account.id,
        reason: "WEEKLY_CHECKIN",
        amount: total,
        balanceAfter,
        memo: bonus > 0 ? `주간 출석 +${base}, ${streak}주 연속 보너스 +${bonus}` : "주간 출석",
        dedupeKey: `checkin:${consumerId}:${week}`,
      },
    });
    await tx.pointAccount.update({
      where: { id: account.id },
      data: {
        balance: balanceAfter,
        lifetimeEarned: { increment: total },
        checkinStreak: streak,
        lastCheckinWeek: week,
        lastCheckinAt: new Date(),
      },
    });

    return { awarded: total, base, bonus, streak, balance: balanceAfter, week };
  });
}

export type PointsSummary = {
  balance: number;
  lifetimeEarned: number;
  checkinStreak: number;
  checkedInThisWeek: boolean;
  week: string;
  entries: {
    reason: PointReason;
    amount: number;
    balanceAfter: number;
    memo: string | null;
    createdAt: Date;
  }[];
};

/** 앱 홈에 뿌릴 요약 — 잔액·스트릭·이번 주 출석 여부·최근 원장. */
export async function pointsSummary(consumerId: string, limit = 20): Promise<PointsSummary> {
  const account = await getOrCreateAccount(consumerId);
  const entries = await prisma.pointLedgerEntry.findMany({
    where: { accountId: account.id },
    orderBy: { sequence: "desc" },
    take: limit,
    select: { reason: true, amount: true, balanceAfter: true, memo: true, createdAt: true },
  });
  return {
    balance: account.balance,
    lifetimeEarned: account.lifetimeEarned,
    checkinStreak: account.checkinStreak,
    checkedInThisWeek: account.lastCheckinWeek === isoWeek(),
    week: isoWeek(),
    entries,
  };
}
