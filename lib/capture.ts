import { summarize } from "./summarizer";
export function normalizeUrl(input: string) {
  let url: URL;
  try { url = new URL(input); } catch { throw new Error("Enter a complete URL, starting with https:// or http://."); }
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (!/^https?:$/.test(url.protocol) || url.username || url.password || (url.port && !["80", "443"].includes(url.port))) throw new Error("Use a public HTTP or HTTPS page without credentials or a custom port.");
  if (host === "localhost" || !host.includes(".") || /\.(local|internal|localhost)$/.test(host) || isPrivateIp(host)) throw new Error("Only public web pages can be saved.");
  url.hash = ""; return url.toString();
}
export function isPrivateIp(ip: string) {
  if (ip.includes(":")) {
    const first = parseInt(ip.split(":")[0] || "0",16);
    // Permit only globally routable unicast. This also rejects expanded
    // loopback, IPv4-mapped addresses, multicast, and transition tunnels.
    return !Number.isFinite(first) || first < 0x2000 || first >= 0x4000 ||
      first === 0x2002 || /^2001:(?:0*:|0*db8:)/i.test(ip);
  }
  const p = ip.split(".").map(Number);
  if (p.length !== 4 || p.some(n => !Number.isInteger(n) || n < 0 || n > 255)) return false;
  return p[0] === 0 || p[0] === 10 || p[0] === 127 || p[0] >= 224 ||
    (p[0] === 169 && p[1] === 254) || (p[0] === 172 && p[1] >= 16 && p[1] <= 31) ||
    (p[0] === 192 && (p[1] === 168 || p[1] === 0)) || (p[0] === 100 && p[1] >= 64 && p[1] <= 127) ||
    (p[0] === 198 && (p[1] === 18 || p[1] === 19 || p[1] === 51)) || (p[0] === 203 && p[1] === 0 && p[2] === 113);
}
async function checkPublicHost(url: string, signal: AbortSignal) {
  const host = new URL(normalizeUrl(url)).hostname;
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) return;
  const records = await Promise.all(["A","AAAA"].map(async type => {
    const response = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(host)}&type=${type}`, { headers: { accept: "application/dns-json" }, signal });
    if (!response.ok) throw new Error("Could not verify this page's public address. Try again.");
    return response.json() as Promise<{ Answer?: { type: number; data: string }[] }>;
  }));
  const addresses = records.flatMap(dns => dns.Answer ?? []).filter(a => a.type === 1 || a.type === 28);
  if (!addresses.length || addresses.some(a => isPrivateIp(a.data))) throw new Error("This address does not resolve to a public webpage.");
}
export function decode(text: string) {
  const entities: Record<string,string> = { amp: "&", quot: '"', apos: "'", lt: "<", gt: ">", nbsp: " ", ndash: "–", mdash: "—", hellip: "…", lsquo: "‘", rsquo: "’", ldquo: "“", rdquo: "”", copy: "©" };
  return text.replace(/&(#x[\da-f]+|#\d+|\w+);/gi, (whole, key: string) => {
    if (!key.startsWith("#")) return entities[key.toLowerCase()] ?? whole;
    const n = key[1].toLowerCase() === "x" ? parseInt(key.slice(2),16) : parseInt(key.slice(1),10);
    return n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : "";
  });
}
function attrs(tag: string) {
  const result: Record<string,string> = {};
  for (const m of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) result[m[1].toLowerCase()] = decode(m[2] ?? m[3] ?? m[4]);
  return result;
}
function publicAsset(value: string | undefined, base: string) {
  if (!value) return null;
  try { return normalizeUrl(new URL(value,base).toString()); } catch { return null; }
}
export function extractPage(html: string, url: string) {
  const meta: Record<string,string> = {};
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) { const a = attrs(tag); const key = a.property ?? a.name; if(key && a.content) meta[key.toLowerCase()] = a.content.slice(0,10000); }
  const title = (meta["og:title"] || meta["twitter:title"] || decode(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "") || new URL(url).hostname).replace(/\s+/g," ").trim().slice(0, 500);
  const description = (meta["og:description"] || meta.description || meta["twitter:description"] || "").slice(0,2000);
  const cleaned = html.replace(/<!--[\s\S]*?-->/g, "").replace(/<(script|style|noscript|svg|nav|footer|header|form)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, "");
  const main = cleaned.match(/<(?:article|main)\b[^>]*>([\s\S]*?)<\/(?:article|main)>/i)?.[1] ?? cleaned.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? cleaned;
  const rawText = decode(main.replace(/<\/(?:p|div|h[1-6]|li|section|blockquote)>|<br\s*\/?\s*>/gi,"\n\n").replace(/<[^>]+>/g, " ")).split("\n").map(s => s.replace(/\s+/g," ").trim()).filter(Boolean).join("\n\n").slice(0, 400000);
  const analysis = summarize(rawText, title, description, meta.keywords);
  const partial = rawText.length < 200 || /just a moment|access denied|verify you are human|enable javascript/i.test(`${title} ${rawText.slice(0,700)}`);
  return { title, description, rawText, ...analysis, image: publicAsset(meta["og:image"] ?? meta["twitter:image"],url), wordCount: rawText.split(/\s+/).filter(Boolean).length,
    status: partial ? "partial" as const : "ready" as const,
    error: partial ? "This page returned limited text. It may require JavaScript or a sign-in. You can still keep the link and retry." : null,
    metadata: { finalUrl: url, meta, language: attrs(html.match(/<html\b[^>]*>/i)?.[0] ?? "").lang ?? null, capturedAt: new Date().toISOString(), summarizer: "extractive-v1", textTruncated: rawText.length >= 400000 },
  };
}
export async function capturePage(input: string) {
  const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 18000);
  try {
    let url = normalizeUrl(input); let response: Response | undefined;
    for (let hop = 0; hop <= 5; hop++) {
      await checkPublicHost(url, controller.signal);
      response = await fetch(url, { redirect: "manual", signal: controller.signal, headers: { "User-Agent": "Commonplace/1.0 (personal bookmark capture)", accept: "text/html,application/xhtml+xml,text/plain;q=0.8" } });
      if (![301,302,303,307,308].includes(response.status)) break;
      const location = response.headers.get("location"); await response.body?.cancel();
      if (!location || hop === 5) throw new Error("The page redirected too many times.");
      url = normalizeUrl(new URL(location,url).toString());
    }
    if (!response?.ok) throw new Error(`The webpage returned HTTP ${response?.status ?? "error"}. Your link is saved; try capture again later.`);
    const contentType = response.headers.get("content-type") ?? "";
    if (!/text\/html|application\/xhtml\+xml|text\/plain/i.test(contentType)) { await response.body?.cancel(); throw new Error("This link is saved, but capture supports HTML and plain-text pages only."); }
    const reader = response.body?.getReader(); if (!reader) throw new Error("The page returned no text.");
    const decoder = new TextDecoder(); let html = ""; let bytes = 0;
    while (true) {
      const chunk = await reader.read(); if(chunk.done) break; bytes += chunk.value.byteLength;
      if (bytes > 3_000_000) { await reader.cancel(); throw new Error("The page exceeds the 3 MB capture limit. The link is still saved."); }
      html += decoder.decode(chunk.value, {stream:true});
    }
    html += decoder.decode();
    if (/text\/plain/i.test(contentType)) html = `<html><title>${new URL(url).hostname}</title><body>${html.replace(/&/g,"&amp;").replace(/</g,"&lt;")}</body></html>`;
    return extractPage(html,url);
  } finally { clearTimeout(timeout); }
}
