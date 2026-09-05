import { describe, expect, it } from "vitest";
import { judge, reportNumberPrefix } from "./verdict";

describe("현장 단속 판정", () => {
  it("원장에 없는 UID는 위조 의심(UN-01)으로 판정하고 조서를 만든다", () => {
    const result = judge({ uid: null });
    expect(result.verdict).toBe("COUNTERFEIT_SUSPECTED");
    expect(result.rule).toBe("UN-01");
    expect(result.hasReport).toBe(true);
  });

  it("통관 기록이 없는 UID는 압수 근거 성립(CU-02)으로 판정한다", () => {
    const result = judge({
      uid: { status: "WHOLESALE", hasCustomsRecord: false, lastTxType: "WHOLESALE_TRANSFER" },
    });
    expect(result.verdict).toBe("SEIZURE_GROUNDS");
    expect(result.rule).toBe("CU-02");
    expect(result.hasReport).toBe(true);
  });

  it("통관 기록이 있는 UID는 정상 유통으로 판정하고 조서를 만들지 않는다", () => {
    const result = judge({
      uid: { status: "RESOLD", hasCustomsRecord: true, lastTxType: "RESALE_TRANSFER" },
    });
    expect(result.verdict).toBe("VERIFIED");
    expect(result.hasReport).toBe(false);
  });

  it("조서번호 접두사는 판정 종류를 따른다", () => {
    expect(reportNumberPrefix("SEIZURE_GROUNDS")).toBe("SZ");
    expect(reportNumberPrefix("COUNTERFEIT_SUSPECTED")).toBe("CF");
  });
});
