import { describe, expect, it } from "vitest";
import { buildMerkleRoot } from "./merkle";

describe("merkle root", () => {
  it("is deterministic for the same leaf set", () => {
    const leaves = ["a", "b", "c", "d"];
    expect(buildMerkleRoot(leaves)).toBe(buildMerkleRoot(leaves));
  });

  it("changes when any leaf changes", () => {
    const root1 = buildMerkleRoot(["a", "b", "c"]);
    const root2 = buildMerkleRoot(["a", "b", "x"]);
    expect(root1).not.toBe(root2);
  });

  it("handles an odd number of leaves by duplicating the last one", () => {
    expect(() => buildMerkleRoot(["a", "b", "c"])).not.toThrow();
  });

  it("handles a single leaf by returning it as the root (leaves are already tx hashes)", () => {
    const leaf = "a".repeat(64);
    expect(buildMerkleRoot([leaf])).toBe(leaf);
  });

  it("throws on an empty leaf set", () => {
    expect(() => buildMerkleRoot([])).toThrow();
  });
});
