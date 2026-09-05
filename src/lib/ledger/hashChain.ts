import { createHash } from "crypto";

// 그룹 허가형 원장의 해시체인 — 각 트랜잭션은 이전 트랜잭션의 해시를 포함하여
// "당사도 임의로 조작할 수 없다"는 성질을 데이터베이스 위에서 시뮬레이션한다.
// (기획서 3.2 — 퍼블릭 앵커링 이전 단계의 무결성 증명 계층)

export const GENESIS_HASH = "0".repeat(64);

export interface LedgerEntryPayload {
  sequence: number;
  uidCode: string;
  txType: string;
  fromOwner: string | null;
  toOwner: string;
  metadata: unknown;
  createdAt: string;
}

// Postgres JSONB normalizes object key order on read, so a plain JSON.stringify
// of data round-tripped through the DB would not reproduce the string used at
// write time. Recursively sorting object keys keeps the hash stable regardless.
function canonicalStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalStringify).join(",")}]`;
  }
  if (value !== null && typeof value === "object") {
    const keys = Object.keys(value as Record<string, unknown>).sort();
    const entries = keys.map(
      (key) => `${JSON.stringify(key)}:${canonicalStringify((value as Record<string, unknown>)[key])}`
    );
    return `{${entries.join(",")}}`;
  }
  return JSON.stringify(value);
}

export function computeEntryHash(prevHash: string, payload: LedgerEntryPayload): string {
  const canonical = canonicalStringify(payload);
  return createHash("sha256").update(prevHash).update(canonical).digest("hex");
}

export interface ChainLink {
  sequence: number;
  prevHash: string;
  hash: string;
  payload: LedgerEntryPayload;
}

export interface ChainVerificationResult {
  valid: boolean;
  length: number;
  brokenAtSequence?: number;
  reason?: string;
}

// 순서대로 정렬된 체인 전체를 재계산하여 무결성을 검증한다 (정부 콘솔의 "원장 상태" 표시에 사용).
export function verifyChain(links: ChainLink[]): ChainVerificationResult {
  let expectedPrevHash = GENESIS_HASH;

  for (const link of links) {
    if (link.prevHash !== expectedPrevHash) {
      return {
        valid: false,
        length: links.length,
        brokenAtSequence: link.sequence,
        reason: `sequence ${link.sequence}: prevHash mismatch`,
      };
    }

    const recomputed = computeEntryHash(link.prevHash, link.payload);
    if (recomputed !== link.hash) {
      return {
        valid: false,
        length: links.length,
        brokenAtSequence: link.sequence,
        reason: `sequence ${link.sequence}: hash does not match payload`,
      };
    }

    expectedPrevHash = link.hash;
  }

  return { valid: true, length: links.length };
}
