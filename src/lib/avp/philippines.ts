import type { AgeVerificationProvider, AgeVerificationResult } from "./types";

// 필리핀 — 공화국법 제11900호(RA 11900) 요건: 정부발급 ID 스캔 + Liveness, 만 18세 이상.
export const philippinesProvider: AgeVerificationProvider = {
  country: "PH",
  method: "RA11900_ID_LIVENESS",

  async verify(input: Record<string, unknown>): Promise<AgeVerificationResult> {
    const idScanned = input.idScanned === true;
    const livenessPassed = input.livenessPassed === true;
    const birthDate = typeof input.birthDate === "string" ? new Date(input.birthDate) : null;

    const reasons: string[] = [];
    if (!idScanned) reasons.push("정부발급 ID 스캔이 확인되지 않았습니다.");
    if (!livenessPassed) reasons.push("Liveness 검증을 통과하지 못했습니다.");

    let age: number | null = null;
    if (!birthDate || Number.isNaN(birthDate.getTime())) {
      reasons.push("생년월일이 유효하지 않습니다.");
    } else {
      const now = new Date();
      age = now.getFullYear() - birthDate.getFullYear();
      const hasHadBirthdayThisYear =
        now.getMonth() > birthDate.getMonth() ||
        (now.getMonth() === birthDate.getMonth() && now.getDate() >= birthDate.getDate());
      if (!hasHadBirthdayThisYear) age -= 1;
      if (age < 18) reasons.push("만 18세 미만입니다.");
    }

    return {
      verified: reasons.length === 0,
      method: "RA11900_ID_LIVENESS",
      reasons: reasons.length > 0 ? reasons : undefined,
    };
  },
};
