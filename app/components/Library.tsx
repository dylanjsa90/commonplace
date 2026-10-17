"use client";
import { useEffect, useMemo, useState, useDeferredValue } from "react";
import {
  Plus,
  Search,
  SlidersHorizontal,
  List,
  Table2,
  Menu,
  ArrowRight,
  BookOpen,
  X,
  Check,
  LoaderCircle,
  ArrowUpRight,
  RefreshCw,
} from "lucide-react";
import type { Bookmark, Topic } from "../../lib/types";
import { examples } from "../../lib/examples";
import { api, formatDate, topicColor } from "./shared";
import Sidebar from "./Sidebar";
import BookmarkRow from "./BookmarkRow";
import SaveDialog from "./SaveDialog";
import ImportDialog from "./ImportDialog";
import DetailDialog from "./DetailDialog";
import Modal from "./Modal";

export default function Library({
  displayName,
  signOutPath,
}: {
  displayName: string;
  signOutPath: string;
}) {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [active, setActive] = useState("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("newest");
  const [view, setView] = useState("list");
  const [filterOpen, setFilterOpen] = useState(false);
  const [status, setStatus] = useState("all");
  const [hasNote, setHasNote] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [detail, setDetail] = useState<Bookmark | null>(null);
  const [deleting, setDeleting] = useState<Bookmark | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [demo, setDemo] = useState(false);
  const [toast, setToast] = useState("");
  const [importing, setImporting] = useState(false);
  const deferredQuery = useDeferredValue(query);

  async function load() {
    try {
      const r = await api<{ bookmarks: Bookmark[] }>("/api/bookmarks");
      setBookmarks(r.bookmarks);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const pending = bookmarks.some((b) => b.status === "pending");

  useEffect(() => {
    if (!pending) return;
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [pending]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 5000);
    return () => clearTimeout(t);
  }, [toast]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        document.getElementById("library-search")?.focus();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);
  const items = demo ? examples : bookmarks;
  const topics = useMemo(() => {
    const counts = new Map<string, number>();
    for (const b of items)
      for (const t of b.topics) counts.set(t, (counts.get(t) ?? 0) + 1);
    return [...counts]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [items]);

  const filtered = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    return items
      .filter(
        (b) =>
          (active === "all" ||
            active === "topics" ||
            (active === "favorites"
              ? b.favorite
              : b.topics.includes(active))) &&
          (status === "all" || b.status === status) &&
          (!hasNote || !!b.note) &&
          (!q ||
            `${b.title} ${b.url} ${b.summary} ${b.note} ${b.topics.join(" ")}`
              .toLowerCase()
              .includes(q)),
      )
      .sort((a, b) =>
        sort === "title"
          ? a.title.localeCompare(b.title)
          : sort === "oldest"
            ? a.savedAt.localeCompare(b.savedAt)
            : b.savedAt.localeCompare(a.savedAt),
      );
  }, [items, active, status, hasNote, deferredQuery, sort]);
  const filterCount = Number(status !== "all") + Number(hasNote);
  const isTopic = !["all", "topics", "favorites"].includes(active);
  const heading =
    active === "topics"
      ? "Follow your curiosity."
      : active === "favorites"
        ? "The ones you come back to."
        : isTopic
          ? active
          : "Your corner of the internet.";
  const subtitle =
    active === "topics"
      ? "Different threads. A collection of connected ideas."
      : active === "favorites"
        ? "A little closer to hand. Your favorite things worth keeping."
        : isTopic
          ? `Good reads and bright ideas about ${active.toLowerCase()}.`
          : "Good reads, bright ideas, and things worth coming back to.";
  function updated(b: Bookmark) {
    setBookmarks((bs) => bs.map((x) => (x.id === b.id ? b : x)));
  }
  async function favorite(b: Bookmark) {
    try {
      const r = await api<{ bookmark: Bookmark }>(`/api/bookmarks/${b.id}`, {
        method: "PATCH",
        body: JSON.stringify({ favorite: !b.favorite }),
      });
      updated(r.bookmark);
      setToast(
        r.bookmark.favorite ? "Added to favorites" : "Removed from favorites",
      );
    } catch (e) {
      setToast((e as Error).message);
    }
  }
  async function deleteLink() {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await api(`/api/bookmarks/${deleting.id}`, { method: "DELETE" });
      setBookmarks((bs) => bs.filter((b) => b.id !== deleting.id));
      setDeleting(null);
      setToast("Link deleted");
    } catch (e) {
      setToast((e as Error).message);
    } finally {
      setDeleteBusy(false);
    }
  }
  function select(v: string) {
    setActive(v);
    setQuery("");
    setStatus("all");
    setHasNote(false);
  }
  function saved(b: Bookmark) {
    setBookmarks((bs) => [b, ...bs]);
    setDemo(false);
    setSaving(false);
    select("all");
    setToast(
      b.status === "ready"
        ? "Saved, summarized, and sorted into topics."
        : "Link saved. Open it to check the capture status.",
    );
  }
  return (
    <div className="app-shell">
      <Sidebar
        count={items.length}
        favorites={items.filter((b) => b.favorite).length}
        topics={topics}
        active={active}
        onSelect={select}
        displayName={displayName}
        signOutPath={signOutPath}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />
      <main className="main">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="mobile-menu icon-button"
              aria-label="Open navigation"
              onClick={() => setMobileOpen(true)}
            >
              <Menu size={21} />
            </button>
            <span>Library</span>
            <span className="breadcrumb-slash">/</span>
            <span>
              {active === "all"
                ? "All links"
                : active === "topics"
                  ? "Topics"
                  : active === "favorites"
                    ? "Favorites"
                    : active}
            </span>
          </div>
          <div className="topbar-actions">
            <button
              className="secondary-button"
              onClick={() => setImporting(true)}
            >
              Import URLs
            </button>
            <button className="primary-button" onClick={() => setSaving(true)}>
              <Plus size={19} />
              Save a link
            </button>
          </div>
        </header>
        <div className="main-inner">
          <section className="intro">
            <h1>{heading}</h1>
            <p>{subtitle}</p>
            <div className="library-count">
              <span>
                {items.length} {demo ? "example" : "saved"}{" "}
                {items.length === 1 ? "link" : "links"}
              </span>
              <i />{" "}
              <span>
                {topics.length} {topics.length === 1 ? "topic" : "topics"}
              </span>
            </div>
          </section>
          {demo ? (
            <div className="demo-banner">
              <span>
                You’re exploring an example library. Save your first link to
                make it yours.
              </span>
              <button
                onClick={() => {
                  setDemo(false);
                  select("all");
                }}
                aria-label="Close example library"
              >
                <X size={15} />
              </button>
            </div>
          ) : null}
          <div className="search-toolbar">
            <div className="search-box">
              <Search size={19} />
              <input
                id="library-search"
                aria-label="Search your library"
                placeholder="Search your library…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {query ? (
                <button
                  className="icon-button"
                  aria-label="Clear search"
                  onClick={() => setQuery("")}
                >
                  <X size={16} />
                </button>
              ) : (
                <kbd>⌘ K</kbd>
              )}
            </div>
            <button
              className={`secondary-button filter-button ${filterCount ? "filter-active" : ""}`}
              aria-expanded={filterOpen}
              onClick={() => setFilterOpen(!filterOpen)}
            >
              <SlidersHorizontal size={17} />
              Filter{filterCount ? <span>{filterCount}</span> : null}
            </button>
          </div>
          {filterOpen ? (
            <div className="filter-panel">
              <label>
                Capture status
                <select
                  aria-label="Capture status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="all">All links</option>
                  <option value="ready">Captured</option>
                  <option value="partial">Limited capture</option>
                  <option value="failed">Capture failed</option>
                  <option value="pending">Capturing</option>
                </select>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={hasNote}
                  onChange={(e) => setHasNote(e.target.checked)}
                />
                Has a note
              </label>
              <button
                className="text-button"
                onClick={() => {
                  setStatus("all");
                  setHasNote(false);
                }}
              >
                Reset filters
              </button>
            </div>
          ) : null}
          <div className="view-toolbar">
            <div className="view-tabs">
              <button
                className={active !== "topics" ? "active" : ""}
                onClick={() => select("all")}
              >
                All links
              </button>
              <button
                className={active === "topics" ? "active" : ""}
                onClick={() => select("topics")}
              >
                By topic
              </button>
            </div>
            <div className="view-controls">
              <select
                aria-label="Sort links"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="title">Title, A–Z</option>
              </select>
              <div className="view-toggle">
                <button
                  className={view === "list" ? "active" : ""}
                  aria-label="List view"
                  aria-pressed={view === "list"}
                  onClick={() => setView("list")}
                >
                  <List size={19} />
                </button>
                <button
                  className={view === "raw" ? "active" : ""}
                  aria-label="Raw table view"
                  aria-pressed={view === "raw"}
                  onClick={() => setView("raw")}
                >
                  <Table2 size={18} />
                </button>
              </div>
            </div>
          </div>
          {error ? (
            <div className="library-error" role="alert">
              <p>{error}</p>
              <button
                className="secondary-button"
                onClick={() => {
                  setLoading(true);
                  load();
                }}
              >
                <RefreshCw size={15} />
                Try again
              </button>
            </div>
          ) : loading ? (
            <div className="loading-state">
              <LoaderCircle className="spin" size={24} />
              <p>Opening your library…</p>
            </div>
          ) : !items.length ? (
            <div className="empty-state">
              <div className="empty-book">
                <BookOpen size={43} strokeWidth={1.3} />
              </div>
              <h2>A good collection starts with one link.</h2>
              <p>
                An article that made you think. A project you want to try.
                <br />
                Save it here — we’ll help you find it again.
              </p>
              <button
                className="primary-button"
                onClick={() => setSaving(true)}
              >
                Save your first link
                <ArrowRight size={17} />
              </button>
              <button
                className="example-button"
                onClick={() => {
                  setDemo(true);
                  select("all");
                }}
              >
                Explore an example library
                <ArrowUpRight size={14} />
              </button>
              <div className="empty-steps">
                <span>
                  <span>01</span>Save a link
                </span>
                <span>
                  <span>02</span>We capture & summarize
                </span>
                <span>
                  <span>03</span>Discover your topics
                </span>
              </div>
            </div>
          ) : !filtered.length ? (
            <div className="no-results">
              <Search size={28} />
              <h2>
                {active === "favorites"
                  ? "Your favorites are waiting."
                  : "No links found."}
              </h2>
              <p>
                {active === "favorites"
                  ? "Use a link’s actions menu to keep your favorite reads close."
                  : "Try a different search or clear your filters."}
              </p>
              {active !== "favorites" ? (
                <button
                  className="secondary-button"
                  onClick={() => {
                    setQuery("");
                    setStatus("all");
                    setHasNote(false);
                  }}
                >
                  Clear search & filters
                </button>
              ) : null}
            </div>
          ) : active === "topics" ? (
            <TopicGroups
              topics={topics}
              bookmarks={filtered}
              onSelect={select}
            />
          ) : view === "raw" ? (
            <RawTable bookmarks={filtered} onOpen={setDetail} />
          ) : (
            <div className="bookmark-list">
              {filtered.map((b) => (
                <BookmarkRow
                  key={b.id}
                  bookmark={b}
                  onOpen={() => setDetail(b)}
                  onFavorite={() => favorite(b)}
                  onDelete={() => setDeleting(b)}
                  onTopic={select}
                  demo={demo}
                />
              ))}
            </div>
          )}
          {!loading && !error && items.length > 0 ? (
            <footer className="list-footer">
              <span>
                {active === "topics"
                  ? `${topics.filter((t) => filtered.some((b) => b.topics.includes(t.name))).length} topic collections`
                  : `Showing ${filtered.length} of ${items.length} links`}
              </span>
              <span>
                {demo ? "Example library" : "Collected with curiosity."}
              </span>
            </footer>
          ) : null}
        </div>
      </main>
      {importing ? (
        <ImportDialog
          onClose={() => setImporting(false)}
          onSaved={(b) => {
            setBookmarks((bs) => [b, ...bs.filter((x) => x.id !== b.id)]);
            setDemo(false);
            select("all");
          }}
        />
      ) : null}
      {saving ? (
        <SaveDialog onClose={() => setSaving(false)} onSaved={saved} />
      ) : null}
      {detail ? (
        <DetailDialog
          bookmark={detail}
          onClose={() => setDetail(null)}
          onUpdated={updated}
          demo={demo}
        />
      ) : null}
      {deleting ? (
        <Modal title="Let this one go?" onClose={() => setDeleting(null)}>
          <p className="modal-intro">
            “{deleting.title}” and its saved text, summary, and note will be
            removed from your library.
          </p>
          <div className="modal-actions">
            <button
              className="secondary-button"
              onClick={() => setDeleting(null)}
            >
              Keep link
            </button>
            <button
              className="danger-button"
              disabled={deleteBusy}
              onClick={deleteLink}
            >
              {deleteBusy ? "Deleting…" : "Delete link"}
            </button>
          </div>
        </Modal>
      ) : null}
      {toast ? (
        <div className="toast" role="status">
          <Check size={17} />
          <span>{toast}</span>
          <button
            aria-label="Dismiss notification"
            onClick={() => setToast("")}
          >
            <X size={15} />
          </button>
        </div>
      ) : null}
    </div>
  );
}

