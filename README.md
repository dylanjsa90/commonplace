# Commonplace

A full-stack personal bookmark library deployed to Cloudflare Workers with a Cloudflare D1 database. Built with React, Vinext, TypeScript, and Cloudflare's Vite plugin.

Production: https://commonplace-library.dylanjsanders1.workers.dev

## Features

- Save HTTP(S) links with optional notes and immutable save dates.
- Bulk import up to 100 URLs, one per line, with live progress, duplicate skipping, three concurrent captures, stop/resume, and retry for unsaved links. Saved links with capture issues remain available for recapture in their details.
- Capture webpage metadata and readable text server-side, with retryable errors.
- Extract summaries from source sentences and classify up to three topics.
- Browse chronological links, raw tables, topic collections, and favorites.
- Search titles, URLs, notes, summaries, and topic names; sort and filter captures.
- Inspect saved text and metadata, edit notes, delete links, and export JSON.
- Email/password authentication with signed JWT sessions. Libraries are isolated by user ID.
- Create an account directly with your name, email, and password. The optional example library never inserts sample bookmarks into the database.

## Run locally

Requires Node.js 22.13 or later.

```sh
npm run install:ci
```

Create an ignored `.dev.vars` file containing `JWT_SECRET` with at least 32 random characters. The configured local project already has a development secret; production uses a separate Cloudflare secret.

```sh
npm run cf:migrate:local
npm run dev
```

The dev server uses http://127.0.0.1:5174. Visit `/register` and choose your password. Local data and credentials are separate from production.

```sh
npm test
npx tsc --noEmit
npm run build
```

## Deployment

The tracked `wrangler.jsonc` declares the Worker, account, D1 binding, migration directory, assets, and password auth mode. It contains no secrets. Resources have already been provisioned in the connected Cloudflare account.

```sh
npm run cf:login
npm run deploy
```

The deployment script validates the configuration, applies only pending D1 migrations, builds the Cloudflare Worker, and deploys the built configuration. The initial SQL migrations and Drizzle history must remain immutable. Add later migrations with `npm run db:generate` after changing `db/schema.ts`.

`JWT_SECRET` is configured separately using Wrangler secrets and is never embedded in the browser bundle. Rotate it only when intended: rotation invalidates existing JWTs. For a new environment, generate a strong secret with a password manager or cryptographic random generator and enter it through `wrangler secret put JWT_SECRET`. The Worker denies requests until password authentication and the secret are configured.

## Account creation

Visit `/register` to create an account with your name, email, and a password of at least 12 characters. Registration is open and requires no invitation or email allowlist. Email addresses are normalized to lowercase; duplicate addresses are rejected atomically. Account creation signs you in immediately. Each account's saved library remains private to that account.

## Authentication

Passwords use salted native scrypt with N=16384, r=8, p=5, and a 32-byte derived key. JWTs use HS256 with fixed issuer and audience, subject and session identifiers, and a 24-hour expiry. A matching, unexpired server session must also exist in D1, so logout revokes the JWT immediately.

Production cookies use the `__Host-` prefix, `Secure`, `HttpOnly`, `SameSite=Lax`, and `Path=/`. The local Vite preview uses an HTTP-compatible cookie. JWTs are not exposed to browser JavaScript or stored in localStorage. Login errors do not identify whether an email exists. Authentication attempts are limited to 10 per email and 25 per IP in a 10-minute window. State-changing endpoints validate request origin. Every bookmark operation is authorized against the current user ID.

Cloudflare Access can be enabled as an additional outer gate. Protect the Worker in Cloudflare Zero Trust, then configure both `ACCESS_TEAM_DOMAIN` and `ACCESS_AUD` as Worker variables. The Worker verifies the Access JWT's RS256 signature, issuer, audience, expiry, subject, and user identity against the team's current signing keys. Configuring only one variable denies requests. Password sign-in remains required inside this gate. No Access application is provisioned automatically.

## API

| Endpoint | Behavior |
| --- | --- |
| `POST /api/auth/register` | Create `{email, name, password}` account and set session cookie |
| `POST /api/auth/login` | Authenticate `{email, password}` and set session cookie |
| `POST /api/auth/logout` | Revoke current session and clear cookie |
| `GET /api/bookmarks` | Own library records without raw text payloads |
| `POST /api/bookmarks` | Save and capture `{url, note?}` |
| `GET /api/bookmarks/:id` | Own full record, text, metadata, topics |
| `PATCH /api/bookmarks/:id` | Edit `{note?, favorite?}` or recapture `{retry:true}` |
| `DELETE /api/bookmarks/:id` | Delete owned bookmark and topic associations |
| `GET /api/export` | Download own library JSON, including saved text |
| `GET /api/health` | Database and auth readiness, without private data |

## Capture and summarization

The app saves the bookmark before fetching, so network failures preserve the link and note. It fetches public HTML and plain-text pages, validates public DNS addresses and every redirect, removes executable markup, and stores readable text and source metadata. Fetched HTML is never executed or rendered as HTML.

Capture does not run webpage JavaScript, sign into third-party sites, or bypass paywalls. Sparse or blocked pages are labeled explicitly. It allows an 18-second deadline, five redirects, a 3 MB response limit, and 400,000 saved-text characters. Previously saved text survives a failed recapture; metadata indicates truncation.

Summarization ranks source sentences by term frequency and title/description overlap. Topics use weighted interest vocabularies and content-derived keywords. This is an English-oriented extractive summarizer; no external AI provider or API key is required.

## Verification

Nine automated tests cover password hashing, JWT signatures/expiry/audience/algorithms, URL safety, metadata extraction, extractive summaries, overlapping topics, private redirects/DNS, limited captures, unsupported files, and response-size limits. Browser checks cover direct signup, sign-in, logout revocation, tampering, account isolation, CSRF rejection, rate limits, real capture, notes, favorites, persistence, raw tables, export, and desktop/mobile layouts. Production registration, cookie flags, login/logout, revoked-token rejection, JavaScript/CSS loading, real page capture, and health were verified against the deployed Worker. Temporary QA accounts and bookmarks were removed.

The original Sites starter configuration is retained as historical scaffolding. Direct Cloudflare deployment uses `vite.config.cloudflare.ts`, `worker/cloudflare.ts`, and `wrangler.jsonc`; it does not publish to Sites or depend on ChatGPT sign-in.

## Example photography

The optional example library uses illustrative stock photography from Unsplash: https://images.unsplash.com/photo-1418065460487-3e41a6c84dc5, https://images.unsplash.com/photo-1448375240586-882707db888b, and https://images.unsplash.com/photo-1462331940025-496dfbfc7564. Real bookmarks use their webpage's Open Graph image when available.
