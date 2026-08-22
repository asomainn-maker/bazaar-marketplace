"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Message = { id: string; body: string; sender_id: string; created_at: string };

export default function GeneralTicketPanel({
  ticketId,
  isOpen,
  initialMessages,
}: {
  ticketId: string;
  isOpen: boolean;
  initialMessages: Message[];
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function send() {
    if (!input.trim()) return;
    const res = await fetch(`/api/tickets/${ticketId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: input.trim() }),
    });
    const data = await res.json();
    if (res.ok) {
      setMessages((prev) => [...prev, data.message]);
      setInput("");
    }
  }

  async function close() {
    if (!confirm("Bu müraciəti bağlayırsınız?")) return;
    setLoading(true);
    await fetch(`/api/admin/tickets/${ticketId}/close`, { method: "POST" });
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-line bg-bg/40 p-4">
        <div className="space-y-2 max-h-72 overflow-y-auto mb-3">
          {messages.map((m) => (
            <div key={m.id} className="text-sm border-b border-line pb-2 last:border-0">
              <p className="text-paper/90">{m.body}</p>
              <p className="text-[10px] text-mist mt-1">{new Date(m.created_at).toLocaleString("az")}</p>
            </div>
          ))}
          {messages.length === 0 && <p className="text-sm text-mist">Mesaj yoxdur.</p>}
        </div>
        {isOpen && (
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Cavab yazın…"
              className="flex-1 rounded-lg border border-line bg-bg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-jade"
            />
            <button onClick={send} className="rounded-full bg-jade text-bg font-semibold px-4 py-2 text-sm">
              Göndər
            </button>
          </div>
        )}
      </div>

      {isOpen && (
        <button onClick={close} disabled={loading} className="rounded-full border border-line px-4 py-2 text-sm disabled:opacity-50">
          Müraciəti bağla
        </button>
      )}
    </div>
  );
}
