import type { CSSProperties } from "react";
export const colors: Record<string,string> = { Design: "#df8593", Technology: "#7ea2c5", Culture: "#d5b879", Science: "#aaa0e2", "Mindful living": "#80a887", Environment: "#80a887", Health: "#db9778", Business: "#a69a85", Travel: "#77a8ad", "Food & cooking": "#d6a765", Uncategorized: "#a3aba1" };
export function topicColor(name: string) { return colors[name] ?? ["#7ea2c5","#80a887","#aaa0e2","#d5b879","#df8593"][Array.from(name).reduce((n,c)=>n+c.charCodeAt(0),0)%5]; }
export function TopicDot({name}: {name:string}) { return <span className="topic-dot" style={{"--dot":topicColor(name)} as CSSProperties} />; }
export function formatDate(date: string) { return new Intl.DateTimeFormat("en-US",{month:"short",day:"numeric",year:"numeric"}).format(new Date(date)); }
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(path,{...init,headers:{"Content-Type":"application/json",...init?.headers}});
  const data = await r.json() as T & {error?:string}; if(!r.ok) throw new Error(data.error ?? "Please try again."); return data;
}
