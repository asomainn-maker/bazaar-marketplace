"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Suggestion = { id: string; title: string; price: number; image_url: string | null };

export default function SearchBar({ initialQuery }: { initialQuery: string }) {
  const [query, setQuery] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (query.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    const timeout = setTimeout(() => {
      fetch(`/api/search/suggest?q=${encodeURIComponent(query.trim())}`)
        .then((r) => r.json())
        .then((d) => {
          setSuggestions(d.listings ?? []);
          setOpen(true);
        });
    }, 250);
    return () => clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setOpen(false);
    router.push(`/?q=${encodeURIComponent(query.trim())}`);
  }

  return (
    <div ref={containerRef} className="relative">
      <form onSubmit={submit}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder="Nə axtarırsınız?"
          className="w-full rounded-full border border-line bg-panel px-5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-jade"
        />
      </form>
      {open && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 rounded-2xl border border-line bg-panel shadow-xl overflow-hidden z-20">
          {suggestions.map((s) => (
            <Link
              key={s.id}
              href={`/listings/${s.id}`}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 hover:bg-bg transition-colors"
            >
              <div className="w-9 h-9 rounded-lg bg-bg overflow-hidden shrink-0">
                {s.image_url && <img src={s.image_url} alt="" className="w-full h-full object-cover" />}
              </div>
              <span className="text-sm truncate flex-1">{s.title}</span>
              <span className="font-mono text-jade-soft text-xs">{Number(s.price).toFixed(2)} ₼</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
