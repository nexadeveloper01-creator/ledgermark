import { describe, expect, it } from "vitest";
import { evaluate, type RateLimitConfig, type RateLimitState } from "./rateLimitPolicy";

const config: RateLimitConfig = { limit: 3, windowMs: 60_000, blockMs: 300_000 };
const t0 = new Date("2026-09-06T00:00:00.000Z");
const at = (ms: number) => new Date(t0.getTime() + ms);

describe("레이트 리밋 판정", () => {
  it("한도 이내의 시도는 허용한다", () => {
    let state: RateLimitState | null = null;
    for (let i = 1; i <= config.limit; i++) {
      const decision = evaluate(state, at(i * 1000), config);
      expect(decision.allowed).toBe(true);
      expect(decision.next.hits).toBe(i);
      state = decision.next;
    }
  });

  it("한도를 넘으면 차단하고 재시도 시각을 알려준다", () => {
    let state: RateLimitState | null = null;
    for (let i = 1; i <= config.limit; i++) {
      state = evaluate(state, at(i * 1000), config).next;
    }

    const blocked = evaluate(state, at(4000), config);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSec).toBe(300);
    expect(blocked.next.blockedUntil).toEqual(new Date(at(4000).getTime() + config.blockMs));
  });

  it("차단 중에는 상태를 그대로 두고 남은 시간을 줄여 알려준다", () => {
    const state: RateLimitState = {
      hits: 9,
      windowStart: t0,
      blockedUntil: at(300_000),
    };

    const decision = evaluate(state, at(120_000), config);
    expect(decision.allowed).toBe(false);
    expect(decision.retryAfterSec).toBe(180);
    expect(decision.next).toBe(state);
  });

  it("차단이 풀리면 카운터를 초기화하고 다시 허용한다", () => {
    const state: RateLimitState = { hits: 9, windowStart: t0, blockedUntil: at(300_000) };

    const decision = evaluate(state, at(300_001), config);
    expect(decision.allowed).toBe(true);
    expect(decision.next.hits).toBe(1);
    expect(decision.next.blockedUntil).toBeNull();
  });

  it("윈도우가 지나면 카운터를 새로 시작한다", () => {
    const state: RateLimitState = { hits: 3, windowStart: t0, blockedUntil: null };

    const decision = evaluate(state, at(config.windowMs + 1), config);
    expect(decision.allowed).toBe(true);
    expect(decision.next.hits).toBe(1);
  });

  it("윈도우 안에서는 카운터가 누적된다", () => {
    const state: RateLimitState = { hits: 2, windowStart: t0, blockedUntil: null };

    const decision = evaluate(state, at(config.windowMs - 1), config);
    expect(decision.allowed).toBe(true);
    expect(decision.next.hits).toBe(3);
    expect(decision.next.windowStart).toEqual(t0);
  });
});
