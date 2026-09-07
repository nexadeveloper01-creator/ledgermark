import { prisma } from "@/lib/prisma";
import { PointsError } from "@/lib/points/pointsService";

// 매장 결제(POS)에서 소비자 쿠폰을 실제 결제 금액에 차감한다.
// 쿠폰은 결제 확정 시점에 USED로 전이되며(트랜잭션), 결제 기록(StoreCheckout)을 남긴다.

function couponLabel(kind: string, value: number): string {
  return kind === "PERCENT" ? `${value}% 할인` : `₱${value} 할인`;
}

function computeDiscount(kind: string, value: number, amount: number): number {
  if (amount <= 0) return 0;
  const d = kind === "PERCENT" ? Math.floor((amount * value) / 100) : value;
  return Math.min(d, amount); // 할인액은 정가를 넘지 않는다.
}

export type CouponLookup = {
  found: boolean;
  code?: string;
  label?: string;
  kind?: "PERCENT" | "AMOUNT";
  value?: number;
  status?: "ISSUED" | "USED" | "EXPIRED";
  usable?: boolean;
  ownerName?: string;
  reason?: string;
};

/** 매장 직원이 결제 전 쿠폰 코드를 조회한다(사용 가능 여부·할인 방식). */
export async function lookupCoupon(code: string): Promise<CouponLookup> {
  const coupon = await prisma.coupon.findUnique({
    where: { code: code.trim().toUpperCase() },
    include: { consumer: { select: { displayName: true } } },
  });
  if (!coupon) return { found: false, reason: "존재하지 않는 쿠폰 코드입니다." };

  const expired = coupon.expiresAt != null && coupon.expiresAt.getTime() < Date.now();
  const status = coupon.status === "USED" ? "USED" : expired ? "EXPIRED" : coupon.status === "EXPIRED" ? "EXPIRED" : "ISSUED";
  const usable = status === "ISSUED";
  return {
    found: true,
    code: coupon.code,
    label: couponLabel(coupon.kind, coupon.value),
    kind: coupon.kind,
    value: coupon.value,
    status,
    usable,
    ownerName: coupon.consumer.displayName,
    reason: usable ? undefined : status === "USED" ? "이미 사용된 쿠폰입니다." : "만료된 쿠폰입니다.",
  };
}

export type Receipt = {
  amount: number;
  discount: number;
  total: number;
  coupon?: { code: string; label: string };
  checkoutId: string;
};

/** 결제 확정 — 쿠폰이 있으면 차감·사용 처리하고 결제 기록을 남긴다(원자적). */
export async function checkout(args: {
  orgId?: string | null;
  staffUserId?: string | null;
  amount: number;
  couponCode?: string | null;
}): Promise<Receipt> {
  const amount = Math.floor(Number(args.amount));
  if (!Number.isFinite(amount) || amount <= 0) throw new PointsError("결제 금액을 올바르게 입력해주세요.");

  return prisma.$transaction(async (tx) => {
    let discount = 0;
    let couponId: string | null = null;
    let couponCode: string | null = null;
    let consumerId: string | null = null;
    let receiptCoupon: { code: string; label: string } | undefined;

    if (args.couponCode && args.couponCode.trim()) {
      const coupon = await tx.coupon.findUnique({ where: { code: args.couponCode.trim().toUpperCase() } });
      if (!coupon) throw new PointsError("존재하지 않는 쿠폰 코드입니다.");
      const expired = coupon.expiresAt != null && coupon.expiresAt.getTime() < Date.now();
      if (coupon.status !== "ISSUED" || expired) {
        throw new PointsError(coupon.status === "USED" ? "이미 사용된 쿠폰입니다." : "만료된 쿠폰입니다.");
      }
      discount = computeDiscount(coupon.kind, coupon.value, amount);
      couponId = coupon.id;
      couponCode = coupon.code;
      consumerId = coupon.consumerId;
      receiptCoupon = { code: coupon.code, label: couponLabel(coupon.kind, coupon.value) };

      await tx.coupon.update({ where: { id: coupon.id }, data: { status: "USED", usedAt: new Date() } });
    }

    const total = amount - discount;
    const record = await tx.storeCheckout.create({
      data: {
        orgId: args.orgId ?? null,
        staffUserId: args.staffUserId ?? null,
        consumerId,
        amount,
        discount,
        total,
        couponId,
        couponCode,
      },
    });

    return { amount, discount, total, coupon: receiptCoupon, checkoutId: record.id };
  });
}
