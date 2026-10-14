import { authenticate, body, failure, HttpError, json } from "../../../../lib/api";
import { database, getBookmark, captureBookmark } from "../../../../lib/repository";
type Context = {params: Promise<{id:string}>};
export async function GET(request: Request, context: Context) { try { const b = await getBookmark(await authenticate(request),(await context.params).id); if(!b) throw new HttpError(404,"Link not found."); return json({bookmark:b}); } catch(e) {return failure(e);} }
export async function PATCH(request: Request, context: Context) {
  try {
    const userId = await authenticate(request,true); const {id} = await context.params;
    const existing = await getBookmark(userId,id); if(!existing) throw new HttpError(404,"Link not found.");
    const data = await body(request);
    if (data.retry === true) return json({bookmark:await captureBookmark(userId,id,existing.url)});
    if (data.note !== undefined && (typeof data.note !== "string" || data.note.length > 10000)) throw new HttpError(400,"Keep your note under 10,000 characters.");
    if (data.favorite !== undefined && typeof data.favorite !== "boolean") throw new HttpError(400,"Invalid favorite value.");
    await database().prepare("UPDATE bookmarks SET note=?,favorite=? WHERE user_id=? AND id=?").bind(data.note ?? existing.note,data.favorite === undefined ? Number(existing.favorite) : Number(data.favorite),userId,id).run();
    return json({bookmark:await getBookmark(userId,id)});
  } catch(e) {return failure(e);}
}
export async function DELETE(request: Request, context: Context) { try { const userId = await authenticate(request,true); const {id} = await context.params; const r = await database().prepare("DELETE FROM bookmarks WHERE user_id=? AND id=?").bind(userId,id).run(); if(!r.meta.changes) throw new HttpError(404,"Link not found."); return json({ok:true}); } catch(e) {return failure(e);} }
