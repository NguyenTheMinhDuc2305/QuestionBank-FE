"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { GenerateRequest } from "@shared/types";
import { AppHeader, type AppView } from "@/components/AppHeader";
import { GeneratorForm } from "@/components/GeneratorForm";
import { ResultsView } from "@/components/ResultsView";
import { Callout } from "@/components/ui";
import { HistoryView } from "@/components/HistoryView";
import { mockBackend, useGenerator } from "@/components/useGenerator";
import { apiBackend } from "@/lib/api-backend";

const INITIAL_REQUEST: GenerateRequest = {
  type: "COMP_SEL",
  loCodes: [],
  bloom: "M1",
  count: 3,
  options: { withImages: true, withAudio: true, language: "en" },
};

export default function Home() {
  return (
    <Suspense>
      <App />
    </Suspense>
  );
}

function App() {
  // `?mock=1` keeps the design demo (mock data) reachable without a backend.
  const USING_MOCK = useSearchParams().get("mock") === "1";
  const gen = useGenerator(USING_MOCK ? mockBackend : apiBackend);
  const [view, setView] = useState<AppView>("generate");
  const [request, setRequest] = useState<GenerateRequest>(INITIAL_REQUEST);
  const resultsRef = useRef<HTMLElement>(null);

  // On phones the results sit below the form: bring them into view when a run arrives.
  const runId = gen.result?.runId;
  useEffect(() => {
    if (runId && window.matchMedia("(max-width: 1023px)").matches) {
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [runId]);

  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader mock={USING_MOCK} view={USING_MOCK ? undefined : view} onViewChange={setView} />
      {view === "history" && !USING_MOCK && <HistoryView />}
      {/* Kept mounted while browsing history so the current form and results are not lost. */}
      <div hidden={view === "history" && !USING_MOCK} className="flex-1 lg:grid lg:grid-cols-[minmax(380px,440px)_minmax(0,1fr)]">
        <aside
          aria-label="Cấu hình"
          className="scrollbar-thin border-b border-border bg-surface lg:sticky lg:top-14 lg:h-[calc(100dvh-3.5rem)] lg:overflow-y-auto lg:border-r lg:border-b-0"
        >
          {gen.meta ? (
            <GeneratorForm
              meta={gen.meta}
              value={request}
              onChange={setRequest}
              onSubmit={(req) => void gen.generate(req)}
              loading={gen.loading}
              allowPreviewTypes={USING_MOCK}
            />
          ) : gen.metaError ? (
            <div className="p-5">
              <Callout tone="danger" title="Không tải được cấu hình từ backend">
                {gen.metaError}
              </Callout>
            </div>
          ) : (
            <FormSkeleton />
          )}
        </aside>
        <main ref={resultsRef} className="min-w-0 scroll-mt-16 px-4 py-5 sm:px-6 lg:py-6">
          <div className="mx-auto max-w-[1200px]">
            <ResultsView
              result={gen.result}
              loading={gen.loading}
              error={gen.error}
              onRegenerateImage={(id) => void gen.regenerateImage(id)}
              onRegenerateAudio={(id) => void gen.regenerateAudio(id)}
              onExportJson={gen.exportJson}
            />
          </div>
        </main>
      </div>
    </div>
  );
}

function FormSkeleton() {
  return (
    <div className="space-y-6 px-5 py-5" aria-busy aria-label="Đang tải cấu hình">
      {[0, 1, 2].map((s) => (
        <div key={s} className="space-y-2.5">
          <div className="skeleton h-4 w-32 rounded" />
          <div className="grid grid-cols-2 gap-2">
            {Array.from({ length: s === 0 ? 6 : 2 }, (_, i) => (
              <div key={i} className="skeleton h-20 rounded-lg" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
