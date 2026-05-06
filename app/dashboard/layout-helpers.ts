export function getImpersonationBannerClasses() {
  return {
    container:
      "flex flex-wrap items-center justify-between gap-3 border-b border-amber-300 bg-amber-100 px-8 py-2 text-xs text-amber-950 shadow-sm shadow-amber-900/5 [html.dark_&]:border-amber-400/25 [html.dark_&]:bg-[#3b2a08] [html.dark_&]:text-[#fde68a]",
    eyebrow:
      "font-semibold uppercase tracking-[0.18em] text-amber-900 [html.dark_&]:text-[#fde68a]",
    identity:
      "ml-3 font-medium text-amber-950 [html.dark_&]:text-[#fde68a]",
    button:
      "rounded-lg border border-amber-500 bg-white px-3 py-1.5 font-semibold text-amber-950 transition hover:bg-amber-50 [html.dark_&]:border-amber-300/40 [html.dark_&]:bg-amber-300/15 [html.dark_&]:text-amber-50 [html.dark_&]:hover:bg-amber-300/25",
  } as const;
}

export function getDashboardSessionRefreshKey(userRaw: string | null | undefined, impersonationRaw: string | null | undefined) {
  const userKey = userRaw || "anonymous";
  const modeKey = impersonationRaw ? "impersonating" : "direct";
  return `${modeKey}:${userKey}`;
}
