import { describe, expect, it } from "vitest";
import { evaluateSchedule, type ScheduleConfig } from "./schedule";

const config: ScheduleConfig = { minBatch: 50, maxDelayMs: 60 * 60_000 };
const now = new Date("2026-09-06T12:00:00.000Z");
const minutesAgo = (m: number) => new Date(now.getTime() - m * 60_000);

describe("앵커링 스케줄 판정", () => {
  it("미앵커 트랜잭션이 없으면 앵커링하지 않는다", () => {
    const d = evaluateSchedule({ pendingCount: 0, oldestPendingAt: null, now }, config);
    expect(d.shouldAnchor).toBe(false);
    expect(d.reason).toBe("NO_PENDING");
  });

  it("건수 임계치에 도달하면 대기 시간과 무관하게 앵커링한다", () => {
    const d = evaluateSchedule({ pendingCount: 50, oldestPendingAt: minutesAgo(1), now }, config);
    expect(d.shouldAnchor).toBe(true);
    expect(d.reason).toBe("BATCH_REACHED");
  });

  it("건수가 부족해도 최대 지연을 넘기면 앵커링한다", () => {
    // 거래가 뜸한 시간대에 앵커가 무한정 지연되지 않도록 하는 장치.
    const d = evaluateSchedule({ pendingCount: 1, oldestPendingAt: minutesAgo(61), now }, config);
    expect(d.shouldAnchor).toBe(true);
    expect(d.reason).toBe("MAX_DELAY_EXCEEDED");
  });

  it("건수도 시간도 못 채우면 대기한다", () => {
    // 트랜잭션 1건마다 앵커링해 가스비를 낭비하지 않도록 하는 장치.
    const d = evaluateSchedule({ pendingCount: 3, oldestPendingAt: minutesAgo(5), now }, config);
    expect(d.shouldAnchor).toBe(false);
    expect(d.reason).toBe("WAITING");
    expect(d.waitedMs).toBe(5 * 60_000);
  });

  it("임계치 경계값을 정확히 처리한다", () => {
    expect(
      evaluateSchedule({ pendingCount: 49, oldestPendingAt: minutesAgo(1), now }, config).shouldAnchor
    ).toBe(false);
    expect(
      evaluateSchedule({ pendingCount: 50, oldestPendingAt: minutesAgo(1), now }, config).shouldAnchor
    ).toBe(true);
    expect(
      evaluateSchedule({ pendingCount: 1, oldestPendingAt: minutesAgo(60), now }, config).shouldAnchor
    ).toBe(true);
  });
});
