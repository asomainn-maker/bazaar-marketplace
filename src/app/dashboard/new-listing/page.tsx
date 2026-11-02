"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Category = { id: string; name: string };

export default function NewListingPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [isAutoDelivery, setIsAutoDelivery] = useState(false);
  const [deliveryContent, setDeliveryContent] = useState("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("categories")
      .select("id, name")
      .order("sort_order")
      .then(({ data }) => setCategories(data ?? []));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const image_urls: string[] = [];
      for (const file of imageFiles) {
        const imgForm = new FormData();
        imgForm.append("file", file);
        const imgRes = await fetch("/api/listings/image", { method: "POST", body: imgForm });
        const imgData = await imgRes.json();
        if (!imgRes.ok) {
          setError(imgData.error || "Şəkil yüklənmədi");
          setLoading(false);
          return;
        }
        image_urls.push(imgData.url);
      }
      const image_url = image_urls[0] ?? null;
      const res = await fetch("/api/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title, description, price, category_id: categoryId || null, image_url, image_urls,
          is_auto_delivery: isAutoDelivery,
          delivery_content: isAutoDelivery ? deliveryContent : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.code === "phone_not_verified") {
          router.push("/dashboard/verify-phone");
          return;
        }
        setError(data.error || "Elan yaradılmadı");
        return;
      }
      router.push(`/listings/${data.listing.id}`);
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
        <p className="text-xs uppercase tracking-widest text-gold mb-2">Yeni elan</p>
        <h1 className="font-display text-2xl mb-8">Satılığa çıxarın</h1>

        <form onSubmit={handleSubmit} className="rounded-2xl border border-line bg-panel p-6 space-y-4">
          <div>
            <span className="text-xs text-mist mb-2 block">Şəkillər (maksimum 5, birincisi əsas şəkil olacaq)</span>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {imagePreviews.map((src, i) => (
                <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-line">
                  <img src={src} alt="" className="w-full h-full object-cover" />
                  {i === 0 && <span className="absolute left-1 top-1 rounded bg-jade text-bg text-[9px] px-1.5 py-0.5 font-semibold">Əsas</span>}
                  <button
                    type="button"
                    onClick={() => {
                      setImageFiles((prev) => prev.filter((_, idx) => idx !== i));
                      setImagePreviews((prev) => prev.filter((_, idx) => idx !== i));
                    }}
                    className="absolute right-1 top-1 rounded-full bg-bg/80 text-paper text-xs w-5 h-5 leading-5 text-center"
                    aria-label="Şəkli sil"
                  >×</button>
                </div>
              ))}
              {imageFiles.length < 5 && (
                <label className="aspect-square rounded-lg border-2 border-dashed border-line hover:border-jade transition-colors flex items-center justify-center text-mist text-2xl cursor-pointer">
                  +
                  <input
                    type="file" accept="image/*" multiple className="hidden"
                    onChange={(e) => {
                      const picked = Array.from(e.target.files ?? []).slice(0, 5 - imageFiles.length);
                      setImageFiles((prev) => [...prev, ...picked]);
                      setImagePreviews((prev) => [...prev, ...picked.map((f) => URL.createObjectURL(f))]);
                      e.target.value = "";
                    }}
                  />
                </label>
              )}
            </div>
          </div>
          <input
            value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Başlıq (məs. Valorant hesabı - Immortal)"
            className="w-full rounded-lg border border-line bg-bg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-jade"
          />
          <select
            value={categoryId} onChange={(e) => setCategoryId(e.target.value)}
            className="w-full rounded-lg border border-line bg-bg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-jade"
          >
            <option value="">Kateqoriya seçin (istəyə bağlı)</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <textarea
            value={description} onChange={(e) => setDescription(e.target.value)} rows={5}
            placeholder="Ətraflı təsvir: level, server, hesab detalları, təhvil şərtləri…"
            className="w-full rounded-lg border border-line bg-bg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-jade resize-none"
          />
          <div className="relative">
            <span className="absolute left-4 top-3 text-mist text-sm">₼</span>
            <input
              type="number" min="0.5" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} required placeholder="Qiymət"
              className="w-full rounded-lg border border-line bg-bg pl-8 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-jade"
            />
          </div>

          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={isAutoDelivery} onChange={(e) => setIsAutoDelivery(e.target.checked)} className="w-4 h-4 accent-jade" />
            Avtomatik təslimat (gift card, kod və s.)
          </label>
          {isAutoDelivery && (
            <div>
              <textarea
                value={deliveryContent} onChange={(e) => setDeliveryContent(e.target.value)} rows={6}
                placeholder={"Hər sətirdə bir kod yazın:\nCODE-1111-2222\nCODE-3333-4444\n..."}
                className="w-full rounded-lg border border-line bg-bg px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-jade resize-none"
              />
              <p className="text-xs text-mist mt-1">
                Stok: {deliveryContent.split("\n").map((l) => l.trim()).filter(Boolean).length} ədəd. Alıcı aldıqda bir kod avtomatik çat bölməsinə göndəriləcək.
              </p>
            </div>
          )}
          {error && <p className="text-sm text-gold bg-gold/10 border border-gold/30 rounded-lg px-3 py-2">{error}</p>}
          <button
            type="submit" disabled={loading}
            className="w-full rounded-full bg-jade text-bg font-semibold px-4 py-3 text-sm hover:bg-jade-soft transition disabled:opacity-50"
          >
            {loading ? "Yaradılır…" : "Elanı dərc et"}
          </button>
        </form>
      </main>
    </div>
  );
}
