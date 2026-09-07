import { prisma } from "@/lib/prisma";
import { getOrCreateAccount, PointsError } from "./pointsService";
import { issueCouponTx } from "@/lib/coupons/couponService";

// 쌓은 포인트로 앱 내 콘텐츠를 해금하거나 경품에 응모/교환한다.
// 차감·재고·응모 기록을 하나의 트랜잭션으로 처리해 이중 차감이나 재고 초과를 막는다.

export type RewardView = {
  id: string;
  slug: string;
  title: string;
  description: string;
  cost: number;
  type: string;
  stock: number | null;
  soldOut: boolean;
  affordable: boolean;
  discountKind: string | null;
  discountValue: number | null;
};

/** 활성 리워드 목록 + 소비자 잔액 기준 구매 가능 여부. */
export async function listRewards(consumerId: string): Promise<{ balance: number; rewards: RewardView[] }> {
  const account = await getOrCreateAccount(consumerId);
  const rewards = await prisma.reward.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { cost: "asc" }],
  });
  return {
    balance: account.balance,
    rewards: rewards.map((r) => ({
      id: r.id,
      slug: r.slug,
      title: r.title,
      description: r.description,
      cost: r.cost,
      type: r.type,
      stock: r.stock,
      soldOut: r.stock != null && r.stock <= 0,
      affordable: account.balance >= r.cost,
      discountKind: r.discountKind,
      discountValue: r.discountValue,
    })),
  };
}

export type RedeemResult = {
  balance: number;
  redemptionId: string;
  title: string;
  cost: number;
  coupon?: { code: string; kind: string; value: number };
};

/** 리워드 사용/응모 — 포인트 차감 + 재고 감소 + 응모 기록을 원자적으로. */
export async function redeemReward(args: {
  consumerId: string;
  rewardId: string;
}): Promise<RedeemResult> {
  return prisma.$transaction(async (tx) => {
    const reward = await tx.reward.findUnique({ where: { id: args.rewardId } });
    if (!reward || !reward.active) throw new PointsError("사용할 수 없는 리워드입니다.");
    if (reward.stock != null && reward.stock <= 0) throw new PointsError("재고가 모두 소진되었습니다.");

    const account = await getOrCreateAccount(args.consumerId, tx);
    if (account.balance < reward.cost) throw new PointsError("포인트가 부족합니다.");

    const balanceAfter = account.balance - reward.cost;

    await tx.pointLedgerEntry.create({
      data: {
        accountId: account.id,
        reason: "REWARD_REDEMPTION",
        amount: -reward.cost,
        balanceAfter,
        memo: `리워드 사용: ${reward.title}`,
        refType: "Reward",
        refId: reward.id,
      },
    });
    await tx.pointAccount.update({ where: { id: account.id }, data: { balance: balanceAfter } });

    if (reward.stock != null) {
      await tx.reward.update({ where: { id: reward.id }, data: { stock: { decrement: 1 } } });
    }

    const redemption = await tx.rewardRedemption.create({
      data: {
        rewardId: reward.id,
        accountId: account.id,
        consumerId: args.consumerId,
        cost: reward.cost,
      },
    });

    // 구매 할인 쿠폰 타입이면 쿠폰을 발급한다.
    let coupon: { code: string; kind: string; value: number } | undefined;
    if (reward.type === "DISCOUNT" && reward.discountKind && reward.discountValue != null) {
      const issued = await issueCouponTx(tx, {
        consumerId: args.consumerId,
        rewardId: reward.id,
        kind: reward.discountKind,
        value: reward.discountValue,
      });
      coupon = { code: issued.code, kind: issued.kind, value: issued.value };
    }

    return {
      balance: balanceAfter,
      redemptionId: redemption.id,
      title: reward.title,
      cost: reward.cost,
      coupon,
    };
  });
}
