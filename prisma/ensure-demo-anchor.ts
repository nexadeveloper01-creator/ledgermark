import { prisma } from "../src/lib/prisma";
import { runAnchorCycle } from "../src/lib/ledger/ledgerService";

// 시연용 블록체인 앵커 1건 보장.
//
// 이 플랫폼의 핵심 가치는 "허가형 원장 → 퍼블릭 체인 앵커링"이다. 앵커가 하나도 없으면
// 콘솔의 앵커링 모듈과 KPI(lastAnchor)가 비어 스토리에 구멍이 생긴다. 따라서 앵커가
// 아직 없을 때만 1회 앵커 사이클을 돌려 Merkle 루트·게시 기록을 만든다(멱등).
// ANCHOR_MODE 기본값은 "simulated"이라 시크릿·실제 체인 호출 없이 데모 기록만 생성된다.
export async function ensureDemoAnchor(): Promise<void> {
  const existing = await prisma.anchor.count();
  if (existing > 0) {
    console.log(`[ensure-demo-anchor] 앵커 ${existing}건 존재 — 건너뜀`);
    return;
  }
  try {
    const anchor = await runAnchorCycle();
    if (anchor) {
      console.log(
        `[ensure-demo-anchor] 앵커 생성: seq ${anchor.fromSequence}~${anchor.toSequence}, tx ${anchor.txCount}, root ${anchor.merkleRoot.slice(0, 12)}…`
      );
    } else {
      console.log("[ensure-demo-anchor] 앵커링할 대기 트랜잭션 없음 — 건너뜀");
    }
  } catch (e) {
    console.warn("[ensure-demo-anchor] 앵커 생성 실패(무시):", (e as Error).message);
  }
}
