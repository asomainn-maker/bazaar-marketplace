"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Conversation = {
  id: string;
  otherUsername: string;
  listingTitle: string | null;
  lastMessage: string | null;
  lastMessageAt: string;
  unread: number;
};

export default function MessagesListPage() {
  const [conversations, setConversations] = useState<Conversation[] | null>(null);

  useEffect(() => {
    fetch("/api/conversations")
      .then((r) => r.json())
      .then((d) => setConversations(d.conversations ?? []));
  }, []);

  return (
    <div className="min-h-screen">
      <header className="max-w-2xl mx-auto px-6 pt-8 flex items-center justify-between">
        <Link href="/dashboard" className="font-display text-lg flex items-center gap-2"><span className="text-mist">←</span> Bazar</Link>
        <Link href="/dashboard" className="text-sm text-mist hover:text-paper">Dashboard</Link>
      </header>
      <main className="max-w-2xl mx-auto px-6 py-12">
        <h1 className="font-display text-2xl mb-6">Mesajlar</h1>

        {conversations === null && <p className="text-sm text-mist">Yüklənir…</p>}
        {conversations && conversations.length === 0 && (
          <p className="text-sm text-mist border border-dashed border-line rounded-2xl p-8 text-center">
            Hələ mesajınız yoxdur. Elan səhifəsində "Satıcıya yaz" düyməsi ilə başlaya bilərsiniz.
          </p>
        )}

        <div className="space-y-2">
          {(conversations ?? []).map((c) => (
            <Link
              key={c.id}
              href={`/dashboard/messages/${c.id}`}
              className="flex items-center justify-between rounded-xl border border-line bg-panel p-4 hover:border-jade transition-colors"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium">@{c.otherUsername}</p>
                  {c.listingTitle && <span className="text-xs text-mist truncate">· {c.listingTitle}</span>}
                </div>
                <p className="text-sm text-mist truncate">{c.lastMessage ?? "Söhbətə başlayın"}</p>
              </div>
              {c.unread > 0 && (
                <span className="rounded-full bg-gold text-bg text-[10px] font-bold px-2 py-1 shrink-0">{c.unread}</span>
              )}
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
