# Commonplace

A full-stack personal bookmark library built with React, Vinext, TypeScript, and Cloudflare D1. Hosted by Sites with ChatGPT sign-in. All reads and writes are scoped to the signed-in visitor's stable user ID.

## What it does

- Saves an HTTP(S) URL with an optional note and an immutable save timestamp.
- Persists the bookmark before capture, so failed fetches do not lose it.
- Fetches public HTML or plain-text pages server-side, follows validated redirects, and extracts title, description, preview image, metadata, and readable page text.
- Runs an extractive sentence-ranking summarizer and a topic classifier. No API key or external AI provider is required.
- Supports chronological list and raw table views, topic collections, search, sorting, capture-status filters, favorites, editable notes, and deletion.
- Lets you inspect saved text and metadata, retry capture, and export the complete library as JSON.
- Starts with an empty database. The clearly labeled example library is an optional frontend preview; example content is never inserted into the database.

## Local development

Requires Node.js 22.13 or later.

```sh
npm run install:ci
npm run db:generate
npm run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_misty_nitro.sql
npm run dev
```

Visit the printed loopback URL. The portable starter simulates sign-in at `/signin-with-chatgpt?return_to=/`. Local sign-in and database state are separate from production. Apply the initial migration once; apply only new pending migrations after schema changes. The tracked SQL and Drizzle journal are deployed through Sites automatically.

```sh
npm test
npx tsc --noEmit
npm run build
```

The tests cover private-address rejection, metadata extraction, source-based summarization, overlapping topics, partial captures, private redirects, DNS validation, unsupported file types, and capture size limits. Browser QA additionally covers real capture, notes, favorites, reload persistence, topic navigation, raw tables, duplicate URLs, authorization, export, and mobile layout.

## Data and API

`bookmarks` stores the source URL, note, save time, fetched time, capture status, title, description, summary, raw text, metadata JSON, image URL, favorite flag, and word count. `topics` and `bookmark_topics` hold per-user topic collections and their many-to-many relationships. The URL is unique per user; fragments are removed while meaningful query parameters are preserved.

| Endpoint | Behavior |
| --- | --- |
| `GET /api/bookmarks` | Library records without raw text payloads |
| `POST /api/bookmarks` | Save and capture `{url, note?}` |
| `GET /api/bookmarks/:id` | Full record, captured text, metadata, and topics |
| `PATCH /api/bookmarks/:id` | Edit `{note? , favorite?}` or recapture `{retry:true}` |
| `DELETE /api/bookmarks/:id` | Delete an owned bookmark and its topic associations |
| `GET /api/export` | Download complete JSON, including raw page text |

API routes require platform-authenticated identity. Mutations validate origin, input types and bounds, and use parameterized SQL. Only a user's own records can be viewed or modified. Extraction output is rendered as escaped text; fetched HTML is never executed. Capture rejects private addresses, unsafe schemes, custom ports, credentials, and redirects to private hosts. DNS resolution is checked through Cloudflare DNS before every fetch.

## Summarization and capture limits

The summarizer ranks existing sentences using term frequency and title/description overlap, selecting up to two source sentences. Topics use a weighted vocabulary of broad interests, with content-derived keywords for unrecognized interests. This is an English-oriented extractive summarizer, not an LLM. It does not invent an abstract or claim full semantic understanding.

Capture reads server-rendered content; it does not run browser JavaScript, bypass paywalls, or sign into third-party sites. Blocked pages, sparse text, unsupported file types, and errors are visible and retryable. Each capture has an 18-second deadline, at most five redirects, a 3 MB response limit, and 400,000 captured-text characters. Previously captured text is retained if a refresh fails. `metadata.textTruncated` indicates text truncation. Search matches titles, URLs, notes, summaries, and topic names.

The app's production source manifest is `.openai/hosting.json`, with a `DB` D1 binding. Runtime data, dev identity, build output, and temporary QA scripts are excluded from source publication. Sites owns production authentication and provisioning.

## Example photography

The optional example library uses stock photographs from Unsplash; these are illustrations of the demo and are not presented as fetched article images. Sources: [forest interior](https://images.unsplash.com/photo-1418065460487-3e41a6c84dc5), [forest path](https://images.unsplash.com/photo-1448375240586-882707db888b), [space](https://images.unsplash.com/photo-1462331940025-496dfbfc7564). Real bookmarks use the page's own Open Graph or Twitter preview image when available.
