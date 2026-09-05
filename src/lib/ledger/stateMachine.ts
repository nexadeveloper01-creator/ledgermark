// UID 소유권 상태머신 (기획서 3.1)
//
// 원칙: UID 레코드에 대한 모든 변경은 반드시 "소유권 이전 트랜잭션"을 통해서만
// 발생하며, 임의 수정(silent update)은 시스템적으로 불가능하다.
//
// 이 모듈은 DB에 의존하지 않는 순수 함수로 구현되어 있다 — 호출자(API 라우트)가
// 현재 스냅샷을 읽어 넘기면, 다음 스냅샷(들)을 계산하거나 유효하지 않은 전이에
// 대해 LedgerError를 던진다.

export type UidStatus =
  | "MINTED"
  | "EXPORTED"
  | "WHOLESALE"
  | "RETAIL_SOLD"
  | "EXCHANGED"
  | "RESOLD";

export type VoucherState = "NONE" | "AVAILABLE" | "USED" | "VOID";

export type OwnerRef =
  | { type: "ORG"; orgId: string }
  | { type: "CONSUMER"; consumerId: string };

export interface UidSnapshot {
  status: UidStatus;
  owner: OwnerRef;
  voucherState: VoucherState;
}

export class LedgerError extends Error {}

function sameOwner(a: OwnerRef, b: OwnerRef): boolean {
  if (a.type !== b.type) return false;
  if (a.type === "ORG" && b.type === "ORG") return a.orgId === b.orgId;
  if (a.type === "CONSUMER" && b.type === "CONSUMER") return a.consumerId === b.consumerId;
  return false;
}

function requireOwnerMatch(current: UidSnapshot, from: OwnerRef, txType: string) {
  if (!sameOwner(current.owner, from)) {
    throw new LedgerError(
      `${txType}: 요청된 현재 소유자가 UID의 실제 소유자와 일치하지 않습니다.`
    );
  }
}

export type TransitionInput =
  | { txType: "MINT"; to: OwnerRef }
  | { txType: "EXPORT_TRANSFER"; from: OwnerRef; to: OwnerRef }
  | { txType: "WHOLESALE_TRANSFER"; from: OwnerRef; to: OwnerRef }
  | { txType: "RETAIL_SALE"; from: OwnerRef; to: OwnerRef; ageVerified: boolean }
  | { txType: "EXCHANGE_TRANSFER"; from: OwnerRef }
  | { txType: "RESALE_TRANSFER"; from: OwnerRef; to: OwnerRef };

// MINT/단순 전이는 같은 UID 레코드의 다음 스냅샷 하나만 반환한다.
export interface SingleTransitionResult {
  kind: "single";
  next: UidSnapshot;
}

// EXCHANGE_TRANSFER는 기존 UID를 폐기(retired)하고 새 UID를 발급하는 구조라
// 레코드 두 개(구/신)에 대한 스냅샷을 함께 반환한다.
export interface ExchangeTransitionResult {
  kind: "exchange";
  retiredCurrent: UidSnapshot;
  issuedNew: UidSnapshot;
}

export type TransitionResult = SingleTransitionResult | ExchangeTransitionResult;

