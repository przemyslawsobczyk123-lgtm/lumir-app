"use client";

import type { ProductAiReview } from "./review-checklist-helpers";

const STATUS_STYLES: Record<ProductAiReview["status"], string> = {
  approved: "border-emerald-300 bg-emerald-500/10 text-emerald-300",
  review: "border-amber-300 bg-amber-500/10 text-amber-300",
  rejected: "border-rose-300 bg-rose-500/10 text-rose-300",
};

export function ProductAiReviewCard({ review }: { review: ProductAiReview | null }) {
  if (!review) {
    return (
      <div className="rounded-2xl border p-5 text-sm text-slate-400" style={{ background: "var(--bg-card)", borderColor: "var(--border-default)" }}>
        Brak recenzji AI dla Allegro.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border p-5 space-y-5" style={{ background: "var(--bg-card)", borderColor: "var(--border-default)" }}>
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-indigo-400 bg-slate-950 text-2xl font-black text-white">
            {review.score}
          </div>
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${STATUS_STYLES[review.status]}`}>
                {review.status}
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-semibold text-slate-300">
                {review.version}
              </span>
            </div>
            <p className="max-w-2xl text-sm text-slate-200">{review.summary}</p>
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-right">
          <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Wynik ogólny</div>
          <div className="mt-1 text-2xl font-black text-white">
            {review.score}
            <span className="text-sm font-semibold text-slate-400">/{review.maxScore}</span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {review.sections.map((section) => {
          const width = section.maxScore > 0 ? Math.max(0, Math.min(100, (section.score / section.maxScore) * 100)) : 0;
          return (
            <div
              key={section.key}
              className="rounded-2xl border p-4 space-y-3"
              style={{ background: "var(--bg-body)", borderColor: "var(--border-default)" }}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-white">{section.label}</div>
                <div className="text-sm font-semibold text-slate-300">
                  {section.score}/{section.maxScore}
                </div>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-cyan-300" style={{ width: `${width}%` }} />
              </div>
              <div className="space-y-1">
                {section.bullets.map((bullet) => (
                  <p key={bullet} className="text-sm text-slate-300">
                    {bullet}
                  </p>
                ))}
              </div>
              <div className="rounded-xl border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs text-amber-100">
                {section.hint}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
