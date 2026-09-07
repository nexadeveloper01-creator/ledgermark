import { prisma } from "../src/lib/prisma";
import { seed } from "./seed";

// 배포 컨테이너 기동 시 호출된다. 계정이 하나도 없을 때(빈 DB)만 시드하며,
// 시드 실패가 서버 기동을 막지 않도록 어떤 경우에도 정상 종료한다.
async function main() {
  try {
    const users = await prisma.user.count();
    if (users > 0) {
      console.log(`[seed-if-empty] 계정 ${users}개 존재 — 시드 건너뜀`);
      return;
    }
    console.log("[seed-if-empty] 빈 DB 감지 — 데모 데이터 시드 실행");
    await seed();
  } catch (err) {
    // 기동을 막지 않는다. 로그만 남기고 넘어간다.
    console.error("[seed-if-empty] 시드 중 오류(무시하고 기동 계속):", err);
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

main();
