"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export default function FilterBar({ sort, min, max }: { sort: string; min: string; max: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [minPrice, setMinPrice] = useState(min);
  const [maxPrice, setMaxPrice] = useState(max);

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete("page");
    router.push(`/?${params.toString()}`);
  }

  function applyPriceRange(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (minPrice) params.set("min", minPrice); else params.delete("min");
    if (maxPrice) params.set("max", maxPrice); else params.delete("max");
    params.delete("page");
    router.push(`/?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <select
        value={sort}
        onChange={(e) => updateParam("sort", e.target.value)}
        className="rounded-full border border-line bg-panel px-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-jade"
      >
        <option value="">Ən yeni</option>
        <option value="oldest">Ən köhnə</option>
        <option value="price_asc">Qiymət: aşağıdan yuxarı</option>
        <option value="price_desc">Qiymət: yuxarıdan aşağı</option>
      </select>

      <form onSubmit={applyPriceRange} className="flex items-center gap-2">
        <input
          value={minPrice} onChange={(e) => setMinPrice(e.target.value)} placeholder="Min $" type="number"
          className="w-20 rounded-full border border-line bg-panel px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-jade"
        />
        <span className="text-mist text-xs">—</span>
        <input
          value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} placeholder="Max $" type="number"
          className="w-20 rounded-full border border-line bg-panel px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-jade"
        />
        <button type="submit" className="rounded-full bg-panel border border-line px-3 py-2 text-xs hover:border-jade">Tətbiq et</button>
      </form>
    </div>
  );
}
