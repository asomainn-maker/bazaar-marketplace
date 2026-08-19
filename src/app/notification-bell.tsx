"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

const BEEP_DATA_URI =
  "data:audio/wav;base64,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";

export default function NotificationBell() {
  const [count, setCount] = useState(0);
  const prevCount = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio(BEEP_DATA_URI);
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch("/api/notifications/summary");
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        if (data.unread > prevCount.current) {
          audioRef.current?.play().catch(() => {});
        }
        prevCount.current = data.unread;
        setCount(data.unread);
      } catch {
        // ignore transient errors
      }
    }

    poll();
    const interval = setInterval(poll, 15000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <Link href="/dashboard/messages" className="relative inline-flex items-center justify-center w-9 h-9 rounded-full border border-line hover:border-jade transition-colors">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 01-3.46 0" />
      </svg>
      {count > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-gold text-bg text-[10px] font-bold flex items-center justify-center px-1">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}
