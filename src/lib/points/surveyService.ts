import { prisma } from "@/lib/prisma";
import { awardPoints, PointsError } from "./pointsService";

// 앱이 요구하는 정보·질문(설문)에 응답하면 포인트를 적립한다.
// 같은 설문은 소비자당 한 번만 적립되며(응답 UNIQUE + 적립 dedupeKey), 마케팅 분석을 위해
// 응답 원본은 SurveyResponse.answers(JSON)에 그대로 남긴다.

export type SurveyView = {
  id: string;
  slug: string;
  title: string;
  description: string;
  points: number;
  category: string;
  questions: unknown;
  completed: boolean;
};

/** 활성 설문 목록 + 소비자별 완료 여부. */
export async function listSurveys(consumerId: string): Promise<SurveyView[]> {
  const [surveys, responses] = await Promise.all([
    prisma.survey.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
    prisma.surveyResponse.findMany({ where: { consumerId }, select: { surveyId: true } }),
  ]);
  const done = new Set(responses.map((r) => r.surveyId));
  return surveys.map((s) => ({
    id: s.id,
    slug: s.slug,
    title: s.title,
    description: s.description,
    points: s.points,
    category: s.category,
    questions: s.questions,
    completed: done.has(s.id),
  }));
}

export type SubmitResult = { awarded: number; balance: number; alreadyDone: boolean };

/** 설문 응답 제출 → 최초 1회 포인트 적립. */
export async function submitSurvey(args: {
  consumerId: string;
  surveyId: string;
  answers: unknown;
}): Promise<SubmitResult> {
  const survey = await prisma.survey.findUnique({ where: { id: args.surveyId } });
  if (!survey || !survey.active) throw new PointsError("설문을 찾을 수 없습니다.");

  if (args.answers == null || typeof args.answers !== "object") {
    throw new PointsError("응답 형식이 올바르지 않습니다.");
  }

  return prisma.$transaction(async (tx) => {
    const existing = await tx.surveyResponse.findUnique({
      where: { surveyId_consumerId: { surveyId: survey.id, consumerId: args.consumerId } },
    });
    if (existing) {
      const account = await tx.pointAccount.findUnique({ where: { consumerId: args.consumerId } });
      return { awarded: 0, balance: account?.balance ?? 0, alreadyDone: true };
    }

    await tx.surveyResponse.create({
      data: {
        surveyId: survey.id,
        consumerId: args.consumerId,
        answers: args.answers as object,
        awarded: survey.points,
      },
    });

    const res = await awardPoints(
      {
        consumerId: args.consumerId,
        reason: "SURVEY_COMPLETION",
        amount: survey.points,
        dedupeKey: `survey:${args.consumerId}:${survey.id}`,
        memo: `설문 참여: ${survey.title}`,
        refType: "Survey",
        refId: survey.id,
      },
      tx
    );

    return { awarded: res.amount, balance: res.balance, alreadyDone: false };
  });
}
