"use client";

import type { CSSProperties, PointerEvent } from "react";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";

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
type HeroFluidStyle = CSSProperties & {
  "--mx": string;
  "--my": string;
  "--x": string;
  "--y": string;
};

const HERO_FLUID_STYLE: HeroFluidStyle = {
  "--mx": "50%",
  "--my": "50%",
  "--x": "50%",
  "--y": "50%",
  background:
    "radial-gradient(circle at var(--mx) var(--my), rgba(255,255,255,.22), transparent 0 7%, transparent 22%), radial-gradient(circle at calc(var(--mx) - 12%) calc(var(--my) + 10%), rgba(0,210,255,.72), transparent 0 16%, transparent 36%), radial-gradient(circle at calc(var(--mx) + 14%) calc(var(--my) - 8%), rgba(255,49,195,.78), transparent 0 17%, transparent 38%), linear-gradient(120deg, #1cc8ff 0%, #2563eb 29%, #4f22d8 53%, #a21caf 76%, #ff2db4 100%)",
};

function useHeroFluidCursor() {
  const heroRef = useRef<HTMLElement>(null);
  const target = useRef({ x: 0, y: 0 });
  const current = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const heroEl = heroRef.current;
    if (!heroEl) return;
    const heroNode: HTMLElement = heroEl;

    function centerGlow() {
      const rect = heroNode.getBoundingClientRect();
      target.current = { x: rect.width / 2, y: rect.height / 2 };
      current.current = target.current;
      heroNode.style.setProperty("--mx", "50%");
      heroNode.style.setProperty("--my", "50%");
      heroNode.style.setProperty("--x", `${current.current.x}px`);
      heroNode.style.setProperty("--y", `${current.current.y}px`);
    }

    centerGlow();
    let frame = 0;
    function animateGlow() {
      current.current = {
        x: current.current.x + (target.current.x - current.current.x) * 0.12,
        y: current.current.y + (target.current.y - current.current.y) * 0.12,
      };
      heroNode.style.setProperty("--x", `${current.current.x}px`);
      heroNode.style.setProperty("--y", `${current.current.y}px`);
      frame = requestAnimationFrame(animateGlow);
    }

    frame = requestAnimationFrame(animateGlow);
    window.addEventListener("resize", centerGlow);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", centerGlow);
    };
  }, []);

  function handleHeroPointerMove(event: PointerEvent<HTMLElement>) {
    const hero = heroRef.current;
    if (!hero) return;
    const rect = hero.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    target.current = { x, y };
    hero.style.setProperty("--mx", `${(x / rect.width) * 100}%`);
    hero.style.setProperty("--my", `${(y / rect.height) * 100}%`);
  }

  return { heroRef, handleHeroPointerMove };
}

