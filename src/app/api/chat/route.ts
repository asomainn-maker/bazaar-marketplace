import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const SITE_KNOWLEDGE = `SAYT NECƏ İŞLƏYİR (İtemBazar — P2P rəqəmsal məhsul bazarı, domainverse.store):

1. CÜZDAN VƏ BALANS ARTIRMA:
- Dashboard → Cüzdan (/dashboard/wallet) səhifəsindən PayPal ilə balans artırılır.
- Yatırılan məbləğdən 10% platform komissiyası tutulur.
- Qiymətlər saytda ₼ (AZN) ilə göstərilir.
- Çıxarış: "Çıxarış tələb et" formu (PayPal email/IBAN), admin təsdiqləyəndən sonra ödənilir.

2. ALIŞ-SATIŞ VƏ TƏHLÜKƏSİZLİK (ESCROW):
- Ödəniş alıcının balansından çıxır, amma satıcıya DƏRHAL getmir — qorunmada saxlanılır.
- Satıcı təhvil verib "Təslim etdim" basır (adi elanlar) VƏ YA avtomatik təslimatlı elanlarda kod dərhal alıcının çatına göndərilir.
- Alıcı "Təhvil aldım" desə pul dərhal satıcıya keçir; 3 gün cavabsız qalarsa avtomatik keçir.
- Satıcı hələ təslim etməyibsə "İmtina et" ilə ləğv edib pulu geri qaytara bilər.
- Problem: sifariş səhifəsində "Problem var, dəstəyə müraciət et" — mübahisə açılır, admin qərar verir.

3. AVTOMATİK TƏSLİMAT: Satıcı elan yaradarkən "Avtomatik təslimat" seçib kodları (hər sətirdə bir kod, məs. gift card) yazır. Alıcı alanda bir kod avtomatik çat bölməsinə göndərilir, stok azalır.

4. ELAN YERLƏŞDİRMƏK: Əvvəlcə telefon doğrulanmalıdır (/dashboard/verify-phone) — nömrə göndərilir, admin zəng edib kod deyir. Sonra /dashboard/new-listing.

5. MESAJLAŞMA: Elan səhifəsində "Satıcıya yaz" ilə çat (/dashboard/messages). Sifariş edəndə çata avtomatik sifariş məlumatı yazılır.

6. ELANI REDAKTƏ: Dashboard-dan "Redaktə" — yalnız şəkil və təsvir dəyişdirilə bilər, başlıq yox.

7. DƏSTƏK (/dashboard/support): Kateqoriyalar — Elanı report etmək, İstifadəçini report etmək, Sayt haqqında fikir/tövsiyə, Elan alanda problem yaşamaq (öz sifarişindən seçir, real mübahisə açır), Problemlə qarşılaşmaq, Digər.

8. RƏY VƏ PROFİL: Tamamlanmış sifarişdən sonra rəy/reytinq yazılır. İctimai profil: /u/username.

9. KATEQORİYALAR: Oyun hesabları, Steam, Valorant, PUBG Mobile, Roblox, Fortnite, CS2, LoL, Discord, Instagram/TikTok/YouTube, Netflix/Spotify, gift kartlar, CD-Key və s.`;

