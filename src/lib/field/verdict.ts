// 현장 단속 판정 엔진 (디자인 프로토타입 "단속 현장"의 판정 시나리오 3종).
//
// 관제 콘솔이 전체 유통 현황을 다루는 데 반해, 현장 단말은 단일 제품에 대한
// "압수 근거가 성립하는가"만 판정한다. 판정은 원장 사실관계에서만 도출되며,
// 적용 법조는 국가별 검토 사항이라 플랫폼이 확정하지 않는다.

export type FieldVerdict = "VERIFIED" | "SEIZURE_GROUNDS" | "COUNTERFEIT_SUSPECTED";

export interface VerdictInput {
  // 원장 조회 결과가 없으면 null (위조 의심)
  uid: {
    status: string;
    hasCustomsRecord: boolean; // EXPORT_TRANSFER 기록 존재 여부 = 통관 대조 배치 포함
    lastTxType: string | null;
  } | null;
}

export interface VerdictResult {
  verdict: FieldVerdict;
  verdictEn: string;
  label: string;
  rule: string;
  basis: string;
  cta: string;
  /** 조서 발행 대상 여부 — 정상 판정은 조회 로그만 남기고 조서를 만들지 않는다. */
  hasReport: boolean;
  reportTitle: string;
  reportEn: string;
  legalNote: string;
}

export function judge({ uid }: VerdictInput): VerdictResult {
  if (!uid) {
    return {
      verdict: "COUNTERFEIT_SUSPECTED",
      verdictEn: "NOT IN LEDGER",
      label: "원장 미존재 — 위조 의심",
      rule: "UN-01",
      basis: "원장에 존재하지 않는 UID입니다. 위조 코드 또는 타사 제품으로 추정됩니다.",
      cta: "위조 신고 접수",
      hasReport: true,
      reportTitle: "위조 신고 조서 (자동 생성)",
      reportEn: "COUNTERFEIT REPORT",
      legalNote: "원장 미존재는 위조 판정의 근거이며, 제품 진위 확인은 제조사 감정과 병행합니다.",
    };
  }

  if (!uid.hasCustomsRecord) {
    return {
      verdict: "SEIZURE_GROUNDS",
      verdictEn: "SEIZURE GROUNDS ESTABLISHED",
      label: "통관 미확인 — 압수 근거",
      rule: "CU-02",
      basis: "MINT 기록은 있으나 통관 대조 배치에 미포함 — 정식 수입 경로 미경유로 판정됩니다.",
      cta: "압수 조서 작성",
      hasReport: true,
      reportTitle: "압수 조서 (자동 생성)",
      reportEn: "SEIZURE REPORT",
      legalNote:
        "적용 법조는 국가별 검토 후 확정됩니다. 플랫폼은 판정 근거와 원장 스냅샷만 제공합니다.",
    };
  }

  return {
    verdict: "VERIFIED",
    verdictEn: "VERIFIED · CLEARED",
    label: "정품 · 정상 유통",
    rule: "—",
    basis: "통관 대조 배치와 일치하며 소유권 이력이 연속됩니다.",
    cta: "정상 종결",
    hasReport: false,
    reportTitle: "조회 로그",
    reportEn: "LOOKUP LOG",
    legalNote: "정상 판정 건은 조회 로그만 남고 조서는 생성되지 않습니다.",
  };
}

export function reportNumberPrefix(verdict: FieldVerdict): string {
  return verdict === "SEIZURE_GROUNDS" ? "SZ" : "CF";
}
