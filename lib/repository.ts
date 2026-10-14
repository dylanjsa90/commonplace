import { env } from "cloudflare:workers";
import type { Bookmark } from "./types";
import { capturePage } from "./capture";
export function database() { if (!env.DB) throw new Error("The library database is unavailable."); return env.DB; }
type Row = Record<string, unknown>;
const columns = "id,url,title,domain,note,description,summary,image,status,error,favorite,saved_at,fetched_at,word_count";
function convert(row: Row, topics: string[] = []): Bookmark {
  return { id: String(row.id), url: String(row.url), title: String(row.title), domain: String(row.domain), note: String(row.note), description: String(row.description), summary: String(row.summary), image: row.image as string|null,
    status: row.status as Bookmark["status"], error: row.error as string|null, favorite: !!row.favorite,
    savedAt: String(row.saved_at), fetchedAt: row.fetched_at as string|null, wordCount: Number(row.word_count), topics,
    ...(row.raw_text !== undefined ? {rawText: String(row.raw_text), metadata: JSON.parse(String(row.metadata))} : {}) };
}
export async function listBookmarks(userId: string) {
  const db = database();
  const [items, tags] = await db.batch([
    db.prepare(`SELECT ${columns} FROM bookmarks WHERE user_id=? ORDER BY saved_at DESC`).bind(userId),
    db.prepare("SELECT bt.bookmark_id,t.name FROM bookmark_topics bt JOIN topics t ON t.id=bt.topic_id WHERE t.user_id=?").bind(userId),
  ]);
  const byId = new Map<string, string[]>();
  for (const t of tags.results as Row[]) { const id = String(t.bookmark_id); byId.set(id,[...(byId.get(id) ?? []),String(t.name)]); }
  return (items.results as Row[]).map(row => convert(row,byId.get(String(row.id))));
}
export async function getBookmark(userId: string, id: string) {
  const db = database();
  const row = await db.prepare(`SELECT ${columns},raw_text,metadata FROM bookmarks WHERE user_id=? AND id=?`).bind(userId,id).first<Row>();
  if(!row) return null;
  const ts = await db.prepare("SELECT t.name FROM topics t JOIN bookmark_topics bt ON bt.topic_id=t.id WHERE t.user_id=? AND bt.bookmark_id=?").bind(userId,id).all<Row>();
  return convert(row,ts.results.map(t => String(t.name)));
}
export async function captureBookmark(userId: string, id: string, url: string) {
  const db = database();
  try {
    const page = await capturePage(url);
    const statements = [db.prepare("UPDATE bookmarks SET title=?,description=?,summary=?,raw_text=?,metadata=?,image=?,status=?,error=?,word_count=?,fetched_at=? WHERE user_id=? AND id=?").bind(page.title,page.description,page.summary,page.rawText,JSON.stringify(page.metadata),page.image,page.status,page.error,page.wordCount,new Date().toISOString(),userId,id),
      db.prepare("DELETE FROM bookmark_topics WHERE bookmark_id=? AND EXISTS (SELECT 1 FROM bookmarks WHERE id=? AND user_id=?)").bind(id,id,userId)];
    for (const name of page.topics) {
      statements.push(db.prepare("INSERT INTO topics (id,user_id,name) VALUES (?,?,?) ON CONFLICT(user_id,name) DO NOTHING").bind(crypto.randomUUID(),userId,name));
      statements.push(db.prepare("INSERT INTO bookmark_topics (bookmark_id,topic_id) SELECT b.id,t.id FROM bookmarks b,topics t WHERE b.id=? AND b.user_id=? AND t.user_id=? AND t.name=? ON CONFLICT DO NOTHING").bind(id,userId,userId,name));
    }
    await db.batch(statements);
  } catch (error) {
    const message = error instanceof Error ? (error.name === "AbortError" ? "The page took too long to respond. Your link is saved; retry when it is available." : error.message) : "Could not capture this page. Your link is saved.";
    // Keep any previously captured text and topics on a failed refresh.
    await db.prepare("UPDATE bookmarks SET status=CASE WHEN raw_text='' THEN 'failed' ELSE 'partial' END,error=? WHERE user_id=? AND id=?").bind(message.slice(0,1000),userId,id).run();
  }
  return getBookmark(userId,id);
}
