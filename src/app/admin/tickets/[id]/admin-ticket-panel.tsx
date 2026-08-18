"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Message = { id: string; body: string; sender_id: string; created_at: string };

export default function AdminTicketPanel({
  ticketId,
  isOpen,
  initialMessages,
  buyerId,
  sellerId,
  buyerName,
  sellerName,
}: {
  ticketId: string;
  isOpen: boolean;
  initialMessages: Message[];
  buyerId: string;
  sellerId: string;
  buyerName: string;
  sellerName: string;
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  function labelFor(senderId: string) {
    if (senderId === buyerId) return `@${buyerName} (alıcı)`;
    if (senderId === sellerId) return `@${sellerName} (satıcı)`;
    return "Admin";
  }

  async function sendMessage() {
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

  async function resolve(resolution: "buyer" | "seller") {
    const confirmText =
      resolution === "buyer"
        ? `Alıcıya geri ödəniş edilsin? (${buyerName} haqlıdır)`
        : `Satıcıya ödəniş buraxılsın? (${sellerName} haqlıdır)`;
    if (!confirm(confirmText)) return;
    setLoading(true);
    const res = await fetch(`/api/admin/tickets/${ticketId}/resolve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resolution, note }),
    });
    setLoading(false);
    if (res.ok) router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-line bg-bg/40 p-4">
        <div className="space-y-2 max-h-72 overflow-y-auto mb-3">
          {messages.map((m) => (
            <div key={m.id} className="text-sm border-b border-line pb-2 last:border-0">
              <p className="text-jade-soft text-xs mb-0.5">{labelFor(m.sender_id)}</p>
              <p className="text-paper/90">{m.body}</p>
            </div>
          ))}
          {messages.length === 0 && <p className="text-sm text-mist">Hələ mesaj yoxdur.</p>}
        </div>
        {isOpen && (
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Tərəflərə mesaj yazın…"
              className="flex-1 rounded-lg border border-line bg-bg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-jade"
            />
            <button onClick={sendMessage} className="rounded-full bg-jade text-bg font-semibold px-4 py-2 text-sm">
              Göndər
            </button>
          </div>
        )}
      </div>

      {isOpen && (
        <div className="rounded-xl border border-gold/30 bg-gold/5 p-4 space-y-3">
          <p className="text-xs uppercase tracking-widest text-gold">Qərar verin</p>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Qərarın qısa izahı (istəyə bağlı, hər iki tərəfə görünəcək)"
            rows={2}
            className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold resize-none"
          />
          <div className="flex gap-3">
            <button
              onClick={() => resolve("buyer")}
              disabled={loading}
              className="flex-1 rounded-full border border-jade text-jade font-semibold px-4 py-2.5 text-sm disabled:opacity-50"
            >
              Alıcı haqlıdır → geri ödə
            </button>
            <button
              onClick={() => resolve("seller")}
              disabled={loading}
              className="flex-1 rounded-full bg-jade text-bg font-semibold px-4 py-2.5 text-sm disabled:opacity-50"
            >
              Satıcı haqlıdır → ödə
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
