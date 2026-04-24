import { Suspense } from "react";

import { ExportApiWorkspace } from "./ExportApiWorkspace";

function ExportApiFallback() {
  return (
    <div className="rounded-3xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6 text-sm text-[var(--text-secondary)] shadow-[var(--shadow-card)]">
      Laduje Export API...
    </div>
  );
}

export default function ExportApiPage() {
  return (
    <Suspense fallback={<ExportApiFallback />}>
      <ExportApiWorkspace />
    </Suspense>
  );
}
