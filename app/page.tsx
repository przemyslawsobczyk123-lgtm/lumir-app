"use client";

import { useEffect, useState } from "react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-[#020617] text-white overflow-x-hidden relative">

      {/* Ambient glows — identyczne jak login */}
      <div className="fixed w-[600px] h-[600px] rounded-full bg-indigo-600/20 blur-[130px] top-[-100px] left-[-100px] pointer-events-none" />
      <div className="fixed w-[500px] h-[500px] rounded-full bg-purple-600/15 blur-[110px] bottom-[-80px] right-[-80px] pointer-events-none" />
      <div className="fixed w-[400px] h-[400px] rounded-full bg-indigo-500/10 blur-[100px] top-[40%] left-[40%] pointer-events-none" />

      {/* NAV */}
      <nav className="fixed top-0 w-full px-10 py-5 backdrop-blur-xl bg-[#020617]/70 border-b border-white/5 z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
              <img src="/lumir-icon.svg" alt="LuMir" className="w-6 h-6" />
            </div>
            <span className="text-xl font-semibold tracking-wider"
              style={{ fontFamily: "var(--font-brand), Georgia, serif", letterSpacing: "0.06em" }}>
              LuMir
            </span>
          </div>
          <div className="flex items-center gap-3">
            <a href="/login"
              className="px-5 py-2 rounded-xl text-sm font-medium text-slate-300 hover:text-white border border-white/10 hover:border-white/20 hover:bg-white/5 transition-all duration-200">
              Zaloguj się
            </a>
            <a href="/register"
              className="px-5 py-2 rounded-xl text-sm font-semibold text-white transition-all duration-200 hover:scale-105 hover:shadow-lg hover:shadow-indigo-500/30"
              style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
              Zarejestruj się
            </a>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="min-h-screen flex items-center justify-center px-6 pt-20">
        <div className="max-w-6xl mx-auto w-full flex items-center justify-between gap-16">

          {/* Left */}
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-medium mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
              Generator ofert zasilany AI
            </div>

            <h1 className="text-5xl md:text-6xl font-bold leading-tight mb-6">
              AI tworzy
              <span className="block"
                style={{ background: "linear-gradient(135deg, #6366f1, #a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                Twoje oferty
              </span>
              sprzedażowe
            </h1>

            <p className="text-slate-400 text-lg leading-relaxed mb-10">
              Narzędzie dla sprzedawców Allegro i marketplace. Generuj opisy,
              atrybuty i kompletne oferty w kilka sekund dzięki AI.
            </p>

            <div className="flex gap-4 mb-10">
              <a href="/register"
                className="px-8 py-3.5 rounded-xl text-white font-semibold text-sm transition-all duration-200 hover:scale-105 hover:shadow-lg hover:shadow-indigo-500/30"
                style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
                Zacznij za darmo →
              </a>
              <a href="/login"
                className="px-8 py-3.5 rounded-xl text-sm font-medium text-slate-300 hover:text-white border border-white/10 hover:border-white/20 hover:bg-white/5 transition-all duration-200">
                Zaloguj się
              </a>
            </div>

            <div className="flex items-center gap-6 text-slate-500 text-sm">
              {["Bezpłatna rejestracja", "Hasła szyfrowane bcrypt", "Token JWT 7 dni"].map(f => (
                <div key={f} className="flex items-center gap-1.5">
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5}>
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  {f}
                </div>
              ))}
            </div>
          </div>

          {/* Right — AI card (styl jak login card) */}
          <div className="hidden lg:block w-[380px] flex-shrink-0">
            <AICard />
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-3 gap-6">
            {[
              { value: "+175%", label: "Wzrost sprzedaży" },
              { value: "10x", label: "Szybciej niż ręcznie" },
              { value: "100%", label: "Ofert gotowych do publikacji" },
            ].map(s => (
              <div key={s.label}
                className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 text-center hover:border-indigo-500/30 transition-all duration-300">
                <div className="text-4xl font-bold mb-2"
                  style={{ background: "linear-gradient(135deg, #6366f1, #a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  {s.value}
                </div>
                <div className="text-slate-400 text-sm">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Wszystko czego potrzebujesz
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto">
              Jeden panel — kompletny generator ofert dla sprzedawców marketplace.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: "🤖", title: "Opisy AI", desc: "Długie, zoptymalizowane opisy dopasowane do SEO i algorytmów marketplace." },
              { icon: "🏷️", title: "Atrybuty automatyczne", desc: "AI analizuje produkt i uzupełnia wszystkie brakujące pola i parametry." },
              { icon: "📦", title: "Gotowe oferty", desc: "Generuj kompletne oferty gotowe do publikacji na Allegro i innych platformach." },
            ].map(f => (
              <div key={f.title}
                className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 hover:border-indigo-500/30 hover:bg-white/8 transition-all duration-300 group">
                <div className="text-3xl mb-4">{f.icon}</div>
                <h3 className="text-white font-semibold text-lg mb-3 group-hover:text-indigo-300 transition-colors">{f.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-32 px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Gotowy zwiększyć sprzedaż?
            </h2>
            <p className="text-slate-400 mb-8">
              Dołącz do sprzedawców którzy oszczędzają godziny pracy każdego dnia.
            </p>
            <a href="/register"
              className="inline-block px-10 py-4 rounded-xl text-white font-semibold transition-all duration-200 hover:scale-105 hover:shadow-xl hover:shadow-indigo-500/30"
              style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
              Utwórz darmowe konto
            </a>
            <p className="text-slate-600 text-xs mt-6">
              Już masz konto? <a href="/login" className="text-indigo-400 hover:text-indigo-300 transition">Zaloguj się</a>
            </p>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/5 py-8 text-center text-slate-600 text-sm">
        © {new Date().getFullYear()} LuMir — Inteligentny generator ofert
      </footer>

    </div>
  );
}

const DEMOS = [
  {
    product: "Sony WH-1000XM5",
    category: "Słuchawki bezprzewodowe",
    output: "Tytuł: Sony WH-1000XM5 Słuchawki Bezprzewodowe ANC\n\nBluetooth 5.3 • ANC • 30h baterii • USB-C\n\nNowoczesne słuchawki z aktywną redukcją szumów klasy premium. Technologia Dual Noise Sensor zapewnia krystalicznie czysty dźwięk nawet w głośnym otoczeniu.",
  },
  {
    product: "iPhone 15 Pro Max 256GB",
    category: "Smartfony",
    output: "Tytuł: Apple iPhone 15 Pro Max 256GB Tytan Naturalny\n\nA17 Pro • 48Mpx • USB-C • 5G • ProMotion 120Hz\n\nNajpotężniejszy iPhone z chipem A17 Pro i systemem aparatów Pro. Titanowy design, ekran Super Retina XDR i wyjątkowa wydajność.",
  },
  {
    product: "Nike Air Max 270",
    category: "Obuwie sportowe",
    output: "Tytuł: Nike Air Max 270 Buty Sportowe Męskie Czarne\n\nRozmiary: 40-47 • Podeszwa Air Max • Mesh oddychający\n\nIkoniczne buty z największą poduszką Air w historii Nike. Lekka konstrukcja mesh zapewnia doskonałą wentylację i komfort przez cały dzień.",
  },
];

const STEPS = [
  "Analizuję produkt...",
  "Pobieram dane z bazy...",
  "Generuję tytuł SEO...",
  "Uzupełniam atrybuty...",
  "Tworzę opis HTML...",
  "Oferta gotowa!",
];

function AICard() {
  const [demoIdx, setDemoIdx]   = useState(0);
  const [step,    setStep]      = useState(0);
  const [typed,   setTyped]     = useState("");
  const [phase,   setPhase]     = useState<"steps"|"typing"|"done">("steps");

  useEffect(() => {
    let s = 0;
    setStep(0); setTyped(""); setPhase("steps");

    // Progress through steps
    const stepTimer = setInterval(() => {
      s++;
      setStep(s);
      if (s >= STEPS.length - 1) {
        clearInterval(stepTimer);
        setPhase("typing");
      }
    }, 600);

    return () => clearInterval(stepTimer);
  }, [demoIdx]);

  useEffect(() => {
    if (phase !== "typing") return;
    const text = DEMOS[demoIdx].output;
    let i = 0;
    const t = setInterval(() => {
      i++;
      setTyped(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(t);
        setPhase("done");
        // After 3s pause, move to next demo
        setTimeout(() => setDemoIdx(d => (d + 1) % DEMOS.length), 3000);
      }
    }, 16);
    return () => clearInterval(t);
  }, [phase, demoIdx]);

  const demo = DEMOS[demoIdx];

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 border-b border-white/10 flex items-center justify-between"
        style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.08))" }}>
        <div>
          <div className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">Produkt</div>
          <div className="text-white text-sm font-medium">{demo.product}</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">Kategoria</div>
          <div className="text-indigo-400 text-xs">{demo.category}</div>
        </div>
      </div>

      {/* Steps */}
      <div className="px-5 py-4 border-b border-white/10 space-y-2">
        {STEPS.map((l, i) => {
          const done    = i < step;
          const active  = i === step;
          const pending = i > step;
          return (
            <div key={l} className={`flex items-center gap-2.5 text-xs transition-all duration-300 ${
              done ? "text-slate-400" : active ? "text-indigo-300" : "text-slate-700"
            }`}>
              <span className="w-4 h-4 flex-shrink-0 flex items-center justify-center">
                {done
                  ? <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-green-400" fill="none" stroke="currentColor" strokeWidth={3}><polyline points="20 6 9 17 4 12"/></svg>
                  : active
                    ? <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                    : <span className="w-1.5 h-1.5 rounded-full bg-slate-700" />
                }
              </span>
              <span className={active ? "font-medium" : ""}>{l}</span>
              {active && <span className="ml-auto text-indigo-500 text-[10px] animate-pulse">●●●</span>}
            </div>
          );
        })}
      </div>

      {/* Output */}
      <div className="px-5 py-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs text-slate-500 uppercase tracking-wider">Wynik AI</div>
          {phase === "done" && (
            <span className="text-[10px] text-green-400 font-medium flex items-center gap-1">
              <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5}><polyline points="20 6 9 17 4 12"/></svg>
              Gotowe
            </span>
          )}
        </div>
        <div className="text-slate-300 text-xs leading-relaxed whitespace-pre-line min-h-[96px]">
          {typed || <span className="text-slate-700">Oczekiwanie na wynik...</span>}
          {phase === "typing" && (
            <span className="inline-block w-0.5 h-3 bg-indigo-400 animate-pulse ml-0.5 align-middle" />
          )}
        </div>
      </div>

      {/* Demo dots */}
      <div className="px-5 pb-4 flex items-center justify-center gap-1.5">
        {DEMOS.map((_, i) => (
          <span key={i} className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
            i === demoIdx ? "bg-indigo-400 w-4" : "bg-slate-700"
          }`} />
        ))}
      </div>
    </div>
  );
}
