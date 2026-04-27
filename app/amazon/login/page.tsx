"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import {
  buildAmazonAuthContinueRequest,
  parseAmazonWebsiteAuthorizationSearchParams,
  readLuMirAuthToken,
} from "../../dashboard/_lib/amazon-seller";
import { isAmazonUiEnabled } from "../../dashboard/mvp-feature-flags";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
const AMAZON_UI_ENABLED = isAmazonUiEnabled();

type BridgeState = "loading" | "redirecting" | "error";

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function AmazonLoginBridgeContent() {
  const searchParams = useSearchParams();
  const [state, setState] = useState<BridgeState>("loading");
  const [message, setMessage] = useState("Laczenie z Amazon...");

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!AMAZON_UI_ENABLED) {
        window.location.replace("/dashboard");
        return;
      }

      const parsed = parseAmazonWebsiteAuthorizationSearchParams(searchParams);
      if (!parsed.ok) {
        setState("error");
        setMessage(parsed.error);
        return;
      }

      const token = readLuMirAuthToken();
      if (!token) {
        setState("error");
        setMessage("Brak tokenu LuMir. Zaloguj sie ponownie i sprobuj jeszcze raz.");
        return;
      }

      try {
        const request = buildAmazonAuthContinueRequest({
          apiBaseUrl: API,
          token,
          ...parsed.value,
        });

        const response = await fetch(request.url, request.init);
        const data = await response.json().catch(() => ({} as Record<string, unknown>));

        if (!response.ok) {
          throw new Error(String(data.error || "Nie udalo sie kontynuowac autoryzacji Amazon"));
        }

        const nextUrl = typeof data.url === "string" ? data.url : "";
        if (!nextUrl) {
          throw new Error("Backend nie zwrocil adresu kontynuacji Amazon");
        }

        if (cancelled) return;
        setState("redirecting");
        window.location.replace(nextUrl);
      } catch (error) {
        if (cancelled) return;
        setState("error");
        setMessage(getErrorMessage(error, "Nie udalo sie polaczyc z Amazon"));
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  if (!AMAZON_UI_ENABLED) {
    return <div className="min-h-screen bg-[#020617]" />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#020617] relative overflow-hidden px-4">
      <div className="absolute w-[520px] h-[520px] rounded-full bg-indigo-600/20 blur-[130px] top-[-120px] left-[-120px] pointer-events-none" />
      <div className="absolute w-[420px] h-[420px] rounded-full bg-purple-600/15 blur-[110px] bottom-[-100px] right-[-100px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-[460px]">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-6" style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
            <svg viewBox="0 0 24 24" className="w-7 h-7 text-white" fill="none" stroke="currentColor" strokeWidth={2.2}>
              <path d="M12 3c4.97 0 9 3.58 9 8 0 2.63-1.47 4.98-3.75 6.47L18 21l-3.93-1.47c-.65.14-1.33.22-2.07.22-4.97 0-9-3.58-9-8s4.03-8 9-8z" />
            </svg>
          </div>

          {state === "loading" && (
            <>
              <h1 className="text-2xl font-semibold text-white mb-2">Autoryzacja Amazon</h1>
              <p className="text-slate-400 text-sm mb-6">{message}</p>
              <div className="flex items-center gap-3 text-sm text-slate-300">
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              <span>Sprawdzanie danych...</span>
              </div>
            </>
          )}

          {state === "redirecting" && (
            <>
              <h1 className="text-2xl font-semibold text-white mb-2">Przekierowanie do Amazon</h1>
              <p className="text-slate-400 text-sm mb-6">Za chwile otworzy sie kolejny etap autoryzacji.</p>
              <div className="flex items-center gap-3 text-sm text-slate-300">
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span>Przekierowywanie...</span>
              </div>
            </>
          )}

          {state === "error" && (
            <>
              <h1 className="text-2xl font-semibold text-white mb-2">Autoryzacja nieudana</h1>
              <p className="text-slate-400 text-sm mb-6">{message}</p>
              <button
                type="button"
                onClick={() => window.location.assign("/dashboard")}
                className="w-full py-3 rounded-xl font-semibold text-white text-sm transition-all duration-200 hover:scale-[1.02]"
                style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
              >
                Wroc do panelu
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AmazonLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#020617]" />}>
      <AmazonLoginBridgeContent />
    </Suspense>
  );
}
