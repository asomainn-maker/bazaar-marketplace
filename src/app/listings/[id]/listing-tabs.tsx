"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Review = { rating: number; body: string | null; created_at: string; username: string };
type Question = { id: string; question: string; answer: string | null; created_at: string; username: string };

const TABS = ["Açıqlama", "Rəylər", "Təhlükəsiz Ticarət", "Sual-Cavab"] as const;

export default function ListingTabs({
  listingId,
  description,
  reviews,
  questions,
  isLoggedIn,
  isOwner,
}: {
  listingId: string;
  description: string | null;
  reviews: Review[];
  questions: Question[];
  isLoggedIn: boolean;
  isOwner: boolean;
}) {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Açıqlama");
  const [newQuestion, setNewQuestion] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [answerDrafts, setAnswerDrafts] = useState<Record<string, string>>({});
  const router = useRouter();

  async function submitQuestion(e: React.FormEvent) {
    e.preventDefault();
    if (!newQuestion.trim()) return;
    setPosting(true);
    setError(null);
    const res = await fetch(`/api/listings/${listingId}/questions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: newQuestion.trim() }),
    });
    const data = await res.json();
    setPosting(false);
    if (!res.ok) {
      setError(data.error || "Sual göndərilmədi");
      return;
    }
    setNewQuestion("");
    router.refresh();
  }

  async function submitAnswer(qid: string) {
    const answer = answerDrafts[qid];
    if (!answer?.trim()) return;
    await fetch(`/api/listings/${listingId}/questions/${qid}/answer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answer }),
    });
    setAnswerDrafts((prev) => ({ ...prev, [qid]: "" }));
    router.refresh();
  }

  return (
    <div className="rounded-2xl border border-line bg-panel overflow-hidden">
      <div className="flex overflow-x-auto border-b border-line">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`whitespace-nowrap px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
              tab === t ? "border-jade text-paper" : "border-transparent text-mist hover:text-paper"
            }`}
          >
            {t}
            {t === "Rəylər" && ` (${reviews.length})`}
            {t === "Sual-Cavab" && ` (${questions.length})`}
          </button>
        ))}
      </div>

      <div className="p-6">
        {tab === "Açıqlama" && (
          <p className="text-paper/90 leading-relaxed whitespace-pre-wrap">
            {description || "Bu elan üçün ətraflı təsvir əlavə edilməyib."}
          </p>
        )}

        {tab === "Rəylər" && (
          <div className="space-y-3">
            {reviews.length === 0 && <p className="text-sm text-mist">Hələ rəy yoxdur.</p>}
            {reviews.map((r, i) => (
              <div key={i} className="border-b border-line pb-3 last:border-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-gold text-sm">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span>
                  <span className="text-xs text-mist">@{r.username}</span>
                </div>
                {r.body && <p className="text-sm text-paper/90">{r.body}</p>}
              </div>
            ))}
          </div>
        )}

        {tab === "Təhlükəsiz Ticarət" && (
          <div className="space-y-3 text-sm text-paper/90">
            <p>Ödədiyiniz məbləğ dərhal satıcıya getmir — sistem tərəfindən qorunmada saxlanılır.</p>
            <p>Satıcı məhsulu təhvil verdiyini bildirdikdən sonra, siz təsdiqləyənə qədər (və ya 3 gün ərzində cavabsız qalarsa avtomatik) ödəniş sərbəst buraxılmır.</p>
            <p>Problem yaranarsa, "Dəstəyə müraciət et" düyməsi ilə mübahisə aça bilərsiniz — komandamız hər iki tərəflə əlaqə saxlayıb qərar verəcək.</p>
            <p className="text-gold">Diqqət: saytdan kənar (mesajlaşma, WhatsApp və s.) ödəniş etməyin — bu, sizi qorunmasız edir.</p>
          </div>
        )}

        {tab === "Sual-Cavab" && (
          <div className="space-y-4">
            {questions.length === 0 && <p className="text-sm text-mist">Hələ sual yoxdur.</p>}
            {questions.map((q) => (
              <div key={q.id} className="border-b border-line pb-3 last:border-0">
                <p className="text-xs text-jade-soft mb-1">@{q.username} soruşdu</p>
                <p className="text-sm text-paper mb-2">{q.question}</p>
                {q.answer ? (
                  <div className="rounded-lg bg-bg/60 p-3">
                    <p className="text-xs text-gold mb-1">Satıcının cavabı</p>
                    <p className="text-sm text-paper/90">{q.answer}</p>
                  </div>
                ) : isOwner ? (
                  <div className="flex gap-2">
                    <input
                      value={answerDrafts[q.id] ?? ""}
                      onChange={(e) => setAnswerDrafts((prev) => ({ ...prev, [q.id]: e.target.value }))}
                      placeholder="Cavab yazın…"
                      className="flex-1 rounded-lg border border-line bg-bg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-jade"
                    />
                    <button onClick={() => submitAnswer(q.id)} className="rounded-full bg-jade text-bg text-xs font-semibold px-3 py-2">
                      Cavabla
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-mist">Hələ cavablanmayıb</p>
                )}
              </div>
            ))}

            {!isOwner && (
              isLoggedIn ? (
                <form onSubmit={submitQuestion} className="flex gap-2 pt-2">
                  <input
                    value={newQuestion}
                    onChange={(e) => setNewQuestion(e.target.value)}
                    placeholder="Sualınızı yazın…"
                    className="flex-1 rounded-lg border border-line bg-bg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-jade"
                  />
                  <button type="submit" disabled={posting} className="rounded-full bg-jade text-bg text-sm font-semibold px-4 py-2 disabled:opacity-50">
                    Soruş
                  </button>
                </form>
              ) : (
                <p className="text-sm text-mist"><Link href="/login" className="text-jade-soft underline">Giriş edin</Link> sual verə bilmək üçün.</p>
              )
            )}
            {error && <p className="text-sm text-gold">{error}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
