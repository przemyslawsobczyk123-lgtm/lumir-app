"use client";

import { useEffect, useRef, useState } from "react";

/* ─────────────────────────────────────────────────────────────
   Smooth anchor scroll with 80px sticky-nav offset
───────────────────────────────────────────────────────────── */
function scrollTo(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const y = el.getBoundingClientRect().top + window.scrollY - 80;
  window.scrollTo({ top: y, behavior: "smooth" });
}

/* ─────────────────────────────────────────────────────────────
   IntersectionObserver hook for scroll animations
───────────────────────────────────────────────────────────── */
function useScrollReveal() {
  useEffect(() => {
    const els = document.querySelectorAll("[data-animate]");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("visible");
            observer.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
}

/* ─────────────────────────────────────────────────────────────
   Inline SVG icons
───────────────────────────────────────────────────────────── */
function IconSparkle({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path d="M12 3v2m0 14v2M3 12h2m14 0h2m-4.22-6.78-1.42 1.42M6.64 17.36l-1.42 1.42m0-12.02 1.42 1.42m10.72 10.72 1.42 1.42M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function IconTag({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M6 6h.008v.008H6V6Z" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function IconSearch({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function IconDatabase({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 2.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125m16.5 5.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function IconDownload({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function IconGrid({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function IconCheck({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  );
}
function IconArrowRight({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────────
   AICard — animated demo (preserved from original)
───────────────────────────────────────────────────────────── */
const DEMOS = [
  {
    product: "Sony WH-1000XM5",
    category: "Słuchawki bezprzewodowe",
    output:
      "Tytuł: Sony WH-1000XM5 Słuchawki Bezprzewodowe ANC\n\nBluetooth 5.3 • ANC • 30h baterii • USB-C\n\nNowoczesne słuchawki z aktywną redukcją szumów klasy premium. Technologia Dual Noise Sensor zapewnia krystalicznie czysty dźwięk nawet w głośnym otoczeniu.",
  },
  {
    product: "iPhone 15 Pro Max 256GB",
    category: "Smartfony",
    output:
      "Tytuł: Apple iPhone 15 Pro Max 256GB Tytan Naturalny\n\nA17 Pro • 48Mpx • USB-C • 5G • ProMotion 120Hz\n\nNajpotężniejszy iPhone z chipem A17 Pro i systemem aparatów Pro. Titanowy design, ekran Super Retina XDR i wyjątkowa wydajność.",
  },
  {
    product: "Nike Air Max 270",
    category: "Obuwie sportowe",
    output:
      "Tytuł: Nike Air Max 270 Buty Sportowe Męskie Czarne\n\nRozmiary: 40-47 • Podeszwa Air Max • Mesh oddychający\n\nIkoniczne buty z największą poduszką Air w historii Nike. Lekka konstrukcja mesh zapewnia doskonałą wentylację i komfort przez cały dzień.",
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
  const [demoIdx, setDemoIdx] = useState(0);
  const [step, setStep] = useState(0);
  const [typed, setTyped] = useState("");
  const [phase, setPhase] = useState<"steps" | "typing" | "done">("steps");

  useEffect(() => {
    let s = 0;
    setStep(0);
    setTyped("");
    setPhase("steps");
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
        setTimeout(() => setDemoIdx((d) => (d + 1) % DEMOS.length), 3000);
      }
    }, 16);
    return () => clearInterval(t);
  }, [phase, demoIdx]);

  const demo = DEMOS[demoIdx];

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
      <div
        className="px-5 py-3 border-b border-white/10 flex items-center justify-between"
        style={{
          background:
            "linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.08))",
        }}
      >
        <div>
          <div className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">Produkt</div>
          <div className="text-white text-sm font-medium">{demo.product}</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">Kategoria</div>
          <div className="text-indigo-400 text-xs">{demo.category}</div>
        </div>
      </div>

      <div className="px-5 py-4 border-b border-white/10 space-y-2">
        {STEPS.map((l, i) => {
          const done = i < step;
          const active = i === step;
          return (
            <div
              key={l}
              className={`flex items-center gap-2.5 text-xs transition-all duration-300 ${
                done ? "text-slate-400" : active ? "text-indigo-300" : "text-slate-700"
              }`}
            >
              <span className="w-4 h-4 flex-shrink-0 flex items-center justify-center">
                {done ? (
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-green-400" fill="none" stroke="currentColor" strokeWidth={3}>
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : active ? (
                  <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-700" />
                )}
              </span>
              <span className={active ? "font-medium" : ""}>{l}</span>
              {active && (
                <span className="ml-auto text-indigo-500 text-[10px] animate-pulse">●●●</span>
              )}
            </div>
          );
        })}
      </div>

      <div className="px-5 py-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs text-slate-500 uppercase tracking-wider">Wynik AI</div>
          {phase === "done" && (
            <span className="text-[10px] text-green-400 font-medium flex items-center gap-1">
              <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <polyline points="20 6 9 17 4 12" />
              </svg>
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

      <div className="px-5 pb-4 flex items-center justify-center gap-1.5">
        {DEMOS.map((_, i) => (
          <span
            key={i}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === demoIdx ? "bg-indigo-400 w-4" : "bg-slate-700 w-1.5"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Lamp SVG illustration (desk lamp, clean vs. room background)
───────────────────────────────────────────────────────────── */
function LampIllustration({ clean }: { clean: boolean }) {
  const arm   = clean ? "#374151" : "#1c1308";
  const joint = clean ? "#4b5563" : "#231a0c";
  const shade = clean ? "#f3f4f6" : "#eee8dc";
  const inner = clean ? "#ffffff"  : "#fdf5e4";
  const base  = clean ? "#9ca3af" : "#100e08";

  return (
    <svg viewBox="0 0 200 310" className="relative z-10 w-44 h-64" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Base */}
      <ellipse cx="100" cy="293" rx="50" ry="13" fill={base} />
      {/* Pole + arms */}
      <path d="M100 293 L100 198 L72 126 L108 58" stroke={arm} strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
      {/* Joints */}
      <circle cx="100" cy="198" r="9" fill={joint} />
      <circle cx="72"  cy="126" r="9" fill={joint} />
      <circle cx="108" cy="58"  r="9" fill={joint} />
      {/* Shade outer */}
      <path d="M84 50 L54 106 L163 106 L133 50 Z" fill={shade} stroke={clean ? "#d1d5db" : "#c4bfb0"} strokeWidth="1.5" />
      {/* Shade inner reflector */}
      <path d="M88 55 L60 102 L158 102 L130 55 Z" fill={inner} />
      {/* Bulb */}
      <ellipse cx="109" cy="79" rx="10" ry="12" fill="rgba(255,225,70,0.95)" />
      <ellipse cx="109" cy="76" rx="5"  ry="6"  fill="rgba(255,255,200,0.95)" />
      {/* Light cone */}
      <path d="M56 106 L24 292 L182 292 L150 106 Z" fill={clean ? "rgba(255,235,100,0.05)" : "rgba(255,200,50,0.15)"} />
      {/* Warm floor glow (room only) */}
      {!clean && <ellipse cx="103" cy="278" rx="58" ry="13" fill="rgba(255,175,30,0.18)" />}
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────────
   BeforeAfterSlider — auto-plays, drag to control
───────────────────────────────────────────────────────────── */
function BeforeAfterSlider() {
  const [pos, setPos]   = useState(22);
  const containerRef    = useRef<HTMLDivElement>(null);
  const dragging        = useRef(false);
  const animDir         = useRef(1);   // 1 = right (revealing PO), -1 = left
  const pauseUntil      = useRef(0);

  /* Auto-animation via requestAnimationFrame */
  useEffect(() => {
    let rafId: number;
    function frame(time: number) {
      if (!dragging.current && time > pauseUntil.current) {
        setPos(prev => {
          const next = prev + 0.22 * animDir.current;
          if (next >= 82) { animDir.current = -1; pauseUntil.current = time + 2200; return 82; }
          if (next <= 18) { animDir.current =  1; pauseUntil.current = time + 2200; return 18; }
          return next;
        });
      }
      rafId = requestAnimationFrame(frame);
    }
    rafId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafId);
  }, []);

  /* Drag handling */
  useEffect(() => {
    function onMove(e: MouseEvent | TouchEvent) {
      if (!dragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
      setPos(Math.round((x / rect.width) * 100));
    }
    function onUp() { dragging.current = false; }
    window.addEventListener("mousemove",  onMove);
    window.addEventListener("mouseup",    onUp);
    window.addEventListener("touchmove",  onMove, { passive: true });
    window.addEventListener("touchend",   onUp);
    return () => {
      window.removeEventListener("mousemove",  onMove);
      window.removeEventListener("mouseup",    onUp);
      window.removeEventListener("touchmove",  onMove);
      window.removeEventListener("touchend",   onUp);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative rounded-2xl overflow-hidden border border-white/10 select-none"
      style={{ cursor: "col-resize", height: "460px" }}
      onMouseDown={() => { dragging.current = true; }}
      onTouchStart={() => { dragging.current = true; }}
    >
      {/* ── PO LUMIRAI — białe tło, gotowe do marketplace ── */}
      <div className="absolute inset-0 flex items-center justify-center overflow-hidden" style={{ background: "#f8f9fa" }}>
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 80% 50% at 50% 100%, rgba(200,200,230,0.35) 0%, #f8f9fa 55%)" }} />
        {/* Shadow pod produktem */}
        <div className="absolute bottom-14 left-1/2 -translate-x-1/2 w-28 h-5 rounded-full" style={{ background: "#000", opacity: 0.12, filter: "blur(14px)" }} />
        <LampIllustration clean />
        <div className="absolute top-5 right-5 text-[9px] font-bold px-2.5 py-1 rounded text-white tracking-widest" style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>PO LUMIRAI</div>
        <div className="absolute bottom-5 right-5 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
          <span className="text-[10px] text-slate-500 font-medium">Białe tło · gotowe do marketplace</span>
        </div>
      </div>

      {/* ── PRZED — zdjęcie w pokoju, surowe ── */}
      <div className="absolute inset-0 overflow-hidden" style={{ width: `${pos}%` }}>
        <div className="absolute inset-0 flex items-center justify-center" style={{ background: "#1c1409", minWidth: "640px" }}>
          {/* Tło pokoju */}
          <div className="absolute inset-0" style={{ background: "linear-gradient(155deg,#2d1f10 0%,#110d07 45%,#1a1208 100%)" }} />
          {/* Światło z okna */}
          <div className="absolute top-0 right-0 w-72 h-72 rounded-full opacity-25" style={{ background: "radial-gradient(circle,rgba(240,200,120,0.7) 0%,transparent 70%)", filter: "blur(50px)" }} />
          {/* Blat */}
          <div className="absolute bottom-0 left-0 right-0 h-1/3" style={{ background: "linear-gradient(180deg,#2a1c0e 0%,#191008 100%)" }} />
          {/* Książki */}
          <div className="absolute" style={{ bottom: "28%", left: 40, width: 52, height: 72, background: "linear-gradient(150deg,#8b1a1a,#5a1010)", borderRadius: 3, transform: "rotate(-4deg)", opacity: 0.65 }} />
          <div className="absolute" style={{ bottom: "28%", left: 88, width: 38, height: 60, background: "linear-gradient(150deg,#1a3a8b,#0f2060)", borderRadius: 3, transform: "rotate(2deg)", opacity: 0.65 }} />
          <div className="absolute" style={{ bottom: "28%", left: 124, width: 30, height: 52, background: "linear-gradient(150deg,#2a6b2a,#1a4a1a)", borderRadius: 3, transform: "rotate(-1deg)", opacity: 0.55 }} />
          {/* Kubek */}
          <div className="absolute" style={{ bottom: "28%", right: 64, width: 36, height: 44, background: "#3a2a1a", border: "2px solid #4a3a2a", borderRadius: "4px 4px 50% 50%", opacity: 0.55 }} />
          {/* Kartka */}
          <div className="absolute" style={{ bottom: "29%", right: 16, width: 68, height: 14, background: "#e4d9c0", borderRadius: 2, transform: "rotate(2deg)", opacity: 0.4 }} />
          <LampIllustration clean={false} />
          <div className="absolute top-5 left-5 text-[9px] font-bold px-2.5 py-1 rounded tracking-widest" style={{ background: "rgba(0,0,0,0.5)", color: "#cbd5e1" }}>PRZED</div>
          <div className="absolute bottom-5 left-5 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-orange-400 flex-shrink-0" />
            <span className="text-[10px] text-slate-500 font-medium">Oryginalne zdjęcie sprzedawcy</span>
          </div>
        </div>
      </div>

      {/* Linia podziału */}
      <div className="absolute top-0 bottom-0 w-px z-10" style={{ left: `${pos}%`, background: "rgba(255,255,255,0.6)", boxShadow: "0 0 10px rgba(255,255,255,0.4)" }} />

      {/* Uchwyt */}
      <div
        className="absolute top-1/2 z-20 -translate-y-1/2 -translate-x-1/2 w-11 h-11 rounded-full bg-white shadow-2xl flex items-center justify-center"
        style={{ left: `${pos}%`, cursor: "col-resize" }}
      >
        <svg viewBox="0 0 24 24" className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" strokeWidth={2.5}>
          <path d="M9 18l-6-6 6-6M15 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Main page
───────────────────────────────────────────────────────────── */
export default function Landing() {
  useScrollReveal();

  return (
    <div className="min-h-screen bg-white text-gray-900 overflow-x-hidden relative">

      {/* Subtle global ambient on white bg */}
      <div className="fixed w-[700px] h-[700px] rounded-full pointer-events-none z-0" style={{ background: "radial-gradient(circle, rgba(99,102,241,0.05) 0%, transparent 70%)", bottom: "-300px", right: "-200px", filter: "blur(80px)" }} />

      {/* ── NAV ─────────────────────────────────────────────── */}
      <nav className="fixed top-0 w-full z-50 backdrop-blur-xl bg-white/95 border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M13 10V3L4 14h7v7l9-11h-7Z" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span
              className="text-xl font-semibold tracking-wide text-gray-900"
              style={{ fontFamily: "var(--font-brand, ‘Georgia’, serif)", letterSpacing: "0.06em" }}
            >
              LuMir
            </span>
          </div>

          {/* Center nav */}
          <div className="hidden md:flex items-center gap-8">
            {[
              { label: "Jak działa", id: "jak-dziala" },
              { label: "Funkcje", id: "funkcje" },
              { label: "Cennik", id: "cennik" },
            ].map(({ label, id }) => (
              <button
                key={id}
                onClick={() => scrollTo(id)}
                className="text-sm text-gray-500 hover:text-gray-900 transition-colors duration-200"
              >
                {label}
              </button>
            ))}
          </div>

          {/* Right CTAs */}
          <div className="flex items-center gap-3">
            <a
              href="/login"
              className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 hover:text-gray-900 border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all duration-200"
            >
              Zaloguj się
            </a>
            <a
              href="/register"
              className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all duration-200 hover:scale-105 hover:shadow-lg hover:shadow-indigo-500/30"
              style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
            >
              Zacznij za darmo →
            </a>
          </div>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────────── */}
      <section id="hero" className="relative min-h-screen flex items-center px-6 pt-20 overflow-hidden">

        {/* Bokeh orbs — softer on white bg */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute w-[650px] h-[650px] rounded-full" style={{ background: "radial-gradient(circle, rgba(139,92,246,0.14) 0%, transparent 65%)", top: "-220px", left: "-180px", filter: "blur(80px)" }} />
          <div className="absolute w-[520px] h-[520px] rounded-full" style={{ background: "radial-gradient(circle, rgba(249,115,22,0.10) 0%, transparent 65%)", top: "80px", right: "-120px", filter: "blur(100px)" }} />
          <div className="absolute w-[420px] h-[420px] rounded-full" style={{ background: "radial-gradient(circle, rgba(236,72,153,0.09) 0%, transparent 65%)", bottom: "-60px", left: "35%", filter: "blur(90px)" }} />
          <div className="absolute w-[280px] h-[280px] rounded-full" style={{ background: "radial-gradient(circle, rgba(99,102,241,0.11) 0%, transparent 65%)", top: "45%", left: "55%", filter: "blur(60px)" }} />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto w-full flex flex-col lg:flex-row items-center justify-between gap-16 py-24">

          {/* Left copy */}
          <div className="max-w-2xl">
            {/* Badge */}
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-indigo-200 bg-indigo-50 text-indigo-600 text-xs font-medium mb-8"
              data-animate
            >
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
              Generator ofert zasilany AI
            </div>

            {/* H1 */}
            <h1
              className="text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.05] tracking-tight mb-6 text-gray-900"
              data-animate
              data-animate-delay="1"
            >
              Twoje oferty{" "}
              <span style={{ background: "linear-gradient(135deg, #f97316, #fb923c)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>generowane</span>
              <br />
              <span style={{ background: "linear-gradient(135deg, #6366f1, #a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                przez AI.
              </span>
            </h1>

            {/* Subheadline */}
            <p
              className="text-gray-500 text-lg leading-relaxed mb-10 max-w-xl"
              data-animate
              data-animate-delay="2"
            >
              Wgraj plik produktów, wybierz marketplace. AI uzupełni opisy,
              atrybuty i wyeksportuje gotowy plik Mirakl w minuty.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap gap-4 mb-10" data-animate data-animate-delay="3">
              <a
                href="/register"
                className="px-8 py-3.5 rounded-xl text-white font-semibold text-sm transition-all duration-200 hover:scale-[1.02] hover:shadow-lg hover:shadow-indigo-500/30"
                style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
              >
                Zacznij za darmo →
              </a>
              <button
                onClick={() => scrollTo("jak-dziala")}
                className="px-8 py-3.5 rounded-xl text-sm font-medium text-gray-600 hover:text-gray-900 border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all duration-200"
              >
                Zobacz jak działa ↓
              </button>
            </div>

            {/* Trust row */}
            <div className="flex flex-wrap items-center gap-6 text-gray-500 text-sm" data-animate data-animate-delay="4">
              {["Bezpłatna rejestracja", "Pierwsze generacje gratis", "Bez karty kredytowej"].map((f) => (
                <div key={f} className="flex items-center gap-1.5">
                  <IconCheck className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                  {f}
                </div>
              ))}
            </div>
          </div>

          {/* Right — AI demo card */}
          <div className="hidden lg:block w-[380px] flex-shrink-0" data-animate data-animate-delay="2">
            <AICard />
          </div>
        </div>
      </section>

      {/* ── LOGOS BAR ────────────────────────────────────────── */}
      <section className="py-16 px-6 border-t border-gray-100">
        <div className="max-w-6xl mx-auto">
          <p className="text-xs uppercase tracking-widest text-gray-400 text-center mb-8" data-animate>
            Obsługiwane marketplace&apos;y
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3" data-animate data-animate-delay="1">
            {["Media Expert", "Allegro", "Empik", "Decathlon", "X-Kom", "Amazon"].map((name) => (
              <div
                key={name}
                className="px-6 py-3 rounded-xl border border-gray-200 text-gray-500 text-sm font-semibold hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 transition-all duration-200 cursor-default"
              >
                {name}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── STATS ────────────────────────────────────────────── */}
      <section id="stats" className="py-32 px-6 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-gray-200 rounded-2xl overflow-hidden shadow-sm">
            {[
              { value: "10x", label: "Szybciej niż ręcznie" },
              { value: "6", label: "Źródeł danych AI" },
              { value: "5+", label: "Marketplace’ów" },
              { value: "150+", label: "Mapowań kolumn" },
            ].map(({ value, label }, i) => (
              <div
                key={label}
                className="bg-slate-50 px-10 py-16 text-center"
                data-animate
                data-animate-delay={String(i + 1) as "1" | "2" | "3" | "4"}
              >
                <div
                  className="text-6xl font-black mb-3 tabular-nums"
                  style={{ background: "linear-gradient(135deg, #6366f1, #a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
                >
                  {value}
                </div>
                <div className="text-gray-500 text-sm tracking-wide">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────── */}
      <section id="jak-dziala" className="py-40 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-24" data-animate>
            <p className="eyebrow">Jak to działa</p>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 tracking-tight">
              Trzy kroki do gotowej oferty
            </h2>
          </div>

          <div className="space-y-24">
            {[
              { num: "01", title: "Wgraj plik produktów", desc: "Excel lub CSV z Twoimi produktami. LuMir automatycznie rozpoznaje kolumny i mapuje dane — ponad 150 wariantów nazw kolumn.", align: "left" },
              { num: "02", title: "Wybierz marketplace i kategorię", desc: "Allegro, Media Expert, Empik i inne. Każdy marketplace ma własny szablon Mirakl z wymaganymi polami i dozwolonymi wartościami.", align: "right" },
              { num: "03", title: "Pobierz gotowy plik", desc: "AI uzupełnia brakujące pola, generuje opisy HTML i eksportuje plik gotowy do wgrania na marketplace. Jednym kliknięciem.", align: "left" },
            ].map(({ num, title, desc, align }) => (
              <div key={num} className={`flex flex-col ${align === "right" ? "lg:flex-row-reverse" : "lg:flex-row"} items-center gap-16`} data-animate>
                <div className="flex-1 flex items-center justify-center">
                  <span
                    className="text-[10rem] font-black leading-none select-none"
                    style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.18), rgba(139,92,246,0.08))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
                  >
                    {num}
                  </span>
                </div>
                <div className="flex-1 max-w-lg">
                  <h3 className="text-3xl font-bold text-gray-900 mb-4 tracking-tight">{title}</h3>
                  <p className="text-gray-500 text-lg leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────── */}
      <section id="funkcje" className="py-40 px-6 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20" data-animate>
            <p className="eyebrow">Funkcje</p>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 tracking-tight">
              AI na każdym etapie generowania
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { Icon: IconSparkle, title: "Opisy produktów AI",  desc: "GPT-4o-mini generuje długie opisy HTML dopasowane do SEO i wymagań każdego marketplace.", delay: "1" },
              { Icon: IconTag,     title: "Auto-atrybuty",       desc: "150+ mapowań kolumn. AI rozpoznaje i uzupełnia wszystkie wymagane pola — nawet niestandardowe.", delay: "2" },
              { Icon: IconSearch,  title: "Dane z Allegro",      desc: "Batch EAN lookup przez oficjalne Allegro API. Cache 7 dni — błyskawiczne wyniki bez limitów.", delay: "3" },
              { Icon: IconDatabase,title: "Icecat enrichment",   desc: "Specyfikacje techniczne z globalnej bazy Icecat dla tysięcy marek i modeli produktów.", delay: "4" },
              { Icon: IconDownload,title: "Gotowy plik Mirakl",  desc: "Excel zgodny ze standardem Mirakl, gotowy do wgrania jednym kliknięciem. Zero ręcznej pracy.", delay: "5" },
              { Icon: IconGrid,    title: "Multi-marketplace",   desc: "Jeden panel, sześć platform. Każdy marketplace ma własny szablon i reguły walidacji.", delay: "1" },
            ].map(({ Icon, title, desc, delay }) => (
              <div
                key={title}
                className="relative group bg-white rounded-2xl p-8 border border-gray-100 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-500/8 transition-all duration-300 overflow-hidden"
                data-animate
                data-animate-delay={delay as "1" | "2" | "3" | "4" | "5"}
              >
                <div className="absolute top-0 left-0 right-0 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: "linear-gradient(90deg, transparent, #6366f1, transparent)" }} />
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-5" style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.15)" }}>
                  <Icon className="w-5 h-5 text-indigo-500" />
                </div>
                <h3 className="text-gray-900 font-semibold text-lg mb-3 group-hover:text-indigo-600 transition-colors duration-200">{title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BEFORE / AFTER ───────────────────────────────────── */}
      <section className="py-40 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16" data-animate>
            <p className="eyebrow">Zdjęcia produktowe AI</p>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 tracking-tight mb-4">
              Masz 10–15 sekund.<br />
              <span style={{ background: "linear-gradient(135deg, #6366f1, #a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                Każdy piksel musi pracować.
              </span>
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              AI usuwa tło, czyści zdjęcia i przygotowuje je zgodnie ze standardami każdego marketplace.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2 mb-10" data-animate data-animate-delay="1">
            {["Usuwanie tła", "Białe tło", "Standard marketplace", "Cichy kadr", "Auto-retusz"].map(label => (
              <span key={label} className="px-3 py-1.5 rounded-full text-xs font-medium border border-indigo-200 text-indigo-600 bg-indigo-50">{label}</span>
            ))}
          </div>
          <p className="text-center text-gray-400 text-xs mb-4" data-animate data-animate-delay="2">
            Animacja automatyczna · przeciągnij suwak aby sterować
          </p>
          <div data-animate data-animate-delay="2"><BeforeAfterSlider /></div>
        </div>
      </section>

      {/* ── AI PIPELINE ──────────────────────────────────────── */}
      <section className="py-40 px-6 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20" data-animate>
            <p className="eyebrow">Silnik AI</p>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 tracking-tight">
              Pięcioetapowy pipeline
            </h2>
            <p className="text-gray-500 mt-4 max-w-xl mx-auto">
              Każdy produkt przechodzi przez pięć warstw wzbogacania danych zanim trafi do pliku wynikowego.
            </p>
          </div>

          <div className="flex flex-col lg:flex-row items-start lg:items-stretch gap-0" data-animate data-animate-delay="1">
            {[
              { num: "1", name: "Direct",    desc: "Mapowanie kolumn z pliku Excel",        active: true  },
              { num: "2", name: "Allegro",   desc: "EAN lookup, dane z API (cache 7 dni)",  active: false },
              { num: "3", name: "Icecat",    desc: "Specyfikacje techniczne produktów",     active: false },
              { num: "4", name: "Gemini AI", desc: "Uzupełnienie brakujących atrybutów",    active: false },
              { num: "5", name: "Opis HTML", desc: "GPT-4o-mini generuje pełny opis",       active: false },
            ].map(({ num, name, desc, active }, idx, arr) => (
              <div key={name} className="flex lg:flex-col flex-1 items-start lg:items-stretch">
                <div className={`flex-1 rounded-2xl p-6 border transition-all duration-200 ${active ? "border-indigo-300 bg-indigo-50" : "border-gray-200 bg-white"}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold mb-4 ${active ? "bg-indigo-500 text-white" : "bg-gray-100 text-gray-500"}`}>
                    {num}
                  </div>
                  <div className={`font-semibold text-sm mb-1.5 ${active ? "text-indigo-600" : "text-gray-700"}`}>{name}</div>
                  <div className="text-gray-400 text-xs leading-relaxed">{desc}</div>
                </div>
                {idx < arr.length - 1 && (
                  <div className="flex items-center justify-center px-2 py-4 lg:py-0 lg:px-0 lg:my-auto">
                    <IconArrowRight className="w-4 h-4 text-gray-300 rotate-90 lg:rotate-0" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ──────────────────────────────────────────── */}
      <section id="cennik" className="py-40 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-6" data-animate>
            <p className="eyebrow">Cennik</p>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 tracking-tight">
              Płać za efekty, nie subskrypcje
            </h2>
          </div>
          <p className="text-center text-gray-500 mb-16" data-animate data-animate-delay="1">
            System kredytów — generujesz tyle ile potrzebujesz
          </p>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* Starter */}
            <div className="rounded-2xl p-10 border border-gray-200 flex flex-col bg-white shadow-sm" data-animate data-animate-delay="1">
              <div className="mb-8">
                <div className="text-gray-400 text-xs uppercase tracking-widest mb-2">Starter</div>
                <div className="text-4xl font-bold text-gray-900 mb-1">Zacznij za darmo</div>
                <div className="text-gray-500 text-sm">Pierwsze generacje gratis</div>
              </div>
              <ul className="space-y-3 mb-10 flex-1">
                {["Generator ofert", "Multi-marketplace", "AI opisy", "Eksport Mirakl"].map((f) => (
                  <li key={f} className="flex items-center gap-3 text-gray-700 text-sm">
                    <IconCheck className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <a
                href="/register"
                className="block text-center py-3.5 rounded-xl font-semibold text-sm border border-indigo-300 text-indigo-600 hover:bg-indigo-50 hover:border-indigo-400 transition-all duration-200"
              >
                Utwórz konto →
              </a>
            </div>

            {/* Pro */}
            <div
              className="rounded-2xl p-10 border flex flex-col relative overflow-hidden shadow-lg"
              style={{ background: "linear-gradient(145deg, #f5f3ff, #ede9fe)", borderColor: "rgba(99,102,241,0.25)" }}
              data-animate
              data-animate-delay="2"
            >
              <div className="absolute top-0 right-0 w-64 h-64 rounded-full blur-[80px] opacity-30 pointer-events-none" style={{ background: "radial-gradient(circle, #a78bfa, transparent)" }} />
              <div className="mb-8 relative">
                <div className="text-indigo-500 text-xs uppercase tracking-widest mb-2">Pro</div>
                <div className="text-4xl font-bold text-gray-900 mb-1">Kup kredyty</div>
                <div className="text-gray-600 text-sm">Skaluj według potrzeb</div>
              </div>
              <ul className="space-y-3 mb-10 flex-1 relative">
                {["Wszystko ze Startera", "Allegro API", "Icecat enrichment", "Priorytetowe AI", "Historia i ulubione"].map((f) => (
                  <li key={f} className="flex items-center gap-3 text-gray-700 text-sm">
                    <IconCheck className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <a
                href="/register"
                className="relative block text-center py-3.5 rounded-xl font-semibold text-white text-sm transition-all duration-200 hover:scale-[1.02] hover:shadow-lg hover:shadow-indigo-500/30"
                style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
              >
                Zacznij za darmo →
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ─────────────────────────────────────────── */}
      <section className="py-40 px-6 text-center bg-slate-50">
        <div className="max-w-3xl mx-auto" data-animate>
          <p className="eyebrow">Gotowy?</p>
          <h2 className="text-4xl md:text-6xl font-bold text-gray-900 tracking-tight mb-6">
            Zacznij generować oferty dziś
          </h2>
          <p className="text-gray-500 text-lg mb-12">
            Dołącz do sprzedawców którzy oszczędzają godziny pracy każdego dnia.
          </p>
          <a
            href="/register"
            className="inline-block px-12 py-4 rounded-xl text-white font-semibold text-base transition-all duration-200 hover:scale-[1.03] hover:shadow-2xl hover:shadow-indigo-500/30"
            style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
          >
            Utwórz darmowe konto →
          </a>
          <p className="text-gray-400 text-sm mt-8">
            Bez karty kredytowej&nbsp;&bull;&nbsp;Pierwsze generacje gratis&nbsp;&bull;&nbsp;Rejestracja w 30 sekund
          </p>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────────── */}
      <footer className="border-t border-gray-100 bg-white py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
                <svg viewBox="0 0 24 24" className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M13 10V3L4 14h7v7l9-11h-7Z" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span className="text-base font-semibold text-gray-900" style={{ fontFamily: "var(--font-brand, ‘Georgia’, serif)", letterSpacing: "0.05em" }}>
                LuMir
              </span>
            </div>

            <div className="flex items-center gap-6">
              {[{ label: "Jak działa", id: "jak-dziala" }, { label: "Funkcje", id: "funkcje" }, { label: "Cennik", id: "cennik" }].map(({ label, id }) => (
                <button key={id} onClick={() => scrollTo(id)} className="text-sm text-gray-500 hover:text-gray-900 transition-colors duration-200">{label}</button>
              ))}
              <a href="/login" className="text-sm text-gray-500 hover:text-gray-900 transition-colors duration-200">Zaloguj</a>
            </div>

            <div className="hidden md:block w-32" />
          </div>

          <div className="border-t border-gray-100 my-6" />

          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-gray-400 text-sm">
            <span>© 2026 LuMir</span>
            <a href="mailto:kontakt@lumirai.pl" className="hover:text-gray-700 transition-colors duration-200">kontakt@lumirai.pl</a>
            <div className="flex items-center gap-5">
              <a href="/regulamin" className="hover:text-gray-700 transition-colors duration-200">Regulamin</a>
              <a href="/privacy" className="hover:text-gray-700 transition-colors duration-200">Polityka prywatności</a>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}
