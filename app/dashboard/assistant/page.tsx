"use client";

import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import {
  ASSISTANT_QUICK_PROMPTS,
  buildAssistantRequest,
  getAssistantStatusTone,
  normalizeAssistantResponse,
  type AssistantAction,
  type AssistantMessage,
  type AssistantSuggestion,
} from "./assistant-helpers";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const INITIAL_ASSISTANT_MESSAGE: AssistantMessage = {
  role: "assistant",
  content: "Cześć. Jestem asystentem LuMir. Pomogę z produktami, importem, AI, eksportem, Allegro, billingiem i zadaniami. Nie wykonuję zmian bez potwierdzenia w UI.",
};

function authHeadersJSON() {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : "";
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

function getErrorMessage(err: unknown) {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "Nie udało się połączyć z asystentem.";
}

async function readResponseError(res: Response) {
  try {
    const data = await res.json();
    if (typeof data?.error === "string" && data.error) return data.error;
  } catch {}
  return "Nie udało się wygenerować odpowiedzi.";
}

function AssistantIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.8 4.6L18 9.4l-4.2 1.8L12 16l-1.8-4.8L6 9.4l4.2-1.8L12 3z" />
      <path d="M19 14l.9 2.1L22 17l-2.1.9L19 20l-.9-2.1L16 17l2.1-.9L19 14z" />
      <path d="M5 14l.8 1.8L8 16.5l-2.2.7L5 19l-.8-1.8L2 16.5l2.2-.7L5 14z" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 2 11 13" />
      <path d="m22 2-7 20-4-9-9-4 20-7z" />
    </svg>
  );
}

