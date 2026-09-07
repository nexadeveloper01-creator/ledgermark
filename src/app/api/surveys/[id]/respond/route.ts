import { NextRequest, NextResponse } from "next/server";
import { authErrorResponse, requireUser } from "@/lib/auth/guards";
import { submitSurvey } from "@/lib/points/surveyService";
import { PointsError } from "@/lib/points/pointsService";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    if (user.role !== "CONSUMER" || !user.consumerId) {
      return NextResponse.json({ error: "소비자 계정만 이용할 수 있습니다." }, { status: 403 });
    }
    const body = await req.json();
    const result = await submitSurvey({
      consumerId: user.consumerId,
      surveyId: params.id,
      answers: body?.answers,
    });
    return NextResponse.json(result);
  } catch (err) {
    const res = authErrorResponse(err);
    if (res) return res;
    if (err instanceof PointsError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    throw err;
  }
}
