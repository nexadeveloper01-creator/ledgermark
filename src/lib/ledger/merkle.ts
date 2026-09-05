import { createHash } from "crypto";

// LOT/일 단위 앵커링을 위한 최소 Merkle 트리 구현.
// 퍼블릭 체인 앵커링은 아직 연동하지 않으며(스텁), 여기서 만든 root만 Anchor 레코드에 저장한다.

function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

export function buildMerkleRoot(leaves: string[]): string {
  if (leaves.length === 0) {
    throw new Error("buildMerkleRoot: leaves must not be empty");
  }

  let level = leaves.slice();
  while (level.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < level.length; i += 2) {
      const left = level[i]!;
      const right = i + 1 < level.length ? level[i + 1]! : left;
      next.push(sha256(left + right));
    }
    level = next;
  }

  return level[0]!;
}
