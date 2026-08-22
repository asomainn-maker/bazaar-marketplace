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

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
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

  // İstifadəçi konteksti (giriş edibsə).
  let userContext = "İSTİFADƏÇİ: Giriş etməyib (qonaq).";
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const admin = createAdminClient();
      const { data: profile } = await admin
        .from("profiles")
        .select("username, wallet_balance, phone_verified, is_admin")
        .eq("id", user.id)
        .maybeSingle();
      const { count: listingCount } = await admin
        .from("listings").select("*", { count: "exact", head: true }).eq("seller_id", user.id).eq("status", "active");
      const { count: orderCount } = await admin
        .from("orders").select("*", { count: "exact", head: true }).eq("buyer_id", user.id);

      userContext = `İSTİFADƏÇİ: @${profile?.username ?? "?"} · Balans: ${Number(profile?.wallet_balance ?? 0).toFixed(2)} ₼ · Telefon doğrulanıb: ${profile?.phone_verified ? "bəli" : "xeyr"} · Aktiv elanları: ${listingCount ?? 0} · Ümumi sifarişi: ${orderCount ?? 0}${profile?.is_admin ? " · ADMİN" : ""}`;
    }
  } catch {
    // kontekst alınmasa da davam et
  }

  const systemPrompt = `Sən "İtemBazar" saytının rəsmi AI köməkçisisən.

${SITE_KNOWLEDGE}

${userContext}

SƏRT QAYDALAR:
- YALNIZ İtemBazar saytı ilə bağlı suallara cavab ver (balans, elan, sifariş, ödəniş, dəstək, təhlükəsizlik, hesab və s.).
- Sayt ilə əlaqəsi olmayan sual (ümumi bilik, başqa mövzular, kod yazma və s.) soruşularsa, nəzakətlə rədd et: "Mən yalnız İtemBazar saytı ilə bağlı suallara cavab verə bilərəm." de və başqa heç nə əlavə etmə.
- İstifadəçinin öz məlumatlarına uyğun şəxsi cavab ver (məs. balansı, elanları haqqında sual versə yuxarıdakı İSTİFADƏÇİ məlumatından istifadə et).
- Azərbaycan dilində, qısa, isti və konkret cavab ver.
- Yalnız bu JSON formatında cavab ver, başqa heç nə yazma: {"text": "cavab", "link": {"href": "/path", "label": "Düymə"}} — link lazım deyilsə "link": null.`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 500,
        system: systemPrompt,
        messages: messages.map((m: { role: string; text: string }) => ({
          role: m.role,
          content: m.text,
        })),
      }),
    });

    const data = await res.json();
    const rawText = data.content?.[0]?.text ?? "";

    let parsed: { text: string; link: { href: string; label: string } | null };
    try {
      parsed = JSON.parse(rawText);
    } catch {
      parsed = { text: rawText || "Cavab hazırlana bilmədi, yenidən cəhd edin.", link: null };
    }

    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json({
      text: "Bir xəta baş verdi. Zəhmət olmasa Dəstək bölməsindən müraciət göndərin.",
      link: { href: "/dashboard/support", label: "Dəstəyə keç" },
    });
  }
}
