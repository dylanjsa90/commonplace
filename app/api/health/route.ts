import { env } from "cloudflare:workers";
import { database } from "../../../lib/repository";
export async function GET() {
  try {
    await database().prepare("SELECT id FROM users LIMIT 1").all();
    return Response.json(
      { status: env.JWT_SECRET ? "ready" : "authentication-required" },
      {
        status: env.JWT_SECRET ? 200 : 503,
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch {
    return Response.json({ status: "database-unavailable" }, { status: 503 });
  }
}
