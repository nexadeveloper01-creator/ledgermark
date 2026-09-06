// 앵커링 시점 판단 (DB 비의존 순수 함수).
//
// 매 실행마다 무조건 앵커링하면 실제 체인에서는 트랜잭션 1건짜리 앵커에도 가스비가
// 나간다. 반대로 건수만 기준으로 삼으면 거래가 뜸한 시간대에 앵커가 무한정 지연된다.
// 그래서 "건수 임계치" 또는 "최대 지연 시간" 중 하나만 충족해도 앵커링한다.

export interface ScheduleConfig {
  /** 이 건수 이상 쌓이면 즉시 앵커링한다. */
  minBatch: number;
  /** 미앵커 트랜잭션이 이 시간을 넘겨 대기하면 건수와 무관하게 앵커링한다. */
  maxDelayMs: number;
}

export interface ScheduleInput {
  pendingCount: number;
  /** 가장 오래된 미앵커 트랜잭션의 기록 시각. 미앵커 건이 없으면 null. */
  oldestPendingAt: Date | null;
  now: Date;
}

export type ScheduleReason = "NO_PENDING" | "BATCH_REACHED" | "MAX_DELAY_EXCEEDED" | "WAITING";

export interface ScheduleDecision {
  shouldAnchor: boolean;
  reason: ScheduleReason;
  pendingCount: number;
  waitedMs: number;
}

export function evaluateSchedule(input: ScheduleInput, config: ScheduleConfig): ScheduleDecision {
  if (input.pendingCount === 0 || !input.oldestPendingAt) {
    return { shouldAnchor: false, reason: "NO_PENDING", pendingCount: 0, waitedMs: 0 };
  }

  const waitedMs = input.now.getTime() - input.oldestPendingAt.getTime();

  if (input.pendingCount >= config.minBatch) {
    return {
      shouldAnchor: true,
      reason: "BATCH_REACHED",
      pendingCount: input.pendingCount,
      waitedMs,
    };
  }

  if (waitedMs >= config.maxDelayMs) {
    return {
      shouldAnchor: true,
      reason: "MAX_DELAY_EXCEEDED",
      pendingCount: input.pendingCount,
      waitedMs,
    };
  }

  return { shouldAnchor: false, reason: "WAITING", pendingCount: input.pendingCount, waitedMs };
}

export function loadScheduleConfig(): ScheduleConfig {
  const minBatch = Number(process.env.ANCHOR_MIN_BATCH ?? 50);
  const maxDelayMinutes = Number(process.env.ANCHOR_MAX_DELAY_MINUTES ?? 60);

  return {
    minBatch: Number.isFinite(minBatch) && minBatch > 0 ? minBatch : 50,
    maxDelayMs:
      (Number.isFinite(maxDelayMinutes) && maxDelayMinutes > 0 ? maxDelayMinutes : 60) * 60_000,
  };
}
