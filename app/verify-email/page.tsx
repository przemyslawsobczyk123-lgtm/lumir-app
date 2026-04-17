"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function VerifyEmailContent() {
  const router = useRouter();
  const params = useSearchParams();
  const [state, setState] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const success = params.get("success");
    const token   = params.get("token");
    const name    = params.get("name");
    const error   = params.get("error");

    if (success && token) {
      // Store JWT and user from redirect
      fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(r => r.json())
        .then(data => {
          if (data.user) {
            localStorage.setItem("token", token);
            localStorage.setItem("user", JSON.stringify(data.user));
          }
        })
        .catch(() => {});
      setState("success");
      setMessage(name ? `Witaj, ${decodeURIComponent(name)}!` : "Email potwierdzony!");
    } else if (error) {
      setState("error");
      if (error === "invalid") setMessage("Link jest nieprawidłowy lub już został użyty.");
      else if (error === "missing") setMessage("Brak tokenu weryfikacyjnego.");
      else setMessage("Wystąpił błąd serwera.");
    } else {
      setState("error");
      setMessage("Nieprawidłowy link weryfikacyjny.");
    }
  }, [params]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#020617] relative overflow-hidden">
      <div className="absolute w-[500px] h-[500px] rounded-full bg-indigo-600/20 blur-[120px] top-[-100px] left-[-100px] pointer-events-none" />
      <div className="absolute w-[400px] h-[400px] rounded-full bg-purple-600/15 blur-[100px] bottom-[-80px] right-[-80px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-[420px] mx-4 text-center">
        {state === "loading" && (
          <>
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
              style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
              <svg className="animate-spin w-7 h-7 text-white" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
            </div>
            <p className="text-slate-400">Weryfikacja emaila…</p>
          </>
        )}

        {state === "success" && (
          <>
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
              style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)" }}>
              <svg viewBox="0 0 24 24" className="w-8 h-8 text-white" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <h1 className="text-2xl font-semibold text-white mb-2">{message}</h1>
            <p className="text-slate-400 text-sm mb-8">Twój email został potwierdzony. Możesz teraz się zalogować.</p>
            <button
              onClick={() => router.push("/dashboard")}
              className="w-full py-3 rounded-xl font-semibold text-white text-sm transition-all hover:scale-[1.02] shadow-lg mb-3"
              style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
            >
              Przejdź do panelu
            </button>
            <button
              onClick={() => router.push("/login")}
              className="w-full py-3 rounded-xl text-sm text-slate-400 hover:text-white transition border border-white/10 hover:border-white/20"
            >
              Zaloguj się
            </button>
          </>
        )}

        {state === "error" && (
          <>
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
              style={{ background: "linear-gradient(135deg, #ef4444, #dc2626)" }}>
              <svg viewBox="0 0 24 24" className="w-8 h-8 text-white" fill="none" stroke="currentColor" strokeWidth={2}>
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <h1 className="text-2xl font-semibold text-white mb-2">Weryfikacja nieudana</h1>
            <p className="text-slate-400 text-sm mb-8">{message}</p>
            <button
              onClick={() => router.push("/login")}
              className="w-full py-3 rounded-xl font-semibold text-white text-sm transition-all hover:scale-[1.02] shadow-lg"
              style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
            >
              Wróć do logowania
            </button>
          </>
        )}

        <p className="text-center text-slate-600 text-xs mt-8">© {new Date().getFullYear()} LuMir</p>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailContent />
    </Suspense>
  );
}
