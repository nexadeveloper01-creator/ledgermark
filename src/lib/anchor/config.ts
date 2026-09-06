import { baseSepolia, polygonAmoy, base, polygon } from "viem/chains";
import type { Chain } from "viem";

// 앵커링 동작 모드.
//
//  - simulated : 퍼블릭 체인에 게시하지 않고 데모용 앵커 기록만 만든다.
//                실제 체인 기록이 아니므로 화면에도 "시뮬레이션"으로 표시된다.
//  - chain     : 실제 퍼블릭 체인에 트랜잭션을 전송한다. 자금이 있는 키가 필요하다.
//  - disabled  : 로컬 Merkle 루트만 계산하고 게시를 시도하지 않는다.
export type AnchorMode = "simulated" | "chain" | "disabled";

const CHAINS: Record<string, Chain> = {
  baseSepolia,
  polygonAmoy,
  base,
  polygon,
};

export interface AnchorConfig {
  mode: AnchorMode;
  chain: Chain | null;
  rpcUrl: string | null;
  privateKey: string | null;
}

export function loadAnchorConfig(): AnchorConfig {
  const rawMode = (process.env.ANCHOR_MODE ?? "simulated").toLowerCase();
  const mode: AnchorMode =
    rawMode === "chain" ? "chain" : rawMode === "disabled" ? "disabled" : "simulated";

  const chainKey = process.env.ANCHOR_CHAIN ?? "baseSepolia";
  const chain = CHAINS[chainKey] ?? null;

  return {
    mode,
    chain,
    rpcUrl: process.env.ANCHOR_RPC_URL || null,
    privateKey: process.env.ANCHOR_PRIVATE_KEY || null,
  };
}

// 시뮬레이션 앵커임을 데이터에서도 구분할 수 있도록 실제 체인에 존재하지 않는 chainId를 쓴다.
export const SIMULATED_CHAIN_ID = 0;

export function isSimulated(chainId: number | null | undefined): boolean {
  return chainId === SIMULATED_CHAIN_ID;
}

export function explorerTxUrl(chainId: number | null, txHash: string | null): string | null {
  if (!chainId || !txHash || isSimulated(chainId)) return null;
  const chain = Object.values(CHAINS).find((c) => c.id === chainId);
  const base = chain?.blockExplorers?.default?.url;
  return base ? `${base}/tx/${txHash}` : null;
}
