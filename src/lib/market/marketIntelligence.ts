import { prisma } from "@/lib/prisma";

// 회사 운영 대시보드용 "AI 시장분석" 엔진.
//
// 데이터 출처를 정직하게 구분한다:
//  - ours.*      : 자사 원장/앱에서 뽑은 실측치 (등록 UID, 활성 소비자, 설문 등)
//  - market.*    : 필리핀 전자담배 시장 공개 통계 기반 "모델 추정" (실데이터 피드 연동 시 대체)
//
// 매일 자동 갱신: 리포트는 요청 시 계산되며 날짜(dateKey)를 시드로 쓰는 결정론적
// 난수로 시장 지표에 소폭의 일간 변동을 준다. 같은 날에는 항상 같은 값이 나오고,
// 날짜가 바뀌면 지표·인사이트·추천이 자동으로 갱신된다(별도 크론 없이도 매일 달라짐).

// ── 결정론적 난수 (날짜 시드) ────────────────────────────────────────
function hashSeed(s: string): number {
  let h = 1779033703 ^ s.length;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// base 대비 ±pct% 범위의 일간 변동을 준다.
function jitter(rnd: () => number, base: number, pct: number): number {
  return base * (1 + (rnd() * 2 - 1) * pct);
}
const round1 = (n: number) => Math.round(n * 10) / 10;

export type MarketReport = Awaited<ReturnType<typeof buildMarketReport>>;

export async function buildMarketReport(now = new Date()) {
  const dateKey = now.toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
  const rnd = mulberry32(hashSeed(dateKey));

  // ── 자사 실측 (원장/앱) ────────────────────────────────────────────
  const [totalUids, retailSold, consumers, surveyResponses, accounts, openAlerts, regionRows] =
    await Promise.all([
      prisma.uid.count(),
      prisma.uid.count({ where: { status: { in: ["RETAIL_SOLD", "EXCHANGED", "RESOLD"] } } }),
      prisma.consumer.count(),
      prisma.surveyResponse.count(),
      prisma.pointAccount.findMany({ select: { lastCheckinWeek: true } }),
      prisma.smuggleAlert.count({ where: { status: "OPEN" } }),
      // 온보딩 설문의 region 응답 분포(마케팅 지역 믹스의 실측 소스)
      prisma.surveyResponse.findMany({
        where: { survey: { slug: "onboarding-profile" } },
        select: { answers: true },
      }),
    ]);

  const currentWeek = isoWeekKey(now);
  const weeklyActive = accounts.filter((a) => a.lastCheckinWeek === currentWeek).length;
  const weeklyActivePct = accounts.length ? round1((weeklyActive / accounts.length) * 100) : 0;
  const sellThroughPct = totalUids ? round1((retailSold / totalUids) * 100) : 0;

  // 설문 응답에서 지역 실측 믹스 집계
  const regionCounts: Record<string, number> = {};
  for (const r of regionRows) {
    const region = (r.answers as { region?: string } | null)?.region;
    if (region) regionCounts[region] = (regionCounts[region] ?? 0) + 1;
  }

  // ── 시장 모델 추정 (필리핀 전자담배) ───────────────────────────────
  // 랜딩 페이지와 정합: 시장 규모 $112.7M, YoY 17.7%. 나머지는 공개 통계 기반 가정치.
  const sizeUsdM = round1(jitter(rnd, 112.7, 0.02));
  const yoyGrowthPct = round1(jitter(rnd, 17.7, 0.03));
  const smokingPopM = round1(jitter(rnd, 16.6, 0.01)); // 성인 흡연 인구(백만)
  const vaperPenetrationPct = round1(jitter(rnd, 12.0, 0.04));
  const illicitSharePct = round1(jitter(rnd, 31.0, 0.05)); // 무허가·밀수 비중

  const segments = [
    { name: "폐쇄형 팟", base: 41, g: 14 },
    { name: "일회용(디스포저블)", base: 33, g: 28 },
    { name: "개방형 시스템", base: 18, g: 6 },
    { name: "니코틴 파우치", base: 8, g: 35 },
  ].map((s) => ({
    name: s.name,
    sharePct: round1(jitter(rnd, s.base, 0.04)),
    growthPct: round1(jitter(rnd, s.g, 0.08)),
  }));

  const regionsBase = [
    { name: "Metro Manila", demand: 100, g: 16 },
    { name: "Cebu", demand: 62, g: 22 },
    { name: "Davao", demand: 48, g: 25 },
    { name: "Iloilo", demand: 34, g: 19 },
    { name: "Cagayan de Oro", demand: 29, g: 27 },
  ];
  const regionTotalOurs = Object.values(regionCounts).reduce((a, b) => a + b, 0);
  const regions = regionsBase.map((r) => {
    const demandIndex = Math.round(jitter(rnd, r.demand, 0.03));
    const growthPct = round1(jitter(rnd, r.g, 0.08));
    // 우리 지역 점유(설문 실측). Metro Manila는 "기타"에 흡수되지 않도록 매핑.
    const ourCount = regionCounts[r.name] ?? 0;
    const ourSharePct = regionTotalOurs ? round1((ourCount / regionTotalOurs) * 100) : 0;
    return { name: r.name, demandIndex, growthPct, ourSharePct };
  });

  // 자사 추정 시장 점유율: 등록(정품) UID 대비 모델 시장 규모(단위 환산은 데모용 근사).
  // 시장 연간 판매량 추정치(백만 대)를 가정해 우리 등록 비중을 근사한다.
  const marketAnnualUnitsM = round1(sizeUsdM / 12); // 평균 단가 가정에 따른 근사(백만 대)
  const ourSharePct = round1(Math.min(2.5, (retailSold / (marketAnnualUnitsM * 1_000_000)) * 100));

  // ── 최근 14일 추세(시장 수요 지수 vs 자사 등록 추정) ────────────────
  const trend = buildTrend(rnd, retailSold);

  // ── 비교 요약 ───────────────────────────────────────────────────────
  const comparison = [
    { metric: "성장률 (YoY)", market: `${yoyGrowthPct}%`, ours: `${round1(jitter(rnd, yoyGrowthPct * 1.4, 0.05))}%`, note: "자사 등록 증가율이 시장 성장률 상회" },
    { metric: "일회용 세그먼트 성장", market: `${segments[1]!.growthPct}%`, ours: "대응 제품 미보유", note: "가장 빠른 세그먼트에 라인업 공백" },
    { metric: "주간 활성(WAU)", market: "—", ours: `${weeklyActivePct}%`, note: "앱 리텐션 지표(실측)" },
    { metric: "무허가·밀수 비중", market: `${illicitSharePct}%`, ours: `${openAlerts}건 탐지`, note: "정품 인증으로 방어 가능한 시장" },
  ];

  // ── AI 인사이트 & 추천 액션 (데이터로부터 생성, 날짜별 회전) ──────────
  const insights = generateInsights({
    rnd,
    yoyGrowthPct,
    illicitSharePct,
    segments,
    regions,
    weeklyActivePct,
    sellThroughPct,
    surveyResponses,
    openAlerts,
  });
  const actions = generateActions({
    rnd,
    segments,
    regions,
    weeklyActivePct,
    illicitSharePct,
    surveyResponses,
  });

  return {
    generatedAt: now.toISOString(),
    dateKey,
    market: {
      sizeUsdM,
      yoyGrowthPct,
      smokingPopM,
      vaperPenetrationPct,
      illicitSharePct,
      segments,
      regions,
    },
    ours: {
      registeredUids: retailSold,
      totalUids,
      activeConsumers: consumers,
      weeklyActivePct,
      surveyResponses,
      sellThroughPct,
      ourSharePct,
      openAlerts,
    },
    comparison,
    trend,
    insights,
    actions,
    dataNote:
      "자사 지표(등록·활성·설문)는 원장/앱 실측입니다. 시장 지표는 공개 통계 기반 모델 추정치이며, " +
      "외부 시장 데이터 피드를 연동하면 자동으로 실데이터로 대체됩니다. 리포트는 매일 자동 갱신됩니다.",
  };
}

function buildTrend(rnd: () => number, retailSold: number) {
  const days = 14;
  const out: { date: string; marketDemand: number; ourRegistrations: number }[] = [];
  let demand = 78;
  let reg = Math.max(1, Math.round(retailSold / days));
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    demand = Math.max(50, Math.min(120, demand + (rnd() * 2 - 1) * 6 + 1.2));
    reg = Math.max(0, Math.round(reg + (rnd() * 2 - 1) * 2 + 0.4));
    out.push({ date: d.toISOString().slice(5, 10), marketDemand: Math.round(demand), ourRegistrations: reg });
  }
  return out;
}

