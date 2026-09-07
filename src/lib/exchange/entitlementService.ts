import { prisma } from "@/lib/prisma";
import { LedgerError } from "@/lib/ledger/stateMachine";

// 무상 교환 자격.
//  - 기본: 기기당 구매 시 교환권 1장(AVAILABLE) → 1회 무상 교환.
//  - 추가: "전체 설문 완료 + 정보 이용 동의" 고객은 추가 1회 무상 교환 자격을 얻는다.
//    추가 교환은 이미 교환권을 소진한(voucher NONE) 본인 기기의 교환권을 1회 복원하는
//    방식으로 제공한다(중고 취득 VOID 기기는 제외). consumer당 1회.

// 정보 이용 동의는 프로필·사용습관·마케팅 스코프를 모두 켠 상태로 인정한다(위치는 선택).

export type ExchangeEntitlement = {
  surveysCompleted: number;
  surveysTotal: number;
  surveysAllDone: boolean;
  consentComplete: boolean;
  qualified: boolean; // 추가 교환 자격 충족 여부
  bonusRemaining: number; // 남은 추가 무상 교환 횟수(0 또는 1)
  bonusUsed: boolean;
  missing: string[]; // 자격까지 부족한 조건 안내
};

export async function getExchangeEntitlement(consumerId: string): Promise<ExchangeEntitlement> {
  const [surveysTotal, doneCount, consent, bonus] = await Promise.all([
    prisma.survey.count({ where: { active: true } }),
    prisma.surveyResponse.count({ where: { consumerId } }),
    prisma.consentRecord.findUnique({ where: { consumerId } }),
    prisma.exchangeBonus.findUnique({ where: { consumerId } }),
  ]);

  const surveysAllDone = surveysTotal > 0 && doneCount >= surveysTotal;
  const consentComplete = !!consent && consent.profile && consent.usage && consent.marketing;
  const qualified = surveysAllDone && consentComplete;
  const bonusUsed = !!bonus?.usedAt;
  const bonusRemaining = qualified && !bonusUsed ? 1 : 0;

  const missing: string[] = [];
  if (!surveysAllDone) missing.push(`설문 ${doneCount}/${surveysTotal} 완료 필요`);
  if (!consentComplete) missing.push("개인정보 이용 동의(프로필·사용습관·마케팅) 필요");

  return { surveysCompleted: doneCount, surveysTotal, surveysAllDone, consentComplete, qualified, bonusRemaining, bonusUsed, missing };
}

/**
 * 추가 무상 교환 자격을 특정 기기에 적용한다 — 해당 기기의 교환권을 AVAILABLE로 복원하고
 * consumer의 추가 교환 자격을 소진 처리한다. 이후 일반 교환 신청 흐름을 그대로 탄다.
 */
export async function applyExchangeBonus(consumerId: string, uidCode: string): Promise<{ uidCode: string }> {
  return prisma.$transaction(async (tx) => {
    // 자격 재확인(경쟁/조작 방지)
    const [surveysTotal, doneCount, consent, existingBonus] = await Promise.all([
      tx.survey.count({ where: { active: true } }),
      tx.surveyResponse.count({ where: { consumerId } }),
      tx.consentRecord.findUnique({ where: { consumerId } }),
      tx.exchangeBonus.findUnique({ where: { consumerId } }),
    ]);
    const surveysAllDone = surveysTotal > 0 && doneCount >= surveysTotal;
    const consentComplete = !!consent && consent.profile && consent.usage && consent.marketing;
    if (!surveysAllDone || !consentComplete) {
      throw new LedgerError("추가 무상 교환 자격이 아직 충족되지 않았습니다(전체 설문 + 정보 이용 동의).");
    }
    if (existingBonus?.usedAt) {
      throw new LedgerError("추가 무상 교환 자격을 이미 사용했습니다.");
    }

    const uid = await tx.uid.findUnique({ where: { code: uidCode } });
    if (!uid || uid.ownerConsumerId !== consumerId) {
      throw new LedgerError("본인이 보유한 기기에만 추가 교환권을 적용할 수 있습니다.");
    }
    if (uid.voucherState === "VOID") {
      throw new LedgerError("중고로 취득한 기기는 무상 교환 대상이 아닙니다.");
    }
    if (uid.voucherState === "AVAILABLE") {
      throw new LedgerError("이미 사용 가능한 교환권이 있는 기기입니다.");
    }

    await tx.uid.update({ where: { id: uid.id }, data: { voucherState: "AVAILABLE" } });
    await tx.exchangeBonus.upsert({
      where: { consumerId },
      update: { usedAt: new Date(), usedUidId: uid.id },
      create: { consumerId, usedAt: new Date(), usedUidId: uid.id },
    });

    return { uidCode: uid.code };
  });
}
