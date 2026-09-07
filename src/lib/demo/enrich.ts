import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";
import { mintLot, transferUid } from "@/lib/ledger/ledgerService";
import { awardPoints, POINTS, isoWeek } from "@/lib/points/pointsService";
import { submitSurvey } from "@/lib/points/surveyService";
import { redeemReward } from "@/lib/points/rewardsService";
import { setConsent } from "@/lib/consent/consentService";

// 투자자 시연용 "실제처럼 보이는" 데모 데이터 시드(서버사이드).
// 운영 DB는 외부에서 직접 접속할 수 없으므로 관리자 엔드포인트로 컨테이너 안에서 실행한다.
//
// 멱등: 데모 소비자(이메일 고정)가 이미 있으면 재생성/재등록하지 않는다. 포인트 적립은
// dedupeKey로 중복 방지된다. 정품 등록은 정식 경로(MINT→EXPORT→WHOLESALE→RETAIL_SALE)를
// 그대로 태워 원장·시장분석 지표가 실제처럼 채워진다.

const DEMO_PASSWORD = "ledgermark1234";
const DEMO_LOT = "DEMO-ACT-01";

type Spec = {
  email: string;
  name: string;
  region: "Metro Manila" | "Cebu" | "Davao" | "기타";
  devices: number;
  surveys: string[];
  weeksAgo: number; // 0 = 이번 주 활성
  streak: number;
  redeem?: string; // 사용할 리워드 slug
};

const SPECS: Spec[] = [
  { email: "juan@demo.ph", name: "Juan Dela Cruz", region: "Metro Manila", devices: 3, surveys: ["onboarding-profile", "usage-habits", "brand-satisfaction"], weeksAgo: 0, streak: 6, redeem: "monthly-draw" },
  { email: "maria@demo.ph", name: "Maria Santos", region: "Metro Manila", devices: 2, surveys: ["onboarding-profile", "usage-habits"], weeksAgo: 0, streak: 4 },
  { email: "jose@demo.ph", name: "Jose Rizal", region: "Cebu", devices: 2, surveys: ["onboarding-profile", "brand-satisfaction"], weeksAgo: 0, streak: 8, redeem: "premium-content" },
  { email: "andres@demo.ph", name: "Andres Bonifacio", region: "Davao", devices: 1, surveys: ["onboarding-profile"], weeksAgo: 1, streak: 2 },
  { email: "nena@demo.ph", name: "Elena Aquino", region: "Metro Manila", devices: 3, surveys: ["onboarding-profile", "usage-habits", "next-product-interest"], weeksAgo: 0, streak: 5, redeem: "premium-content" },
  { email: "paolo@demo.ph", name: "Paolo Reyes", region: "Cebu", devices: 2, surveys: ["onboarding-profile", "usage-habits"], weeksAgo: 2, streak: 3 },
  { email: "kristine@demo.ph", name: "Kristine Lim", region: "Metro Manila", devices: 1, surveys: ["onboarding-profile"], weeksAgo: 0, streak: 1 },
  { email: "marco@demo.ph", name: "Marco Villanueva", region: "Davao", devices: 2, surveys: ["onboarding-profile", "brand-satisfaction"], weeksAgo: 0, streak: 3 },
  { email: "bea@demo.ph", name: "Bea Gonzales", region: "기타", devices: 1, surveys: ["onboarding-profile"], weeksAgo: 3, streak: 2 },
  { email: "ramon@demo.ph", name: "Ramon Cruz", region: "Metro Manila", devices: 2, surveys: ["onboarding-profile", "usage-habits", "brand-satisfaction", "next-product-interest"], weeksAgo: 0, streak: 7, redeem: "monthly-draw" },
  { email: "liza@demo.ph", name: "Liza Tan", region: "Cebu", devices: 1, surveys: ["onboarding-profile"], weeksAgo: 1, streak: 4 },
  { email: "nico@demo.ph", name: "Nico Ramos", region: "기타", devices: 2, surveys: ["onboarding-profile", "next-product-interest"], weeksAgo: 0, streak: 2 },
];

const AGE = ["20대", "30대", "40대", "50대 이상"];
const GENDER = ["남성", "여성", "응답 안 함"];
const FREQ = ["5회 미만", "5~15회", "15회 이상"];
const FLAVORS = ["멘솔", "과일", "타바코", "무향"];
const PLACE = ["편의점", "전문 매장", "온라인", "지인"];
const NPS = ["7", "8", "9", "10"];
const TRUST = ["매우 그렇다", "그렇다", "보통"];
const INTEREST = ["저니코틴", "대용량 배터리", "친환경 소재", "한정판 디자인"];
const PRICE = ["500 이하", "500~900", "900~1500", "1500 이상"];

