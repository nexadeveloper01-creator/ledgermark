// 퍼블릭 체인에 실을 앵커 페이로드의 인코딩 규칙 (체인 비의존 순수 함수).
//
// 컨트랙트를 배포하지 않고 트랜잭션 calldata에 루트를 직접 싣는다. 제3자는 트랜잭션
// 해시만으로 calldata를 읽어 루트를 복원할 수 있어야 하므로, 매직 프리픽스와 버전을
// 붙여 이 페이로드가 LEDGERMARK 앵커임을 자체적으로 식별 가능하게 한다.
//
// 레이아웃: 0x | "LMA1"(ASCII 4바이트) | merkleRoot(32바이트)

const MAGIC = "LMA1";
const MAGIC_HEX = Buffer.from(MAGIC, "ascii").toString("hex");
const ROOT_HEX_LENGTH = 64;

export function encodeAnchorPayload(merkleRoot: string): `0x${string}` {
  const root = merkleRoot.toLowerCase().replace(/^0x/, "");
  if (!/^[0-9a-f]{64}$/.test(root)) {
    throw new Error(`merkleRoot는 32바이트 hex여야 합니다: ${merkleRoot}`);
  }
  return `0x${MAGIC_HEX}${root}`;
}

export function decodeAnchorPayload(data: string | null | undefined): string | null {
  if (!data) return null;
  const hex = data.toLowerCase().replace(/^0x/, "");
  if (!hex.startsWith(MAGIC_HEX)) return null;

  const root = hex.slice(MAGIC_HEX.length);
  if (root.length !== ROOT_HEX_LENGTH || !/^[0-9a-f]+$/.test(root)) return null;
  return root;
}

export function isAnchorPayload(data: string | null | undefined): boolean {
  return decodeAnchorPayload(data) !== null;
}
