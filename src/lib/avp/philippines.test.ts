import { describe, expect, it } from "vitest";
import { philippinesProvider } from "./philippines";

describe("Philippines AVP (RA 11900)", () => {
  it("verifies an adult with ID scan and passed liveness", async () => {
    const result = await philippinesProvider.verify({
      idScanned: true,
      livenessPassed: true,
      birthDate: "2000-01-01",
    });
    expect(result.verified).toBe(true);
  });

  it("rejects a minor even with valid ID scan and liveness", async () => {
    const result = await philippinesProvider.verify({
      idScanned: true,
      livenessPassed: true,
      birthDate: new Date().toISOString().slice(0, 10), // born today = 0 years old
    });
    expect(result.verified).toBe(false);
    expect(result.reasons).toContain("만 18세 미만입니다.");
  });

  it("rejects when liveness check was not passed", async () => {
    const result = await philippinesProvider.verify({
      idScanned: true,
      livenessPassed: false,
      birthDate: "1990-01-01",
    });
    expect(result.verified).toBe(false);
    expect(result.reasons).toContain("Liveness 검증을 통과하지 못했습니다.");
  });

  it("rejects when no ID was scanned", async () => {
    const result = await philippinesProvider.verify({
      idScanned: false,
      livenessPassed: true,
      birthDate: "1990-01-01",
    });
    expect(result.verified).toBe(false);
  });
});
