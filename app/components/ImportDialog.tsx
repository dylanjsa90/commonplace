"use client";
import { useRef, useState, type FormEvent } from "react";
import { ArrowRight, LoaderCircle } from "lucide-react";
import type { Bookmark } from "../../lib/types";
import { IMPORT_LIMIT, parseImport, processImport, type ImportEntry } from "../../lib/url-import";
import Modal from "./Modal";

type Result = ImportEntry & { status: "queued" | "capturing" | "saved" | "skipped" | "error"; message?: string };

export default function ImportDialog({ onClose, onSaved }: { onClose: () => void; onSaved: (bookmark: Bookmark) => void }) {
  const [text, setText] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const stop = useRef(false);
  const running = useRef(false);
  const entries = parseImport(text);
  const valid = entries.filter(entry => entry.url).length;
  const completed = results.filter(r => !["queued", "capturing"].includes(r.status)).length;
  const saved = results.filter(r => r.status === "saved").length;

  async function run(initial: Result[]) {
    if (running.current) return;
    running.current = true;
    stop.current = false;
    setBusy(true);
    setResults(initial);
    setError("");
    const update = (index: number, status: Result["status"], message?: string) =>
      setResults(previous => previous.map((row, i) => i === index ? { ...row, status, message } : row));
    try {
      await processImport(initial.map((row, index) => ({ row, index })).filter(({ row }) => row.status === "queued"), async ({ row, index }) => {
        update(index, "capturing");
        try {
          const response = await fetch("/api/bookmarks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: row.url }) });
          const data = await response.json() as { bookmark?: Bookmark; error?: string };
          if (response.status === 409) { update(index, "skipped", "Already in your library."); return; }
          if (!response.ok || !data.bookmark) {
            if (response.status === 401 || response.status === 403) stop.current = true;
            throw new Error(data.error ?? "Could not save this link. Try again.");
          }
          onSaved(data.bookmark);
          update(index, "saved", data.bookmark.status === "ready" ? "Saved and captured." : "Saved with limited or failed capture. Open the link to retry capture.");
        } catch (error) { update(index, "error", (error as Error).message); }
      }, () => stop.current);
    } finally { running.current = false; setBusy(false); }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!valid || entries.length > IMPORT_LIMIT) { setError(`Enter at least one valid URL and no more than ${IMPORT_LIMIT} non-empty lines.`); return; }
    void run(entries.map(entry => ({ ...entry, status: entry.url ? "queued" : "skipped", message: entry.error })));
  }

  return <Modal title="Bring your links together." wide onClose={() => { if (!running.current) onClose(); }}>
    <p className="modal-intro">Paste one complete URL per line, up to {IMPORT_LIMIT} links. We’ll capture and summarize each new link. Duplicates are skipped.</p>
    {!results.length ? <form onSubmit={submit}>
      <label htmlFor="import-urls">Webpage URLs</label>
      <textarea id="import-urls" autoFocus rows={8} placeholder={"https://example.com/article\nhttps://example.org/story"} value={text} onChange={event => setText(event.target.value)} maxLength={300100} aria-describedby="import-count" />
      <p id="import-count" className="import-count" role="status">{valid} ready to import · {entries.length - valid} invalid or duplicate{entries.length > IMPORT_LIMIT ? ` · Limit: ${IMPORT_LIMIT} lines` : ""}</p>
      {entries.some(entry => entry.error) ? <ul className="import-preview">{entries.map((entry, i) => entry.error ? <li key={i}>URL {i + 1}: {entry.error} <span>{entry.input}</span></li> : null)}</ul> : null}
      {error ? <p role="alert" className="form-error">{error}</p> : null}
      <div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button className="primary-button" disabled={!valid || entries.length > IMPORT_LIMIT}>Import {valid} {valid === 1 ? "link" : "links"}<ArrowRight size={17}/></button></div>
    </form> : <>
      <div className="import-progress" role="status" aria-live="polite">{busy ? <LoaderCircle className="spin" size={17}/> : null}<span>{busy ? "Importing" : results.some(row => row.status === "queued") ? "Import paused" : "Import finished"}: {completed} of {results.length} processed · {saved} saved</span></div>
      <progress max={results.length} value={completed} aria-label="Import progress"/>
      <ol className="import-results">{results.map((row, i) => <li key={i} data-status={row.status}><span className="import-url">{row.input}</span><span>{row.message ?? (row.status === "capturing" ? "Saving & capturing…" : "Waiting to import")}</span></li>)}</ol>
      <div className="modal-actions">{busy ? <button className="secondary-button" onClick={() => { stop.current = true; setError("Stopping after the current captures finish. Remaining links can be resumed."); }}>Stop import</button> : <>
        {results.some(row => row.status === "queued" || row.status === "error") ? <button className="secondary-button" onClick={() => void run(results.map(row => row.url && (row.status === "error" || row.status === "queued") ? { ...row, status: "queued", message: undefined } : row))}>Retry remaining</button> : null}
        <button className="secondary-button" onClick={() => { setResults([]); setText(""); setError(""); }}>Import more</button><button className="primary-button" onClick={onClose}>Done</button>
      </>}</div>
      {error ? <p className="saving-note" role="status">{error}</p> : null}
      {busy ? <p className="saving-note">Keep this dialog open while importing. Each capture can take a few seconds.</p> : null}
    </>}
  </Modal>;
}
