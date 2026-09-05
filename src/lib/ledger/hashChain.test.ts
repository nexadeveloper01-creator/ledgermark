import { describe, expect, it } from "vitest";
import { computeEntryHash, verifyChain, GENESIS_HASH, type ChainLink, type LedgerEntryPayload } from "./hashChain";

function payload(overrides: Partial<LedgerEntryPayload> = {}): LedgerEntryPayload {
  return {
    sequence: 0,
    uidCode: "LOT-000001",
    txType: "MINT",
    fromOwner: null,
    toOwner: "ORG:producer-1",
    metadata: null,
    createdAt: "2026-09-06T00:00:00.000Z",
    ...overrides,
  };
}

describe("hash chain", () => {
  it("is deterministic for the same prevHash + payload", () => {
    const p = payload();
    expect(computeEntryHash(GENESIS_HASH, p)).toBe(computeEntryHash(GENESIS_HASH, p));
  });

  it("produces the same hash regardless of object key order (JSONB-safe)", () => {
    const a = computeEntryHash(GENESIS_HASH, payload({ metadata: { a: 1, b: 2 } }));
    const b = computeEntryHash(GENESIS_HASH, payload({ metadata: { b: 2, a: 1 } }));
    expect(a).toBe(b);
  });

  it("changes when any field changes", () => {
    const base = computeEntryHash(GENESIS_HASH, payload());
    const changed = computeEntryHash(GENESIS_HASH, payload({ toOwner: "ORG:someone-else" }));
    expect(base).not.toBe(changed);
  });

  it("verifies a valid chain of several links", () => {
    const p1 = payload({ uidCode: "LOT-000001" });
    const h1 = computeEntryHash(GENESIS_HASH, p1);

    const p2 = payload({ uidCode: "LOT-000002", toOwner: "ORG:producer-1" });
    const h2 = computeEntryHash(h1, p2);

    const links: ChainLink[] = [
      { sequence: 1, prevHash: GENESIS_HASH, hash: h1, payload: p1 },
      { sequence: 2, prevHash: h1, hash: h2, payload: p2 },
    ];

    const result = verifyChain(links);
    expect(result.valid).toBe(true);
    expect(result.length).toBe(2);
  });

  it("detects tampering with a payload after the fact", () => {
    const p1 = payload({ uidCode: "LOT-000001" });
    const h1 = computeEntryHash(GENESIS_HASH, p1);

    const tampered: ChainLink = {
      sequence: 1,
      prevHash: GENESIS_HASH,
      hash: h1,
      payload: { ...p1, toOwner: "ORG:attacker" }, // hash was computed before this edit
    };

    const result = verifyChain([tampered]);
    expect(result.valid).toBe(false);
    expect(result.brokenAtSequence).toBe(1);
  });

  it("detects a broken prevHash link", () => {
    const p1 = payload();
    const h1 = computeEntryHash(GENESIS_HASH, p1);
    const p2 = payload({ uidCode: "LOT-000002" });
    const h2 = computeEntryHash(h1, p2);

    const links: ChainLink[] = [
      { sequence: 1, prevHash: GENESIS_HASH, hash: h1, payload: p1 },
      { sequence: 2, prevHash: GENESIS_HASH /* should be h1 */, hash: h2, payload: p2 },
    ];

    const result = verifyChain(links);
    expect(result.valid).toBe(false);
    expect(result.brokenAtSequence).toBe(2);
  });
});
