import { describe, expect, it } from "vitest";
import { checkRetailSaleEligibility } from "./eligibility";

describe("소매 판매 적격성", () => {
  it("총판 배분까지 마친 UID만 판매할 수 있다", () => {
    expect(checkRetailSaleEligibility("WHOLESALE").eligible).toBe(true);
  });

  it("통관·배분 이력이 없는 UID는 차단한다 (밀수 의심)", () => {
    for (const status of ["MINTED", "EXPORTED"] as const) {
      const verdict = checkRetailSaleEligibility(status);
      expect(verdict.eligible).toBe(false);
      expect(verdict.reason).toContain("정식 수입 경로");
    }
  });

  it("이미 소비자에게 판매된 UID는 재판매 불가", () => {
    for (const status of ["RETAIL_SOLD", "EXCHANGED", "RESOLD"] as const) {
      expect(checkRetailSaleEligibility(status).eligible).toBe(false);
    }
  });
});
