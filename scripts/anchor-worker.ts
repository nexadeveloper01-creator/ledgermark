// cron 인프라가 없는 환경(로컬 개발, 온프레미스 단일 서버)에서 앵커링을 주기 실행한다.
// 배포 환경에 cron이 있다면 이 워커 대신 /api/ledger/anchor/cron을 호출하는 편이 낫다.
import { prisma } from "../src/lib/prisma";
import { runScheduledAnchoring } from "../src/lib/anchor/scheduler";
import { loadScheduleConfig } from "../src/lib/anchor/schedule";

const intervalMs = Number(process.env.ANCHOR_WORKER_INTERVAL_SEC ?? 60) * 1000;
let stopping = false;

async function tick() {
  try {
    const result = await runScheduledAnchoring();
    const { decision } = result;

    if (result.anchoredId) {
      console.log(
        `[anchor] 앵커 생성 ${result.anchoredId} (${decision.reason}, ${decision.pendingCount}건) → ${result.anchoredStatus}`
      );
    } else if (result.skippedByRace) {
      console.log("[anchor] 다른 인스턴스가 먼저 앵커링함 — 건너뜀");
    } else {
      console.log(`[anchor] 대기 (${decision.reason}, 미앵커 ${decision.pendingCount}건)`);
    }

    for (const r of result.retried) {
      console.log(`[anchor] 실패 앵커 재시도 ${r.id} → ${r.status}`);
    }
  } catch (err) {
    console.error("[anchor] 실행 중 오류", err);
  }
}

async function main() {
  const config = loadScheduleConfig();
  console.log(
    `[anchor] 워커 시작 — ${intervalMs / 1000}초 주기 / 임계치 ${config.minBatch}건 / 최대 지연 ${config.maxDelayMs / 60000}분`
  );

  while (!stopping) {
    await tick();
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}

const shutdown = async () => {
  stopping = true;
  await prisma.$disconnect();
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
