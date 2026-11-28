"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { mockIllustration, mockMeta, mockResults, mockToneWav } from "@/lib/mock";
import type { AudioAsset, GenerateRequest, GenerateResponse, ImageAsset, MetaResponse } from "@shared/types";

// ===========================================================================
// SEAM — the only place that talks to "the backend".
// `src/lib/api-backend.ts` implements this for the QuestionBank Worker (Cloudflare); `mockBackend` powers `?mock=1`.
// ===========================================================================

export interface GeneratorBackend {
  loadMeta(): Promise<MetaResponse>;
  generate(req: GenerateRequest): Promise<GenerateResponse>;
  /** Regenerate one image; resolves with the new url/model. */
  regenerateImage(asset: ImageAsset, run: GenerateResponse, signal?: AbortSignal): Promise<ImageMediaResult>;
  /** Regenerate one audio; `url: null` ⇒ the UI plays it with browser TTS (labelled as such). */
  regenerateAudio(asset: AudioAsset, run: GenerateResponse, signal?: AbortSignal): Promise<AudioMediaResult>;
  /** When true, the hook generates every pending asset right after `generate` (max 3 concurrent). */
  autoMedia?: boolean;
}

export interface ImageMediaResult {
  url: string;
  model: string;
  mimeType?: string;
  bytes?: number;
  fileUrl?: string;
}
export interface AudioMediaResult {
  url: string | null;
  model: string;
  mimeType?: string;
  bytes?: number;
  fileUrl?: string;
  /** Why url is null (server TTS off/failed) */
  fallbackReason?: string;
}

const MEDIA_CONCURRENCY = 3;

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const mockBackend: GeneratorBackend = {
  async loadMeta() {
    await delay(150);
    return mockMeta;
  },
  async generate(req) {
    await delay(1000);
    const run = structuredClone(mockResults[req.type]);
    const now = new Date();
    run.runId = `run_${now.toISOString().replace(/\D/g, "").slice(0, 14)}_${req.type.toLowerCase()}`;
    run.createdAt = now.toISOString();
    run.request = req;
    if (req.options?.withImages === false) run.images = run.images.map((a) => ({ ...a, status: "skipped", url: undefined }));
    if (req.options?.withAudio === false) run.audios = run.audios.map((a) => ({ ...a, status: "skipped", url: undefined }));
    return run;
  },
  async regenerateImage(asset) {
    await delay(1400);
    const subject = /single (\w+)/i.exec(asset.prompt)?.[1] ?? asset.mediaKeyId;
    return { url: mockIllustration(subject, String(Date.now())), model: asset.model };
  },
  async regenerateAudio(asset) {
    await delay(1200);
    return { url: mockToneWav(asset.text), model: "mock-wav-tone" };
  },
};

// ===========================================================================

export interface UseGenerator {
  meta: MetaResponse | null;
  metaError: string | null;
  result: GenerateResponse | null;
  loading: boolean;
  error: string | null;
  generate: (req: GenerateRequest) => Promise<void>;
  reloadMeta: () => void;
  regenerateImage: (assetId: string) => Promise<void>;
  regenerateAudio: (assetId: string) => Promise<void>;
  patchImage: (assetId: string, patch: Partial<ImageAsset>) => void;
  patchAudio: (assetId: string, patch: Partial<AudioAsset>) => void;
  exportJson: () => void;
}

function message(e: unknown) {
  return e instanceof Error ? e.message : String(e);
}

// ---------------------------------------------------------------------------
// Generation history (per question type, this browser only) — fed to `options.avoid`.
// ---------------------------------------------------------------------------
const HISTORY_MAX = 60;
const historyKey = (type: string) => `qb.history.${type}`;

function readHistory(type: string): string[] {
  try {
    const raw = window.localStorage.getItem(historyKey(type));
    const list = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(list) ? list.filter((s): s is string => typeof s === "string").slice(-HISTORY_MAX) : [];
  } catch {
    return [];
  }
}

function writeHistory(type: string, signatures: string[]): void {
  if (!signatures.length) return;
  try {
    const merged = [...new Set([...readHistory(type), ...signatures])].slice(-HISTORY_MAX);
    window.localStorage.setItem(historyKey(type), JSON.stringify(merged));
  } catch {
    /* storage unavailable (private mode) — de-duplication still works inside one run */
  }
}

