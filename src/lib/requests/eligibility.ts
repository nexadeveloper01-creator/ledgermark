// 소매 판매 적격성 판정 — 디자인 프로토타입의 "판매 차단" 케이스에 대응한다.
//
// 정상 유통 제품은 MINT → EXPORT_TRANSFER(수출/통관) → WHOLESALE_TRANSFER(총판 배분)를
// 거쳐 매장에 도달하므로, 매장이 스캔한 시점의 UID는 WHOLESALE 상태여야 한다.
// 통관을 거치지 않고 흘러들어온 제품은 이 조건을 만족할 수 없으므로 판매를 차단하고
// 관제 콘솔에 밀수 의심 알림으로 승격한다.

import type { UidStatus } from "@/lib/ledger/stateMachine";

export interface EligibilityVerdict {
  eligible: boolean;
  reason?: string;
}

export function checkRetailSaleEligibility(status: UidStatus): EligibilityVerdict {
  if (status === "WHOLESALE") {
    return { eligible: true };
  }

  if (status === "MINTED" || status === "EXPORTED") {
    return {
      eligible: false,
      reason:
        "통관·총판 배분 이력이 없는 UID입니다. 정식 수입 경로를 거치지 않은 것으로 판정되어 판매가 차단되었습니다.",
    };
  }

  return {
    eligible: false,
    reason: `이미 판매되었거나 소비자가 보유 중인 UID입니다 (현재: ${status}).`,
  };
}
