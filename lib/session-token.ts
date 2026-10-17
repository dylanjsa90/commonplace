import { SignJWT, jwtVerify } from "jose";
export const SESSION_SECONDS = 86400;
const ISSUER = "commonplace";
const AUDIENCE = "commonplace-web";
function key(secret: string) {
  if (secret.length < 32) throw new Error("JWT secret is not configured.");
  return new TextEncoder().encode(secret);
}
export async function signSession(
  secret: string,
  userId: string,
  sessionId: string,
) {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setSubject(userId)
    .setJti(sessionId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_SECONDS}s`)
    .sign(key(secret));
}
export async function verifySession(secret: string, token: string) {
  const { payload } = await jwtVerify(token, key(secret), {
    issuer: ISSUER,
    audience: AUDIENCE,
    algorithms: ["HS256"],
    requiredClaims: ["exp", "iat", "sub", "jti"],
  });
  if (!payload.sub || !payload.jti) throw new Error("Invalid session.");
  return { userId: payload.sub, sessionId: payload.jti };
}