function RawTable({
  bookmarks,
  onOpen,
}: {
  bookmarks: Bookmark[];
  onOpen: (b: Bookmark) => void;
}) {
  return (
    <div className="raw-table-wrapper">
      <table className="raw-table">
        <thead>
          <tr>
            <th>Link</th>
            <th>Note</th>
            <th>Date saved</th>
            <th>Capture</th>
          </tr>
        </thead>
        <tbody>
          {bookmarks.map((b) => (
            <tr key={b.id}>
              <td>
                <button onClick={() => onOpen(b)}>{b.title}</button>
                <a href={b.url} target="_blank" rel="noopener noreferrer">
                  {b.url}
                </a>
              </td>
              <td>{b.note || <span className="muted">No note</span>}</td>
              <td>
                <time dateTime={b.savedAt}>{formatDate(b.savedAt)}</time>
              </td>
              <td>
                <span className={`status status-${b.status}`}>
                  {b.status === "ready"
                    ? "Captured"
                    : b.status === "partial"
                      ? "Limited"
                      : b.status === "failed"
                        ? "Failed"
                        : "Pending"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function TopicGroups({
  topics,
  bookmarks,
  onSelect,
}: {
  topics: Topic[];
  bookmarks: Bookmark[];
  onSelect: (name: string) => void;
}) {
  return (
    <div className="topic-groups">
      {topics
        .filter((t) => bookmarks.some((b) => b.topics.includes(t.name)))
        .map((t) => {
          const links = bookmarks.filter((b) => b.topics.includes(t.name));
          return (
            <button
              className="topic-group"
              key={t.name}
              onClick={() => onSelect(t.name)}
            >
              <div className="topic-group-heading">
                <span
                  className="topic-collection-icon"
                  style={{
                    background: topicColor(t.name) + "28",
                    color: topicColor(t.name),
                  }}
                >
                  <BookOpen size={23} />
                </span>
                <span>
                  {links.length} {links.length === 1 ? "link" : "links"}
                </span>
                <ArrowUpRight size={20} />
              </div>
              <h2>{t.name}</h2>
              <div className="topic-preview">
                {links.slice(0, 3).map((b) => (
                  <p key={b.id}>{b.title}</p>
                ))}
              </div>
              <span className="topic-group-footer">
                Explore collection
                <ArrowRight size={16} />
              </span>
            </button>
          );
        })}
    </div>
  );
}
