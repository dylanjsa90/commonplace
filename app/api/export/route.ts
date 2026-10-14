import { authenticate, failure } from "../../../lib/api";
import { database } from "../../../lib/repository";
export async function GET(request: Request) {
  try {
    const userId = await authenticate(request);
    const db = database();
    const [items,tags] = await db.batch([db.prepare("SELECT id,url,title,domain,note,description,summary,raw_text,metadata,image,status,error,favorite,saved_at,fetched_at,word_count FROM bookmarks WHERE user_id=? ORDER BY saved_at DESC").bind(userId),db.prepare("SELECT bt.bookmark_id,t.name FROM bookmark_topics bt JOIN topics t ON t.id=bt.topic_id WHERE t.user_id=?").bind(userId)]);
    const rows = items.results as Record<string,unknown>[];
    const topicRows = tags.results as Record<string,unknown>[];
    const bookmarks = rows.map(b => ({...b,metadata:JSON.parse(String(b.metadata)),topics:topicRows.filter(t => t.bookmark_id===b.id).map(t => t.name)}));
    return new Response(JSON.stringify({format:"commonplace-v1",exportedAt:new Date().toISOString(),bookmarks},null,2),{headers:{"Content-Type":"application/json","Content-Disposition":"attachment; filename=commonplace-library.json","Cache-Control":"no-store"}});
  } catch(e) {return failure(e);}
}
