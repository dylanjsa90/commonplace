import { getUser, checkOrigin } from "./auth";
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function authenticate(request: Request, mutation = false) {
  const user = await getUser();
  if (!user) throw new HttpError(401, "Sign in to access your library.");
  if (mutation && !checkOrigin(request))
    throw new HttpError(403, "This request came from another site.");
  return user.userId;
}
export async function body(request: Request): Promise<Record<string, unknown>> {
  if (!request.headers.get("content-type")?.includes("application/json"))
    throw new HttpError(415, "Send JSON data.");
  const text = await request.text();
  if (text.length > 20000) throw new HttpError(413, "The note is too long.");
  try {
    const value = JSON.parse(text);
    if (!value || Array.isArray(value) || typeof value !== "object")
      throw new Error();
    return value;
  } catch {
    throw new HttpError(400, "Invalid request data.");
  }
}
export function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}
export function failure(error: unknown) {
  if (error instanceof HttpError)
    return json({ error: error.message }, error.status);
  console.error("Library request failed", error);
  return json(
    { error: "Something went wrong with your library. Please try again." },
    500,
  );
}