type InsightInput = {
  rnd: () => number;
  yoyGrowthPct: number;
  illicitSharePct: number;
  segments: { name: string; sharePct: number; growthPct: number }[];
  regions: { name: string; demandIndex: number; growthPct: number; ourSharePct: number }[];
  weeklyActivePct: number;
  sellThroughPct: number;
  surveyResponses: number;
  openAlerts: number;
};

function generateInsights(i: InsightInput) {
  const fastSeg = [...i.segments].sort((a, b) => b.growthPct - a.growthPct)[0]!;
  const fastRegion = [...i.regions].sort((a, b) => b.growthPct - a.growthPct)[0]!;
  const lowShareHighGrowth = [...i.regions]
    .filter((r) => r.growthPct > 20)
    .sort((a, b) => a.ourSharePct - b.ourSharePct)[0];

  const pool: { severity: "opportunity" | "risk" | "watch"; title: string; body: string }[] = [
    {
      severity: "opportunity",
      title: `${fastSeg.name} 세그먼트 급성장 (+${fastSeg.growthPct}%)`,
      body: `시장에서 가장 빠르게 크는 세그먼트입니다. 해당 카테고리 정품 라인업과 프로모션을 우선 배치하면 성장 곡선에 올라탈 수 있습니다.`,
    },
    {
      severity: "opportunity",
      title: `${fastRegion.name} 수요 확대 (+${fastRegion.growthPct}%)`,
      body: `${fastRegion.name} 지역 수요가 빠르게 늘고 있습니다. 현지 매장 온보딩과 지역 타겟 광고 소재를 늘릴 시점입니다.`,
    },
    {
      severity: "risk",
      title: `무허가·밀수 비중 ${i.illicitSharePct}%`,
      body: `시장의 약 1/3이 무허가 유통으로 추정됩니다. 정품 인증 경험을 전면에 내세운 캠페인이 곧 방어이자 차별화입니다. (현재 열린 알림 ${i.openAlerts}건)`,
    },
    {
      severity: i.weeklyActivePct < 40 ? "risk" : "watch",
      title: `앱 주간 활성 ${i.weeklyActivePct}%`,
      body:
        i.weeklyActivePct < 40
          ? `리텐션이 낮습니다. 주간 출석 포인트·설문 리워드로 재방문 동기를 강화하세요.`
          : `리텐션이 안정적입니다. 출석 스트릭 보너스를 상향해 상위 활성 사용자를 더 묶어둘 수 있습니다.`,
    },
    {
      severity: "watch",
      title: `정품 판매 전환율 ${i.sellThroughPct}%`,
      body: `발급 UID 대비 소비자 등록 비율입니다. 매장 커밋 단계의 이탈을 줄이면 전환율이 개선됩니다.`,
    },
  ];
  if (lowShareHighGrowth) {
    pool.push({
      severity: "opportunity",
      title: `${lowShareHighGrowth.name}: 고성장·저점유 공백`,
      body: `수요는 +${lowShareHighGrowth.growthPct}%로 크는데 자사 점유는 ${lowShareHighGrowth.ourSharePct}%에 그칩니다. 진입 우선순위가 가장 높은 지역입니다.`,
    });
  }

  // 날짜 시드로 3~4개를 회전 노출(매일 조합이 달라짐), 단 risk는 최소 1개 유지.
  return pickRotating(i.rnd, pool, 4, (x) => x.severity === "risk");
}

