import { randomBytes } from "crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { PointsError } from "@/lib/points/pointsService";

// 포인트로 발급받은 구매 할인 쿠폰의 조회·사용.

export function generateCouponCode(): string {
  // 사람이 읽기 쉬운 8자 코드 (혼동 문자 제외)
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(8);
  let s = "";
  for (let i = 0; i < 8; i++) s += alphabet[bytes[i]! % alphabet.length];
  return `LM-${s.slice(0, 4)}-${s.slice(4)}`;
}

export type CouponView = {
  id: string;
  code: string;
  kind: "PERCENT" | "AMOUNT";
  value: number;
  label: string;
  status: "ISSUED" | "USED" | "EXPIRED";
  issuedAt: string;
  expiresAt: string | null;
  usedAt: string | null;
};

function couponLabel(kind: string, value: number): string {
  return kind === "PERCENT" ? `${value}% 할인` : `₱${value} 할인`;
}

function effectiveStatus(c: { status: string; expiresAt: Date | null }): "ISSUED" | "USED" | "EXPIRED" {
  if (c.status === "USED") return "USED";
  if (c.status === "EXPIRED") return "EXPIRED";
  if (c.expiresAt && c.expiresAt.getTime() < Date.now()) return "EXPIRED";
  return "ISSUED";
}

export async function listCoupons(consumerId: string): Promise<CouponView[]> {
  const coupons = await prisma.coupon.findMany({
    where: { consumerId },
    orderBy: { issuedAt: "desc" },
  });
  return coupons.map((c) => ({
    id: c.id,
    code: c.code,
    kind: c.kind,
    value: c.value,
    label: couponLabel(c.kind, c.value),
    status: effectiveStatus(c),
    issuedAt: c.issuedAt.toISOString(),
    expiresAt: c.expiresAt?.toISOString() ?? null,
    usedAt: c.usedAt?.toISOString() ?? null,
  }));
}

/** 쿠폰 사용 처리(본인 소유 · 미사용 · 미만료). */
export async function useCoupon(consumerId: string, couponId: string): Promise<CouponView> {
  return prisma.$transaction(async (tx) => {
    const coupon = await tx.coupon.findUnique({ where: { id: couponId } });
    if (!coupon || coupon.consumerId !== consumerId) throw new PointsError("쿠폰을 찾을 수 없습니다.");
    if (effectiveStatus(coupon) !== "ISSUED") throw new PointsError("사용할 수 없는 쿠폰입니다(사용됨/만료).");
    const updated = await tx.coupon.update({
      where: { id: couponId },
      data: { status: "USED", usedAt: new Date() },
    });
    return {
      id: updated.id,
      code: updated.code,
      kind: updated.kind,
      value: updated.value,
      label: couponLabel(updated.kind, updated.value),
      status: "USED" as const,
      issuedAt: updated.issuedAt.toISOString(),
      expiresAt: updated.expiresAt?.toISOString() ?? null,
      usedAt: updated.usedAt?.toISOString() ?? null,
    };
  });
}

/** 할인 쿠폰 발급(리워드 사용 트랜잭션 내부에서 호출). */
export async function issueCouponTx(
  tx: Prisma.TransactionClient,
  args: { consumerId: string; rewardId: string; kind: "PERCENT" | "AMOUNT"; value: number; days?: number }
) {
  const expiresAt = new Date(Date.now() + (args.days ?? 90) * 86400000);
  return tx.coupon.create({
    data: {
      code: generateCouponCode(),
      consumerId: args.consumerId,
      rewardId: args.rewardId,
      kind: args.kind,
      value: args.value,
      expiresAt,
    },
  });
}

export type BenefitsSummary = {
  consentPointsEarned: number;
  lifetimeEarned: number;
  couponsActive: number;
  discountPesosTotal: number; // 발급받은 정액 쿠폰 합계(페소)
  discountPercentActive: number; // 사용 가능한 정률 쿠폰 수
};

export async function benefitsSummary(consumerId: string): Promise<BenefitsSummary> {
  const account = await prisma.pointAccount.findUnique({ where: { consumerId } });
  const consentPointsEarned = account
    ? (
        await prisma.pointLedgerEntry.aggregate({
          where: { accountId: account.id, reason: "CONSENT_REWARD" },
          _sum: { amount: true },
        })
      )._sum.amount ?? 0
    : 0;

  const coupons = await prisma.coupon.findMany({ where: { consumerId } });
  const now = Date.now();
  const active = coupons.filter((c) => c.status === "ISSUED" && (!c.expiresAt || c.expiresAt.getTime() >= now));
  return {
    consentPointsEarned,
    lifetimeEarned: account?.lifetimeEarned ?? 0,
    couponsActive: active.length,
    discountPesosTotal: coupons.filter((c) => c.kind === "AMOUNT").reduce((s, c) => s + c.value, 0),
    discountPercentActive: active.filter((c) => c.kind === "PERCENT").length,
  };
}
