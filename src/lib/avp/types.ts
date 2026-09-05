// 연령인증 Provider 계층 (기획서 3.3) — 국가별 법적 요건을 모듈로 분리한다.
// 원본 신분정보는 이 계층을 벗어나지 않으며, 원장에는 검증 결과 크리덴셜만 남는다.

export interface AgeVerificationResult {
  verified: boolean;
  method: string;
  reasons?: string[];
}

export interface AgeVerificationProvider {
  country: string;
  method: string;
  verify(input: Record<string, unknown>): Promise<AgeVerificationResult>;
}

export class UnsupportedCountryError extends Error {
  constructor(country: string) {
    super(
      `국가 '${country}'의 연령인증 모듈이 아직 구현되지 않았습니다. ` +
        `기획서 2.1/2.3 — 개별 법률 검토 선행이 필요한 [정보공백] 국가입니다.`
    );
  }
}
