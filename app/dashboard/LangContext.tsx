"use client";
import { createContext, useContext, useSyncExternalStore, type ReactNode } from "react";
import { type Lang } from "./i18n";

const LANG_STORAGE_KEY = "lumir-lang";
const LANG_EVENT = "lumir-lang-change";

function normalizeLang(value: string | null | undefined): Lang {
  return value === "en" || value === "pl" ? value : "pl";
}

function readLang(): Lang {
  if (typeof window === "undefined") return "pl";
  return normalizeLang(window.localStorage.getItem(LANG_STORAGE_KEY));
}

function subscribe(onChange: () => void) {
  if (typeof window === "undefined") return () => {};

  const handleStorage = (event: StorageEvent) => {
    if (event.key && event.key !== LANG_STORAGE_KEY) return;
    onChange();
  };
  const handleLangChange = () => onChange();

  window.addEventListener("storage", handleStorage);
  window.addEventListener(LANG_EVENT, handleLangChange);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(LANG_EVENT, handleLangChange);
  };
}

const LangContext = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({
  lang: "pl",
  setLang: () => {},
});

export function LangProvider({ children }: { children: ReactNode }) {
  const lang = useSyncExternalStore<Lang>(subscribe, readLang, () => "pl");

  function setLang(l: Lang) {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(LANG_STORAGE_KEY, l);
    window.dispatchEvent(new Event(LANG_EVENT));
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
