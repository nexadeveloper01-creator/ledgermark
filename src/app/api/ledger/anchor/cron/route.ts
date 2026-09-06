import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { recordAudit } from "@/lib/audit/log";
import { runScheduledAnchoring } from "@/lib/anchor/scheduler";
import { loadScheduleConfig } from "@/lib/anchor/schedule";

export const dynamic = "force-dynamic";

// 외부 스케줄러(cron, Vercel Cron, K8s CronJob 등)가 호출하는 엔드포인트.
// 사람 세션이 아니라 공유 시크릿으로 인증한다.
function authorize(req: NextRequest): boolean {
  const secret = process.env.ANCHOR_CRON_SECRET;
  if (!secret) return false;

  const header = req.headers.get("authorization") ?? "";
  const provided = header.startsWith("Bearer ") ? header.slice(7) : "";

  const a = Buffer.from(provided);
  const b = Buffer.from(secret);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  if (!process.env.ANCHOR_CRON_SECRET) {
    return NextResponse.json(
      { error: "ANCHOR_CRON_SECRET이 설정되지 않아 자동 앵커링이 비활성화되어 있습니다." },
      { status: 503 }
    );
  }

  if (!authorize(req)) {
    return NextResponse.json({ error: "인증에 실패했습니다." }, { status: 401 });
  }

  const result = await runScheduledAnchoring();

  if (result.anchoredId) {
    await recordAudit({
      action: "ANCHOR_RUN",
      actorEmail: "system:cron",
      req,
      targetType: "Anchor",
      targetId: result.anchoredId,
      detail: {
        trigger: "SCHEDULED",
        reason: result.decision.reason,
        txCount: result.decision.pendingCount,
        status: result.anchoredStatus,
      },
    });
  }

  return NextResponse.json({
    anchored: result.anchoredId !== null,
    anchorId: result.anchoredId,
    status: result.anchoredStatus,
    decision: result.decision,
    retried: result.retried,
    skippedByRace: result.skippedByRace,
    policy: loadScheduleConfig(),
  });
}