export function applyTransition(
  current: UidSnapshot | null,
  input: TransitionInput
): TransitionResult {
  switch (input.txType) {
    case "MINT": {
      if (current !== null) {
        throw new LedgerError("MINT: 이미 발급된 UID에는 다시 MINT할 수 없습니다.");
      }
      return {
        kind: "single",
        next: { status: "MINTED", owner: input.to, voucherState: "NONE" },
      };
    }

    case "EXPORT_TRANSFER": {
      if (!current) throw new LedgerError("EXPORT_TRANSFER: UID가 존재하지 않습니다.");
      if (current.status !== "MINTED") {
        throw new LedgerError(
          `EXPORT_TRANSFER: MINTED 상태에서만 가능합니다 (현재: ${current.status}).`
        );
      }
      requireOwnerMatch(current, input.from, "EXPORT_TRANSFER");
      return {
        kind: "single",
        next: { status: "EXPORTED", owner: input.to, voucherState: "NONE" },
      };
    }

    case "WHOLESALE_TRANSFER": {
      if (!current) throw new LedgerError("WHOLESALE_TRANSFER: UID가 존재하지 않습니다.");
      if (current.status !== "EXPORTED") {
        throw new LedgerError(
          `WHOLESALE_TRANSFER: EXPORTED 상태에서만 가능합니다 (현재: ${current.status}).`
        );
      }
      requireOwnerMatch(current, input.from, "WHOLESALE_TRANSFER");
      return {
        kind: "single",
        next: { status: "WHOLESALE", owner: input.to, voucherState: "NONE" },
      };
    }

    case "RETAIL_SALE": {
      if (!current) throw new LedgerError("RETAIL_SALE: UID가 존재하지 않습니다.");
      if (current.status !== "WHOLESALE") {
        throw new LedgerError(
          `RETAIL_SALE: WHOLESALE 상태에서만 가능합니다 (현재: ${current.status}).`
        );
      }
      requireOwnerMatch(current, input.from, "RETAIL_SALE");
      if (input.to.type !== "CONSUMER") {
        throw new LedgerError("RETAIL_SALE: 신규 소유자는 소비자(CONSUMER)여야 합니다.");
      }
      if (!input.ageVerified) {
        throw new LedgerError("RETAIL_SALE: 연령인증이 완료되지 않았습니다.");
      }
      // 최초 소비자 구매 시점에 교환권 1회를 신규 발급한다.
      return {
        kind: "single",
        next: { status: "RETAIL_SOLD", owner: input.to, voucherState: "AVAILABLE" },
      };
    }

    case "EXCHANGE_TRANSFER": {
      if (!current) throw new LedgerError("EXCHANGE_TRANSFER: UID가 존재하지 않습니다.");
      if (current.status !== "RETAIL_SOLD" && current.status !== "EXCHANGED") {
        throw new LedgerError(
          `EXCHANGE_TRANSFER: RETAIL_SOLD 또는 EXCHANGED 상태에서만 가능합니다 (현재: ${current.status}).`
        );
      }
      requireOwnerMatch(current, input.from, "EXCHANGE_TRANSFER");
      if (current.voucherState !== "AVAILABLE") {
        throw new LedgerError(
          `EXCHANGE_TRANSFER: 사용 가능한 교환권이 없습니다 (현재: ${current.voucherState}).`
        );
      }
      return {
        kind: "exchange",
        retiredCurrent: { status: "EXCHANGED", owner: current.owner, voucherState: "USED" },
        // 신UID는 동일 소유자에게 귀속되며, 무상교환 남용을 막기 위해 새 교환권을
        // 자동으로 부여하지 않는다(추가 교환은 별도 승인 절차가 필요하다는 의미).
        issuedNew: { status: "RETAIL_SOLD", owner: current.owner, voucherState: "NONE" },
      };
    }

    case "RESALE_TRANSFER": {
      if (!current) throw new LedgerError("RESALE_TRANSFER: UID가 존재하지 않습니다.");
      if (current.status !== "RETAIL_SOLD" && current.status !== "EXCHANGED") {
        throw new LedgerError(
          `RESALE_TRANSFER: RETAIL_SOLD 또는 EXCHANGED 상태에서만 가능합니다 (현재: ${current.status}).`
        );
      }
      requireOwnerMatch(current, input.from, "RESALE_TRANSFER");
      if (input.to.type !== "CONSUMER") {
        throw new LedgerError("RESALE_TRANSFER: 신규 소유자는 소비자(CONSUMER)여야 합니다.");
      }
      // 남용 방지: 중고 구매자가 이전 소유자의 미사용 교환권을 재신청하지 못하도록
      // 소유권 상태와 무관하게 교환권을 VOID로 강제 소거한다 (기획서 3.1 참고).
      return {
        kind: "single",
        next: { status: "RESOLD", owner: input.to, voucherState: "VOID" },
      };
    }

    default: {
      const exhaustive: never = input;
      throw new LedgerError(`알 수 없는 트랜잭션 유형: ${JSON.stringify(exhaustive)}`);
    }
  }
}