function answersFor(slug: string, spec: Spec, i: number): Record<string, unknown> {
  switch (slug) {
    case "onboarding-profile":
      return { ageBand: AGE[i % AGE.length], region: spec.region, gender: GENDER[i % GENDER.length] };
    case "usage-habits":
      return {
        frequency: FREQ[i % FREQ.length],
        flavor: [FLAVORS[i % FLAVORS.length], FLAVORS[(i + 1) % FLAVORS.length]],
        purchasePlace: PLACE[i % PLACE.length],
      };
    case "brand-satisfaction":
      return { nps: NPS[i % NPS.length], trust: TRUST[i % TRUST.length], comment: "" };
    case "next-product-interest":
      return { interest: [INTEREST[i % INTEREST.length], INTEREST[(i + 2) % INTEREST.length]], price: PRICE[i % PRICE.length] };
    default:
      return { ok: true };
  }
}

async function fabricateCheckin(consumerId: string, weeksAgo: number, streak: number) {
  const now = new Date();
  const when = new Date(now.getTime() - weeksAgo * 7 * 86400000);
  const week = isoWeek(when);
  const base = POINTS.WEEKLY_CHECKIN;
  const bonus = Math.min((streak - 1) * POINTS.STREAK_STEP, POINTS.STREAK_MAX_BONUS);
  await awardPoints({
    consumerId,
    reason: "WEEKLY_CHECKIN",
    amount: base + bonus,
    dedupeKey: `checkin:${consumerId}:${week}`,
    memo: bonus > 0 ? `주간 출석 +${base}, ${streak}주 연속 보너스 +${bonus}` : "주간 출석",
  });
  await prisma.pointAccount.update({
    where: { consumerId },
    data: { checkinStreak: streak, lastCheckinWeek: week, lastCheckinAt: when },
  });
}

export type DemoEnrichResult = {
  createdConsumers: number;
  skippedConsumers: number;
  registrations: number;
  surveys: number;
  redemptions: number;
  note: string;
};

