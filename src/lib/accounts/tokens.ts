import { createHash, randomBytes } from "crypto";
import type { TokenType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// 메일로 나가는 토큰은 원문을 저장하지 않는다 — DB가 유출돼도 링크를 재구성할 수 없어야 한다.
export function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export const TOKEN_TTL_MS: Record<TokenType, number> = {
  EMAIL_VERIFY: 24 * 60 * 60 * 1000,
  // 재설정 토큰은 계정 탈취로 직결되므로 유효기간을 짧게 둔다.
  PASSWORD_RESET: 60 * 60 * 1000,
};

export async function issueToken(userId: string, type: TokenType) {
  const raw = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS[type]);

  // 같은 종류의 미사용 토큰은 무효화해 링크가 여러 개 살아있지 않게 한다.
  await prisma.verificationToken.updateMany({
    where: { userId, type, usedAt: null },
    data: { usedAt: new Date() },
  });

  await prisma.verificationToken.create({
    data: { tokenHash: hashToken(raw), type, userId, expiresAt },
  });

  return { raw, expiresAt };
}

export type ConsumeFailure = "NOT_FOUND" | "EXPIRED" | "ALREADY_USED";

export type ConsumeResult =
  | { ok: true; userId: string }
  | { ok: false; reason: ConsumeFailure };

// 토큰을 검증하고 즉시 소진한다. 재사용·만료·타입 불일치를 모두 거부한다.
export async function consumeToken(raw: string, type: TokenType): Promise<ConsumeResult> {
  if (!raw) return { ok: false, reason: "NOT_FOUND" };

  const token = await prisma.verificationToken.findUnique({
    where: { tokenHash: hashToken(raw) },
  });

  if (!token || token.type !== type) return { ok: false, reason: "NOT_FOUND" };
  if (token.usedAt) return { ok: false, reason: "ALREADY_USED" };
  if (token.expiresAt < new Date()) return { ok: false, reason: "EXPIRED" };

  await prisma.verificationToken.update({
    where: { id: token.id },
    data: { usedAt: new Date() },
  });

  return { ok: true, userId: token.userId };
}

export const CONSUME_FAILURE_MESSAGE: Record<ConsumeFailure, string> = {
  NOT_FOUND: "유효하지 않은 링크입니다.",
  EXPIRED: "링크가 만료되었습니다. 다시 요청해주세요.",
  ALREADY_USED: "이미 사용된 링크입니다.",
};
