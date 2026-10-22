"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type Item = { id: string; text: string; href: string; kind: "message" | "order" | "admin" };

const ICONS: Record<Item["kind"], string> = { message: "💬", order: "🧾", admin: "🛡️" };

function beep() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  } catch {
    // səs dəstəklənmirsə keç
  }
}

export default function NotificationBell() {
  const [items, setItems] = useState<Item[]>([]);
  const [open, setOpen] = useState(false);
  const prevCount = useRef(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const res = await fetch("/api/notifications/summary");
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        if (data.unread > prevCount.current) beep();
        prevCount.current = data.unread;
        setItems(data.items ?? []);
      } catch {
        // keç
      }
    }
    poll();
    const interval = setInterval(poll, 15000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const count = items.length;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Bildirişlər"
        className="relative inline-flex items-center justify-center w-9 h-9 rounded-full border border-line hover:border-jade transition-colors"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 01-3.46 0" />
        </svg>
        {count > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-gold text-bg text-[10px] font-bold flex items-center justify-center px-1">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-w-[85vw] rounded-2xl border border-line bg-panel shadow-2xl z-40 animate-pop overflow-hidden">
          <div className="px-4 py-3 border-b border-line text-xs uppercase tracking-widest text-mist">Bildirişlər</div>
          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 && <p className="px-4 py-6 text-sm text-mist text-center">Yeni bildiriş yoxdur.</p>}
            {items.map((it) => (
              <Link
                key={it.id} href={it.href} onClick={() => setOpen(false)}
                className="flex gap-3 px-4 py-3 text-sm border-b border-line last:border-0 hover:bg-bg transition-colors"
              >
                <span>{ICONS[it.kind]}</span>
                <span className="text-paper/90">{it.text}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