export async function seedDemoActivity(): Promise<DemoEnrichResult> {
  const [producer, importer, distributor] = await Promise.all([
    prisma.organization.findFirst({ where: { type: "PRODUCER" } }),
    prisma.organization.findFirst({ where: { type: "IMPORTER" } }),
    prisma.organization.findFirst({ where: { type: "DISTRIBUTOR" } }),
  ]);
  if (!producer || !importer || !distributor) {
    throw new Error("기본 조직(생산/수입/총판)이 없어 데모 시드를 진행할 수 없습니다.");
  }

  // 1) 데모 LOT을 총판까지 배분해 소매판매 가능한 UID 풀을 만든다(최초 1회).
  const existingLot = await prisma.lot.findUnique({ where: { code: DEMO_LOT } });
  if (!existingLot) {
    const { uidCodes } = await mintLot({
      code: DEMO_LOT,
      productName: "Aurora Pod · Demo",
      quantity: 40,
      producerOrgId: producer.id,
    });
    for (const code of uidCodes) {
      await transferUid(code, { txType: "EXPORT_TRANSFER", from: { type: "ORG", orgId: producer.id }, to: { type: "ORG", orgId: importer.id } });
      await transferUid(code, { txType: "WHOLESALE_TRANSFER", from: { type: "ORG", orgId: importer.id }, to: { type: "ORG", orgId: distributor.id } });
    }
  }

  // 소매판매 가능한(총판 보유·WHOLESALE) 데모 UID 풀
  const pool = await prisma.uid.findMany({
    where: { lot: { code: DEMO_LOT }, status: "WHOLESALE", ownerOrgId: distributor.id },
    select: { id: true, code: true },
  });
  let p = 0;

  const result: DemoEnrichResult = {
    createdConsumers: 0,
    skippedConsumers: 0,
    registrations: 0,
    surveys: 0,
    redemptions: 0,
    note: "",
  };

  for (let i = 0; i < SPECS.length; i++) {
    const spec = SPECS[i]!;
    const existing = await prisma.user.findUnique({ where: { email: spec.email } });
    if (existing) {
      result.skippedConsumers++;
      continue; // 이미 시드된 데모 계정은 건드리지 않는다(멱등).
    }

    // 소비자 + 계정(이메일 인증 완료 상태) 생성
    const consumer = await prisma.consumer.create({ data: { displayName: spec.name, country: "PH" } });
    await prisma.user.create({
      data: {
        email: spec.email,
        displayName: spec.name,
        role: "CONSUMER",
        consumerId: consumer.id,
        passwordHash: await hashPassword(DEMO_PASSWORD),
        emailVerifiedAt: new Date(),
      },
    });
    result.createdConsumers++;

    await awardPoints({ consumerId: consumer.id, reason: "SIGNUP_BONUS", amount: POINTS.SIGNUP_BONUS, dedupeKey: `signup:${consumer.id}`, memo: "가입 축하 포인트" });

    // 정품 등록: 풀에서 UID를 꺼내 정식 소매판매 전이 + 등록 포인트
    for (let d = 0; d < spec.devices && p < pool.length; d++) {
      const uid = pool[p++]!;
      await transferUid(uid.code, {
        txType: "RETAIL_SALE",
        from: { type: "ORG", orgId: distributor.id },
        to: { type: "CONSUMER", consumerId: consumer.id },
        ageVerified: true,
      });
      await awardPoints({
        consumerId: consumer.id,
        reason: "DEVICE_REGISTRATION",
        amount: POINTS.DEVICE_REGISTRATION,
        dedupeKey: `reg:${uid.id}`,
        memo: `정품 등록: ${uid.code}`,
        refType: "Uid",
        refId: uid.id,
      });
      result.registrations++;
    }

    // 설문 응답(포인트 적립)
    for (const slug of spec.surveys) {
      const survey = await prisma.survey.findUnique({ where: { slug } });
      if (!survey) continue;
      await submitSurvey({ consumerId: consumer.id, surveyId: survey.id, answers: answersFor(slug, spec, i) });
      result.surveys++;
    }

    // 주간 출석(스트릭/WAU 분포)
    await fabricateCheckin(consumer.id, spec.weeksAgo, spec.streak);

    // 일부는 리워드 사용(경품 응모/콘텐츠 해금)
    if (spec.redeem) {
      const reward = await prisma.reward.findUnique({ where: { slug: spec.redeem } });
      if (reward) {
        try {
          await redeemReward({ consumerId: consumer.id, rewardId: reward.id });
          result.redemptions++;
        } catch {
          // 잔액 부족 등은 무시
        }
      }
    }
  }

  // 동의(스코프별) + 할인 쿠폰 보장 — 신규/기존 데모 계정 모두에 idempotent하게 적용.
  // 동의 보상 포인트는 dedupeKey로, 쿠폰은 "미보유일 때만 발급"으로 중복을 막는다.
  const couponEmails = new Set(["juan@demo.ph", "maria@demo.ph", "ramon@demo.ph", "jose@demo.ph"]);
  for (let i = 0; i < SPECS.length; i++) {
    const spec = SPECS[i]!;
    const user = await prisma.user.findUnique({ where: { email: spec.email } });
    if (!user?.consumerId) continue;

    // 대부분 프로필·사용습관 동의, 절반은 맞춤 광고까지 동의(동의 기반 데이터 활용 모델).
    await setConsent(user.consumerId, {
      profile: true,
      usage: spec.surveys.includes("usage-habits"),
      marketing: i % 2 === 0,
      location: i % 3 === 0,
    });

    // 일부 데모 계정에 할인 쿠폰 1장 발급(미보유일 때만).
    if (couponEmails.has(spec.email)) {
      const hasCoupon = await prisma.coupon.count({ where: { consumerId: user.consumerId } });
      if (hasCoupon === 0) {
        const reward = await prisma.reward.findUnique({ where: { slug: "discount-10p" } });
        if (reward) {
          try {
            await redeemReward({ consumerId: user.consumerId, rewardId: reward.id });
            result.redemptions++;
          } catch {
            // 잔액 부족 등 무시
          }
        }
      }
    }
  }

  result.note =
    result.createdConsumers > 0
      ? `데모 소비자 ${result.createdConsumers}명 생성(등록 ${result.registrations}건, 설문 ${result.surveys}건, 리워드 ${result.redemptions}건). 동의·쿠폰 반영 완료.`
      : "데모 계정 존재 — 동의·쿠폰만 idempotent하게 보장했습니다.";
  return result;
}
