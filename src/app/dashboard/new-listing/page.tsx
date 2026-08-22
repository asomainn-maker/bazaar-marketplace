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
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
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
      let image_url: string | null = null;
      if (imageFile) {
        const imgForm = new FormData();
        imgForm.append("file", imageFile);
        const imgRes = await fetch("/api/listings/image", { method: "POST", body: imgForm });
        const imgData = await imgRes.json();
        if (!imgRes.ok) {
          setError(imgData.error || "Şəkil yüklənmədi");
          setLoading(false);
          return;
        }
        image_url = imgData.url;
      }
      const res = await fetch("/api/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title, description, price, category_id: categoryId || null, image_url,
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
          <label className="block">
            <span className="text-xs text-mist mb-2 block">Şəkil (istəyə bağlı, tövsiyə olunur)</span>
            <div className="rounded-xl border-2 border-dashed border-line hover:border-jade transition-colors overflow-hidden">
              {imagePreview ? (
                <img src={imagePreview} alt="" className="w-full h-48 object-cover" />
              ) : (
                <div className="h-32 flex items-center justify-center text-mist text-sm">Şəkil seçmək üçün klikləyin</div>
              )}
            </div>
            <input
              type="file" accept="image/*" className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setImageFile(f);
                setImagePreview(f ? URL.createObjectURL(f) : null);
              }}
            />
          </label>
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