async function fetchUserContext(): Promise<string> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return "İSTİFADƏÇİ: Giriş etməyib (qonaq).";

    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("username, wallet_balance, phone_verified, is_admin")
      .eq("id", user.id)
      .maybeSingle();

    const { data: myListings } = await admin
      .from("listings").select("title, price, status").eq("seller_id", user.id).order("created_at", { ascending: false }).limit(15);
    const { data: myPurchases } = await admin
      .from("orders").select("amount, status, listings(title)").eq("buyer_id", user.id).order("created_at", { ascending: false }).limit(15);
    const { data: mySales } = await admin
      .from("orders").select("amount, status, listings(title)").eq("seller_id", user.id).order("created_at", { ascending: false }).limit(15);

    const listingsText = (myListings ?? []).map((l) => `- ${l.title} (${l.status}, ${Number(l.price).toFixed(2)} ₼)`).join("\n") || "yoxdur";
    const purchasesText = (myPurchases ?? []).map((o) => `- ${(o.listings as unknown as { title: string } | null)?.title ?? "?"} (${o.status}, ${Number(o.amount).toFixed(2)} ₼)`).join("\n") || "yoxdur";
    const salesText = (mySales ?? []).map((o) => `- ${(o.listings as unknown as { title: string } | null)?.title ?? "?"} (${o.status}, ${Number(o.amount).toFixed(2)} ₼)`).join("\n") || "yoxdur";

    return `İSTİFADƏÇİ: @${profile?.username ?? "?"}
Balans: ${Number(profile?.wallet_balance ?? 0).toFixed(2)} ₼
Telefon doğrulanıb: ${profile?.phone_verified ? "bəli" : "xeyr"}
${profile?.is_admin ? "Bu istifadəçi ADMİN-dir." : ""}

Bu istifadəçinin elanları:
${listingsText}

Bu istifadəçinin alışları:
${purchasesText}

Bu istifadəçinin satışları:
${salesText}`;
  } catch {
    return "İSTİFADƏÇİ: məlumat alınmadı.";
  }
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      text: "Hazırda AI köməkçi aktiv deyil. Zəhmət olmasa Dəstək bölməsindən müraciət göndərin.",
      link: { href: "/dashboard/support", label: "Dəstəyə keç" },
    });
  }

  const { messages } = await req.json();
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "Mesaj tələb olunur" }, { status: 400 });
  }

  const userContext = await fetchUserContext();

  const systemPrompt = `Sən "İtemBazar" saytının rəsmi AI köməkçisisən. Sən əsl süni intellektsən — sual verildikdə düşünüb, kontekstə (aşağıdakı sayt məlumatı və istifadəçinin öz məlumatları) əsaslanaraq dəqiq, ağıllı cavab ver. Sadə açar-söz uyğunlaşdırması etmə — sualı həqiqətən anla.

${SITE_KNOWLEDGE}

${userContext}

QAYDALAR:
- Yalnız İtemBazar saytı, hesab, elanlar, sifarişlər, ödəniş, təhlükəsizlik, dəstək mövzularında kömək et.
- Sayt ilə əlaqəsi olmayan sual (kod yazma, ümumi bilik, tərcümə və s.) soruşularsa, nəzakətlə bildir ki, yalnız İtemBazar ilə bağlı suallara cavab verə bilərsən.
- İstifadəçi öz elanları/sifarişləri/balansı haqqında soruşsa, yuxarıdakı real məlumatlardan istifadə et.
- Azərbaycan dilində, isti, qısa və konkret cavab ver.
- Cavabını YALNIZ bu JSON formatında ver: {"text": "cavab mətni", "link_href": "/uyğun/yol", "link_label": "Düymə mətni"} — link lazım deyilsə link_href və link_label-i boş string ("") qoy.`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: messages.map((m: { role: string; text: string }) => ({
            role: m.role === "user" ? "user" : "model",
            parts: [{ text: m.text }],
          })),
          systemInstruction: { parts: [{ text: systemPrompt }] },
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
              type: "object",
              properties: {
                text: { type: "string" },
                link_href: { type: "string" },
                link_label: { type: "string" },
              },
              required: ["text"],
            },
          },
        }),
      }
    );

    const data = await res.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      const errMsg = data.error?.message || "AI cavab vermədi";
      return NextResponse.json({
        text: `Texniki problem: ${errMsg}. Dəstək bölməsindən müraciət göndərə bilərsiniz.`,
        link: { href: "/dashboard/support", label: "Dəstəyə keç" },
      });
    }

    const parsed = JSON.parse(rawText);
    return NextResponse.json({
      text: parsed.text,
      link: parsed.link_href && parsed.link_label ? { href: parsed.link_href, label: parsed.link_label } : null,
    });
  } catch {
    return NextResponse.json({
      text: "Bir xəta baş verdi. Zəhmət olmasa Dəstək bölməsindən müraciət göndərin.",
      link: { href: "/dashboard/support", label: "Dəstəyə keç" },
    });
  }
}