function HeroFluidBackground() {
  return (
    <>
      <div
        className="hero-fluid-field pointer-events-none absolute -inset-[18%] z-0 opacity-95"
        style={{
          background:
            "radial-gradient(ellipse at 11% 18%, rgba(0,225,255,.92), transparent 0 20%, transparent 40%), radial-gradient(ellipse at 83% 18%, rgba(255,39,194,.92), transparent 0 24%, transparent 46%), radial-gradient(ellipse at 78% 76%, rgba(0,194,255,.85), transparent 0 20%, transparent 44%), radial-gradient(ellipse at 30% 77%, rgba(255,0,208,.75), transparent 0 18%, transparent 39%), radial-gradient(ellipse at 52% 48%, rgba(62,42,255,.9), transparent 0 32%, transparent 56%)",
          filter: "blur(42px) saturate(1.45)",
          animation: "heroFluid 12s ease-in-out infinite alternate",
        }}
      />
      <div
        className="hero-wave-band pointer-events-none absolute left-[-12%] right-[-12%] top-[34%] z-[1] h-[38%]"
        style={{
          transform: "rotate(-9deg)",
          background:
            "linear-gradient(90deg, rgba(8,18,74,.70), rgba(38,16,109,.78) 45%, rgba(85,18,132,.68) 74%, rgba(151,18,129,.54))",
          boxShadow: "0 28px 80px rgba(20,0,80,.38), inset 0 1px 0 rgba(255,255,255,.12)",
          filter: "blur(1px)",
        }}
      />
      <div
        className="hero-orbit-ring pointer-events-none absolute left-[10%] top-[12%] z-[2] h-36 w-36 rounded-full opacity-75"
        style={{
          background: "repeating-radial-gradient(circle, rgba(255,255,255,.42) 0 2px, transparent 2px 8px)",
          maskImage: "radial-gradient(circle, transparent 0 42%, #000 43% 72%, transparent 73%)",
          WebkitMaskImage: "radial-gradient(circle, transparent 0 42%, #000 43% 72%, transparent 73%)",
        }}
      />
      <div
        className="hero-orbit-ring pointer-events-none absolute right-[30%] top-[34%] z-[2] h-56 w-56 rounded-full opacity-65"
        style={{
          background: "repeating-radial-gradient(circle, rgba(255,255,255,.36) 0 2px, transparent 2px 11px)",
          maskImage: "radial-gradient(circle, transparent 0 34%, #000 35% 72%, transparent 73%)",
          WebkitMaskImage: "radial-gradient(circle, transparent 0 34%, #000 35% 72%, transparent 73%)",
        }}
      />
      <div
        className="hero-dot-grid pointer-events-none absolute right-[6%] top-[24%] z-[2] h-44 w-44 opacity-85"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,.92) 0 3px, transparent 4px)",
          backgroundSize: "34px 34px",
        }}
      />
      <div className="hero-ring-row pointer-events-none absolute bottom-[15%] left-[34%] z-[2] flex gap-6 opacity-70">
        {Array.from({ length: 7 }).map((_, index) => (
          <span key={index} className="h-5 w-5 rounded-full border-2 border-white/45" />
        ))}
      </div>
      <div
        className="pointer-events-none absolute inset-0 z-[3]"
        style={{
          background:
            "linear-gradient(90deg, rgba(5,10,45,.30) 0%, rgba(5,10,45,.18) 42%, rgba(5,10,45,.10) 100%), radial-gradient(ellipse at 68% 46%, rgba(11,0,55,.44), transparent 0 24%, transparent 44%)",
          backdropFilter: "blur(2px) saturate(1.1)",
        }}
      />
      <div
        className="cursor-glow pointer-events-none absolute z-[4] h-[320px] w-[320px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-90 mix-blend-screen transition-all duration-200 group-hover/hero:h-[380px] group-hover/hero:w-[380px] group-hover/hero:opacity-100"
        style={{
          left: "var(--x)",
          top: "var(--y)",
          background:
            "radial-gradient(circle, rgba(255,255,255,.34) 0 4%, transparent 9%), radial-gradient(circle, rgba(0,245,255,.95), rgba(0,117,255,.55) 22%, rgba(255,40,205,.55) 46%, transparent 70%)",
          filter: "blur(22px) saturate(1.9) contrast(1.1)",
        }}
      />
      <style jsx global>{`
        @keyframes heroFluid {
          0% { transform: translate3d(-2%, -2%, 0) scale(1) rotate(0deg); }
          50% { transform: translate3d(3%, 1%, 0) scale(1.08) rotate(6deg); }
          100% { transform: translate3d(-1%, 3%, 0) scale(1.12) rotate(-4deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          .hero-fluid-field { animation: none !important; }
        }
      `}</style>
    </>
  );
}

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
    <div className="bg-slate-950/30 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-2xl overflow-hidden">
      <div
        className="px-5 py-3 border-b border-white/10 flex items-center justify-between"
        style={{
          background:
            "linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.08))",
        }}
      >
        <div>
          <div className="text-xs text-white/55 uppercase tracking-wider mb-0.5">Produkt</div>
          <div className="text-white text-sm font-medium">{demo.product}</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-white/55 uppercase tracking-wider mb-0.5">Kategoria</div>
          <div className="text-cyan-200 text-xs">{demo.category}</div>
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
          <div className="text-xs text-white/55 uppercase tracking-wider">Wynik AI</div>
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

