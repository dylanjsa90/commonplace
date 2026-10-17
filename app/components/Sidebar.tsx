"use client";
import {
  BookOpen,
  FileText,
  Tags,
  Star,
  Download,
  ChevronDown,
  X,
} from "lucide-react";
import { TopicDot } from "./shared";
import type { Topic } from "../../lib/types";
export default function Sidebar({
  count,
  favorites,
  topics,
  active,
  onSelect,
  displayName,
  signOutPath,
  mobileOpen,
  onClose,
}: {
  count: number;
  favorites: number;
  topics: Topic[];
  active: string;
  onSelect: (v: string) => void;
  displayName: string;
  signOutPath: string;
  mobileOpen: boolean;
  onClose: () => void;
}) {
  function select(v: string) {
    onSelect(v);
    onClose();
  }
  return (
    <>
      <div
        className={`sidebar-backdrop ${mobileOpen ? "visible" : ""}`}
        onClick={onClose}
      />
      <aside className={`sidebar ${mobileOpen ? "open" : ""}`}>
        <a className="brand" href="/" aria-label="Commonplace home">
          <BookOpen size={30} strokeWidth={1.65} />
          <span>Commonplace</span>
        </a>
        <button
          className="mobile-close icon-button"
          aria-label="Close navigation"
          onClick={onClose}
        >
          <X size={20} />
        </button>
        <p className="nav-label">Library</p>
        <nav aria-label="Library">
          <button
            className={active === "all" ? "selected" : ""}
            onClick={() => select("all")}
          >
            <FileText size={19} />
            <span>All links</span>
            <small>{count}</small>
          </button>
          <button
            className={active === "topics" ? "selected" : ""}
            onClick={() => select("topics")}
          >
            <Tags size={19} />
            <span>Topics</span>
            <small>{topics.length}</small>
          </button>
          <button
            className={active === "favorites" ? "selected" : ""}
            onClick={() => select("favorites")}
          >
            <Star size={19} />
            <span>Favorites</span>
            <small>{favorites}</small>
          </button>
        </nav>
        <div className="sidebar-topics">
          <p className="nav-label">Topics</p>
          {topics.length ? (
            topics.map((t) => (
              <button
                key={t.name}
                className={`topic-nav ${active === t.name ? "selected" : ""}`}
                onClick={() => select(t.name)}
              >
                <TopicDot name={t.name} />
                <span>{t.name}</span>
                <small>{t.count}</small>
              </button>
            ))
          ) : (
            <p className="sidebar-empty">
              Your interests will take shape as you save links.
            </p>
          )}
        </div>
        <div className="sidebar-bottom">
          <p className="library-motto">A home for your curiosity.</p>
          <a className="export-link" href="/api/export" download>
            <Download size={15} />
            Export your library
          </a>
          <details className="profile">
            <summary>
              <span className="avatar">
                {displayName === "Personal library"
                  ? "C"
                  : displayName[0].toUpperCase()}
              </span>
              <span>{displayName}</span>
              <ChevronDown size={16} />
            </summary>
            {signOutPath === "/logout" ? (
              <form action="/api/auth/logout" method="POST">
                <button>Sign out</button>
              </form>
            ) : (
              <a href={signOutPath} target="_top">
                Sign out
              </a>
            )}
          </details>
        </div>
      </aside>
    </>
  );
}
