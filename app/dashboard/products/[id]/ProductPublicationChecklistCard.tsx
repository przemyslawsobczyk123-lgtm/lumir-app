"use client";

import type { PublicationChecklist } from "./review-checklist-helpers";

const STATUS_STYLES: Record<string, string> = {
  pass: "border-emerald-300 bg-emerald-500/10 text-emerald-200",
  fail: "border-rose-300 bg-rose-500/10 text-rose-200",
  todo: "border-amber-300 bg-amber-500/10 text-amber-100",
  na: "border-slate-300 bg-white/5 text-slate-300",
};

export function ProductPublicationChecklistCard({
  checklist,
  togglingKey,
  onToggleManual,
}: {
  checklist: PublicationChecklist | null;
  togglingKey: string | null;
  onToggleManual: (itemKey: string, checked: boolean) => void | Promise<void>;
}) {
  if (!checklist) {
    return (
      <div className="rounded-2xl border p-5 text-sm text-slate-400" style={{ background: "var(--bg-card)", borderColor: "var(--border-default)" }}>
        Brak checklisty publikacji dla Allegro.
      </div>
    );
  }

  const progressRatio = checklist.progress.total > 0
    ? Math.max(0, Math.min(100, (checklist.progress.completed / checklist.progress.total) * 100))
    : 0;

  return (
    <div className="rounded-2xl border p-5 space-y-5" style={{ background: "var(--bg-card)", borderColor: "var(--border-default)" }}>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <h3 className="text-lg font-bold text-white">Checklista przed publikacją</h3>
          <p className="text-sm text-slate-300">
            Auto-checki z danych produktu i draftu oraz potwierdzenia manualne przed publish.
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-right">
          <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Postęp</div>
          <div className="mt-1 text-2xl font-black text-white">{checklist.progressLabel}</div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="h-2 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-300" style={{ width: `${progressRatio}%` }} />
        </div>
        {checklist.blockingItems.length > 0 ? (
          <div className="text-xs text-rose-200">
            Blokery: {checklist.blockingItems.join(", ")}
          </div>
        ) : (
          <div className="text-xs text-emerald-200">Brak aktywnych blockerów checklisty.</div>
        )}
      </div>

      <div className="grid gap-3">
        {checklist.items.map((item) => {
          const isManual = item.type === "manual";
          const isBusy = togglingKey === item.key;
          return (
            <div
              key={item.key}
              className="rounded-2xl border p-4"
              style={{ background: "var(--bg-body)", borderColor: "var(--border-default)" }}
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-white">{item.label}</span>
                    <span className={`rounded-full border px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${STATUS_STYLES[item.status] || STATUS_STYLES.na}`}>
                      {item.status}
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-300">
                      {item.type}
                    </span>
                    {item.blocking ? (
                      <span className="rounded-full border border-rose-300/40 bg-rose-500/10 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-rose-200">
                        blocker
                      </span>
                    ) : null}
                  </div>
                  <p className="text-sm text-slate-300">{item.hint}</p>
                  {item.evidence ? <p className="text-xs text-slate-400">{item.evidence}</p> : null}
                </div>

                {isManual ? (
                  <label className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200">
                    <input
                      type="checkbox"
                      checked={!!item.checked}
                      onChange={(event) => onToggleManual(item.key, event.target.checked)}
                      disabled={isBusy}
                    />
                    <span>{isBusy ? "Zapisywanie..." : "Potwierdź"}</span>
                  </label>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