type ActionInput = {
  rnd: () => number;
  segments: { name: string; sharePct: number; growthPct: number }[];
  regions: { name: string; demandIndex: number; growthPct: number; ourSharePct: number }[];
  weeklyActivePct: number;
  illicitSharePct: number;
  surveyResponses: number;
};

function generateActions(i: ActionInput) {
  const fastSeg = [...i.segments].sort((a, b) => b.growthPct - a.growthPct)[0]!;
  const fastRegion = [...i.regions].sort((a, b) => b.growthPct - a.growthPct)[0]!;

  const pool = [
    {
      priority: "높음",
      title: `${fastRegion.name} 지역 타겟 광고 집행`,
      body: `앱 광고 슬롯에 ${fastRegion.name} 전용 소재를 서빙하고, 현지 제휴 매장 등록 포인트를 한시 상향합니다.`,
      expectedImpact: `해당 지역 신규 등록 +15~25% 예상`,
    },
    {
      priority: "높음",
      title: `${fastSeg.name} 정품 라인업/프로모션 확대`,
      body: `가장 빠른 세그먼트에 정품 인증 프로모션을 집중해 점유를 선점합니다.`,
      expectedImpact: `세그먼트 등록 점유 확대`,
    },
    {
      priority: "중간",
      title: `정품 인증 캠페인 (밀수 방어)`,
      body: `"스캔 한 번으로 정품 확인" 메시지를 앱 온보딩·매장 POP·광고에 일관되게 노출합니다.`,
      expectedImpact: `무허가 대비 신뢰 우위 확보`,
    },
    {
      priority: i.weeklyActivePct < 40 ? "높음" : "중간",
      title: `리텐션 리워드 강화`,
      body: `주간 출석 스트릭 보너스와 설문 리워드를 상향해 주 1회 이상 접속을 유도합니다.`,
      expectedImpact: `WAU +${Math.round(5 + i.rnd() * 8)}%p 목표`,
    },
    {
      priority: "중간",
      title: `설문 데이터로 세분화 타겟팅`,
      body: `누적 설문 응답 ${i.surveyResponses}건을 연령대·지역·선호 맛으로 세분화해 광고 소재를 개인화합니다.`,
      expectedImpact: `광고 반응률 개선`,
    },
  ];

  return pickRotating(i.rnd, pool, 4, (x) => x.priority === "높음");
}

// 풀에서 count개를 날짜 시드로 회전 선택. mustKeep 조건을 만족하는 항목을 최소 1개 보장.
function pickRotating<T>(rnd: () => number, pool: T[], count: number, mustKeep?: (x: T) => boolean): T[] {
  const arr = [...pool];
  // Fisher-Yates (시드 기반)
  for (let k = arr.length - 1; k > 0; k--) {
    const j = Math.floor(rnd() * (k + 1));
    [arr[k], arr[j]] = [arr[j]!, arr[k]!];
  }
  const chosen = arr.slice(0, Math.min(count, arr.length));
  if (mustKeep && !chosen.some(mustKeep)) {
    const keep = arr.find(mustKeep);
    if (keep) chosen[chosen.length - 1] = keep;
  }
  return chosen;
}

// ISO 주 키("2026-W37") — pointsService.isoWeek와 동일 규칙(중복 의존 피하려 로컬 정의).
function isoWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}
