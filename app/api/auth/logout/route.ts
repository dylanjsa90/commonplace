import {
  checkOrigin,
  revokeSession,
  sessionCookie,
} from "../../../../lib/auth";
export async function POST(request: Request) {
  if (!checkOrigin(request))
    return Response.json(
      { error: "This request came from another site." },
      { status: 403 },
    );
  await revokeSession();
  return new Response(null, {
    status: 303,
    headers: {
      Location: "/login",
      "Set-Cookie": sessionCookie(request, "", 0),
      "Cache-Control": "no-store",
    },
  });
}
