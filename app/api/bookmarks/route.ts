import { authenticate, body, failure, HttpError, json } from "../../../lib/api";
import { database, listBookmarks, captureBookmark } from "../../../lib/repository";
import { normalizeUrl } from "../../../lib/capture";
export async function GET(request: Request) { try { return json({bookmarks:await listBookmarks(await authenticate(request))}); } catch(e) {return failure(e);} }
export async function POST(request: Request) {
  try {
    const userId = await authenticate(request,true); const data = await body(request);
    if (typeof data.url !== "string" || data.url.length > 3000) throw new HttpError(400,"Enter a webpage URL.");
    if (data.note !== undefined && (typeof data.note !== "string" || data.note.length > 10000)) throw new HttpError(400,"Keep your note under 10,000 characters.");
    let url: string; try { url = normalizeUrl(data.url.trim()); } catch(e) { throw new HttpError(400,(e as Error).message); }
    const id = crypto.randomUUID(); const db = database(); const domain = new URL(url).hostname.replace(/^www\./,"");
    const result = await db.prepare("INSERT INTO bookmarks(id,user_id,url,title,domain,note,saved_at) VALUES (?,?,?,?,?,?,?) ON CONFLICT(user_id,url) DO NOTHING").bind(id,userId,url,domain,domain,(data.note as string ?? "").trim(),new Date().toISOString()).run();
    if (!result.meta.changes) throw new HttpError(409,"This link is already in your library.");
    return json({bookmark:await captureBookmark(userId,id,url)},201);
  } catch(e) { return failure(e); }
}
