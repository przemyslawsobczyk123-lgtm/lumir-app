import Link from "next/link";
import Image from "next/image";

type LegalSection = {
  title: string;
  body: string[];
};

type LegalPageProps = {
  title: string;
  subtitle: string;
  updatedAt: string;
  sections: LegalSection[];
};

export function LegalPage({ title, subtitle, updatedAt, sections }: LegalPageProps) {
  return (
    <main className="min-h-screen bg-[#020617] px-6 py-10 text-slate-200">
      <div className="mx-auto max-w-4xl">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-300 transition hover:text-indigo-100">
          <Image src="/lumir-icon.svg?v=outlined-20260506" alt="LuMir" width={28} height={28} className="h-7 w-7 rounded-lg" />
          <span>LuMir</span>
        </Link>
        <header className="mt-8 border-b border-white/10 pb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-indigo-300">Dokument prawny</p>
          <h1 className="mt-3 text-3xl font-semibold text-white">{title}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">{subtitle}</p>
          <p className="mt-4 text-xs text-slate-500">Ostatnia aktualizacja: {updatedAt}</p>
        </header>

        <div className="mt-8 space-y-8">
          {sections.map((section) => (
            <section key={section.title} className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
              <h2 className="text-lg font-semibold text-white">{section.title}</h2>
              <div className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
                {section.body.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <footer className="mt-10 border-t border-white/10 pt-6 text-xs leading-6 text-slate-500">
          <p>
            Ten dokument jest wersja operacyjna dla MVP. Przed szeroka sprzedaza nalezy potwierdzic tresc z doradca
            prawnym i uzupelnic pelne dane operatora, jezeli wymagaja tego przepisy.
          </p>
          <p className="mt-3">
            Materialy referencyjne:{" "}
            <a className="text-indigo-300 hover:text-indigo-100" href="https://uodo.gov.pl/pl/645/4097">
              UODO - obowiazki administratora
            </a>
            {" "}oraz{" "}
            <a className="text-indigo-300 hover:text-indigo-100" href="https://www.gov.pl/web/rozwoj-technologia/przedsiebiorstwa-na-platformach-internetowych">
              Gov.pl - uslugi platform internetowych
            </a>
            .
          </p>
        </footer>
      </div>
    </main>
  );
}
