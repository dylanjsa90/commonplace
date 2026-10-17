import handler from "vinext/server/fetch-handler";
import { verifyAccessToken } from "../lib/access-token";
// eslint-disable-next-line import/no-anonymous-default-export
export default {
  async fetch(request: Request, env: Cloudflare.Env, ctx: ExecutionContext) {
    if (
      env.AUTH_PROVIDER !== "password" ||
      !env.JWT_SECRET ||
      env.JWT_SECRET.length < 32
    )
      return new Response("Commonplace authentication is not configured yet.", {
        status: 503,
        headers: { "Cache-Control": "no-store" },
      });
    // Never trust hosting-platform identity headers sent directly by a caller.
    const headers = new Headers(request.headers);
    for (const key of [...headers.keys()])
      if (
        key.startsWith("oai-authenticated-user-") ||
        key.startsWith("commonplace-auth-")
      )
        headers.delete(key);
    if (env.ACCESS_TEAM_DOMAIN || env.ACCESS_AUD) {
      if (!env.ACCESS_TEAM_DOMAIN || !env.ACCESS_AUD)
        return new Response("Cloudflare Access is not configured completely.", {
          status: 503,
        });
      try {
        await verifyAccessToken(
          headers.get("cf-access-jwt-assertion"),
          env.ACCESS_TEAM_DOMAIN,
          env.ACCESS_AUD,
        );
      } catch {
        return new Response("Cloudflare Access sign-in is required.", {
          status: 403,
          headers: { "Cache-Control": "no-store" },
        });
      }
    }
    const authenticatedRequest = new Request(request, { headers });
    const pathname = new URL(request.url).pathname;
    if (
      env.ASSETS &&
      (request.method === "GET" || request.method === "HEAD") &&
      (pathname.startsWith("/_next/static/") ||
        pathname.startsWith("/examples/") ||
        pathname === "/favicon.svg")
    )
      return env.ASSETS.fetch(authenticatedRequest);
    return handler.fetch(authenticatedRequest, env, ctx);
  },
};
