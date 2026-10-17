import { env } from "cloudflare:workers";
import { body, failure, HttpError } from "../../../../lib/api";
import { database } from "../../../../lib/repository";
import {
  allowAuthAttempt,
  checkOrigin,
  createSession,
} from "../../../../lib/auth";
import { verifyPassword, DUMMY_HASH } from "../../../../lib/password";

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
      !email ||
      email.length > 254 ||
      typeof data.password !== "string" ||
      data.password.length > 1024
    )
      throw new HttpError(400, "Enter your email and password.");
    if (!(await allowAuthAttempt(request, email)))
      throw new HttpError(429, "Too many attempts. Try again in 10 minutes.");
    const user = await database()
      .prepare("SELECT id,password_hash FROM users WHERE email=?")
      .bind(email)
      .first<{ id: string; password_hash: string }>();
    const valid = await verifyPassword(
      data.password,
      user?.password_hash ?? DUMMY_HASH,
    );
    if (!user || !valid)
      throw new HttpError(401, "The email or password is incorrect.");
    return Response.json(
      { ok: true },
      {
        headers: {
          "Set-Cookie": await createSession(user.id, request),
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (e) {
    return failure(e);
  }
}