function ActionChips({ actions, onOpen }: { actions: AssistantAction[]; onOpen: (href: string) => void }) {
  if (!actions.length) return null;
  return (
    <div className="mt-5 flex flex-wrap gap-2">
      {actions.map((action) => (
        <button
          key={`${action.href}-${action.label}`}
          type="button"
          onClick={() => onOpen(action.href)}
          className="rounded-full border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] transition hover:border-indigo-300 hover:text-indigo-300"
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}

function SuggestionGrid({ suggestions, onPick }: { suggestions: AssistantSuggestion[]; onPick: (prompt: string) => void }) {
  return (
    <div className="assistant-suggestion-grid grid w-full gap-3 sm:grid-cols-2">
      {suggestions.map((item) => (
        <button
          key={item.prompt}
          type="button"
          onClick={() => onPick(item.prompt)}
          className="group min-h-[104px] rounded-2xl border border-indigo-300/25 bg-indigo-500/10 p-4 text-left transition hover:border-indigo-300/60 hover:bg-indigo-500/15"
        >
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-300 transition group-hover:bg-indigo-500/25">
              <AssistantIcon className="h-4 w-4" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-bold leading-5 text-[var(--text-heading)]">{item.label}</span>
              <span className="mt-1 block text-sm leading-5 text-[var(--text-secondary)]">{item.prompt}</span>
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}

function MessageBubble({ message }: { message: AssistantMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[82%] rounded-2xl border px-4 py-3 text-sm leading-6 shadow-sm md:max-w-[760px] ${
          isUser
            ? "border-indigo-400/30 bg-gradient-to-r from-indigo-500 to-violet-500 text-white"
            : "border-[var(--border-default)] bg-[var(--bg-card)] text-[var(--text-primary)]"
        }`}
      >
        <div className="whitespace-pre-wrap">{message.content}</div>
      </div>
    </div>
  );
}

function HeaderTag({ children }: { children: string }) {
  return (
    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-[var(--text-secondary)]">
      {children}
    </span>
  );
}

export default function AssistantPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<AssistantMessage[]>([INITIAL_ASSISTANT_MESSAGE]);
  const [suggestions, setSuggestions] = useState<AssistantSuggestion[]>(ASSISTANT_QUICK_PROMPTS);
  const [actions, setActions] = useState<AssistantAction[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fallbackMode, setFallbackMode] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const hasStarted = messages.length > 1;
  const canSend = message.trim().length > 0 && !loading;
  const status = error ? "error" : loading ? "thinking" : fallbackMode ? "fallback" : "online";

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function sendPrompt(promptText = message) {
    const trimmed = promptText.trim();
    if (!trimmed || loading) return;

    const nextMessages: AssistantMessage[] = [...messages, { role: "user", content: trimmed }];
    setMessages(nextMessages);
    setMessage("");
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${API}/api/assistant/chat`, {
        method: "POST",
        headers: authHeadersJSON(),
        body: JSON.stringify(buildAssistantRequest({ message: trimmed, messages })),
      });
      if (!res.ok) throw new Error(await readResponseError(res));

      const normalized = normalizeAssistantResponse(await res.json());
      setMessages([...nextMessages, { role: "assistant", content: normalized.reply }]);
      setSuggestions(normalized.suggestions.length ? normalized.suggestions : ASSISTANT_QUICK_PROMPTS);
      setActions(normalized.actions);
      setFallbackMode(normalized.contextSummary?.aiStatus === "fallback");
    } catch (err) {
      const text = getErrorMessage(err);
      setError(text);
      setFallbackMode(false);
      setMessages([...nextMessages, { role: "assistant", content: text }]);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit() {
    if (!canSend) return;
    void sendPrompt();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey) return;
    event.preventDefault();
    handleSubmit();
  }

  return (
    <div className="assistant-workspace relative flex h-[calc(100vh-126px)] min-h-[720px] w-full flex-col overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] shadow-[var(--shadow-card)] xl:left-1/2 xl:w-[calc(100vw-284px)] xl:max-w-[1480px] xl:-translate-x-1/2">
      <header className="border-b border-[var(--border-default)] bg-[var(--bg-card-hover)] px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-500/15 text-indigo-300">
                <AssistantIcon />
              </span>
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.22em] text-indigo-300">Asystent AI</div>
                <h1 className="text-xl font-bold text-[var(--text-heading)]">AI Asystent LuMir</h1>
              </div>
            </div>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
              Pytaj o produkty, import, AI, eksporty, Allegro, billing i zadania. Asystent czyta kontekst konta i podaje konkretne następne kroki.
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <HeaderTag>Tylko podgląd</HeaderTag>
            <HeaderTag>Kontekst konta</HeaderTag>
            <div className="flex items-center gap-2 rounded-full border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)]">
              <span className={`h-2.5 w-2.5 rounded-full ${getAssistantStatusTone(status)}`} />
              {loading ? "Analizuję" : error ? "Wymaga uwagi" : fallbackMode ? "Tryb awaryjny" : "Online"}
            </div>
          </div>
        </div>
      </header>

      <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto bg-[var(--bg-body)]">
        {!hasStarted ? (
          <div className="assistant-welcome mx-auto flex min-h-full max-w-[860px] flex-col items-center justify-center px-5 py-10 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/15 text-indigo-300">
              <AssistantIcon className="h-7 w-7" />
            </div>
            <h2 className="mt-5 text-2xl font-bold text-[var(--text-heading)]">
              Cześć, w czym mam pomóc?
            </h2>
            <p className="mt-3 max-w-[620px] text-sm leading-6 text-[var(--text-secondary)]">
              Wybierz szybkie pytanie albo napisz własne. Najlepiej działa na konkretach: produkt, import, eksport, kredyty, błąd joba lub integracja marketplace.
            </p>
            <div className="mt-7 w-full">
              <SuggestionGrid suggestions={suggestions} onPick={(prompt) => void sendPrompt(prompt)} />
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-[920px] space-y-4 px-5 py-6">
            {messages.slice(1).map((item, index) => (
              <MessageBubble key={`${item.role}-${index}-${item.content.slice(0, 12)}`} message={item} />
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] px-4 py-3 text-sm text-[var(--text-secondary)]">
                  Sprawdzam dane konta i przygotowuję odpowiedź...
                </div>
              </div>
            )}
            <ActionChips actions={actions} onOpen={(href) => router.push(href)} />
          </div>
        )}
      </div>

      <footer className="border-t border-[var(--border-default)] bg-[var(--bg-card-hover)] px-4 py-4">
        {hasStarted && suggestions.length > 0 ? (
          <div className="mx-auto mb-3 flex max-w-[920px] gap-2 overflow-x-auto pb-1">
            {suggestions.slice(0, 5).map((item) => (
              <button
                key={item.prompt}
                type="button"
                onClick={() => void sendPrompt(item.prompt)}
                className="shrink-0 rounded-full border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] transition hover:border-indigo-300 hover:text-[var(--text-primary)]"
              >
                {item.label}
              </button>
            ))}
          </div>
        ) : null}

        <div className="mx-auto flex max-w-[920px] gap-3">
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value.slice(0, 2000))}
            onKeyDown={handleKeyDown}
            rows={1}
            maxLength={2000}
            placeholder="Napisz wiadomość..."
            className="min-h-[56px] flex-1 resize-none rounded-2xl border border-[var(--border-input)] bg-[var(--bg-input)] px-4 py-4 text-sm text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-tertiary)] focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
          />
          <button
            type="button"
            aria-disabled={!canSend}
            onClick={handleSubmit}
            className={`flex h-[56px] min-w-[118px] items-center justify-center gap-2 rounded-2xl px-4 text-sm font-bold text-white shadow-sm ${
              canSend
                ? "bg-gradient-to-r from-indigo-500 to-violet-500 hover:shadow-indigo-950/30"
                : "cursor-not-allowed bg-slate-500/50"
            }`}
          >
            <SendIcon />
            Wyślij
          </button>
        </div>
        <div className="mx-auto mt-2 flex max-w-[920px] justify-between text-[11px] text-[var(--text-tertiary)]">
          <span>Enter wysyła, Shift+Enter dodaje linię.</span>
          <span>{message.length}/2000</span>
        </div>
      </footer>
    </div>
  );
}
