import type { GeneratorBackend } from "@/components/useGenerator";
import { mockMeta, questionTypes } from "@/lib/mock";
import type { AudioAsset, GenerateRequest, GenerateResponse, GeneratedQuestion, ImageAsset, MetaResponse } from "@shared/types";
import { HttpError, type WorkerLO, type WorkerType, workerApi } from "./api-client";
import { bloomLevel, buildLoTree, convertQuestion } from "./convert";

/**
 * Adapter between the original QuestionBank UI and the QuestionBank Worker (Cloudflare Workflows).
 * One generation = one Worker job per selected LO cháu; images and audio are produced server-side,
 * so the UI receives finished assets (no per-asset generation from the browser).
 */

const SUPPORTED: WorkerType[] = ["COMP_SEL", "TYPING", "MATCH", "ORDER", "LISTEN"];
/** Must not exceed the Worker's MAX_ACTIVE_JOBS. */
const JOB_CONCURRENCY = 3;
const POLL_MS = 5000;
const JOB_TIMEOUT_MS = 20 * 60 * 1000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** LO rows by code (filled by loadMeta; used to resolve codes and unit names). */
const loByCode = new Map<string, WorkerLO>();
const loById = new Map<string, WorkerLO>();

export async function ensureLos(): Promise<void> {
  if (loByCode.size) return;
  for (const lo of await workerApi.learningObjectives()) {
    loByCode.set(lo.code, lo);
    loById.set(lo.id, lo);
  }
}
export const findLoById = (id: string | undefined) => (id ? loById.get(id) : undefined);

// ---------------------------------------------------------------------------
// Progress (shown by the loading state while jobs run; generation takes 1–3 minutes)
// ---------------------------------------------------------------------------

export interface GenerationProgress {
  total: number;
  done: number;
  running: number;
  questions: number;
}
type ProgressListener = (p: GenerationProgress | null) => void;
const progressListeners = new Set<ProgressListener>();
let lastProgress: GenerationProgress | null = null;
export function onGenerationProgress(fn: ProgressListener) {
  progressListeners.add(fn);
  fn(lastProgress);
  return () => {
    progressListeners.delete(fn);
  };
}
function emit(p: GenerationProgress | null) {
  lastProgress = p;
  progressListeners.forEach((l) => l(p));
}

// ---------------------------------------------------------------------------

function instructionsFor(req: GenerateRequest): string {
  const parts: string[] = [];
  if (req.type === "MATCH" && req.options?.matchMode === "en_image")
    parts.push("MATCH: left = English word, right = the same English word illustrated by an image (image on the right side).");
  if (req.type === "MATCH" && req.options?.matchMode === "en_vi")
    parts.push("MATCH: left = English word or phrase, right = its Vietnamese meaning (text only on the right side).");
  const avoid = (req.options?.avoid ?? []).slice(-20);
  if (avoid.length) parts.push(`Do not repeat these previously generated questions: ${avoid.join(" || ")}`);
  return parts.join("\n").slice(0, 2000);
}

/** Create a job, waiting while the Worker's active-job limit is reached. */
async function createJob(loId: string, req: GenerateRequest) {
  const wantImages = req.options?.withImages !== false;
  const wantAudio = req.options?.withAudio !== false;
  const body = {
    request_key: crypto.randomUUID(),
    lo_id: loId,
    question_type: req.type as WorkerType,
    bloom_level: bloomLevel(req.bloom),
    count: req.count,
    include_images: req.type === "LISTEN" || (req.type !== "ORDER" && wantImages),
    include_audio: req.type === "LISTEN" || wantAudio,
    instructions: instructionsFor(req),
  };
  for (let attempt = 0; ; attempt++) {
    try {
      return await workerApi.createJob(body); // same request_key on retry ⇒ never a duplicate job
    } catch (e) {
      if (e instanceof HttpError && e.status === 429 && attempt < 120) {
        await sleep(POLL_MS);
        continue;
      }
      throw e;
    }
  }
}

async function waitForJob(id: string) {
  const deadline = Date.now() + JOB_TIMEOUT_MS;
  for (;;) {
    const job = await workerApi.job(id);
    if (job.status === "completed" || job.status === "failed") return job;
    if (Date.now() > deadline) throw new HttpError(504, "Job chạy quá lâu; xem lại trong tab Câu đã tạo sau.");
    await sleep(POLL_MS);
  }
}

