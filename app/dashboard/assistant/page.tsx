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

function AssistantIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
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
    <div className="mt-4 flex flex-wrap gap-2">
      {actions.map((action) => (
        <button
          key={`${action.href}-${action.label}`}
          type="button"
          onClick={() => onOpen(action.href)}
          className="rounded-full border border-[var(--border-default)] bg-[var(--bg-card-hover)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] hover:border-indigo-300 hover:text-indigo-300"
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}

function SuggestionGrid({ suggestions, onPick }: { suggestions: AssistantSuggestion[]; onPick: (prompt: string) => void }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {suggestions.map((item) => (
        <button
          key={item.prompt}
          type="button"
          onClick={() => onPick(item.prompt)}
          className="rounded-2xl border border-indigo-400/20 bg-indigo-500/10 p-4 text-left transition hover:border-indigo-300/50 hover:bg-indigo-500/15"
        >
          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-500/15 text-indigo-300">
              <AssistantIcon />
            </span>
            {item.label}
          </div>
          <div className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">
            {item.prompt}
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
        className={`max-w-[82%] rounded-2xl border px-4 py-3 text-sm leading-6 shadow-sm ${
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

export default function AssistantPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<AssistantMessage[]>([
    {
      role: "assistant",
      content: "Cześć. Jestem asystentem LuMir. Pomogę z produktami, importem, AI, exportem, Allegro, billingiem i zadaniami. Nie wykonuję zmian bez potwierdzenia w UI.",
    },
  ]);
  const [suggestions, setSuggestions] = useState<AssistantSuggestion[]>(ASSISTANT_QUICK_PROMPTS);
  const [actions, setActions] = useState<AssistantAction[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fallbackMode, setFallbackMode] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

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
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl border border-[var(--border-default)] bg-[var(--bg-card)] shadow-[var(--shadow-card)]">
        <div className="border-b border-[var(--border-default)] bg-gradient-to-r from-indigo-500/12 via-violet-500/10 to-transparent px-6 py-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.24em] text-indigo-300">Asystent AI</div>
              <h1 className="mt-2 text-2xl font-bold text-[var(--text-heading)]">Centrum pomocy LuMir</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
                Zadaj pytanie o katalog, import, AI, eksporty, Allegro, billing albo błędy workerów. Asystent analizuje kontekst konta i podaje następne kroki.
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-[var(--border-default)] bg-[var(--bg-card-hover)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)]">
              <span className={`h-2.5 w-2.5 rounded-full ${getAssistantStatusTone(status)}`} />
              {loading ? "Analizuję" : error ? "Wymaga uwagi" : fallbackMode ? "Tryb awaryjny" : "Online"}
            </div>
          </div>
        </div>

        <div className="grid min-h-[660px] gap-0 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="flex min-h-[660px] flex-col border-[var(--border-default)] lg:border-r">
            <div ref={listRef} className="flex-1 space-y-4 overflow-y-auto p-5">
              {messages.map((item, index) => (
                <MessageBubble key={`${item.role}-${index}-${item.content.slice(0, 12)}`} message={item} />
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] px-4 py-3 text-sm text-[var(--text-secondary)]">
                    Asystent sprawdza kontekst konta...
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-[var(--border-default)] bg-[var(--bg-card-hover)] p-4">
              <div className="flex gap-3">
                <textarea
                  value={message}
                  onChange={(event) => setMessage(event.target.value.slice(0, 2000))}
                  onKeyDown={handleKeyDown}
                  rows={2}
                  maxLength={2000}
                  placeholder="Napisz wiadomość..."
                  className="min-h-[54px] flex-1 resize-none rounded-2xl border border-[var(--border-input)] bg-[var(--bg-input)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
                />
                <button
                  type="button"
                  aria-disabled={!canSend}
                  onClick={handleSubmit}
                  className={`flex h-[54px] min-w-[112px] items-center justify-center gap-2 rounded-2xl px-4 text-sm font-bold text-white shadow-sm ${
                    canSend
                      ? "bg-gradient-to-r from-indigo-500 to-violet-500 hover:shadow-indigo-950/30"
                      : "cursor-not-allowed bg-slate-500/50"
                  }`}
                >
                  <SendIcon />
                  Wyślij
                </button>
              </div>
              <div className="mt-2 flex justify-between text-[11px] text-[var(--text-tertiary)]">
                <span>Enter wysyła, Shift+Enter dodaje linię.</span>
                <span>{message.length}/2000</span>
              </div>
            </div>
          </div>

          <aside className="space-y-5 bg-[var(--bg-card-hover)] p-5">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--text-tertiary)]">Szybkie pytania</div>
              <div className="mt-4">
                <SuggestionGrid suggestions={suggestions} onPick={(prompt) => void sendPrompt(prompt)} />
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4">
              <div className="text-sm font-bold text-[var(--text-primary)]">Co potrafi teraz</div>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-[var(--text-secondary)]">
                <li>Analizuje produkty, statusy, błędy i kolejkę zadań.</li>
                <li>Pomaga dobrać import, AI draft i eksport marketplace.</li>
                <li>Sprawdza kredyty oraz podpowiada następny krok.</li>
                <li>Nie wykonuje mutacji bez przejścia przez właściwy ekran.</li>
              </ul>
              <ActionChips actions={actions} onOpen={(href) => router.push(href)} />
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
