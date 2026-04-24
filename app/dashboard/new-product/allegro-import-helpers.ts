export type AllegroImportErrorNotice = {
  title: string;
  message: string;
};

export function getAllegroImportErrorNotice(error: string | null | undefined): AllegroImportErrorNotice | null {
  const normalized = String(error || "").trim();
  const lower = normalized.toLowerCase();

  if (!normalized || !lower.includes("403")) {
    return null;
  }

  if (
    lower.includes("no longer supported")
    || lower.includes("details resource")
    || lower.includes("detail resource")
    || lower.includes("blocked for your integration")
    || lower.includes("deprecated")
  ) {
    return {
      title: "Allegro zablokowalo stary zasob szczegolow oferty",
      message: "Wyglada na deprecated resource szczegolow oferty w Allegro. To nie jest zwykly brak jednego scope.",
    };
  }

  return {
    title: "Allegro odrzucilo pobranie oferty (403)",
    message: "403 moze oznaczac problem z zasobem, tokenem albo uprawnieniami. Ten komunikat sam w sobie nie potwierdza braku scope.",
  };
}
