export type SellerJob = {
  id: string;
  type: string;
  status: "queued" | "processing" | "done" | "error";
  progressPercent: number;
  currentStep: string | null;
  elapsedSeconds: number;
  etaSeconds: number | null;
  label: string | null;
};

type JobsResponse = {
  data?: Array<{
    id?: unknown;
    type?: unknown;
    status?: unknown;
    progressPercent?: unknown;
    currentStep?: unknown;
    elapsedSeconds?: unknown;
    etaSeconds?: unknown;
    scopeLabel?: unknown;
  }>;
};

type RawJob = NonNullable<JobsResponse["data"]>[number];

function normalizeNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeJob(raw: RawJob): SellerJob | null {
  if (!raw || typeof raw.id !== "string" || typeof raw.type !== "string") return null;
  const status = typeof raw.status === "string" ? raw.status : "queued";
  if (!["queued", "processing", "done", "error"].includes(status)) return null;

  return {
    id: raw.id,
    type: raw.type,
    status: status as SellerJob["status"],
    progressPercent: Math.max(0, Math.min(100, normalizeNumber(raw.progressPercent, 0))),
    currentStep: typeof raw.currentStep === "string" ? raw.currentStep : null,
    elapsedSeconds: Math.max(0, normalizeNumber(raw.elapsedSeconds, 0)),
    etaSeconds: raw.etaSeconds == null ? null : Math.max(0, normalizeNumber(raw.etaSeconds, 0)),
    label: typeof raw.scopeLabel === "string" ? raw.scopeLabel : null,
  };
}

export async function fetchActiveJobs(token: string): Promise<SellerJob[]> {
  const api = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
  const res = await fetch(`${api}/api/jobs?scope=active`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  const json = (await res.json()) as JobsResponse;
  if (!res.ok) {
    const message = typeof (json as { error?: unknown }).error === "string"
      ? (json as { error?: string }).error
      : "Nie udało się pobrać aktywnych jobów";
    throw new Error(message);
  }

  return (json.data || [])
    .map((job) => normalizeJob(job))
    .filter((job): job is SellerJob => job !== null);
}

export function formatJobDuration(seconds: number | null | undefined) {
  if (!Number.isFinite(Number(seconds)) || Number(seconds) <= 0) return "0s";
  const total = Math.round(Number(seconds));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  if (!mins) return `${secs}s`;
  return `${mins}m ${secs}s`;
}