export function useGenerator(
  backend: GeneratorBackend = mockBackend,
  opts: { onRunCreated?: (run: GenerateResponse) => void } = {},
): UseGenerator {
  const [meta, setMeta] = useState<MetaResponse | null>(null);
  const [metaError, setMetaError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerateResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Latest result, for callbacks that must not re-create on every media patch.
  const resultRef = useRef<GenerateResponse | null>(null);
  useEffect(() => {
    resultRef.current = result;
  }, [result]);
  const onRunCreated = useRef(opts.onRunCreated);
  useEffect(() => {
    onRunCreated.current = opts.onRunCreated;
  }, [opts.onRunCreated]);

  const [metaTick, setMetaTick] = useState(0);
  const reloadMeta = useCallback(() => {
    setMetaError(null);
    setMetaTick((t) => t + 1);
  }, []);
  useEffect(() => {
    let alive = true;
    backend
      .loadMeta()
      .then((m) => alive && setMeta(m))
      .catch((e) => alive && setMetaError(message(e)));
    return () => {
      alive = false;
    };
  }, [backend, metaTick]);

  // Shared limiter: at most MEDIA_CONCURRENCY media requests in flight (auto queue + manual regenerate).
  const limiter = useRef<{ active: number; waiters: Array<() => void> }>({ active: 0, waiters: [] });
  const acquire = useCallback(async () => {
    const l = limiter.current;
    if (l.active >= MEDIA_CONCURRENCY) await new Promise<void>((r) => l.waiters.push(r));
    else l.active++;
  }, []);
  const release = useCallback(() => {
    const l = limiter.current;
    const next = l.waiters.shift();
    if (next) next();
    else l.active--;
  }, []);
  const mediaAbort = useRef<AbortController | null>(null);

  const patchImage = useCallback((assetId: string, patch: Partial<ImageAsset>) => {
    setResult((r) => (r ? { ...r, images: r.images.map((a) => (a.id === assetId ? { ...a, ...patch } : a)) } : r));
  }, []);

  const patchAudio = useCallback((assetId: string, patch: Partial<AudioAsset>) => {
    setResult((r) => (r ? { ...r, audios: r.audios.map((a) => (a.id === assetId ? { ...a, ...patch } : a)) } : r));
  }, []);

  const runImage = useCallback(
    async (run: GenerateResponse, asset: ImageAsset, signal?: AbortSignal) => {
      const patch = (p: Partial<ImageAsset>) =>
        setResult((r) =>
          r && r.runId === run.runId ? { ...r, images: r.images.map((a) => (a.id === asset.id ? { ...a, ...p } : a)) } : r,
        );
      await acquire();
      try {
        if (signal?.aborted) return;
        patch({ status: "generating", error: undefined });
        const { url, model, mimeType, bytes, fileUrl } = await backend.regenerateImage(asset, run, signal);
        patch({ status: "done", url, model, mimeType, bytes, fileUrl, error: undefined });
      } catch (e) {
        if (signal?.aborted) return;
        patch({ status: "error", error: message(e) });
      } finally {
        release();
      }
    },
    [backend, acquire, release],
  );

  const runAudio = useCallback(
    async (run: GenerateResponse, asset: AudioAsset, signal?: AbortSignal) => {
      const patch = (p: Partial<AudioAsset>) =>
        setResult((r) =>
          r && r.runId === run.runId ? { ...r, audios: r.audios.map((a) => (a.id === asset.id ? { ...a, ...p } : a)) } : r,
        );
      await acquire();
      try {
        if (signal?.aborted) return;
        patch({ status: "generating", error: undefined });
        const { url, model, mimeType, bytes, fileUrl } = await backend.regenerateAudio(asset, run, signal);
        patch({ status: "done", url: url ?? undefined, model, mimeType, bytes, fileUrl, error: undefined });
      } catch (e) {
        if (signal?.aborted) return;
        patch({ status: "error", error: message(e) });
      } finally {
        release();
      }
    },
    [backend, acquire, release],
  );

  const generate = useCallback(
    async (req: GenerateRequest) => {
      mediaAbort.current?.abort(); // a new run cancels the previous media queue
      mediaAbort.current = null;
      setLoading(true);
      setError(null);
      try {
        // Anti-duplicate: send what was generated before for this type so the model does not repeat it.
        const avoid = readHistory(req.type);
        const sent: GenerateRequest = avoid.length ? { ...req, options: { ...req.options, avoid } } : req;
        let run = await backend.generate(sent);
        writeHistory(
          req.type,
          run.questions.map((q) => q.signature).filter((s): s is string => Boolean(s)),
        );
        const wantImages = req.options?.withImages !== false;
        const wantAudio = req.options?.withAudio !== false;
        if (backend.autoMedia) {
          run = {
            ...run,
            images: run.images.map((a) => (!wantImages && a.status === "pending" ? { ...a, status: "skipped" } : a)),
            audios: run.audios.map((a) => (!wantAudio && a.status === "pending" ? { ...a, status: "skipped" } : a)),
          };
        }
        setResult(run);
        onRunCreated.current?.(run);
        if (backend.autoMedia) {
          const ctl = new AbortController();
          mediaAbort.current = ctl;
          const finalRun = run;
          for (const a of finalRun.images) if (a.status === "pending") void runImage(finalRun, a, ctl.signal);
          for (const a of finalRun.audios) if (a.status === "pending") void runAudio(finalRun, a, ctl.signal);
        }
      } catch (e) {
        setError(message(e));
      } finally {
        setLoading(false);
      }
    },
    [backend, runImage, runAudio],
  );

  useEffect(() => () => mediaAbort.current?.abort(), []);

  const regenerateImage = useCallback(
    async (assetId: string) => {
      const run = resultRef.current;
      const asset = run?.images.find((x) => x.id === assetId);
      if (!run || !asset || asset.status === "generating") return;
      await runImage(run, asset, mediaAbort.current?.signal);
    },
    [runImage],
  );

  const regenerateAudio = useCallback(
    async (assetId: string) => {
      const run = resultRef.current;
      const asset = run?.audios.find((x) => x.id === assetId);
      if (!run || !asset || asset.status === "generating") return;
      await runAudio(run, asset, mediaAbort.current?.signal);
    },
    [runAudio],
  );

  const exportJson = useCallback(() => {
    const run = resultRef.current;
    if (!run) return;
    const blob = new Blob([JSON.stringify(run, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${run.runId}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, []);

  return { meta, metaError, result, loading, error, generate, reloadMeta, regenerateImage, regenerateAudio, patchImage, patchAudio, exportJson };
}
