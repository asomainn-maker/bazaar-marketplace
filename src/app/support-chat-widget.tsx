"use client";

import { useState } from "react";
import Link from "next/link";

type ChatMessage = { from: "bot" | "user"; text: string; link?: { href: string; label: string } | null };

export default function SupportChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { from: "bot", text: "Salam! Sualınızı yazın — balans artırma, elan qoyma, avtomatik təslimat, dolandırılma və s. haqqında sürətlə cavab verə bilərəm." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;
    const userMsg: ChatMessage = { from: "user", text: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.from === "user" ? "user" : "assistant", text: m.text })),
        }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { from: "bot", text: data.text, link: data.link }]);
    } catch {
      setMessages((prev) => [...prev, {
        from: "bot",
        text: "Bir xəta baş verdi. Dəstək bölməsindən müraciət göndərə bilərsiniz.",
        link: { href: "/dashboard/support", label: "Dəstəyə keç" },
      }]);
    } finally {
      setLoading(false);
    }
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
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-xl px-3 py-2 text-xs bg-bg text-mist border border-line">Yazır…</div>
              </div>
            )}
          </div>
          <form onSubmit={send} className="flex gap-2 p-3 border-t border-line">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Sualınızı yazın…"
              className="flex-1 rounded-full border border-line bg-bg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-jade"
            />
            <button type="submit" disabled={loading} className="rounded-full bg-jade text-bg px-3 py-2 text-xs font-semibold disabled:opacity-50">Göndər</button>
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
