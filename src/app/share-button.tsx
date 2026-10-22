"use client";

import { useEffect, useRef, useState } from "react";

export default function ShareButton({ path, title }: { path: string; title: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const url = typeof window !== "undefined" ? `${window.location.origin}${path}` : path;
  const text = `${title} — İtemBazar`;
  const enc = encodeURIComponent;

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt("Linki kopyalayın:", url);
    }
  }

  async function nativeShare() {
    if (navigator.share) {
      try { await navigator.share({ title, text, url }); } catch { /* ləğv edildi */ }
    } else {
      setOpen(true);
    }
  }

  const options = [
    { label: "WhatsApp", href: `https://wa.me/?text=${enc(text + " " + url)}` },
    { label: "Telegram", href: `https://t.me/share/url?url=${enc(url)}&text=${enc(text)}` },
    { label: "Email", href: `mailto:?subject=${enc(text)}&body=${enc(url)}` },
    { label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}` },
    { label: "X (Twitter)", href: `https://twitter.com/intent/tweet?url=${enc(url)}&text=${enc(text)}` },
    { label: "SMS", href: `sms:?&body=${enc(text + " " + url)}` },
  ];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="rounded-full border border-line px-4 py-2 text-sm text-paper hover:border-jade transition"
      >
        🔗 Paylaş
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-line bg-panel shadow-2xl p-2 z-30 animate-pop">
          {options.map((o) => (
            <a
              key={o.label} href={o.href} target="_blank" rel="noopener noreferrer"
              className="block rounded-lg px-3 py-2 text-sm hover:bg-bg transition-colors"
            >
              {o.label}
            </a>
          ))}
          <button onClick={copy} className="w-full text-left rounded-lg px-3 py-2 text-sm hover:bg-bg transition-colors">
            Discord üçün linki kopyala
          </button>
          <button onClick={copy} className="w-full text-left rounded-lg px-3 py-2 text-sm hover:bg-bg transition-colors">
            {copied ? "✓ Kopyalandı" : "Linki kopyala"}
          </button>
          {typeof navigator !== "undefined" && "share" in navigator && (
            <button onClick={nativeShare} className="w-full text-left rounded-lg px-3 py-2 text-sm hover:bg-bg transition-colors">
              Digər tətbiqlər…
            </button>
          )}
        </div>
      )}
    </div>
  );
}
