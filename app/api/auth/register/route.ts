import { env } from "cloudflare:workers";
import { body, failure, HttpError } from "../../../../lib/api";
import { database } from "../../../../lib/repository";
import {
  allowAuthAttempt,
  checkOrigin,
  createSession,
} from "../../../../lib/auth";
import { hashPassword } from "../../../../lib/password";

export async function POST(request: Request) {
  try {
    if (env.AUTH_PROVIDER !== "password" || !env.JWT_SECRET)
      throw new HttpError(503, "Password sign-in is not configured.");
    if (!checkOrigin(request))
      throw new HttpError(403, "This request came from another site.");
    const data = await body(request);
    const email =
      typeof data.email === "string" ? data.email.trim().toLowerCase() : "";
    if (
      email.length > 254 ||
      !/^\S+@[^\s@]+\.[^\s@]+$/.test(email) ||
      typeof data.name !== "string" ||
      !data.name.trim() ||
      data.name.length > 80
    )
      throw new HttpError(400, "Enter your name and a valid email.");
    if (
      typeof data.password !== "string" ||
      data.password.length < 12 ||
      data.password.length > 1024
    )
      throw new HttpError(400, "Use a password with at least 12 characters.");
    if (!(await allowAuthAttempt(request, email)))
      throw new HttpError(429, "Too many attempts. Try again in 10 minutes.");
    const db = database();
    const id = crypto.randomUUID();
    const passwordHash = await hashPassword(data.password);
    const result = await db
      .prepare(
        "INSERT INTO users(id,email,name,password_hash,created_at) VALUES(?,?,?,?,?) ON CONFLICT(email) DO NOTHING",
      )
      .bind(id, email, data.name.trim(), passwordHash, new Date().toISOString())
      .run();
    if (!result.meta.changes)
      throw new HttpError(
        409,
        "An account with this email already exists. Sign in instead.",
      );
    return Response.json(
      { ok: true },
      {
        status: 201,
        headers: {
          "Set-Cookie": await createSession(id, request),
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (e) {
    return failure(e);
  }
}
