"use client";

import { useState } from "react";
import Link from "next/link";

type ChatMessage = { from: "bot" | "user"; text: string; link?: { href: string; label: string } };

const FAQ: { keywords: string[]; text: string; link?: { href: string; label: string } }[] = [
  {
    keywords: ["aldat", "dələduz", "hiylə", "scam", "fırıl"],
    text: "Belə hallarda ödənişiniz artıq qorunmadadır. Dəstək bölməsindən \"Elan alanda problem yaşamaq\" seçib ticket açın, komandamız araşdıracaq.",
    link: { href: "/dashboard/support", label: "Dəstəyə keç" },
  },
  {
    keywords: ["balans", "pul artır", "pul yüklə", "deposit", "pul necə", "kart", "paypal"],
    text: "Balansınızı artırmaq üçün Dashboard → Cüzdan səhifəsinə keçib PayPal ilə istədiyiniz məbləği ödəyin. Yatırılan məbləğdən 10% komissiya tutulur.",
    link: { href: "/dashboard/wallet", label: "Cüzdana keç" },
  },
  {
    keywords: ["elan qoy", "necə sat", "elan yerləşdir", "elan yarat"],
    text: "Elan yerləşdirmək üçün əvvəlcə telefon nömrənizi doğrulamalısınız, sonra Dashboard → \"+ Yeni elan\"dan davam edin.",
    link: { href: "/dashboard/new-listing", label: "Yeni elan" },
  },
  {
    keywords: ["telefon", "doğrula", "nömrə"],
    text: "Telefon doğrulaması üçün nömrənizi göndərin — admin sizə zəng edib təsdiq kodu deyəcək, kodu bura yazmalısınız.",
    link: { href: "/dashboard/verify-phone", label: "Nömrə doğrula" },
  },
  {
    keywords: ["report", "şikayət"],
    text: "Bir elanı və ya istifadəçini report etmək üçün Dəstək bölməsindən uyğun kateqoriyanı seçin.",
    link: { href: "/dashboard/support", label: "Dəstəyə keç" },
  },
  {
    keywords: ["çıxar", "withdraw", "pulumu al"],
    text: "Qazandığınız pulu çıxarmaq üçün Cüzdan səhifəsində \"Çıxarış tələb et\" formunu doldurun. Admin təsdiqləyəndən sonra ödəniş göndəriləcək.",
    link: { href: "/dashboard/wallet", label: "Cüzdana keç" },
  },
  {
    keywords: ["mübahisə", "geri qaytar", "refund", "iade"],
    text: "Sifariş səhifənizdə \"Problem var, dəstəyə müraciət et\" düyməsi ilə mübahisə aça bilərsiniz — pul geri qaytarılana və ya satıcıya buraxılana qədər qorunur.",
    link: { href: "/dashboard", label: "Dashboard" },
  },
];

function findAnswer(input: string) {
  const lower = input.toLowerCase();
  for (const item of FAQ) {
    if (item.keywords.some((k) => lower.includes(k))) return item;
  }
  return null;
}

export default function SupportChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { from: "bot", text: "Salam! Sualınızı yazın — balans artırma, elan qoyma, dolandırılma və s. haqqında sürətlə cavab verə bilərəm." },
  ]);
  const [input, setInput] = useState("");

  function send(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    const userMsg: ChatMessage = { from: "user", text: input.trim() };
    const match = findAnswer(input);
    const botMsg: ChatMessage = match
      ? { from: "bot", text: match.text, link: match.link }
      : {
          from: "bot",
          text: "Dəqiq cavab tapa bilmədim. Ən yaxşısı Dəstək bölməsindən müraciət göndərməkdir — orada kateqoriya seçib probleminizi yazın.",
          link: { href: "/dashboard/support", label: "Dəstəyə keç" },
        };
    setMessages((prev) => [...prev, userMsg, botMsg]);
    setInput("");
  }

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {open && (
        <div className="mb-3 w-80 max-w-[90vw] rounded-2xl border border-line bg-panel shadow-2xl overflow-hidden flex flex-col" style={{ maxHeight: "70vh" }}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-line">
            <p className="text-sm font-display">Sürətli yardım</p>
            <button onClick={() => setOpen(false)} className="text-mist hover:text-paper text-sm">✕</button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.from === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed ${m.from === "user" ? "bg-jade text-bg" : "bg-bg text-paper border border-line"}`}>
                  {m.text}
                  {m.link && (
                    <Link href={m.link.href} className="block mt-1.5 text-jade-soft underline">
                      {m.link.label} →
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
          <form onSubmit={send} className="flex gap-2 p-3 border-t border-line">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Sualınızı yazın…"
              className="flex-1 rounded-full border border-line bg-bg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-jade"
            />
            <button type="submit" className="rounded-full bg-jade text-bg px-3 py-2 text-xs font-semibold">Göndər</button>
          </form>
        </div>
      )}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-14 h-14 rounded-full bg-jade text-bg shadow-xl flex items-center justify-center text-2xl hover:bg-jade-soft transition"
      >
        {open ? "✕" : "💬"}
      </button>
    </div>
  );
}
