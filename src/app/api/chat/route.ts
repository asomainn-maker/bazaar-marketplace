import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type Reply = { text: string; link: { href: string; label: string } | null };

const GREETINGS = ["salam", "salaam", "sagol", "sağol", "hi", "hello", "hey", "necəsən", "necesen", "xoş", "xosh gundu", "günaydın", "axşamın xeyir"];

const FAQ: { keywords: string[]; reply: Reply }[] = [
  {
    keywords: ["balans art", "pul art", "pul yükl", "deposit", "paypal", "kart il", "necə pul", "pul necə", "balans dolduram", "balans dol"],
    reply: {
      text: "Balansınızı artırmaq üçün Dashboard → Cüzdan səhifəsinə keçib PayPal ilə istədiyiniz məbləği ödəyin. Yatırılan məbləğdən 10% platform komissiyası tutulur, qalanı balansınıza əlavə olunur.",
      link: { href: "/dashboard/wallet", label: "Cüzdana keç" },
    },
  },
  {
    keywords: ["çıxar", "cixar", "withdraw", "pulumu al", "pulumu çıxar"],
    reply: {
      text: "Qazandığınız pulu çıxarmaq üçün Cüzdan səhifəsində \"Çıxarış tələb et\" formunu doldurun (PayPal email və ya IBAN). Admin təsdiqləyəndən sonra ödəniş göndərilir.",
      link: { href: "/dashboard/wallet", label: "Cüzdana keç" },
    },
  },
  {
    keywords: ["elan qoy", "elan yerləşdir", "elan yerlesdir", "necə sat", "nece sat", "elan yarat"],
    reply: {
      text: "Elan yerləşdirmək üçün əvvəlcə telefon nömrənizi doğrulamalısınız (admin sizə zəng edib kod deyəcək), sonra Dashboard → \"+ Yeni elan\"dan davam edin.",
      link: { href: "/dashboard/new-listing", label: "Yeni elan" },
    },
  },
  {
    keywords: ["telefon", "doğrul", "dogrul", "nömrə", "nomre"],
    reply: {
      text: "Telefon doğrulaması üçün nömrənizi göndərin — admin sizə zəng edib təsdiq kodu deyəcək, kodu saytda müvafiq sahəyə yazmalısınız.",
      link: { href: "/dashboard/verify-phone", label: "Nömrə doğrula" },
    },
  },
  {
    keywords: ["avtomatik təslimat", "avtomatik teslimat", "gift card", "stok", "kod avtomatik"],
    reply: {
      text: "Avtomatik təslimatlı elan yaratmaq üçün \"+ Yeni elan\"da \"Avtomatik təslimat\" qutusunu işarələyin və kodlarınızı (hər sətirdə bir kod) yazın. Alıcı aldıqda bir kod avtomatik çat bölməsinə göndərilir.",
      link: { href: "/dashboard/new-listing", label: "Yeni elan" },
    },
  },
  {
    keywords: ["aldat", "dələduz", "delaeduz", "hiylə", "hiyle", "scam", "fırıl", "firil", "dolandır"],
    reply: {
      text: "Ödədiyiniz pul artıq qorunmadadır (satıcıya dərhal getmir). Sifariş səhifənizdə \"Problem var, dəstəyə müraciət et\" düyməsi ilə mübahisə açın, komandamız araşdıracaq.",
      link: { href: "/dashboard/support", label: "Dəstəyə keç" },
    },
  },
  {
    keywords: ["mübahisə", "mubahise", "geri qaytar", "refund", "iade"],
    reply: {
      text: "Sifariş səhifənizdə \"Problem var, dəstəyə müraciət et\" düyməsi ilə mübahisə aça bilərsiniz. Pul admin qərar verənə qədər (və ya alıcı təsdiqləyənə/3 gün keçənə qədər) qorunmada qalır.",
      link: { href: "/dashboard", label: "Dashboard" },
    },
  },
  {
    keywords: ["report", "şikayət", "sikayet"],
    reply: {
      text: "Bir elanı və ya istifadəçini report etmək üçün Dəstək bölməsindən uyğun kateqoriyanı seçin.",
      link: { href: "/dashboard/support", label: "Dəstəyə keç" },
    },
  },
  {
    keywords: ["ticket", "dəstək aç", "destek ac", "dəstəyə", "destege", "necə müraciət", "nece muraciet", "necə əlaqə", "nece elaqe", "kömək laz", "komek laz", "əlaqə saxla", "elaqe sahla", "haradan açır", "haradan acir", "haradan yazım", "haradan yazim"],
    reply: {
      text: "Dəstək bölməsindən (Dashboard → Dəstək) kateqoriya seçib müraciət göndərə bilərsiniz: elan/istifadəçi report etmək, fikir-tövsiyə, elan alanda problem, digər problem. Admin qısa müddətdə cavab verəcək.",
      link: { href: "/dashboard/support", label: "Dəstəyə keç" },
    },
  },
  {
    keywords: ["mesaj", "çat", "chat", "satıcı ilə", "saticiya yaz"],
    reply: {
      text: "Elan səhifəsində \"Satıcıya yaz\" düyməsi ilə birbaşa satıcı ilə çat aça bilərsiniz. Bütün mesajlarınız Dashboard → Mesajlar bölməsindədir.",
      link: { href: "/dashboard/messages", label: "Mesajlara keç" },
    },
  },
  {
    keywords: ["rəy", "rey", "reytinq", "ulduz", "review"],
    reply: {
      text: "Tamamlanmış sifarişdən sonra satıcıya ulduzla reytinq və rəy yaza bilərsiniz — bu, onun ictimai profilində görünür.",
      link: null,
    },
  },
  {
    keywords: ["redaktə", "redakte", "elan dəyiş", "elan deyis", "şəkli dəyiş", "sekili deyis"],
    reply: {
      text: "Dashboard-da öz elanınızın yanındakı \"Redaktə\" düyməsi ilə şəkli və təsviri dəyişə bilərsiniz. Başlığı isə dəyişmək mümkün deyil.",
      link: { href: "/dashboard", label: "Dashboard" },
    },
  },
  {
    keywords: ["komissiya", "faiz", "10%", "nə qədər tutulur", "ne qeder tutulur"],
    reply: {
      text: "Balans artırarkən 10% platform komissiyası tutulur. Məsələn 100 ₼ yatırsanız, 90 ₼ balansınıza əlavə olunur.",
      link: null,
    },
  },
  {
    keywords: ["kateqoriya", "hansı məhsul", "ne satila biler", "nə satıla bilər"],
    reply: {
      text: "Oyun hesabları, Steam, Valorant, PUBG Mobile, Roblox, Fortnite, CS2, LoL, Discord, Instagram/TikTok/YouTube xidmətləri, Netflix/Spotify, gift kartlar, CD-Key və digər rəqəmsal məhsullar satıla bilər.",
      link: { href: "/", label: "Kateqoriyalara bax" },
    },
  },
];

