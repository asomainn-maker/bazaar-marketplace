"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Message = { id: string; body: string; sender_id: string; created_at: string };

const STATUS_LABELS: Record<string, string> = {
  paid: "Ödənilib · satıcının təhvil verməsi gözlənilir",
  delivered: "Təslim edilib · sizin təsdiqiniz gözlənilir",
  completed: "Tamamlanıb",
  disputed: "Mübahisəli · dəstək araşdırır",
  refunded: "Alıcıya geri qaytarılıb",
  cancelled: "Ləğv edilib",
};

export default function OrderActions({
  orderId,
  status,
  isBuyer,
  autoReleaseAt,
  ticketId,
  ticketStatus,
}: {
  orderId: string;
  status: string;
  isBuyer: boolean;
  autoReleaseAt: string | null;
  ticketId: string | null;
  ticketStatus: string | null;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [disputeMessage, setDisputeMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState("");
  const router = useRouter();

  useEffect(() => {
    if (!ticketId) return;
    fetch(`/api/tickets/${ticketId}/messages`)
      .then((r) => r.json())
      .then((d) => setMessages(d.messages ?? []));
  }, [ticketId]);

  async function callAction(path: string, body?: object) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Xəta baş verdi");
        return null;
      }
      router.refresh();
      return data;
    } catch {
      setError("Şəbəkə xətası");
      return null;
    } finally {
      setLoading(false);
    }
  }

  async function sendDispute() {
    const data = await callAction(`/api/orders/${orderId}/dispute`, { message: disputeMessage });
    if (data) {
      setDisputeOpen(false);
      setDisputeMessage("");
    }
  }

  async function sendChatMessage() {
    if (!ticketId || !chatInput.trim()) return;
    const res = await fetch(`/api/tickets/${ticketId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: chatInput.trim() }),
    });
    const data = await res.json();
    if (res.ok) {
      setMessages((prev) => [...prev, data.message]);
      setChatInput("");
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-mist">{STATUS_LABELS[status] ?? status}</p>
      {status === "delivered" && autoReleaseAt && (
        <p className="text-xs text-mist">
          Cavab verilməsə, ödəniş avtomatik olaraq {new Date(autoReleaseAt).toLocaleString("az")} tarixində satıcıya keçəcək.
        </p>
      )}

      {error && <p className="text-sm text-gold bg-gold/10 border border-gold/30 rounded-lg px-3 py-2">{error}</p>}

      <div className="flex flex-wrap gap-3">
        {!isBuyer && status === "paid" && (
          <button
            onClick={() => callAction(`/api/orders/${orderId}/deliver`)}
            disabled={loading}
            className="rounded-full bg-jade text-bg font-semibold px-5 py-2.5 text-sm disabled:opacity-50"
          >
            Təslim etdim
          </button>
        )}
        {isBuyer && status === "delivered" && (
          <button
            onClick={() => callAction(`/api/orders/${orderId}/confirm`)}
            disabled={loading}
            className="rounded-full bg-jade text-bg font-semibold px-5 py-2.5 text-sm disabled:opacity-50"
          >
            Təhvil aldım, ödənişi buraxın
          </button>
        )}
        {["paid", "delivered"].includes(status) && !ticketId && (
          <button
            onClick={() => setDisputeOpen((v) => !v)}
            className="rounded-full border border-line px-5 py-2.5 text-sm hover:border-gold transition"
          >
            Problem var, dəstəyə müraciət et
          </button>
        )}
      </div>

      {disputeOpen && (
        <div className="rounded-xl border border-gold/30 bg-gold/5 p-4 space-y-2">
          <textarea
            value={disputeMessage}
            onChange={(e) => setDisputeMessage(e.target.value)}
            placeholder="Problemi izah edin…"
            rows={3}
            className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold resize-none"
          />
          <button
            onClick={sendDispute}
            disabled={loading || !disputeMessage.trim()}
            className="rounded-full bg-gold text-bg font-semibold px-4 py-2 text-sm disabled:opacity-50"
          >
            Mübahisəni göndər
          </button>
        </div>
      )}

      {ticketId && (
        <div className="rounded-xl border border-line bg-bg/40 p-4">
          <p className="text-xs uppercase tracking-widest text-gold mb-3">
            Dəstək söhbəti {ticketStatus && ticketStatus !== "open" ? "· Həll olunub" : "· Açıq"}
          </p>
          <div className="space-y-2 max-h-64 overflow-y-auto mb-3">
            {messages.map((m) => (
              <div key={m.id} className="text-sm border-b border-line pb-2 last:border-0">
                <p className="text-paper/90">{m.body}</p>
                <p className="text-[10px] text-mist mt-1">{new Date(m.created_at).toLocaleString("az")}</p>
              </div>
            ))}
            {messages.length === 0 && <p className="text-sm text-mist">Hələ mesaj yoxdur.</p>}
          </div>
          {ticketStatus === "open" && (
            <div className="flex gap-2">
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Mesaj yazın…"
                className="flex-1 rounded-lg border border-line bg-bg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-jade"
              />
              <button onClick={sendChatMessage} className="rounded-full bg-jade text-bg font-semibold px-4 py-2 text-sm">
                Göndər
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
