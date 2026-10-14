"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
export default function Modal({title,onClose,children,wide=false}:{title:string;onClose:()=>void;children:ReactNode;wide?:boolean}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(()=>{ ref.current?.showModal(); const original = document.body.style.overflow; document.body.style.overflow="hidden"; return ()=>{ document.body.style.overflow=original; }; },[]);
  return <dialog className={`modal ${wide?"modal-wide":""}`} ref={ref} aria-label={title} onCancel={onClose} onClick={e=>{if(e.target===e.currentTarget){const r=e.currentTarget.getBoundingClientRect(); if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)onClose();}}}>
    <div className="modal-head"><h2>{title}</h2><button className="icon-button" aria-label="Close dialog" onClick={onClose}><X size={20}/></button></div>{children}
  </dialog>;
}
