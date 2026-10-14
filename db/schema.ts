import { sqliteTable, text, integer, index, uniqueIndex, primaryKey } from "drizzle-orm/sqlite-core";
export const bookmarks = sqliteTable("bookmarks", {
  id: text("id").primaryKey(), userId: text("user_id").notNull(),
  url: text("url").notNull(), title: text("title").notNull(), domain: text("domain").notNull(),
  note: text("note").notNull().default(""), description: text("description").notNull().default(""),
  summary: text("summary").notNull().default(""), rawText: text("raw_text").notNull().default(""),
  metadata: text("metadata").notNull().default("{}"), image: text("image"),
  status: text("status").notNull().default("pending"), error: text("error"),
  favorite: integer("favorite").notNull().default(0), savedAt: text("saved_at").notNull(),
  fetchedAt: text("fetched_at"), wordCount: integer("word_count").notNull().default(0),
}, t => [uniqueIndex("bookmarks_user_url").on(t.userId, t.url), index("bookmarks_user_date").on(t.userId, t.savedAt)]);
export const topics = sqliteTable("topics", {
  id: text("id").primaryKey(), userId: text("user_id").notNull(), name: text("name").notNull(),
}, t => [uniqueIndex("topics_user_name").on(t.userId, t.name)]);
export const bookmarkTopics = sqliteTable("bookmark_topics", {
  bookmarkId: text("bookmark_id").notNull().references(() => bookmarks.id, { onDelete: "cascade" }),
  topicId: text("topic_id").notNull().references(() => topics.id, { onDelete: "cascade" }),
}, t => [primaryKey({ columns: [t.bookmarkId, t.topicId] })]);
