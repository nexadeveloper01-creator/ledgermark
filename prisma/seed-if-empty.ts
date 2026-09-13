import { prisma } from "../src/lib/prisma";
import { seed } from "./seed";
import { seedSurveysAndRewards } from "./seed-points";
import { ensureTestAccounts } from "./ensure-test-accounts";
import { ensureDemoStock } from "./ensure-demo-stock";
import { ensureDemoRequests } from "./ensure-demo-requests";

// 배포 컨테이너 기동 시 호출된다. 계정이 하나도 없을 때(빈 DB)만 전체 시드하며,
// 설문·리워드 카탈로그는 이미 데이터가 있는 DB에도 매번 idempotent(upsert)하게
// 보장한다(신규 기능 배포 시 콘텐츠가 비어 있지 않도록). 시드 실패가 서버 기동을
// 막지 않도록 어떤 경우에도 정상 종료한다.
async function main() {
  try {
    const users = await prisma.user.count();
    if (users > 0) {
      console.log(`[seed-if-empty] 계정 ${users}개 존재 — 전체 시드는 건너뜀`);
      // 포인트 제도 콘텐츠(설문·리워드)는 기존 DB에도 보장한다.
      await seedSurveysAndRewards();
      // 역할별 테스트 로그인 계정도 기존 DB에 매번 보장한다.
      await ensureTestAccounts();
      // 시연용 300개 재고(데모 LOT 없을 때 1회).
      await ensureDemoStock();
      // 소매점 판매 큐 시연 데이터(소매 재고 + 대기 판매요청).
      await ensureDemoRequests();
      return;
    }
    console.log("[seed-if-empty] 빈 DB 감지 — 데모 데이터 시드 실행");
    await seed();
    await ensureTestAccounts();
    await ensureDemoStock();
    await ensureDemoRequests();
  } catch (err) {
    // 기동을 막지 않는다. 로그만 남기고 넘어간다.
    console.error("[seed-if-empty] 시드 중 오류(무시하고 기동 계속):", err);
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

main();
