import { describe, expect, it } from "vitest";
import { decodeAnchorPayload, encodeAnchorPayload, isAnchorPayload } from "./payload";

const root = "a".repeat(64);

describe("앵커 페이로드", () => {
  it("인코딩한 루트를 그대로 복원한다", () => {
    const encoded = encodeAnchorPayload(root);
    expect(decodeAnchorPayload(encoded)).toBe(root);
  });

  it("0x 접두사와 대문자 입력을 허용한다", () => {
    const encoded = encodeAnchorPayload(`0x${"AB".repeat(32)}`);
    expect(decodeAnchorPayload(encoded)).toBe("ab".repeat(32));
  });

  it("매직 프리픽스로 LEDGERMARK 앵커임을 식별한다", () => {
    // "LMA1" = 4c4d4131
    expect(encodeAnchorPayload(root).startsWith("0x4c4d4131")).toBe(true);
  });

  it("앵커가 아닌 calldata는 거부한다", () => {
    expect(decodeAnchorPayload("0xdeadbeef")).toBeNull();
    expect(decodeAnchorPayload("0x")).toBeNull();
    expect(decodeAnchorPayload(null)).toBeNull();
    expect(isAnchorPayload("0xa9059cbb")).toBe(false);
  });

  it("길이가 맞지 않는 페이로드는 거부한다", () => {
    expect(decodeAnchorPayload("0x4c4d4131abcd")).toBeNull();
  });

  it("32바이트가 아닌 루트는 인코딩을 거부한다", () => {
    expect(() => encodeAnchorPayload("abc")).toThrow();
    expect(() => encodeAnchorPayload("z".repeat(64))).toThrow();
  });
});
