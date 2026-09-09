import { createHash, randomBytes } from "crypto";
import { cookies, headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE } from "./cookie";
import { isDeveloperEmail } from "./developer";

export { SESSION_COOKIE };
const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 관제 콘솔·단속 단말을 고려해 8시간으로 짧게 둔다

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await prisma.session.create({
    data: { tokenHash: hashToken(token), userId, expiresAt },
  });

  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });

  return { token, expiresAt };
}

export interface SessionUser {
  id: string;
  email: string;
  displayName: string;
  role: "ADMIN" | "GOV_INSPECTOR" | "FIELD_OFFICER" | "PARTNER_STAFF" | "CONSUMER";
  organizationId: string | null;
  organizationName: string | null;
  organizationType: string | null;
  consumerId: string | null;
  isOrgManager: boolean;
  emailVerified: boolean;
  isDeveloper: boolean;
}

// 웹은 httpOnly 쿠키를, 모바일·API 클라이언트(Flutter 등)는 Authorization: Bearer를 쓴다.
// 세션 토큰은 어느 쪽이든 동일하게 해시로 대조하므로 두 경로를 함께 지원한다.
function resolveToken(): string | null {
  const cookieToken = cookies().get(SESSION_COOKIE)?.value;
  if (cookieToken) return cookieToken;

  const auth = headers().get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7).trim() || null;
  return null;
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const token = resolveToken();
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: { include: { organization: { select: { name: true, type: true } } } } },
  });

  if (!session) return null;
  if (session.expiresAt < new Date()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  const { user } = session;

  // 비활성화된 계정의 세션은 즉시 무효로 취급한다.
  if (user.disabledAt) {
    await prisma.session.deleteMany({ where: { userId: user.id } }).catch(() => {});
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    organizationId: user.organizationId,
    organizationName: user.organization?.name ?? null,
    organizationType: user.organization?.type ?? null,
    consumerId: user.consumerId,
    isOrgManager: user.isOrgManager,
    emailVerified: user.emailVerifiedAt !== null,
    isDeveloper: isDeveloperEmail(user.email),
  };
}

export async function destroySession() {
  const token = resolveToken();
  if (token) {
    await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  }
  cookies().delete(SESSION_COOKIE);
}
