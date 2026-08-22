"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

type Message = { id: string; body: string; sender_id: string; created_at: string };

export default function SupportTicketPage() {
  const params = useParams();
  const id = params.id as string;
  const [messages, setMessages] = useState<Message[]>([]);
  const [myId, setMyId] = useState<string | null>(null);
  const [input, setInput] = useState("");

  useEffect(() => {
    import("@/lib/supabase/client").then(({ createClient }) => {
      createClient().auth.getUser().then(({ data }) => setMyId(data.user?.id ?? null));
    });
  }, []);

  function load() {
    fetch(`/api/tickets/${id}/messages`)
      .then((r) => r.json())
      .then((d) => setMessages(d.messages ?? []));
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    const body = input.trim();
    setInput("");
    const res = await fetch(`/api/tickets/${id}/messages`, {
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
        <Link href="/dashboard/support" className="text-sm text-mist hover:text-paper">← Dəstək</Link>
      </header>
      <main className="max-w-2xl mx-auto w-full px-6 py-6 flex-1 flex flex-col">
        <div className="flex-1 rounded-2xl border border-line bg-panel p-5 overflow-y-auto space-y-3 min-h-[50vh] max-h-[65vh]">
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.sender_id === myId ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${m.sender_id === myId ? "bg-jade text-bg" : "bg-bg text-paper border border-line"}`}>
                {m.body}
              </div>
            </div>
          ))}
          {messages.length === 0 && <p className="text-sm text-mist">Mesaj yoxdur.</p>}
        </div>
        <form onSubmit={send} className="flex gap-2 mt-4">
          <input
            value={input} onChange={(e) => setInput(e.target.value)} placeholder="Mesaj yazın…"
            className="flex-1 rounded-full border border-line bg-bg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-jade"
          />
          <button type="submit" className="rounded-full bg-jade text-bg font-semibold px-5 py-3 text-sm">Göndər</button>
        </form>
      </main>
    </div>
  );
}
