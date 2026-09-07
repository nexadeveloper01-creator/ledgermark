import { NextResponse } from "next/server";
import { authErrorResponse, requireUser } from "@/lib/auth/guards";
import { listSurveys } from "@/lib/points/surveyService";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireUser();
    if (user.role !== "CONSUMER" || !user.consumerId) {
      return NextResponse.json({ error: "소비자 계정만 이용할 수 있습니다." }, { status: 403 });
    }
    const surveys = await listSurveys(user.consumerId);
    return NextResponse.json({ surveys });
  } catch (err) {
    const res = authErrorResponse(err);
    if (res) return res;
    throw err;
  }
}
