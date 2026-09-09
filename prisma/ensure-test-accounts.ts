import { prisma } from "../src/lib/prisma";
import { hashPassword } from "../src/lib/auth/password";

// 테스트용 역할별 로그인 계정 세트(@ledgermark.com, 공통 비밀번호).
// 부팅 시 매번 idempotent(upsert)하게 보장한다 — 파일럿/데모 편의용.
export const TEST_ACCOUNT_PASSWORD = "ledgermark2026!";

async function orgByType(type: string, nameLike?: string) {
  const orgs = await prisma.organization.findMany({ where: { type: type as never } });
  if (nameLike) {
    const m = orgs.find((o) => o.name.includes(nameLike));
    if (m) return m;
  }
  return orgs[0] ?? null;
}

export async function ensureTestAccounts() {
  const verifiedAt = new Date();
  const passwordHash = await hashPassword(TEST_ACCOUNT_PASSWORD);

  const ledgerOperator = await orgByType("LEDGER_OPERATOR");
  const boc = await orgByType("GOVERNMENT", "관세청");
  const pnp = await orgByType("GOVERNMENT", "PNP");
  const retailer = await orgByType("RETAILER");
  const distributor = await orgByType("DISTRIBUTOR");

  if (!ledgerOperator || !boc || !pnp || !retailer || !distributor) {
    console.warn(
      `[ensure-test-accounts] 조직 미존재로 건너뜀: operator=${!!ledgerOperator} boc=${!!boc} pnp=${!!pnp} retailer=${!!retailer} distributor=${!!distributor}`
    );
    return;
  }

  // 소비자 계정용 Consumer 레코드(없으면 생성)
  const existing = await prisma.user.findUnique({ where: { email: "consumer@ledgermark.com" } });
  let consumerId = existing?.consumerId ?? null;
  if (!consumerId) {
    const c = await prisma.consumer.create({ data: { displayName: "테스트 소비자", country: "PH" } });
    consumerId = c.id;
  }

  const accounts = [
    { email: "admin@ledgermark.com", displayName: "테스트 운영자", role: "ADMIN", organizationId: ledgerOperator.id, consumerId: null, isOrgManager: false },
    { email: "inspector@ledgermark.com", displayName: "테스트 심사관 (관세청)", role: "GOV_INSPECTOR", organizationId: boc.id, consumerId: null, isOrgManager: false },
    { email: "officer@ledgermark.com", displayName: "테스트 단속관 (경찰)", role: "FIELD_OFFICER", organizationId: pnp.id, consumerId: null, isOrgManager: false },
    { email: "store@ledgermark.com", displayName: "테스트 매장 담당", role: "PARTNER_STAFF", organizationId: retailer.id, consumerId: null, isOrgManager: true },
    { email: "distributor@ledgermark.com", displayName: "테스트 총판 담당", role: "PARTNER_STAFF", organizationId: distributor.id, consumerId: null, isOrgManager: true },
    { email: "consumer@ledgermark.com", displayName: "테스트 소비자", role: "CONSUMER", organizationId: null, consumerId, isOrgManager: false },
  ] as const;

  for (const a of accounts) {
    await prisma.user.upsert({
      where: { email: a.email },
      update: {
        passwordHash,
        emailVerifiedAt: verifiedAt,
        displayName: a.displayName,
        role: a.role as never,
        organizationId: a.organizationId,
        consumerId: a.consumerId,
        isOrgManager: a.isOrgManager,
        disabledAt: null,
      },
      create: {
        email: a.email,
        passwordHash,
        emailVerifiedAt: verifiedAt,
        displayName: a.displayName,
        role: a.role as never,
        organizationId: a.organizationId,
        consumerId: a.consumerId,
        isOrgManager: a.isOrgManager,
      },
    });
  }
  console.log(`[ensure-test-accounts] 역할별 테스트 계정 ${accounts.length}개 보장 완료`);
}
