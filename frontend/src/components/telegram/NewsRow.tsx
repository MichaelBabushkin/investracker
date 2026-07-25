"use client";

// Tape "Wire" news row: a fixed 3-zone grid (source mark · text · media thumb),
// hairline separated. Media lives in a fixed-aspect thumb so rows never take a
// data-dependent height; click opens a lightbox. Detected tickers become chips,
// held ones highlighted. Hebrew text is bidi-isolated so the metadata stays LTR.

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Eye, ImageIcon, X } from "lucide-react";
import api from "@/services/api";
import { TelegramFeedItem } from "@/types/telegram";
import { stockHref } from "@/components/StockLink";

function timeAgo(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}
function fmtCount(n: number | null): string | null {
  if (n == null) return null;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}
function plainText(t: string | null): string {
  if (!t) return "";
  return t
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, "$1")
    .replace(/\*\*|__|`/g, "")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export interface HeldSets { world: Set<string>; israeli: Set<string>; }

/** Detect tickers worth chipping: explicit $TICKER, or any currently-held symbol. */
function detectTickers(text: string | null, held: HeldSets): Array<{ sym: string; market: "israeli" | "world"; held: boolean }> {
  if (!text) return [];
  const found = new Map<string, { sym: string; market: "israeli" | "world"; held: boolean }>();
  for (const m of Array.from(text.matchAll(/\$([A-Za-z]{1,6})\b/g))) {
    const sym = m[1].toUpperCase();
    const market = held.israeli.has(sym) ? "israeli" : "world";
    found.set(sym, { sym, market, held: held.world.has(sym) || held.israeli.has(sym) });
  }
  const scan = (set: Set<string>, market: "israeli" | "world") => {
    for (const sym of Array.from(set)) {
      if (found.has(sym)) continue;
      if (new RegExp(`\\b${sym}\\b`).test(text)) found.set(sym, { sym, market, held: true });
    }
  };
  scan(held.world, "world");
  scan(held.israeli, "israeli");
  // held first, then explicit; cap at 4
  return Array.from(found.values()).sort((a, b) => Number(b.held) - Number(a.held)).slice(0, 4);
}

function MediaThumb({ proxyUrl, onOpen }: { proxyUrl: string; onOpen: (src: string, isVideo: boolean) => void }) {
  const [src, setSrc] = useState<string | null>(null);
  const [isVideo, setIsVideo] = useState(false);
  const [err, setErr] = useState(false);
  useEffect(() => {
    let obj: string | null = null;
    let active = true;
    api.get(proxyUrl, { responseType: "blob" })
      .then((res) => {
        if (!active || !res.data || res.data.size === 0) { setErr(true); return; }
        obj = URL.createObjectURL(res.data);
        setIsVideo(((res.data.type as string) || "").startsWith("video/"));
        setSrc(obj);
      })
      .catch(() => active && setErr(true));
    return () => { active = false; if (obj) URL.revokeObjectURL(obj); };
  }, [proxyUrl]);

  if (err) {
    return (
      <div className="w-[112px] h-[72px] shrink-0 rounded-md border border-rule-row bg-surface-dark-tertiary flex items-center justify-center text-label">
        <ImageIcon size={16} />
      </div>
    );
  }
  return (
    <button
      onClick={() => src && onOpen(src, isVideo)}
      className="relative w-[112px] h-[72px] shrink-0 rounded-md overflow-hidden border border-rule-row bg-surface-dark-tertiary hover:border-brand-400/30 transition-colors"
      title="Open media"
    >
      {src ? (
        isVideo
          ? <video src={src} muted className="w-full h-full object-cover" />
          : <img src={src} alt="" className="w-full h-full object-cover" loading="lazy" />
      ) : (
        <div className="w-full h-full animate-pulse" />
      )}
    </button>
  );
}

function Lightbox({ src, isVideo, onClose }: { src: string; isVideo: boolean; onClose: () => void }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4" onClick={onClose}>
      <button className="absolute top-4 right-4 text-white/70 hover:text-white p-1.5" onClick={onClose}><X size={22} /></button>
      {isVideo
        ? <video src={src} controls autoPlay className="max-h-[90vh] max-w-[90vw] rounded-lg" onClick={(e) => e.stopPropagation()} />
        : <img src={src} alt="" className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg" onClick={(e) => e.stopPropagation()} />}
    </div>
  );
}

export default function NewsRow({ item, held, dense = false }: { item: TelegramFeedItem; held: HeldSets; dense?: boolean }) {
  const [lightbox, setLightbox] = useState<{ src: string; isVideo: boolean } | null>(null);
  const title = item.channel.title || item.channel.username;
  const views = fmtCount(item.views);
  const text = plainText(item.text);
  const tickers = detectTickers(item.text, held);
  const showThumb = item.has_media && !!item.media_proxy_url;

  return (
    <>
      <div className={`grid gap-3 py-2.5 border-b border-rule-row hover:bg-white/[0.015] transition-colors ${showThumb ? "grid-cols-[28px_1fr] sm:grid-cols-[28px_minmax(0,1fr)_112px]" : "grid-cols-[28px_1fr]"}`}>
        {/* Source mark */}
        <div className="pt-0.5">
          {item.channel.logo_url
            ? <img src={item.channel.logo_url} alt={title} className="w-7 h-7 rounded-lg object-cover border border-rule-row" />
            : <div className="w-7 h-7 rounded-lg bg-surface-dark-tertiary border border-rule-row flex items-center justify-center text-[11px] font-bold text-brand-400">{title.charAt(0).toUpperCase()}</div>}
        </div>

        {/* Text column — capped measure, metadata LTR, body bidi-isolated */}
        <div className="min-w-0 max-w-[680px]">
          <div className="flex items-center gap-2 text-[11px] text-label mb-1">
            <span className="text-figure font-medium truncate max-w-[220px]">{title}</span>
            <span className="text-rule-section">·</span>
            <span className="tabular-nums">{timeAgo(item.posted_at)}</span>
            {item.has_media && <ImageIcon size={11} />}
            {views && <span className="inline-flex items-center gap-1 tabular-nums"><Eye size={11} />{views}</span>}
          </div>
          {text ? (
            <p className={`text-[13px] text-gray-300 leading-snug ${dense ? "line-clamp-2" : "line-clamp-3"}`} dir="auto" style={{ unicodeBidi: "isolate" }}>
              {text}
            </p>
          ) : (
            <p className="text-[13px] text-label italic">{item.has_media ? "Media post" : "—"}</p>
          )}
          {tickers.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {tickers.map((t) => (
                <Link
                  key={t.sym}
                  href={stockHref(t.sym, t.market)}
                  className={`px-1.5 py-0.5 rounded text-[11px] font-semibold tabular-nums transition-colors ${
                    t.held
                      ? "bg-brand-400/10 text-brand-400 hover:bg-brand-400/20"
                      : "bg-white/[0.04] text-label hover:text-figure"
                  }`}
                >
                  ${t.sym}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Media thumb — fixed aspect, never sets row height */}
        {showThumb && (
          <div className="hidden sm:block">
            <MediaThumb proxyUrl={item.media_proxy_url!} onOpen={(src, isVideo) => setLightbox({ src, isVideo })} />
          </div>
        )}
      </div>

      {lightbox && <Lightbox src={lightbox.src} isVideo={lightbox.isVideo} onClose={() => setLightbox(null)} />}
    </>
  );
}
