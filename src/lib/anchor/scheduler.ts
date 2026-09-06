import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { publishAnchorRecord, runAnchorCycle } from "@/lib/ledger/ledgerService";
import { evaluateSchedule, loadScheduleConfig, type ScheduleDecision } from "./schedule";

/** 재시도를 시도할 실패 앵커의 최대 개수 — 한 번의 실행이 과도하게 길어지지 않도록 제한한다. */
const MAX_RETRY_PER_RUN = 5;

export interface PendingStats {
  pendingCount: number;
  oldestPendingAt: Date | null;
  lastAnchoredSequence: number;
}

export async function getPendingStats(): Promise<PendingStats> {
  const lastAnchor = await prisma.anchor.findFirst({ orderBy: { toSequence: "desc" } });
  const lastAnchoredSequence = lastAnchor?.toSequence ?? 0;

  const [pendingCount, oldest] = await Promise.all([
    prisma.ledgerTransaction.count({ where: { sequence: { gt: lastAnchoredSequence } } }),
    prisma.ledgerTransaction.findFirst({
      where: { sequence: { gt: lastAnchoredSequence } },
      orderBy: { sequence: "asc" },
      select: { createdAt: true },
    }),
  ]);

  return { pendingCount, oldestPendingAt: oldest?.createdAt ?? null, lastAnchoredSequence };
}

export interface SchedulerRunResult {
  decision: ScheduleDecision;
  anchoredId: string | null;
  anchoredStatus: string | null;
  retried: { id: string; status: string }[];
  skippedByRace: boolean;
}

export async function runScheduledAnchoring(options?: { force?: boolean }): Promise<SchedulerRunResult> {
  const config = loadScheduleConfig();
  const stats = await getPendingStats();

  const decision = evaluateSchedule(
    { pendingCount: stats.pendingCount, oldestPendingAt: stats.oldestPendingAt, now: new Date() },
    config
  );

  // 게시에 실패한 앵커는 새 앵커 여부와 무관하게 재시도한다.
  const failed = await prisma.anchor.findMany({
    where: { status: "FAILED" },
    orderBy: { fromSequence: "asc" },
    take: MAX_RETRY_PER_RUN,
  });

  const retried: { id: string; status: string }[] = [];
  for (const anchor of failed) {
    const updated = await publishAnchorRecord(anchor.id);
    retried.push({ id: updated.id, status: updated.status });
  }

  if (!decision.shouldAnchor && !options?.force) {
    return { decision, anchoredId: null, anchoredStatus: null, retried, skippedByRace: false };
  }

  try {
    const anchor = await runAnchorCycle();
    return {
      decision,
      anchoredId: anchor?.id ?? null,
      anchoredStatus: anchor?.status ?? null,
      retried,
      skippedByRace: false,
    };
  } catch (err) {
    // 다른 스케줄러 인스턴스가 같은 구간을 먼저 앵커링한 경우 (fromSequence unique 위반).
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { decision, anchoredId: null, anchoredStatus: null, retried, skippedByRace: true };
    }
    throw err;
  }
}
