import { prisma } from "@/lib/prisma";
import { awardPoints } from "@/lib/points/pointsService";

// 개인정보 수집·활용 동의. 스코프별로 동의를 받고, 최초 동의 시 스코프별 보상 포인트를
// 지급한다(철회 후 재동의해도 dedupeKey로 재지급되지 않는다). 변경은 append-only
// ConsentEvent에 기록해 "언제 무엇에 동의/철회했는지"를 추적할 수 있게 한다.

export const CONSENT_SCOPES = ["profile", "usage", "location", "marketing"] as const;
export type ConsentScope = (typeof CONSENT_SCOPES)[number];

export const SCOPE_POINTS: Record<ConsentScope, number> = {
  profile: 80,
  usage: 40,
  location: 40,
  marketing: 40,
};

export const SCOPE_LABEL: Record<ConsentScope, string> = {
  profile: "프로필 정보(연령대·지역)",
  usage: "제품 사용 습관",
  location: "위치 기반",
  marketing: "맞춤 광고·마케팅 활용",
};

export type ConsentView = {
  scopes: Record<ConsentScope, boolean>;
  rewardedScopes: ConsentScope[];
  scopePoints: Record<ConsentScope, number>;
  scopeLabels: Record<ConsentScope, string>;
  consentPointsEarned: number;
  updatedAt: string | null;
};

async function rewardedScopesFor(consumerId: string): Promise<ConsentScope[]> {
  const account = await prisma.pointAccount.findUnique({ where: { consumerId } });
  if (!account) return [];
  const entries = await prisma.pointLedgerEntry.findMany({
    where: { accountId: account.id, reason: "CONSENT_REWARD" },
    select: { dedupeKey: true },
  });
  const out: ConsentScope[] = [];
  for (const e of entries) {
    const scope = e.dedupeKey?.split(":").pop() as ConsentScope | undefined;
    if (scope && CONSENT_SCOPES.includes(scope)) out.push(scope);
  }
  return out;
}

export async function getConsent(consumerId: string): Promise<ConsentView> {
  const [record, rewarded, account] = await Promise.all([
    prisma.consentRecord.findUnique({ where: { consumerId } }),
    rewardedScopesFor(consumerId),
    prisma.pointAccount.findUnique({ where: { consumerId } }),
  ]);
  const consentPointsEarned = account
    ? (
        await prisma.pointLedgerEntry.aggregate({
          where: { accountId: account.id, reason: "CONSENT_REWARD" },
          _sum: { amount: true },
        })
      )._sum.amount ?? 0
    : 0;
  return {
    scopes: {
      profile: record?.profile ?? false,
      usage: record?.usage ?? false,
      location: record?.location ?? false,
      marketing: record?.marketing ?? false,
    },
    rewardedScopes: rewarded,
    scopePoints: SCOPE_POINTS,
    scopeLabels: SCOPE_LABEL,
    consentPointsEarned,
    updatedAt: record?.updatedAt.toISOString() ?? null,
  };
}

export type SetConsentResult = { awarded: number; balance: number; scopes: Record<ConsentScope, boolean> };

/** 동의 상태를 갱신한다. 새로 켠 스코프는 보상 지급(최초 1회), 변경은 이벤트로 기록. */
export async function setConsent(
  consumerId: string,
  next: Partial<Record<ConsentScope, boolean>>
): Promise<SetConsentResult> {
  const current = await prisma.consentRecord.findUnique({ where: { consumerId } });
  const prevState: Record<ConsentScope, boolean> = {
    profile: current?.profile ?? false,
    usage: current?.usage ?? false,
    location: current?.location ?? false,
    marketing: current?.marketing ?? false,
  };

  const newState: Record<ConsentScope, boolean> = { ...prevState };
  for (const scope of CONSENT_SCOPES) {
    if (typeof next[scope] === "boolean") newState[scope] = next[scope]!;
  }

  await prisma.consentRecord.upsert({
    where: { consumerId },
    update: { ...newState },
    create: { consumerId, ...newState },
  });

  // 변경 이력 기록 + 새로 동의한 스코프 보상
  let awarded = 0;
  for (const scope of CONSENT_SCOPES) {
    if (newState[scope] !== prevState[scope]) {
      await prisma.consentEvent.create({
        data: { consumerId, scope, granted: newState[scope] },
      });
    }
    if (newState[scope]) {
      const res = await awardPoints({
        consumerId,
        reason: "CONSENT_REWARD",
        amount: SCOPE_POINTS[scope],
        dedupeKey: `consent:${consumerId}:${scope}`,
        memo: `${SCOPE_LABEL[scope]} 동의 보상`,
      });
      if (!res.skipped) awarded += res.amount;
    }
  }

  const account = await prisma.pointAccount.findUnique({ where: { consumerId } });
  return { awarded, balance: account?.balance ?? 0, scopes: newState };
}
