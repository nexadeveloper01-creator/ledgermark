// 레이트 리밋 판정 로직 (DB 비의존 순수 함수).
//
// 고정 윈도우 + 잠금 방식: windowMs 안에 limit회를 넘기면 blockMs 동안 차단한다.
// 차단이 풀리면 카운터를 초기화해 다시 limit회의 기회를 준다.

export interface RateLimitConfig {
  limit: number;
  windowMs: number;
  blockMs: number;
}

export interface RateLimitState {
  hits: number;
  windowStart: Date;
  blockedUntil: Date | null;
}

export interface RateLimitDecision {
  allowed: boolean;
  retryAfterSec: number;
  /** 이번 시도를 반영한 다음 상태. allowed=false여도 저장해야 잠금이 유지된다. */
  next: RateLimitState;
}

export function evaluate(
  state: RateLimitState | null,
  now: Date,
  config: RateLimitConfig
): RateLimitDecision {
  if (state?.blockedUntil && state.blockedUntil > now) {
    return {
      allowed: false,
      retryAfterSec: Math.ceil((state.blockedUntil.getTime() - now.getTime()) / 1000),
      next: state,
    };
  }

  // 윈도우가 지났거나 잠금이 막 풀렸으면 새 윈도우를 시작한다.
  const windowExpired =
    !state || now.getTime() - state.windowStart.getTime() >= config.windowMs || !!state.blockedUntil;

  const hits = windowExpired ? 1 : state.hits + 1;
  const windowStart = windowExpired ? now : state.windowStart;

  if (hits > config.limit) {
    const blockedUntil = new Date(now.getTime() + config.blockMs);
    return {
      allowed: false,
      retryAfterSec: Math.ceil(config.blockMs / 1000),
      next: { hits, windowStart, blockedUntil },
    };
  }

  return {
    allowed: true,
    retryAfterSec: 0,
    next: { hits, windowStart, blockedUntil: null },
  };
}
