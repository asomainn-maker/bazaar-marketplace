"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

type Message = { id: string; body: string; sender_id: string; created_at: string };

export default function ConversationPage() {
  const params = useParams();
  const id = params.id as string;
  const [messages, setMessages] = useState<Message[]>([]);
  const [myId, setMyId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    import("@/lib/supabase/client").then(({ createClient }) => {
      createClient().auth.getUser().then(({ data }) => setMyId(data.user?.id ?? null));
    });
  }, []);

  async function loadMessages() {
    const res = await fetch(`/api/conversations/${id}/messages`);
    if (!res.ok) return;
    const data = await res.json();
    setMessages(data.messages ?? []);
  }

  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    const body = input.trim();
    setInput("");
    const res = await fetch(`/api/conversations/${id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    if (res.ok) {
      const data = await res.json();
      setMessages((prev) => [...prev, data.message]);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="max-w-2xl mx-auto w-full px-6 pt-8 flex items-center justify-between">
        <Link href="/dashboard/messages" className="text-sm text-mist hover:text-paper">← Mesajlar</Link>
      </header>
      <main className="max-w-2xl mx-auto w-full px-6 py-6 flex-1 flex flex-col">
        <div className="flex-1 rounded-2xl border border-line bg-panel p-5 overflow-y-auto space-y-3 min-h-[50vh] max-h-[65vh]">
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.sender_id === myId ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                  m.sender_id === myId ? "bg-jade text-bg" : "bg-bg text-paper border border-line"
                }`}
              >
                {m.body}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={send} className="flex gap-2 mt-4">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Mesaj yazın…"
            className="flex-1 rounded-full border border-line bg-bg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-jade"
          />
          <button type="submit" className="rounded-full bg-jade text-bg font-semibold px-5 py-3 text-sm">
            Göndər
          </button>
        </form>
        <p className="text-[11px] text-mist mt-3 text-center">
          Təhlükəsizlik üçün ödənişi yalnız saytdan (Elan səhifəsindəki "İndi al" düyməsi) edin.
        </p>
      </main>
    </div>
  );
}
