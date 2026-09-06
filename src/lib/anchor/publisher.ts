import { createHash } from "crypto";
import { createPublicClient, createWalletClient, http, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { loadAnchorConfig, SIMULATED_CHAIN_ID, type AnchorConfig } from "./config";
import { decodeAnchorPayload, encodeAnchorPayload } from "./payload";

export interface PublishResult {
  txHash: string;
  chainId: number;
  blockNumber: bigint | null;
  simulated: boolean;
}

export interface VerifyResult {
  found: boolean;
  matches: boolean;
  simulated: boolean;
  onChainRoot: string | null;
  blockNumber: bigint | null;
  chainId: number | null;
  message: string;
}

export class AnchorPublishError extends Error {}

function transport(config: AnchorConfig) {
  return config.rpcUrl ? http(config.rpcUrl) : http();
}

// 데모용 앵커. 실제 체인에 아무것도 쓰지 않으며, 루트에서 결정적으로 파생한
// 참조값을 만들어 게시 흐름만 재현한다. 실제 트랜잭션 해시가 아니므로
// chainId를 SIMULATED_CHAIN_ID로 표시해 화면에서 구분할 수 있게 한다.
function simulatePublish(merkleRoot: string): PublishResult {
  const digest = createHash("sha256")
    .update("simulated-anchor")
    .update(merkleRoot)
    .digest("hex");

  return {
    txHash: `0x${digest}`,
    chainId: SIMULATED_CHAIN_ID,
    blockNumber: null,
    simulated: true,
  };
}

export async function publishAnchor(merkleRoot: string): Promise<PublishResult> {
  const config = loadAnchorConfig();

  if (config.mode === "disabled") {
    throw new AnchorPublishError("앵커 게시가 비활성화되어 있습니다 (ANCHOR_MODE=disabled).");
  }

  if (config.mode === "simulated") {
    return simulatePublish(merkleRoot);
  }

  if (!config.chain) {
    throw new AnchorPublishError(`알 수 없는 체인입니다: ${process.env.ANCHOR_CHAIN}`);
  }
  if (!config.privateKey) {
    throw new AnchorPublishError(
      "ANCHOR_PRIVATE_KEY가 설정되지 않았습니다. 가스비가 있는 전용 지갑 키가 필요합니다."
    );
  }

  const account = privateKeyToAccount(config.privateKey as Hex);
  const wallet = createWalletClient({
    account,
    chain: config.chain,
    transport: transport(config),
  });
  const publicClient = createPublicClient({ chain: config.chain, transport: transport(config) });

  // 컨트랙트 없이 자기 자신에게 0-value 트랜잭션을 보내고 calldata에 루트를 싣는다.
  const txHash = await wallet.sendTransaction({
    to: account.address,
    value: 0n,
    data: encodeAnchorPayload(merkleRoot),
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

  return {
    txHash,
    chainId: config.chain.id,
    blockNumber: receipt.blockNumber,
    simulated: false,
  };
}

export async function verifyAnchorOnChain(args: {
  txHash: string;
  merkleRoot: string;
  chainId: number | null;
}): Promise<VerifyResult> {
  const config = loadAnchorConfig();

  if (args.chainId === SIMULATED_CHAIN_ID) {
    // 시뮬레이션 앵커는 체인에 존재하지 않는다. 검증 결과를 성공으로 위장하지 않는다.
    const expected = simulatePublish(args.merkleRoot);
    return {
      found: false,
      matches: false,
      simulated: true,
      onChainRoot: null,
      blockNumber: null,
      chainId: SIMULATED_CHAIN_ID,
      message:
        expected.txHash === args.txHash
          ? "시뮬레이션 앵커입니다. 로컬 Merkle 루트와는 일치하지만 퍼블릭 체인에는 게시되지 않았습니다."
          : "시뮬레이션 앵커이며 저장된 참조값이 루트와 일치하지 않습니다.",
    };
  }

  if (!config.chain) {
    throw new AnchorPublishError("체인 설정이 없어 검증할 수 없습니다.");
  }

  const publicClient = createPublicClient({ chain: config.chain, transport: transport(config) });

  const tx = await publicClient.getTransaction({ hash: args.txHash as Hex }).catch(() => null);
  if (!tx) {
    return {
      found: false,
      matches: false,
      simulated: false,
      onChainRoot: null,
      blockNumber: null,
      chainId: config.chain.id,
      message: "해당 트랜잭션을 체인에서 찾을 수 없습니다.",
    };
  }

  const onChainRoot = decodeAnchorPayload(tx.input);
  const expected = args.merkleRoot.toLowerCase().replace(/^0x/, "");
  const matches = onChainRoot === expected;

  return {
    found: true,
    matches,
    simulated: false,
    onChainRoot,
    blockNumber: tx.blockNumber,
    chainId: config.chain.id,
    message: matches
      ? "체인에 기록된 Merkle 루트가 원장 계산값과 일치합니다."
      : onChainRoot
        ? "체인에 기록된 루트가 원장 계산값과 다릅니다."
        : "해당 트랜잭션에 LEDGERMARK 앵커 페이로드가 없습니다.",
  };
}
