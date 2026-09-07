import { prisma } from "../src/lib/prisma";

// 포인트로 참여하는 설문(정보/질문)과 사용 가능한 리워드(콘텐츠·경품) 카탈로그.
// slug 기준 upsert라 여러 번 실행해도 중복 없이 최신 내용으로 맞춰진다.
// 응답(answers)은 마케팅 분석의 원천이 되므로 질문에 category를 달아 둔다.

const SURVEYS = [
  {
    slug: "onboarding-profile",
    title: "내 정보 알려주기",
    description: "기본 프로필을 입력하면 맞춤 혜택을 받을 수 있어요.",
    points: 80,
    category: "PROFILE",
    sortOrder: 1,
    questions: [
      { id: "ageBand", text: "연령대", type: "single", options: ["20대", "30대", "40대", "50대 이상"] },
      { id: "region", text: "거주 지역", type: "single", options: ["Metro Manila", "Cebu", "Davao", "기타"] },
      { id: "gender", text: "성별", type: "single", options: ["남성", "여성", "응답 안 함"] },
    ],
  },
  {
    slug: "usage-habits",
    title: "제품 사용 습관",
    description: "어떻게 사용하는지 알려주시면 제품 개선에 반영해요.",
    points: 120,
    category: "USAGE",
    sortOrder: 2,
    questions: [
      { id: "frequency", text: "하루 평균 사용 횟수", type: "single", options: ["5회 미만", "5~15회", "15회 이상"] },
      { id: "flavor", text: "선호하는 맛", type: "multi", options: ["멘솔", "과일", "타바코", "무향"] },
      { id: "purchasePlace", text: "주로 구매하는 곳", type: "single", options: ["편의점", "전문 매장", "온라인", "지인"] },
    ],
  },
  {
    slug: "brand-satisfaction",
    title: "브랜드 만족도",
    description: "정품 인증 경험은 어떠셨나요?",
    points: 100,
    category: "SATISFACTION",
    sortOrder: 3,
    questions: [
      { id: "nps", text: "지인에게 추천할 의향 (0~10)", type: "scale", options: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"] },
      { id: "trust", text: "정품 인증 기능이 구매 신뢰에 도움이 되나요?", type: "single", options: ["매우 그렇다", "그렇다", "보통", "아니다"] },
      { id: "comment", text: "개선했으면 하는 점 (선택)", type: "text" },
    ],
  },
  {
    slug: "next-product-interest",
    title: "신제품 관심 조사",
    description: "다음 제품 기획에 참여해 주세요.",
    points: 90,
    category: "MARKETING",
    sortOrder: 4,
    questions: [
      { id: "interest", text: "관심 있는 신제품 유형", type: "multi", options: ["저니코틴", "대용량 배터리", "친환경 소재", "한정판 디자인"] },
      { id: "price", text: "적정 가격대(페소)", type: "single", options: ["500 이하", "500~900", "900~1500", "1500 이상"] },
    ],
  },
];

const REWARDS = [
  {
    slug: "premium-content",
    title: "프리미엄 사용 가이드 해금",
    description: "전문가 팁·관리법 콘텐츠를 잠금 해제합니다.",
    cost: 200,
    type: "CONTENT" as const,
    stock: null,
    sortOrder: 1,
  },
  {
    slug: "cleaning-kit",
    title: "클리닝 키트 교환",
    description: "정품 클리닝 키트로 교환합니다. (매장 수령)",
    cost: 500,
    type: "GIFT" as const,
    stock: 100,
    sortOrder: 2,
  },
  {
    slug: "monthly-draw",
    title: "월간 경품 추첨 응모",
    description: "매달 추첨하는 한정판 디바이스 경품에 응모합니다.",
    cost: 300,
    type: "PRIZE_DRAW" as const,
    stock: null,
    sortOrder: 3,
  },
  {
    slug: "voucher-100",
    title: "제휴 매장 100P 상품권",
    description: "제휴 매장에서 현금처럼 쓰는 상품권으로 전환합니다.",
    cost: 1000,
    type: "GIFT" as const,
    stock: 50,
    sortOrder: 4,
  },
];

export async function seedSurveysAndRewards() {
  for (const s of SURVEYS) {
    await prisma.survey.upsert({
      where: { slug: s.slug },
      update: {
        title: s.title,
        description: s.description,
        points: s.points,
        category: s.category,
        sortOrder: s.sortOrder,
        questions: s.questions,
        active: true,
      },
      create: { ...s },
    });
  }
  for (const r of REWARDS) {
    await prisma.reward.upsert({
      where: { slug: r.slug },
      update: {
        title: r.title,
        description: r.description,
        cost: r.cost,
        type: r.type,
        sortOrder: r.sortOrder,
        active: true,
      },
      // 재고는 update에서 건드리지 않는다(운영 중 소진 상태를 시드가 되돌리지 않도록).
      create: { ...r },
    });
  }
  console.log(`Seeded ${SURVEYS.length} surveys, ${REWARDS.length} rewards.`);
}

const isMain = process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href;
if (isMain) {
  seedSurveysAndRewards()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
