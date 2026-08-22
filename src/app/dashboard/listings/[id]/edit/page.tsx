"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function EditListingPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [newImageFile, setNewImageFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("listings")
      .select("title, description, image_url")
      .eq("id", id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setTitle(data.title);
          setDescription(data.description ?? "");
          setImageUrl(data.image_url);
        }
      });
  }, [id]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      let finalImageUrl = imageUrl;
      if (newImageFile) {
        const formData = new FormData();
        formData.append("file", newImageFile);
        const imgRes = await fetch("/api/listings/image", { method: "POST", body: formData });
        const imgData = await imgRes.json();
        if (!imgRes.ok) { setError(imgData.error || "Şəkil yüklənmədi"); setLoading(false); return; }
        finalImageUrl = imgData.url;
      }

      const res = await fetch(`/api/listings/${id}/edit`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description, image_url: finalImageUrl }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Yadda saxlanmadı"); return; }
      router.push(`/listings/${id}`);
    } catch {
      setError("Şəbəkə xətası");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen">
      <header className="max-w-2xl mx-auto px-6 pt-8 flex items-center justify-between">
        <Link href="/dashboard" className="font-display text-lg">İtemBazar</Link>
        <Link href="/dashboard" className="text-sm text-mist hover:text-paper">← Dashboard</Link>
      </header>
      <main className="max-w-2xl mx-auto px-6 py-12">
        <p className="text-xs uppercase tracking-widest text-gold mb-2">Redaktə</p>
        <h1 className="font-display text-2xl mb-1">{title}</h1>
        <p className="text-sm text-mist mb-8">Başlığı dəyişmək mümkün deyil — yalnız şəkil və təsviri yeniləyə bilərsiniz.</p>

        <form onSubmit={submit} className="rounded-2xl border border-line bg-panel p-6 space-y-4">
          <label className="block">
            <span className="text-xs text-mist mb-2 block">Şəkil</span>
            <div className="rounded-xl border-2 border-dashed border-line hover:border-jade transition-colors overflow-hidden">
              {preview || imageUrl ? (
                <img src={preview ?? imageUrl ?? ""} alt="" className="w-full h-48 object-cover" />
              ) : (
                <div className="h-32 flex items-center justify-center text-mist text-sm">Şəkil seçmək üçün klikləyin</div>
              )}
            </div>
            <input
              type="file" accept="image/*" className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setNewImageFile(f);
                setPreview(f ? URL.createObjectURL(f) : null);
              }}
            />
          </label>

          <textarea
            value={description} onChange={(e) => setDescription(e.target.value)} rows={6}
            placeholder="Təsviri yeniləyin…"
            className="w-full rounded-lg border border-line bg-bg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-jade resize-none"
          />

          {error && <p className="text-sm text-gold bg-gold/10 border border-gold/30 rounded-lg px-3 py-2">{error}</p>}

          <button type="submit" disabled={loading} className="w-full rounded-full bg-jade text-bg font-semibold px-4 py-3 text-sm disabled:opacity-50">
            {loading ? "Saxlanır…" : "Dəyişiklikləri saxla"}
          </button>
        </form>
      </main>
    </div>
  );
}
