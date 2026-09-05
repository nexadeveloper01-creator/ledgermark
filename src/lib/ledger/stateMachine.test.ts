import { describe, expect, it } from "vitest";
import { applyTransition, LedgerError, type OwnerRef, type UidSnapshot } from "./stateMachine";

const producer: OwnerRef = { type: "ORG", orgId: "producer-1" };
const importer: OwnerRef = { type: "ORG", orgId: "importer-1" };
const distributor: OwnerRef = { type: "ORG", orgId: "distributor-1" };
const retailer: OwnerRef = { type: "ORG", orgId: "retailer-1" };
const consumerA: OwnerRef = { type: "CONSUMER", consumerId: "consumer-a" };
const consumerB: OwnerRef = { type: "CONSUMER", consumerId: "consumer-b" };

describe("UID ownership state machine — full lifecycle (기획서 3.1)", () => {
  it("walks MINT -> EXPORT -> WHOLESALE -> RETAIL_SALE -> EXCHANGE -> RESALE", () => {
    const minted = applyTransition(null, { txType: "MINT", to: producer });
    expect(minted.kind).toBe("single");
    if (minted.kind !== "single") throw new Error("unreachable");
    expect(minted.next).toEqual<UidSnapshot>({
      status: "MINTED",
      owner: producer,
      voucherState: "NONE",
    });

    const exported = applyTransition(minted.next, {
      txType: "EXPORT_TRANSFER",
      from: producer,
      to: importer,
    });
    if (exported.kind !== "single") throw new Error("unreachable");
    expect(exported.next.status).toBe("EXPORTED");
    expect(exported.next.owner).toEqual(importer);

    const wholesale = applyTransition(exported.next, {
      txType: "WHOLESALE_TRANSFER",
      from: importer,
      to: distributor,
    });
    if (wholesale.kind !== "single") throw new Error("unreachable");
    expect(wholesale.next.status).toBe("WHOLESALE");

    const retailSold = applyTransition(wholesale.next, {
      txType: "RETAIL_SALE",
      from: distributor,
      to: consumerA,
      ageVerified: true,
    });
    if (retailSold.kind !== "single") throw new Error("unreachable");
    expect(retailSold.next).toEqual<UidSnapshot>({
      status: "RETAIL_SOLD",
      owner: consumerA,
      voucherState: "AVAILABLE",
    });

    const exchanged = applyTransition(retailSold.next, {
      txType: "EXCHANGE_TRANSFER",
      from: consumerA,
    });
    expect(exchanged.kind).toBe("exchange");
    if (exchanged.kind !== "exchange") throw new Error("unreachable");
    expect(exchanged.retiredCurrent).toEqual<UidSnapshot>({
      status: "EXCHANGED",
      owner: consumerA,
      voucherState: "USED",
    });
    expect(exchanged.issuedNew).toEqual<UidSnapshot>({
      status: "RETAIL_SOLD",
      owner: consumerA,
      voucherState: "NONE",
    });

    const resold = applyTransition(exchanged.issuedNew, {
      txType: "RESALE_TRANSFER",
      from: consumerA,
      to: consumerB,
    });
    if (resold.kind !== "single") throw new Error("unreachable");
    expect(resold.next).toEqual<UidSnapshot>({
      status: "RESOLD",
      owner: consumerB,
      voucherState: "VOID",
    });
  });

  it("rejects RETAIL_SALE without age verification", () => {
    const wholesale: UidSnapshot = { status: "WHOLESALE", owner: retailer, voucherState: "NONE" };
    expect(() =>
      applyTransition(wholesale, {
        txType: "RETAIL_SALE",
        from: retailer,
        to: consumerA,
        ageVerified: false,
      })
    ).toThrow(LedgerError);
  });

  it("rejects transitions from the wrong current owner", () => {
    const exported: UidSnapshot = { status: "EXPORTED", owner: importer, voucherState: "NONE" };
    expect(() =>
      applyTransition(exported, {
        txType: "WHOLESALE_TRANSFER",
        from: distributor, // 실제 소유자는 importer
        to: retailer,
      })
    ).toThrow(LedgerError);
  });

  it("rejects MINT on a UID that already exists", () => {
    const minted: UidSnapshot = { status: "MINTED", owner: producer, voucherState: "NONE" };
    expect(() => applyTransition(minted, { txType: "MINT", to: producer })).toThrow(LedgerError);
  });

  it("rejects skipping a stage (e.g. WHOLESALE straight to RETAIL_SALE is fine, but MINTED straight to RETAIL_SALE is not)", () => {
    const minted: UidSnapshot = { status: "MINTED", owner: producer, voucherState: "NONE" };
    expect(() =>
      applyTransition(minted, {
        txType: "RETAIL_SALE",
        from: producer,
        to: consumerA,
        ageVerified: true,
      })
    ).toThrow(LedgerError);
  });

  it("rejects EXCHANGE_TRANSFER when no voucher is available", () => {
    const noVoucher: UidSnapshot = {
      status: "RETAIL_SOLD",
      owner: consumerA,
      voucherState: "NONE",
    };
    expect(() => applyTransition(noVoucher, { txType: "EXCHANGE_TRANSFER", from: consumerA })).toThrow(
      LedgerError
    );
  });

  it("prevents the resale-abuse loophole: a buyer of a resold UID cannot claim a fresh exchange voucher", () => {
    // 회의에서 미해결이었던 실무 문제: 중고 구매자가 무상교환을 재신청하는 부정사용 경로.
    const retailSold: UidSnapshot = {
      status: "RETAIL_SOLD",
      owner: consumerA,
      voucherState: "AVAILABLE",
    };

    const resold = applyTransition(retailSold, {
      txType: "RESALE_TRANSFER",
      from: consumerA,
      to: consumerB,
    });
    if (resold.kind !== "single") throw new Error("unreachable");
    expect(resold.next.voucherState).toBe("VOID");

    // consumerB는 이제 소유자이지만 교환권이 VOID이므로 EXCHANGE_TRANSFER를 신청할 수 없다.
    expect(() =>
      applyTransition(resold.next, { txType: "EXCHANGE_TRANSFER", from: consumerB })
    ).toThrow(LedgerError);
  });

  it("keeps resale traceable even after a prior exchange", () => {
    const exchangedNew: UidSnapshot = {
      status: "RETAIL_SOLD",
      owner: consumerA,
      voucherState: "NONE",
    };
    const resold = applyTransition(exchangedNew, {
      txType: "RESALE_TRANSFER",
      from: consumerA,
      to: consumerB,
    });
    if (resold.kind !== "single") throw new Error("unreachable");
    expect(resold.next.owner).toEqual(consumerB);
    expect(resold.next.status).toBe("RESOLD");
  });
});
