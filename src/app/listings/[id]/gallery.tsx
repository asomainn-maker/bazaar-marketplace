"use client";

import { useState } from "react";

export default function Gallery({ images, title }: { images: string[]; title: string }) {
  const [active, setActive] = useState(0);
  if (images.length === 0) return null;

  return (
    <div>
      <div className="aspect-[16/9] bg-bg overflow-hidden">
        <img src={images[active]} alt={title} className="w-full h-full object-cover" />
      </div>
      {images.length > 1 && (
        <div className="flex gap-2 p-3 overflow-x-auto bg-bg/40">
          {images.map((src, i) => (
            <button
              key={src + i} type="button" onClick={() => setActive(i)}
              className={`shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${i === active ? "border-jade" : "border-line"}`}
            >
              <img src={src} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
