import { createRemoteJWKSet, jwtVerify } from "jose";
const keys = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

export async function verifyAccessToken(
  token: string | null,
  teamDomain: string,
  audience: string,
) {
  const url = new URL(teamDomain);
  if (
    url.protocol !== "https:" ||
    !/^[a-z0-9-]+\.cloudflareaccess\.com$/i.test(url.hostname) ||
    url.pathname !== "/" ||
    url.search ||
    url.hash ||
    url.username ||
    url.password
  )
    throw new Error("Invalid Access issuer.");
  if (!token || token.length > 16000 || !audience)
    throw new Error("Access sign-in required.");
  const issuer = url.origin;
  let jwks = keys.get(issuer);
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL("/cdn-cgi/access/certs", issuer));
    keys.set(issuer, jwks);
  }
  const { payload } = await jwtVerify(token, jwks, {
    issuer,
    audience,
    algorithms: ["RS256"],
    requiredClaims: ["exp", "sub", "iat"],
  });
  if (typeof payload.email !== "string" || !payload.email)
    throw new Error("A visitor identity is required.");
  return payload;
}
