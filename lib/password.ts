import { scrypt, randomBytes, timingSafeEqual } from "node:crypto";
const COST = { N: 16384, r: 8, p: 5, maxmem: 32 * 1024 * 1024 };
const derive = (password: string, salt: Buffer) =>
  new Promise<Buffer>((resolve, reject) =>
    scrypt(password, salt, 32, COST, (error, key) =>
      error ? reject(error) : resolve(key),
    ),
  );
export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const hash = await derive(password, salt);
  return `scrypt$16384$8$5$${salt.toString("base64url")}$${hash.toString("base64url")}`;
}
export async function verifyPassword(password: string, encoded: string) {
  const [algorithm, n, r, p, saltText, keyText] = encoded.split("$");
  if (
    algorithm !== "scrypt" ||
    n !== "16384" ||
    r !== "8" ||
    p !== "5" ||
    !saltText ||
    !keyText
  )
    return false;
  const salt = Buffer.from(saltText, "base64url");
  const expected = Buffer.from(keyText, "base64url");
  if (salt.length !== 16 || expected.length !== 32) return false;
  const actual = await derive(password, salt);
  return timingSafeEqual(actual, expected);
}
// Equal-cost comparison for unknown accounts, with a non-secret impossible hash.
export const DUMMY_HASH =
  "scrypt$16384$8$5$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