/* Product SVG: microwave, raw seller photo vs marketplace-ready */
function MicrowaveIllustration({ clean }: { clean: boolean }) {
  const suffix = clean ? "clean" : "raw";
  const metal = clean ? "#d7dde7" : "#9aa1aa";
  const side = clean ? "#9ca3af" : "#707781";
  const dark = clean ? "#111827" : "#1f2937";
  const screen = clean ? "#98d82e" : "#84cc16";

  return (
    <svg
      viewBox="0 0 560 360"
      className="relative z-10 w-[420px] max-w-[82%] h-auto"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Kuchenka mikrofalowa"
    >
      <defs>
        <linearGradient id={`microwave-metal-${suffix}`} x1="70" y1="72" x2="448" y2="288" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f8fafc" />
          <stop offset="0.42" stopColor={metal} />
          <stop offset="1" stopColor="#8b93a1" />
        </linearGradient>
        <linearGradient id={`microwave-door-${suffix}`} x1="88" y1="115" x2="350" y2="242" gradientUnits="userSpaceOnUse">
          <stop stopColor="#111827" />
          <stop offset="0.5" stopColor="#374151" />
          <stop offset="1" stopColor="#0f172a" />
        </linearGradient>
        <pattern id={`microwave-mesh-${suffix}`} width="6" height="6" patternUnits="userSpaceOnUse">
          <path d="M0 3H6M3 0V6" stroke="rgba(255,255,255,0.18)" strokeWidth="1" />
        </pattern>
      </defs>

      <ellipse cx="284" cy="312" rx="205" ry="22" fill="rgba(15,23,42,0.18)" />
      <path d="M418 80h86c18 0 30 14 30 31v156c0 17-12 31-30 31h-86V80Z" fill={side} />
      <path d="M430 96h78c6 0 10 5 10 11v139c0 7-4 12-10 12h-78V96Z" fill="rgba(15,23,42,0.10)" />
      <rect x="48" y="82" width="410" height="218" rx="16" fill={`url(#microwave-metal-${suffix})`} stroke={clean ? "#cbd5e1" : "#6b7280"} strokeWidth="3" />
      <rect x="70" y="105" width="286" height="156" rx="13" fill={dark} />
      <rect x="92" y="126" width="226" height="112" rx="8" fill={`url(#microwave-door-${suffix})`} />
      <rect x="108" y="139" width="194" height="86" rx="6" fill={`url(#microwave-mesh-${suffix})`} opacity="0.72" />
      <rect x="366" y="101" width="70" height="166" rx="11" fill="#0f172a" />
      <text x="401" y="128" textAnchor="middle" fill={screen} fontFamily="monospace" fontSize="26" fontWeight="700">12:42</text>
      <rect x="380" y="142" width="42" height="1" fill="rgba(255,255,255,0.22)" />
      {["Power", "Def", "Grill", "1", "2", "3", "4", "5", "6", "Stop", "0", "Start"].map((label, i) => {
        const col = i % 3;
        const row = Math.floor(i / 3);
        return (
          <g key={label}>
            <rect x={376 + col * 18} y={154 + row * 24} width="14" height="14" rx="3" fill={i > 8 ? "rgba(248,250,252,0.16)" : "rgba(248,250,252,0.10)"} stroke="rgba(255,255,255,0.18)" />
            <text x={383 + col * 18} y={164 + row * 24} textAnchor="middle" fill="rgba(255,255,255,0.82)" fontFamily="monospace" fontSize={i < 3 ? "4.5" : "8"}>
              {label}
            </text>
          </g>
        );
      })}
      <rect x="372" y="272" width="58" height="18" rx="5" fill="rgba(15,23,42,0.20)" stroke="rgba(255,255,255,0.25)" />
      <rect x="92" y="294" width="38" height="12" rx="6" fill="#111827" opacity="0.82" />
      <rect x="382" y="294" width="38" height="12" rx="6" fill="#111827" opacity="0.82" />
      <path d="M62 90h382" stroke="rgba(255,255,255,0.55)" strokeWidth="2" />
      <path d="M516 126v102" stroke="rgba(255,255,255,0.22)" strokeWidth="2" strokeLinecap="round" strokeDasharray="3 8" />
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────────
   CompareSlider - full range before/after reveal
───────────────────────────────────────────────────────────── */
const MICROWAVE_PHOTOS = {
  before: "/landing/microwave-before.png",
  after: "/landing/microwave-after.png",
} as const;

function ProductPhoto({ variant }: { variant: "before" | "after" }) {
  const [failed, setFailed] = useState(false);
  const isAfter = variant === "after";

  if (failed) {
    return (
      <div className="absolute inset-0 flex items-center justify-center">
        <MicrowaveIllustration clean={isAfter} />
      </div>
    );
  }

  return (
    <Image
      src={MICROWAVE_PHOTOS[variant]}
      alt={isAfter ? "Kuchenka mikrofalowa po LuMirAI na bialym tle" : "Kuchenka mikrofalowa przed LuMirAI w kuchni"}
      fill
      sizes="(max-width: 768px) 92vw, 560px"
      className="object-contain"
      onError={() => setFailed(true)}
      unoptimized
    />
  );
}

type CompareContent = {
  badge: string;
  title: string;
  text?: string;
  bullets?: string[];
  chips?: string[];
};

function ComparePanel({ content, tone, variant }: { content: CompareContent; tone: "before" | "after"; variant: "title" | "description" | "attributes" | "photos" }) {
  if (variant === "photos") {
    const isAfter = tone === "after";
    return (
      <div className="absolute inset-0 bg-white">
        <ProductPhoto variant={isAfter ? "after" : "before"} />
        <div className="pointer-events-none absolute left-4 top-4 rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] shadow-sm" style={{ background: isAfter ? "#ccfbf1" : "rgba(15,23,42,.68)", color: isAfter ? "#0f766e" : "#fff" }}>
          {content.badge}
        </div>
        {isAfter && (
          <div className="pointer-events-none absolute right-4 top-4 flex flex-col items-end gap-1.5">
            {["RGB 255", "2560x2560", "Gotowe Allegro"].map((label) => (
              <span key={label} className="rounded-full border border-teal-200 bg-teal-50 px-2.5 py-1 text-[9px] font-bold text-teal-700 shadow-sm">
                {label}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  }

  const accent = tone === "after" ? "#14b8a6" : "#8b5cf6";
  return (
    <div className="absolute inset-0 bg-white p-5 sm:p-7 text-slate-900">
      <div className="mb-5 flex items-center justify-between gap-4">
        <span className="rounded-md px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em]" style={{ background: tone === "after" ? "#ccfbf1" : "#ede9fe", color: accent }}>
          {content.badge}
        </span>
        {tone === "after" && <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-teal-500">Gotowe do oferty</span>}
      </div>
      <h3 className="mb-4 text-xl font-bold leading-tight text-slate-950 sm:text-2xl">{content.title}</h3>
      {content.text && <p className="mb-5 max-w-xl text-sm leading-relaxed text-slate-600">{content.text}</p>}
      {content.bullets && (
        <ul className="space-y-3 text-sm leading-relaxed text-slate-600">
          {content.bullets.map((item) => (
            <li key={item} className="flex gap-3">
              <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ background: accent }} />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
      {content.chips && (
        <div className="mt-6 flex flex-wrap gap-2">
          {content.chips.map((chip) => (
            <span key={chip} className="rounded-md border px-3 py-1.5 text-[11px] font-medium" style={{ borderColor: tone === "after" ? "#99f6e4" : "#ddd6fe", color: accent, background: tone === "after" ? "#f0fdfa" : "#faf5ff" }}>
              {chip}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function getSliderPercentFromClientX(rect: DOMRect, clientX: number) {
  const x = clientX - rect.left;
  return Math.max(0, Math.min(100, Math.round((x / rect.width) * 100)));
}

type CompareSliderStyle = CSSProperties & {
  "--split": string;
  "--handle-x": string;
};

function CompareSlider({ before, after, variant }: { before: CompareContent; after: CompareContent; variant: "title" | "description" | "attributes" | "photos" }) {
  const [pos, setPos] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const heightClass = variant === "description" ? "h-[430px]" : variant === "attributes" ? "h-[390px]" : variant === "photos" ? "h-[430px]" : "h-[300px]";
  const sliderStyle: CompareSliderStyle = {
    "--split": `${pos}%`,
    "--handle-x": `clamp(24px, ${pos}%, calc(100% - 24px))`,
  };

  function updateFromPointer(clientX: number) {
    if (!containerRef.current) return;
    setPos(getSliderPercentFromClientX(containerRef.current.getBoundingClientRect(), clientX));
  }

  function startDrag(event: PointerEvent<HTMLDivElement>) {
    dragging.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    updateFromPointer(event.clientX);
  }

  function moveDrag(event: PointerEvent<HTMLDivElement>) {
    if (!dragging.current) return;
    updateFromPointer(event.clientX);
  }

  function stopDrag(event: PointerEvent<HTMLDivElement>) {
    dragging.current = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  return (
    <div
      ref={containerRef}
      className={`compare-slider relative overflow-hidden rounded-2xl border border-violet-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.10)] ${heightClass}`}
      style={sliderStyle}
      onPointerDown={startDrag}
      onPointerMove={moveDrag}
      onPointerUp={stopDrag}
      onPointerCancel={stopDrag}
      role="slider"
      aria-label="Porownanie przed i po LuMirAI"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pos}
    >
      <ComparePanel content={after} tone="after" variant={variant} />
      <div className="absolute inset-0 overflow-hidden will-change-[clip-path]" style={{ clipPath: "inset(0 calc(100% - var(--split)) 0 0)" }}>
        <ComparePanel content={before} tone="before" variant={variant} />
      </div>
      <div className="pointer-events-none absolute inset-y-0 z-20 w-[2px] bg-gradient-to-b from-transparent via-slate-950 to-transparent shadow-[0_0_26px_rgba(15,23,42,0.35)]" style={{ left: "var(--split)" }} />
      <div className="compare-slider-handle pointer-events-none absolute top-1/2 z-30 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/80 bg-white/95 text-slate-600 shadow-[0_18px_45px_rgba(15,23,42,0.22)] ring-8 ring-white/35 backdrop-blur-xl transition-transform duration-200" style={{ left: "var(--handle-x)" }}>
        <span className="absolute inset-2 rounded-full border border-slate-100" />
        <svg viewBox="0 0 24 24" className="relative h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2.5}>
          <path d="M8.5 7 3.5 12l5 5M15.5 7l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
}

const TRANSFORMATION_SECTIONS = [
  {
    eyebrow: "OPISY PRODUKTOWE",
    title: "Masz 10-15 sekund. Kazde slowo musi pracowac.",
    description: "Naglowki odpowiadaja na pytania, ktore kupujacy i tak zadadza. LuMirAI porzadkuje dane produktu, wzmacnia benefity i uklada opis pod decyzje zakupowa oraz algorytm Allegro.",
    chips: ["Algorytm Allegro", "Opinie klientow", "Rozwiazuje problem", "Unikalny tekst", "Naglowki H1-H3", "Jezyk sprzedazy"],
    variant: "description" as const,
    before: {
      badge: "PRZED",
      title: "Kuchenka mikrofalowa z wyswietlaczem LED",
      text: "Mikrofala 20L. Kolor srebrny. Moc 700W. Timer. Talerz szklany. Do kuchni.",
      bullets: ["Brak struktury i naglowkow.", "Dane techniczne zmieszane z opisem.", "Klient nie widzi, jaki problem rozwiazuje produkt."],
    },
    after: {
      badge: "PO LUMIRAI",
      title: "Kuchenka mikrofalowa 20L 700W z wyswietlaczem LED",
      text: "Szybkie podgrzewanie, rozmrazanie i codzienne gotowanie w kompaktowej kuchence do malej i sredniej kuchni.",
      bullets: ["Dlaczego kupujacy wybieraja ten model?", "Czytelny panel LED ulatwia ustawienie czasu i programu.", "Pojemnosc 20 l sprawdza sie w codziennym podgrzewaniu obiadow i napojow.", "Timer pomaga kontrolowac proces bez otwierania drzwiczek."],
    },
  },
  {
    eyebrow: "TYTULY AI",
    title: "Tytul, ktory trafia w to, czego szukaja kupujacy.",
    description: "LuMirAI uklada tytul z najwazniejszych danych oferty: typu produktu, pojemnosci, mocy, koloru i funkcji. Maks. 75 znakow, bez szumu.",
    chips: ["Allegro Analytics", "Planer Kampanii", "Google Trends", "Wyszukiwarka Allegro", "Maks. 75 znakow", "Wysoki wolumen"],
    variant: "title" as const,
    before: {
      badge: "PRZED",
      title: "Mikrofala MW-20 srebrna",
      text: "Krotki tytul bez pojemnosci, mocy i slow kluczowych.",
    },
    after: {
      badge: "PO LUMIRAI",
      title: "Kuchenka mikrofalowa 20L 700W Srebrna Timer LED",
      text: "Typ produktu, pojemnosc, moc, kolor i funkcja w jednym czytelnym tytule.",
      chips: ["55 / 75 znakow", "Kuchenka mikrofalowa", "20L", "700W", "Timer LED"],
    },
  },
  {
    eyebrow: "ATRYBUTY PRODUKTU",
    title: "Atrybuty, ktore przechodza walidacje marketplace.",
    description: "LuMirAI zmienia niepelne dane w uporzadkowane pola: techniczne, logistyczne i sprzedazowe. Sprzedawca widzi, co bylo puste i co zostalo uzupelnione.",
    chips: ["Pola wymagane", "Walidacja Allegro", "Dane techniczne", "Braki oznaczone", "Gotowe do eksportu"],
    variant: "attributes" as const,
    before: {
      badge: "PRZED",
      title: "Braki w atrybutach",
      bullets: ["Pojemnosc: brak", "Moc: 700W wpisane w opisie", "Sterowanie: brak", "Srednica talerza: brak", "Gwarancja: brak"],
    },
    after: {
      badge: "PO LUMIRAI",
      title: "Komplet atrybutow produktu",
      bullets: ["Pojemnosc: 20 l", "Moc mikrofal: 700 W", "Kolor: srebrny", "Sterowanie: elektroniczne", "Srednica talerza: 25.5 cm", "Gwarancja: 24 mies."],
    },
  },
  {
    eyebrow: "ZDJECIA PRODUKTOWE",
    title: "Zdjecia i miniatury pod trafnosc Allegro. Technicznie i wizualnie.",
    description: "Format 2560x2560 px, biale tlo RGB 255, wycieta ramka. Zgodne z wymaganiami Allegro i czytelne w wynikach wyszukiwania.",
    chips: ["2560x2560 px", "RGB 255 biale tlo", "Biala ramka wycieta", "Trafnosc Allegro", "Format Allegro"],
    variant: "photos" as const,
    before: {
      badge: "PRZED",
      title: "Zdjecie z kuchni",
      text: "Tlo, szafki i blat konkuruja z produktem.",
    },
    after: {
      badge: "PO LUMIRAI",
      title: "Produkt na bialym tle",
      text: "Czysta miniatura gotowa do marketplace.",
    },
  },
];


export default function Landing() {
  useScrollReveal();
  const { heroRef, handleHeroPointerMove } = useHeroFluidCursor();

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
      <section
        id="hero"
        ref={heroRef}
        onPointerMove={handleHeroPointerMove}
        className="hero-fluid-section group/hero relative isolate min-h-screen flex items-center px-6 pt-20 overflow-hidden"
        style={HERO_FLUID_STYLE}
      >

        <HeroFluidBackground />

        <div className="relative z-10 max-w-6xl mx-auto w-full flex flex-col lg:flex-row items-center justify-between gap-16 py-24">

          {/* Left copy */}
          <div className="max-w-2xl">
            {/* Badge */}
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/45 bg-white/90 text-indigo-700 text-xs font-semibold mb-8 shadow-lg shadow-slate-950/10"
              data-animate
            >
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
              Generator ofert zasilany AI
            </div>

            {/* H1 */}
            <h1
              className="text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.05] tracking-tight mb-6 text-white drop-shadow-[0_5px_26px_rgba(15,23,42,0.45)]"
              data-animate
              data-animate-delay="1"
            >
              Twoje oferty{" "}
              <span style={{ background: "linear-gradient(135deg, #f97316, #fb923c)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>generowane</span>
              <br />
              <span style={{ background: "linear-gradient(135deg, #ffffff, #c4b5fd)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                przez AI.
              </span>
            </h1>

            {/* Subheadline */}
            <p
              className="text-white/85 text-lg leading-relaxed mb-10 max-w-xl drop-shadow-[0_2px_12px_rgba(15,23,42,0.35)]"
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
                className="px-8 py-3.5 rounded-xl text-white font-semibold text-sm transition-all duration-200 hover:scale-[1.02] hover:shadow-lg hover:shadow-pink-500/30"
                style={{ background: "linear-gradient(135deg, #ff7a1a, #ff3dbd)" }}
              >
                Zacznij za darmo →
              </a>
              <button
                onClick={() => scrollTo("jak-dziala")}
                className="px-8 py-3.5 rounded-xl text-sm font-semibold text-white hover:text-white border border-white/45 hover:border-white/75 hover:bg-white/15 transition-all duration-200 backdrop-blur"
              >
                Zobacz jak działa ↓
              </button>
            </div>

            {/* Trust row */}
            <div className="flex flex-wrap items-center gap-6 text-white/85 text-sm drop-shadow-[0_2px_10px_rgba(15,23,42,0.30)]" data-animate data-animate-delay="4">
              {["Bezpłatna rejestracja", "Pierwsze generacje gratis", "Bez karty kredytowej"].map((f) => (
                <div key={f} className="flex items-center gap-1.5">
                  <IconCheck className="w-3.5 h-3.5 text-cyan-200 flex-shrink-0" />
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

      {/* ── BEFORE / AFTER OFFER TRANSFORMATION ───────────────── */}
      <section className="bg-white px-6">
        <div className="mx-auto max-w-6xl">
          {TRANSFORMATION_SECTIONS.map((item, idx) => {
            const reverse = idx % 2 === 1;
            return (
              <div key={item.eyebrow} className="grid gap-12 border-t border-slate-200 py-28 lg:grid-cols-2 lg:items-center lg:gap-16">
                <div className={reverse ? "lg:order-2" : ""} data-animate>
                  <p className="mb-5 text-xs font-black uppercase tracking-[0.22em]" style={{ color: idx === 1 ? "#8b5cf6" : idx === 2 ? "#6366f1" : "#14b8a6" }}>
                    {item.eyebrow}
                  </p>
                  <h2 className="mb-6 text-4xl font-black leading-tight tracking-tight text-slate-950 md:text-5xl">
                    {item.title}
                  </h2>
                  <p className="mb-7 max-w-xl text-lg leading-relaxed text-slate-600">
                    {item.description}
                  </p>
                  <div className="flex max-w-xl flex-wrap gap-2">
                    {item.chips.map((chip) => (
                      <span key={chip} className="rounded-md border border-violet-200 bg-white px-3 py-1.5 text-xs font-medium text-violet-700 shadow-sm">
                        {chip}
                      </span>
                    ))}
                  </div>
                </div>
                <div className={reverse ? "lg:order-1" : ""} data-animate data-animate-delay="2">
                  <p className="mb-3 text-center text-xs font-medium text-slate-400">
                    Przeciagaj suwak: PRZED / PO LUMIRAI
                  </p>
                  <CompareSlider before={item.before} after={item.after} variant={item.variant} />
                </div>
              </div>
            );
          })}
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
