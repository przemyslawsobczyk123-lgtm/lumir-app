"use client";
import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { type Lang } from "./i18n";

const LangContext = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({
  lang: "pl",
  setLang: () => {},
});

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("pl");

  useEffect(() => {
    const saved = localStorage.getItem("lumir-lang") as Lang | null;
    if (saved === "en" || saved === "pl") setLangState(saved);
  }, []);

  function setLang(l: Lang) {
    setLangState(l);
    localStorage.setItem("lumir-lang", l);
  }

  return (
    <LangContext.Provider value={{ lang, setLang }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}
