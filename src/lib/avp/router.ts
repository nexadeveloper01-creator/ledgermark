import { philippinesProvider } from "./philippines";
import { UnsupportedCountryError, type AgeVerificationProvider } from "./types";

const registry: Record<string, AgeVerificationProvider> = {
  PH: philippinesProvider,
};

// 사용자 등록국가 판별 → 국가별 AVP 모듈 호출 (기획서 3.3 다이어그램).
// 파라과이·카자흐스탄·한국 등은 [정보공백]으로 명시되어 있어 의도적으로 미구현 상태이며,
// 호출 시 UnsupportedCountryError로 명확히 실패한다(자동으로 통과시키지 않는다).
export function getAgeVerificationProvider(country: string): AgeVerificationProvider {
  const provider = registry[country.toUpperCase()];
  if (!provider) {
    throw new UnsupportedCountryError(country);
  }
  return provider;
}
