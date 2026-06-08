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

export function normalizeProductPriceInput(value: unknown) {
  if (value == null || String(value).trim() === "") return null;
  if (typeof value === "number") {
    if (!Number.isFinite(value) || value <= 0) return null;
    const rounded = Math.round((value + Number.EPSILON) * 100) / 100;
    return Math.abs(value - rounded) < 1e-9 ? rounded : null;
  }

  const raw = String(value).trim().replace(/\s*PLN$/i, "").trim();
  let normalized = "";
  if (/^\d{1,3}(?:[ .]\d{3})+,\d{1,2}$/.test(raw)) {
    normalized = raw.replace(/[ .]/g, "").replace(",", ".");
  } else if (/^\d+,\d{1,2}$/.test(raw)) {
    normalized = raw.replace(",", ".");
  } else if (/^\d+(?:\.\d{1,2})?$/.test(raw)) {
    normalized = raw;
  } else {
    return null;
  }
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  const rounded = Math.round((parsed + Number.EPSILON) * 100) / 100;
  return rounded > 0 ? rounded : null;
}

export function hasProductPriceChanged(initialValue: unknown, currentValue: unknown) {
  const initialPrice = normalizeProductPriceInput(initialValue);
  const currentPrice = normalizeProductPriceInput(currentValue);
  if (initialPrice == null || currentPrice == null) return initialPrice !== currentPrice;
  return Math.round(initialPrice * 100) !== Math.round(currentPrice * 100);
}

export function getPublicationChecklistBlockerLabels(checklist: PublicationChecklist) {
  const labels = new Map(checklist.items.map((item) => [item.key, item.label]));
  return checklist.blockingItems.map((key) => labels.get(key) || key);
}

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
