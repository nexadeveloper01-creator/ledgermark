import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("비밀번호 해시", () => {
  it("올바른 비밀번호를 검증한다", async () => {
    const hash = await hashPassword("correct horse battery staple");
    expect(await verifyPassword("correct horse battery staple", hash)).toBe(true);
  });

  it("틀린 비밀번호를 거부한다", async () => {
    const hash = await hashPassword("correct horse battery staple");
    expect(await verifyPassword("wrong password", hash)).toBe(false);
  });

  it("같은 비밀번호도 매번 다른 해시를 만든다 (salt)", async () => {
    const a = await hashPassword("same");
    const b = await hashPassword("same");
    expect(a).not.toBe(b);
    expect(await verifyPassword("same", a)).toBe(true);
    expect(await verifyPassword("same", b)).toBe(true);
  });

  it("평문을 해시에 남기지 않는다", async () => {
    const hash = await hashPassword("supersecret");
    expect(hash).not.toContain("supersecret");
  });

  it("형식이 깨진 해시는 예외 대신 false를 반환한다", async () => {
    expect(await verifyPassword("x", "not-a-hash")).toBe(false);
    expect(await verifyPassword("x", "")).toBe(false);
  });
});
