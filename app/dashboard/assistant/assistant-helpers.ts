export type AssistantRole = "user" | "assistant";

export type AssistantMessage = {
  role: AssistantRole;
  content: string;
};

export type AssistantSuggestion = {
  label: string;
  prompt: string;
};

export type AssistantAction = {
  label: string;
  href: string;
};

export type AssistantResponse = {
  reply: string;
  suggestions: AssistantSuggestion[];
  actions: AssistantAction[];
  contextSummary?: {
    productsTotal?: number;
    creditsRemaining?: number;
    allegroValidAccounts?: number;
    recentJobs?: number;
  };
};

export const ASSISTANT_QUICK_PROMPTS: AssistantSuggestion[] = [
  { label: "Co poprawic najpierw?", prompt: "Co powinienem poprawic najpierw w produktach?" },
  { label: "Import produktow", prompt: "Jak najlepiej zaimportowac nowe produkty i uruchomic AI?" },
  { label: "Przygotuj eksport", prompt: "Jak przygotowac produkty do eksportu na marketplace?" },
  { label: "Kredyty AI", prompt: "Ile kredytow potrzebuje do kolejnej serii ofert?" },
];

function cleanText(value: unknown, maxLength = 2000) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function readArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function normalizeSuggestion(value: unknown): AssistantSuggestion | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  const label = cleanText(candidate.label, 80);
  const prompt = cleanText(candidate.prompt, 300);
  if (!label || !prompt) return null;
  return { label, prompt };
}

function normalizeAction(value: unknown): AssistantAction | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  const label = cleanText(candidate.label, 80);
  const href = cleanText(candidate.href, 200);
  if (!label || !href.startsWith("/dashboard")) return null;
  return { label, href };
}

export function buildAssistantRequest(input: {
  message: string;
  messages: AssistantMessage[];
}) {
  return {
    message: cleanText(input.message),
    history: input.messages
      .filter((item) => item.role === "user" || item.role === "assistant")
      .map((item) => ({ role: item.role, content: cleanText(item.content, 900) }))
      .filter((item) => item.content)
      .slice(-5),
  };
}

export function normalizeAssistantResponse(payload: unknown): AssistantResponse {
  const envelope = payload && typeof payload === "object" ? payload as Record<string, unknown> : {};
  const data = envelope.data && typeof envelope.data === "object"
    ? envelope.data as Record<string, unknown>
    : envelope;

  return {
    reply: cleanText(data.reply, 6000) || "Nie udalo sie odczytac odpowiedzi asystenta.",
    suggestions: readArray(data.suggestions)
      .map(normalizeSuggestion)
      .filter((item): item is AssistantSuggestion => Boolean(item)),
    actions: readArray(data.actions)
      .map(normalizeAction)
      .filter((item): item is AssistantAction => Boolean(item)),
    contextSummary: data.contextSummary && typeof data.contextSummary === "object"
      ? data.contextSummary as AssistantResponse["contextSummary"]
      : undefined,
  };
}

export function getAssistantStatusTone(status: "online" | "thinking" | "error") {
  if (status === "thinking") return "bg-amber-400";
  if (status === "error") return "bg-rose-400";
  return "bg-emerald-400";
}
