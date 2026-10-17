import { env } from "cloudflare:workers";
import { headers, cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getChatGPTUser } from "../app/chatgpt-auth";
import { database } from "./repository";
import { signSession, verifySession, SESSION_SECONDS } from "./session-token";
export type User = { userId: string; email: string; fullName: string | null };
const COOKIE = "__Host-commonplace_session";
const LOCAL_COOKIE = "commonplace_session";
export async function getUser(): Promise<User | null> {
  if (env.AUTH_PROVIDER !== "password") return getChatGPTUser();
  const cookieStore = await cookies();
  const token =
    cookieStore.get(COOKIE)?.value ||
    (import.meta.env.DEV ? cookieStore.get(LOCAL_COOKIE)?.value : undefined);
  if (!token || token.length > 8192 || !env.JWT_SECRET) return null;
  try {
    const claims = await verifySession(env.JWT_SECRET, token);
    const row = await database()
      .prepare(
        "SELECT u.id,u.email,u.name FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.id=? AND s.user_id=? AND s.expires_at>?",
      )
      .bind(claims.sessionId, claims.userId, Math.floor(Date.now() / 1000))
      .first<{ id: string; email: string; name: string }>();
    return row
      ? { userId: row.id, email: row.email, fullName: row.name }
      : null;
  } catch {
    return null;
  }
}
export async function requireUser(returnTo: string) {
  const user = await getUser();
  if (user) return user;
  redirect(
    env.AUTH_PROVIDER === "password"
      ? "/login"
      : `/signin-with-chatgpt?return_to=${encodeURIComponent(returnTo)}`,
  );
}
export function signOutPath() {
  return env.AUTH_PROVIDER === "password"
    ? "/logout"
    : "/signout-with-chatgpt?return_to=/";
}
export function sessionCookie(
  request: Request,
  token: string,
  maxAge = SESSION_SECONDS,
) {
  const secure = new URL(request.url).protocol === "https:";
  return `${secure ? COOKIE : LOCAL_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure ? "; Secure" : ""}`;
}
export async function createSession(userId: string, request: Request) {
  if (!env.JWT_SECRET) throw new Error("Authentication is not configured.");
  const id = crypto.randomUUID();
  await database()
    .prepare("INSERT INTO sessions(id,user_id,expires_at) VALUES(?,?,?)")
    .bind(id, userId, Math.floor(Date.now() / 1000) + SESSION_SECONDS)
    .run();
  return sessionCookie(request, await signSession(env.JWT_SECRET, userId, id));
}
export async function revokeSession() {
  const cookieStore = await cookies();
  const token =
    cookieStore.get(COOKIE)?.value ||
    (import.meta.env.DEV ? cookieStore.get(LOCAL_COOKIE)?.value : undefined);
  if (token && env.JWT_SECRET) {
    try {
      const s = await verifySession(env.JWT_SECRET, token);
      await database()
        .prepare("DELETE FROM sessions WHERE id=? AND user_id=?")
        .bind(s.sessionId, s.userId)
        .run();
    } catch {}
  }
}
export function checkOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return false;
  return request.headers.get("sec-fetch-site") !== "cross-site";
}
export async function tokenHash(token: string) {
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(token),
  );
  return [...new Uint8Array(bytes)]
    .map((n) => n.toString(16).padStart(2, "0"))
    .join("");
}
export async function allowAuthAttempt(request: Request, email: string) {
  const ip = request.headers.get("cf-connecting-ip") ?? "local";
  const now = Math.floor(Date.now() / 1000);
  const db = database();
  for (const [key, limit] of [
    [`ip:${ip}`, 25],
    [`email:${email}`, 10],
  ] as const) {
    const hashed = await tokenHash(key);
    const result = await db
      .prepare(
        "INSERT INTO auth_attempts(key,count,window_start) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN window_start<? THEN 1 ELSE count+1 END,window_start=CASE WHEN window_start<? THEN ? ELSE window_start END RETURNING count",
      )
      .bind(hashed, now, now - 600, now - 600, now)
      .first<{ count: number }>();
    if (!result || result.count > limit) return false;
  }
  return true;
}
