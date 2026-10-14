"use client";
import { useState, type FormEvent } from "react";
import { Link, ArrowRight, LoaderCircle, Sparkles } from "lucide-react";
import Modal from "./Modal";
import { api } from "./shared";
import type { Bookmark } from "../../lib/types";
export default function SaveDialog({onClose,onSaved}:{onClose:()=>void;onSaved:(b:Bookmark)=>void}) {
  const [url,setUrl]=useState(""); const [note,setNote]=useState(""); const [busy,setBusy]=useState(false); const [error,setError]=useState("");
  async function submit(e:FormEvent) { e.preventDefault(); setBusy(true); setError(""); try { const r=await api<{bookmark:Bookmark}>("/api/bookmarks",{method:"POST",body:JSON.stringify({url,note})}); onSaved(r.bookmark); } catch(e) {setError((e as Error).message);} finally{setBusy(false);} }
  return <Modal title="Something worth keeping." onClose={onClose}><p className="modal-intro">Save a link. Let the ideas find their place.</p><form onSubmit={submit}>
    <label htmlFor="save-url">Webpage URL</label><div className="input-with-icon"><Link size={18}/><input id="save-url" type="url" placeholder="https://..." required autoFocus value={url} onChange={e=>setUrl(e.target.value)} maxLength={3000} disabled={busy}/></div>
    <label htmlFor="save-note">Your note <span>optional</span></label><textarea id="save-note" placeholder="What caught your eye?" value={note} onChange={e=>setNote(e.target.value)} maxLength={10000} rows={4} disabled={busy}/>
    <div className="capture-hint"><Sparkles size={17}/><p>We’ll capture the page, make a short summary, and find its topics. Your note stays just as you wrote it.</p></div>
    {error?<p role="alert" className="form-error">{error}</p>:null}
    <div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button className="primary-button" disabled={busy}>{busy?<><LoaderCircle className="spin" size={17}/>Saving & capturing…</>:<>Save link<ArrowRight size={17}/></>}</button></div>
    {busy?<p className="saving-note" role="status">Fetching the page and finding topics. This can take a few seconds.</p>:null}
  </form></Modal>;
}
