"use client";
import { useState, useEffect } from "react";
import {
  ExternalLink,
  RefreshCw,
  Star,
  LoaderCircle,
  Quote,
} from "lucide-react";
import Modal from "./Modal";
import { api, formatDate, TopicDot } from "./shared";
import type { Bookmark } from "../../lib/types";
export default function DetailDialog({
  bookmark: initial,
  onClose,
  onUpdated,
  demo = false,
}: {
  bookmark: Bookmark;
  onClose: () => void;
  onUpdated: (b: Bookmark) => void;
  demo?: boolean;
}) {
  const [b, setB] = useState(initial);
  const [loading, setLoading] = useState(!demo);
  const [tab, setTab] = useState("summary");
  const [note, setNote] = useState(initial.note);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    if (demo) return;
    let live = true;
    api<{ bookmark: Bookmark }>(`/api/bookmarks/${initial.id}`)
      .then((r) => {
        if (live) {
          setB(r.bookmark);
          setNote(r.bookmark.note);
        }
      })
      .catch((e) => {
        if (live) setError(e.message);
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [initial.id, demo]);
  async function update(data: Record<string, unknown>, action: string) {
    setBusy(action);
    setError("");
    try {
      const r = await api<{ bookmark: Bookmark }>(`/api/bookmarks/${b.id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
      setB(r.bookmark);
      onUpdated(r.bookmark);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  return (
    <Modal title="Saved page" onClose={onClose} wide>
      <div className="detail-heading">
        <p className="detail-domain">
          {b.domain} <span>· Saved {formatDate(b.savedAt)}</span>
        </p>
        <h3>{b.title}</h3>
        <div className="detail-tools">
          <a
            className="secondary-button"
            href={b.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open original
            <ExternalLink size={15} />
          </a>
          {!demo ? (
            <>
              <button
                className={`icon-button ${b.favorite ? "is-favorite" : ""}`}
                aria-label={b.favorite ? "Remove favorite" : "Add to favorites"}
                disabled={!!busy}
                onClick={() => update({ favorite: !b.favorite }, "favorite")}
              >
                <Star size={19} />
              </button>
              <button
                className="text-button"
                disabled={!!busy}
                onClick={() => update({ retry: true }, "capture")}
              >
                <RefreshCw
                  size={15}
                  className={busy === "capture" ? "spin" : ""}
                />
                {busy === "capture" ? "Capturing…" : "Recapture"}
              </button>
            </>
          ) : (
            <span className="example-label">Example page</span>
          )}
        </div>
      </div>
      <div className="detail-tabs" role="tablist">
        {[
          ["summary", "Overview"],
          ["text", "Saved text"],
          ["metadata", "Metadata"],
        ].map(([key, label]) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            className={tab === key ? "active" : ""}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      {b.error ? <div className="capture-warning">{b.error}</div> : null}
      <div className="detail-body">
        {loading ? (
          <div className="detail-loading">
            <LoaderCircle className="spin" size={20} />
            Loading captured page…
          </div>
        ) : tab === "summary" ? (
          <>
            <h4>At a glance</h4>
            <p className="detail-summary">
              {b.summary ||
                "No summary is available yet. Try recapturing the page."}
            </p>
            <div className="detail-topics">
              {b.topics.map((t) => (
                <span key={t}>
                  <TopicDot name={t} />
                  {t}
                </span>
              ))}
            </div>
            <p className="analysis-caption">
              {demo
                ? "Sample summary and topics for this example library."
                : `Extractive summary · ${b.wordCount.toLocaleString()} words captured${b.fetchedAt ? ` · ${formatDate(b.fetchedAt)}` : ""}`}
            </p>
            <div className="note-editor">
              <label htmlFor="detail-note">
                <Quote size={16} />
                Your note
              </label>
              <textarea
                id="detail-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={4}
                maxLength={10000}
                disabled={demo || !!busy}
                placeholder="Add a thought to come back to…"
              />
              {!demo ? (
                <button
                  className="primary-button"
                  disabled={!!busy || note === b.note}
                  onClick={() => update({ note }, "note")}
                >
                  {busy === "note" ? "Saving…" : "Save note"}
                </button>
              ) : null}
            </div>
          </>
        ) : tab === "text" ? (
          <>
            <div className="text-meta">
              {b.wordCount.toLocaleString()} words · Captured page text
            </div>
            <div className="raw-text">
              {b.rawText ||
                (demo
                  ? "This is an example bookmark. Save your own link to capture its webpage text."
                  : "No webpage text has been captured. Use Recapture to try again.")}
            </div>
          </>
        ) : (
          <>
            <h4>Original URL</h4>
            <a
              className="metadata-url"
              href={b.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              {b.url}
            </a>
            <h4>Capture details</h4>
            <pre className="metadata-pre">
              {JSON.stringify(
                b.metadata ?? (demo ? { example: true } : { status: b.status }),
                null,
                2,
              )}
            </pre>
          </>
        )}
      </div>
    </Modal>
  );
}
