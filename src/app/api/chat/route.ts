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

  const faqMatch = findFaq(text);
  if (faqMatch) return NextResponse.json(faqMatch);

  return NextResponse.json({
    text: "Mən yalnız İtemBazar saytı ilə bağlı suallara (balans, elan, sifariş, təhlükəsizlik, dəstək və s.) kömək edə bilərəm. Probleminizi dəqiqləşdirib Dəstək bölməsindən müraciət göndərə bilərsiniz.",
    link: { href: "/dashboard/support", label: "Dəstəyə keç" },
  });
}
