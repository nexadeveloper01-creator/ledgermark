import { prisma } from "@/lib/prisma";
import { evaluate, type RateLimitConfig, type RateLimitDecision } from "./rateLimitPolicy";

export const LOGIN_PER_EMAIL: RateLimitConfig = {
  limit: 5,
  windowMs: 15 * 60 * 1000,
  blockMs: 15 * 60 * 1000,
};

// IP는 프록시 헤더에서 오므로 위조될 수 있다. 계정별 제한이 실질적인 방어선이고,
// IP 제한은 계정을 바꿔가며 시도하는 경우를 늦추기 위한 보조 수단이라 한도를 넉넉히 둔다.
export const LOGIN_PER_IP: RateLimitConfig = {
  limit: 20,
  windowMs: 15 * 60 * 1000,
  blockMs: 15 * 60 * 1000,
};

// 가입은 공개 엔드포인트라 대량 등록과 이메일 열거를 막아야 한다.
// 다만 입력값 검증 실패도 시도로 집계되므로, 폼을 몇 번 잘못 채운 정상 사용자가
// 잠기지 않도록 한도를 넉넉히 둔다(위협은 스크립트 기반 대량 시도다).
export const SIGNUP_PER_IP: RateLimitConfig = {
  limit: 20,
  windowMs: 60 * 60 * 1000,
  blockMs: 60 * 60 * 1000,
};

export const LOOKUP_PER_USER: RateLimitConfig = {
  limit: 20,
  windowMs: 10 * 60 * 1000,
  blockMs: 10 * 60 * 1000,
};

export async function consumeRateLimit(
  key: string,
  config: RateLimitConfig
): Promise<RateLimitDecision> {
  const now = new Date();
  const existing = await prisma.rateLimitEntry.findUnique({ where: { key } });

  const decision = evaluate(
    existing
      ? { hits: existing.hits, windowStart: existing.windowStart, blockedUntil: existing.blockedUntil }
      : null,
    now,
    config
  );

  // 이미 잠금 상태면 상태 변화가 없다. 차단된 요청이 DB 쓰기를 유발하지 않도록 생략한다.
  if (existing?.blockedUntil && existing.blockedUntil > now) {
    return decision;
  }

  await prisma.rateLimitEntry.upsert({
    where: { key },
    create: {
      key,
      hits: decision.next.hits,
      windowStart: decision.next.windowStart,
      blockedUntil: decision.next.blockedUntil,
    },
    update: {
      hits: decision.next.hits,
      windowStart: decision.next.windowStart,
      blockedUntil: decision.next.blockedUntil,
    },
  });

  return decision;
}

// 로그인 성공처럼 "정상 사용"이 확인되면 카운터를 비운다.
export async function clearRateLimit(key: string) {
  await prisma.rateLimitEntry.deleteMany({ where: { key } });
}

// 신뢰할 수 있는 프록시가 x-forwarded-for를 설정한다는 전제로 읽는다.
// 프록시 앞단이 없는 환경에서는 클라이언트가 위조할 수 있으므로 IP 제한만 믿어서는 안 된다.
export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}
