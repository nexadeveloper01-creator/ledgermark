import { NextResponse } from "next/server";
import { AnchorPublishError, verifyAnchorOnChain } from "@/lib/anchor/publisher";
import { authErrorResponse, requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// 앵커 검증 — 저장된 트랜잭션을 체인에서 다시 읽어 Merkle 루트가 일치하는지 확인한다.
// 원장 DB가 아니라 체인 기록을 근거로 삼는 것이 이 기능의 핵심이다.
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    await requireRole("GOV_INSPECTOR", "ADMIN");

    const anchor = await prisma.anchor.findUnique({ where: { id: params.id } });
    if (!anchor) {
      return NextResponse.json({ error: "앵커를 찾을 수 없습니다." }, { status: 404 });
    }
    if (!anchor.publicAnchorRef) {
      return NextResponse.json(
        { error: "아직 퍼블릭 체인에 게시되지 않은 앵커입니다." },
        { status: 422 }
      );
    }

    const result = await verifyAnchorOnChain({
      txHash: anchor.publicAnchorRef,
      merkleRoot: anchor.merkleRoot,
      chainId: anchor.chainId,
    });

    return NextResponse.json({
      anchor: {
        id: anchor.id,
        merkleRoot: anchor.merkleRoot,
        txHash: anchor.publicAnchorRef,
        chainId: anchor.chainId,
      },
      verification: {
        ...result,
        blockNumber: result.blockNumber?.toString() ?? null,
      },
    });
  } catch (err) {
    const authResponse = authErrorResponse(err);
    if (authResponse) return authResponse;
    if (err instanceof AnchorPublishError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    throw err;
  }
}