function findFaq(message: string) {
  const lower = message.toLowerCase();
  for (const item of FAQ) {
    if (item.keywords.some((k) => lower.includes(k))) return item.reply;
  }
  return null;
}

function isGreeting(message: string) {
  const lower = message.toLowerCase().trim();
  return GREETINGS.some((g) => lower === g || lower.startsWith(g + " ") || lower.startsWith(g + "!"));
}

export async function POST(req: NextRequest) {
  const { messages } = await req.json();
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "Mesaj tələb olunur" }, { status: 400 });
  }

  const lastUserMsg = [...messages].reverse().find((m: { role: string }) => m.role === "user");
  const text: string = lastUserMsg?.text ?? "";

  if (isGreeting(text)) {
    return NextResponse.json({
      text: "Salam! Sizə İtemBazar ilə bağlı (balans, elan, sifariş, təhlükəsizlik, dəstək və s.) necə kömək edə bilərəm?",
      link: null,
    });
  }

  // Şəxsi balans sualı
  if (/balans[ıi]m|mənim balans|menim balans/.test(text.toLowerCase())) {
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const admin = createAdminClient();
        const { data: profile } = await admin.from("profiles").select("wallet_balance").eq("id", user.id).maybeSingle();
        return NextResponse.json({
          text: `Hazırkı balansınız: ${Number(profile?.wallet_balance ?? 0).toFixed(2)} ₼.`,
          link: { href: "/dashboard/wallet", label: "Cüzdana keç" },
        });
      }
    } catch {
      // aşağıdakı ümumi cavaba düşsün
    }
  }

  // Şəxsi elan sualı
  if (/elanlar[ıi]m|satd[ıi][gğ][ıi]m elan|mənim elan|menim elan/.test(text.toLowerCase())) {
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const admin = createAdminClient();
        const { data: listings } = await admin
          .from("listings").select("title, price, status").eq("seller_id", user.id).order("created_at", { ascending: false }).limit(10);
        const active = (listings ?? []).filter((l) => l.status === "active");
        const sold = (listings ?? []).filter((l) => l.status === "sold");
        const listText = active.length > 0
          ? active.map((l) => `• ${l.title} — ${Number(l.price).toFixed(2)} ₼`).join("\n")
          : "Aktiv elanınız yoxdur.";
        return NextResponse.json({
          text: `Sizin ${active.length} aktiv, ${sold.length} satılmış elanınız var.\n\n${listText}`,
          link: { href: "/dashboard", label: "Dashboard-a keç" },
        });
      }
    } catch {
      // aşağıdakı ümumi cavaba düşsün
    }
  }

  // Şəxsi sifariş sualı (alışlar)
  if (/sifari[şs]lər[ıi]m|ald[ıi][gğ][ıi]m elan|nə alm[ıi][şs][ae]m|ne almisham/.test(text.toLowerCase())) {
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const admin = createAdminClient();
        const { data: orders } = await admin
          .from("orders").select("amount, status, listings(title)").eq("buyer_id", user.id).order("created_at", { ascending: false }).limit(10);
        const list = (orders ?? []).map((o) => `• ${(o.listings as unknown as { title: string } | null)?.title ?? "Sifariş"} — ${Number(o.amount).toFixed(2)} ₼ (${o.status})`).join("\n");
        return NextResponse.json({
          text: (orders ?? []).length > 0 ? `Alışlarınız:\n\n${list}` : "Hələ heç bir alışınız yoxdur.",
          link: { href: "/dashboard", label: "Dashboard-a keç" },
        });
      }
    } catch {
      // aşağıdakı ümumi cavaba düşsün
    }
  }

  // Şəxsi satış sualı
  if (/sat[ıi][şs]lar[ıi]m|kimə satd[ıi]m|kime satdim/.test(text.toLowerCase())) {
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const admin = createAdminClient();
        const { data: orders } = await admin
          .from("orders").select("amount, status, listings(title)").eq("seller_id", user.id).order("created_at", { ascending: false }).limit(10);
        const list = (orders ?? []).map((o) => `• ${(o.listings as unknown as { title: string } | null)?.title ?? "Sifariş"} — ${Number(o.amount).toFixed(2)} ₼ (${o.status})`).join("\n");
        return NextResponse.json({
          text: (orders ?? []).length > 0 ? `Satışlarınız:\n\n${list}` : "Hələ heç bir satışınız yoxdur.",
          link: { href: "/dashboard", label: "Dashboard-a keç" },
        });
      }
    } catch {
      // aşağıdakı ümumi cavaba düşsün
    }
  }

  const faqMatch = findFaq(text);
  if (faqMatch) return NextResponse.json(faqMatch);

  return NextResponse.json({
    text: "Mən yalnız İtemBazar saytı ilə bağlı suallara (balans, elan, sifariş, təhlükəsizlik, dəstək və s.) kömək edə bilərəm. Probleminizi dəqiqləşdirib Dəstək bölməsindən müraciət göndərə bilərsiniz.",
    link: { href: "/dashboard/support", label: "Dəstəyə keç" },
  });
}
