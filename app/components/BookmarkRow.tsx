"use client";
import { useState } from "react";
import { MoreHorizontal, Star, Quote, RefreshCw, Trash2, FileText, ExternalLink } from "lucide-react";
import type { Bookmark } from "../../lib/types";
import { formatDate, TopicDot, topicColor } from "./shared";
export default function BookmarkRow({bookmark:b,onOpen,onFavorite,onDelete,onTopic,demo=false}:{bookmark:Bookmark;onOpen:()=>void;onFavorite:()=>void;onDelete:()=>void;onTopic:(topic:string)=>void;demo?:boolean}) {
  const [menu,setMenu]=useState(false); const [imageFailed,setImageFailed]=useState(false);
  return <article className="bookmark-row">
    <div className="source-mark" style={{background:topicColor(b.topics[0] ?? b.domain)}} aria-hidden="true">{b.domain[0].toUpperCase()}</div>
    <div className="bookmark-content"><div className="source-line"><a href={b.url} target="_blank" rel="noopener noreferrer">{b.domain}<ExternalLink size={11}/></a>{b.favorite?<Star size={12} className="favorite-mark"/>:null}{b.status!=="ready"?<span className={`status status-${b.status}`}>{b.status==="pending"?"Capturing…":b.status==="partial"?"Limited capture":"Capture failed"}</span>:null}</div>
      <button className="article-title" onClick={onOpen}>{b.title}</button><p className="article-summary">{b.summary || (b.status==="pending"?"Capturing this page and finding its topics…":"Your link is safe here. Open it to retry capturing the page.")}</p>
      <div className="row-topics">{b.topics.map(t=><button key={t} onClick={()=>onTopic(t)}><TopicDot name={t}/>{t}</button>)}</div>
      {b.note?<p className="article-note"><Quote size={15}/><span>{b.note}</span></p>:null}
    </div>
    <div className="bookmark-side"><div className="date-menu"><time dateTime={b.savedAt}>{formatDate(b.savedAt)}</time><div className="row-menu-wrap"><button className="icon-button" aria-label={`Actions for ${b.title}`} aria-expanded={menu} onClick={()=>setMenu(!menu)}><MoreHorizontal size={20}/></button>{menu?<><button className="menu-catcher" aria-label="Close actions" onClick={()=>setMenu(false)}/><div className="row-menu"><button onClick={()=>{setMenu(false);onOpen();}}><FileText size={15}/>View saved page</button>{!demo?<><button onClick={()=>{setMenu(false);onFavorite();}}><Star size={15}/>{b.favorite?"Remove favorite":"Add to favorites"}</button><button className="danger-text" onClick={()=>{setMenu(false);onDelete();}}><Trash2 size={15}/>Delete link</button></>:null}</div></>:null}</div></div>
      {b.image&&!imageFailed?<button className="thumbnail" onClick={onOpen} aria-label={`View ${b.title}`}><img src={b.image} onError={()=>setImageFailed(true)} alt="" loading="lazy" referrerPolicy="no-referrer"/></button>:<button className={`thumbnail thumbnail-art art-${(b.topics[0]??"Uncategorized").toLowerCase().replace(/\W+/g,"-")}`} onClick={onOpen} aria-label={`View ${b.title}`}><span/><span/><span/></button>}
    </div>
  </article>;
}
