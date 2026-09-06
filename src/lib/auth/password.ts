import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "crypto";
import { promisify } from "util";

// promisify가 options 오버로드를 잃어버리므로 시그니처를 명시한다.
const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: ScryptOptions
) => Promise<Buffer>;

// OWASP 권장 조합 중 하나 (N=2^16, r=8, p=2). N*r*128*p 만큼 메모리를 쓰므로
// maxmem을 명시하지 않으면 Node 기본 한도(32MB)에 걸려 실패한다.
const N = 65536;
const r = 8;
const p = 2;
const KEY_LENGTH = 64;
const MAX_MEM = 192 * 1024 * 1024;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = await scryptAsync(password, salt, KEY_LENGTH, {
    N,
    r,
    p,
    maxmem: MAX_MEM,
  });

  return `scrypt$${N}$${r}$${p}$${salt.toString("base64")}$${derived.toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;

  const [, nRaw, rRaw, pRaw, saltRaw, hashRaw] = parts;
  const salt = Buffer.from(saltRaw!, "base64");
  const expected = Buffer.from(hashRaw!, "base64");

  const derived = await scryptAsync(password, salt, expected.length, {
    N: Number(nRaw),
    r: Number(rRaw),
    p: Number(pRaw),
    maxmem: MAX_MEM,
  });

  // 길이가 다르면 timingSafeEqual이 예외를 던지므로 먼저 확인한다.
  if (derived.length !== expected.length) return false;
  return timingSafeEqual(derived, expected);
}