export interface ConvertedRun {
  questions: GeneratedQuestion[];
  images: ImageAsset[];
  audios: AudioAsset[];
}

/** Fetch and convert questions by id (signed media URLs are valid for 10 minutes). */
export async function loadQuestions(ids: string[]): Promise<ConvertedRun> {
  await ensureLos();
  const out: ConvertedRun = { questions: [], images: [], audios: [] };
  for (const id of ids) {
    const w = await workerApi.question(id);
    const c = convertQuestion(w, loByCode.get(w.learning_objectives?.[0]?.code ?? ""));
    out.questions.push(c.question);
    out.images.push(...c.images);
    out.audios.push(...c.audios);
  }
  return out;
}

export const apiBackend: GeneratorBackend = {
  autoMedia: false,
  async loadMeta(): Promise<MetaResponse> {
    const [config] = await Promise.all([workerApi.config(), ensureLos()]);
    const tree = buildLoTree([...loByCode.values()]);
    return {
      questionTypes: questionTypes.map((t) =>
        SUPPORTED.includes(t.code as WorkerType)
          ? { ...t, enabled: true }
          : { ...t, enabled: false, phaseNote: "Chưa hỗ trợ trên backend mới" },
      ),
      loTree: tree,
      bloomLevels: mockMeta.bloomLevels,
      limits: { maxQuestions: 10, maxTotalQuestions: 30 },
      models: { text: config.text_model, image: config.image_provider, audio: config.audio_model },
      hasApiKey: config.missing_text_settings.length === 0,
    };
  },

  async generate(req): Promise<GenerateResponse> {
    await ensureLos();
    const los = req.loCodes.map((code) => {
      const lo = loByCode.get(code);
      if (!lo) throw new HttpError(422, `Không tìm thấy LO ${code}`);
      return lo;
    });
    const progress: GenerationProgress = { total: los.length, done: 0, running: 0, questions: 0 };
    emit({ ...progress });
    const results: Array<{ jobId: string; questionIds: string[]; error?: string }> = [];
    const warnings: string[] = [];
    try {
      let next = 0;
      const worker = async () => {
        while (next < los.length) {
          const lo = los[next++];
          progress.running++;
          emit({ ...progress });
          try {
            const created = await createJob(lo.id, req);
            const job = await waitForJob(created.id);
            const ids = (job.questions ?? []).sort((a, b) => a.item_index - b.item_index).map((q) => q.id);
            results.push({ jobId: job.id, questionIds: ids, error: job.status === "failed" ? (job.error ?? "Job thất bại") : undefined });
            progress.questions += ids.length;
          } catch (e) {
            results.push({ jobId: "", questionIds: [], error: e instanceof Error ? e.message : String(e) });
          } finally {
            progress.running--;
            progress.done++;
            emit({ ...progress });
          }
        }
      };
      await Promise.all(Array.from({ length: Math.min(JOB_CONCURRENCY, los.length) }, worker));
    } finally {
      emit(null);
    }

    const ids = results.flatMap((r) => r.questionIds);
    for (const r of results) if (r.error) warnings.push(r.error);
    if (!ids.length) throw new HttpError(502, warnings[0] ?? "Không tạo được câu hỏi nào.");

    const run = await loadQuestions(ids);
    // Group by LO in the selected order (the results view groups consecutive LO).
    const rank = new Map(req.loCodes.map((c, i) => [c, i]));
    run.questions.sort((a, b) => (rank.get(a.lo.code) ?? 0) - (rank.get(b.lo.code) ?? 0));
    const now = new Date();
    return {
      runId: `run_${now.toISOString().replace(/\D/g, "").slice(0, 14)}_${req.type.toLowerCase()}`,
      request: req,
      createdAt: now.toISOString(),
      model: (await workerApi.config()).text_model,
      ...run,
      warnings,
    };
  },

  async regenerateImage() {
    throw new HttpError(501, "Chưa hỗ trợ tạo lại từng ảnh; hãy tạo lại câu hỏi.");
  },
  async regenerateAudio() {
    throw new HttpError(501, "Chưa hỗ trợ tạo lại từng audio; hãy tạo lại câu hỏi.");
  },
};
