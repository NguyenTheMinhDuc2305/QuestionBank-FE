/**
 * Low-level client for the QuestionBank Worker (Cloudflare). Base URL: NEXT_PUBLIC_AI_CORE_URL.
 * The Worker holds every API key; this file never sees one.
 */

/** HTTP error with a readable message. `status === 0` means the backend was unreachable. */
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

const BASE = (process.env.NEXT_PUBLIC_AI_CORE_URL ?? "").replace(/\/+$/, "");

function detailMessage(detail: unknown): string {
  if (detail == null) return "";
  if (typeof detail === "string") return detail;
  if (typeof detail === "object" && detail && "missing_settings" in detail) {
    const missing = (detail as { missing_settings: string[] }).missing_settings;
    return `Backend còn thiếu cấu hình: ${missing.join(", ")}`;
  }
  return JSON.stringify(detail);
}

export async function request<T>(path: string, init: RequestInit = {}, signal?: AbortSignal): Promise<T> {
  if (!BASE) throw new HttpError(0, "Thiếu NEXT_PUBLIC_AI_CORE_URL (địa chỉ backend Worker).");
  const headers = new Headers(init.headers);
  if (init.body) headers.set("content-type", "application/json");
  let res: Response;
  try {
    res = await fetch(BASE + path, { ...init, headers, signal });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") throw e;
    throw new HttpError(0, "Không kết nối được backend. Kiểm tra mạng hoặc địa chỉ NEXT_PUBLIC_AI_CORE_URL.");
  }
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    /* non-JSON body (e.g. proxy error page) */
  }
  if (!res.ok) {
    const detail = (json as { detail?: unknown } | null)?.detail;
    const msg = detailMessage(detail) || (res.status >= 500 ? "Backend gặp lỗi, thử lại sau." : `HTTP ${res.status}`);
    throw new HttpError(res.status, msg, detail);
  }
  return json as T;
}

// ---------------------------------------------------------------------------
// Worker response shapes (subset used by the UI)
// ---------------------------------------------------------------------------

export type WorkerType = "COMP_SEL" | "TYPING" | "MATCH" | "ORDER" | "LISTEN";
export type ReviewStatus = "draft" | "approved" | "retired";

export interface WorkerLO {
  id: string;
  code: string;
  grade: number;
  unit: number;
  general_name: string;
  specific_name: string;
  category: string;
  content: string;
  /** Row number in the source CSV (keeps the curriculum order). */
  source_record?: number;
}

export interface WorkerConfig {
  question_types: WorkerType[];
  text_model: string;
  audio_model: string;
  audio_voice: string;
  image_provider: string;
  missing_text_settings: string[];
  missing_media_settings: string[];
}

export interface WorkerJob {
  id: string;
  status: "queued" | "running" | "completed" | "failed";
  completed_count: number;
  error: string | null;
  created_at: string;
  config: { count: number; question_type: WorkerType; lo_id: string };
  questions?: Array<{ id: string; item_index: number }>;
}

export interface WorkerMedia {
  id: string;
  kind: "images" | "audios";
  url: string;
  object_key: string;
  model_name: string;
  prompt?: string;
  negative_prompt?: string;
  effective_prompt?: string;
  transcript?: string;
  voice?: string;
}

export type Row = Record<string, unknown>;

export interface WorkerQuestion {
  id: string;
  question_type: WorkerType;
  bloom_level: number;
  status: ReviewStatus;
  instruction_text: string;
  hint: string;
  explanation: string;
  job_id: string;
  item_index: number;
  created_at: string;
  detail: Row | null;
  items: Row[];
  media: Record<string, WorkerMedia>;
  learning_objectives?: Array<Pick<WorkerLO, "id" | "code" | "grade" | "unit" | "specific_name" | "content">>;
}

export interface WorkerQuestionSummary {
  id: string;
  question_type: WorkerType;
  bloom_level: number;
  status: ReviewStatus;
  instruction_text: string;
  created_at: string;
  job_id: string;
  item_index: number;
  summary: string;
  lo: Pick<WorkerLO, "id" | "code" | "grade" | "unit" | "specific_name" | "content"> | null;
}

export interface QuestionPage {
  items: WorkerQuestionSummary[];
  offset: number;
  limit: number;
  has_more: boolean;
}

export interface JobRequest {
  request_key: string;
  lo_id: string;
  question_type: WorkerType;
  bloom_level: number;
  count: number;
  include_images: boolean;
  include_audio: boolean;
  instructions: string;
}

export const workerApi = {
  config: () => request<WorkerConfig>("/v1/config"),
  learningObjectives: () => request<WorkerLO[]>("/v1/learning-objectives?limit=1000"),
  createJob: (body: JobRequest, signal?: AbortSignal) =>
    request<WorkerJob>("/v1/jobs", { method: "POST", body: JSON.stringify(body) }, signal),
  job: (id: string, signal?: AbortSignal) => request<WorkerJob>(`/v1/jobs/${id}`, {}, signal),
  question: (id: string, signal?: AbortSignal) => request<WorkerQuestion>(`/v1/questions/${id}`, {}, signal),
  questions: (params: Record<string, string | number | undefined>, signal?: AbortSignal) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "") qs.set(k, String(v));
    return request<QuestionPage>(`/v1/questions?${qs}`, {}, signal);
  },
  review: (id: string, status: "approved" | "retired") =>
    request<unknown>(`/v1/questions/${id}/review`, { method: "PATCH", body: JSON.stringify({ status }) }),
};
