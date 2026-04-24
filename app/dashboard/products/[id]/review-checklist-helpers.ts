export type ProductAiReviewSection = {
  key: string;
  label: string;
  score: number;
  maxScore: number;
  bullets: string[];
  hint: string;
};

export type ProductAiReview = {
  marketplaceSlug: string;
  score: number;
  maxScore: number;
  status: "approved" | "review" | "rejected";
  version: string;
  summary: string;
  sections: ProductAiReviewSection[];
};

export type PublicationChecklistItem = {
  key: string;
  label: string;
  type: "auto" | "manual";
  status: "pass" | "fail" | "todo" | "na";
  blocking: boolean;
  hint: string;
  evidence: string;
  checked?: boolean;
};

export type PublicationChecklist = {
  marketplaceSlug: string;
  progress: {
    completed: number;
    total: number;
  };
  progressLabel: string;
  blockingItems: string[];
  items: PublicationChecklistItem[];
};

function toNumber(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function toStringArray(value: unknown) {
  return Array.isArray(value) ? value.map((item) => String(item)).filter(Boolean) : [];
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

export function normalizeProductAiReview(raw: unknown): ProductAiReview {
  const review = asRecord(raw);
  const sections = Array.isArray(review.sections)
    ? review.sections.map((value) => {
        const section = asRecord(value);
        return {
          key: String(section.key || ""),
          label: String(section.label || ""),
          score: toNumber(section.score),
          maxScore: toNumber(section.maxScore),
          bullets: toStringArray(section.bullets),
          hint: String(section.hint || ""),
        };
      })
    : [];

  return {
    marketplaceSlug: String(review.marketplaceSlug || ""),
    score: toNumber(review.score),
    maxScore: toNumber(review.maxScore, 100),
    status: review.status === "approved" || review.status === "review" ? review.status : "rejected",
    version: String(review.version || "v1"),
    summary: String(review.summary || ""),
    sections,
  };
}

export function normalizePublicationChecklist(raw: unknown): PublicationChecklist {
  const checklist = asRecord(raw);
  const progress = asRecord(checklist.progress);
  const completed = toNumber(progress.completed);
  const total = toNumber(progress.total);

  return {
    marketplaceSlug: String(checklist.marketplaceSlug || ""),
    progress: {
      completed,
      total,
    },
    progressLabel: `${completed}/${total}`,
    blockingItems: toStringArray(checklist.blockingItems),
    items: Array.isArray(checklist.items)
      ? checklist.items.map((value) => {
          const item = asRecord(value);
          return {
            key: String(item.key || ""),
            label: String(item.label || ""),
            type: item.type === "manual" ? "manual" : "auto",
            status: item.status === "pass" || item.status === "fail" || item.status === "todo" ? item.status : "na",
            blocking: !!item.blocking,
            hint: String(item.hint || ""),
            evidence: String(item.evidence || ""),
            checked: item.checked == null ? undefined : !!item.checked,
          };
        })
      : [],
  };
}
