export type Bookmark = {
  id: string; url: string; title: string; domain: string; note: string; description: string;
  summary: string; image: string | null; status: "pending" | "ready" | "partial" | "failed";
  error: string | null; favorite: boolean; savedAt: string; fetchedAt: string | null;
  wordCount: number; topics: string[]; rawText?: string; metadata?: Record<string, unknown>;
};
export type Topic = { name: string; count: number };
