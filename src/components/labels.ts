import type { BloomLevel, MediaTarget, QuestionTypeCode } from "@shared/types";

/** Static labels used where `MetaResponse` is not at hand (results view). Mirrors the meta catalogue. */
export const BLOOM_LABEL: Record<BloomLevel, string> = {
  M1: "Nhận biết",
  M2: "Thông hiểu",
  M3: "Vận dụng",
  M4: "Vận dụng cao",
};

export const TYPE_LABEL: Record<QuestionTypeCode, string> = {
  COMP_SEL: "Chọn đáp án điền khuyết",
  RESP_SEL: "Chọn câu trả lời phù hợp",
  TYPING: "Gõ đáp án",
  MATCH: "Nối cột A – B",
  ORDER: "Sắp xếp thành câu",
  LISTEN: "Nghe và sắp xếp tranh",
  SPEAK: "Luyện nói (iSpeak)",
};

export const TARGET_LABEL: Record<MediaTarget, string> = {
  question: "Đề bài",
  option: "Đáp án",
  pairA: "Cột A",
  pairB: "Cột B",
  item: "Item",
  answer: "Câu trả lời",
};

/**
 * LO cháu names can be multi-line grammar blocks ("Pattern: ...\nConstraint: ...").
 * Returns a one-line title (without the "Pattern:" prefix) and the remaining lines.
 */
export function summarizeLo(name: string): { title: string; rest: string[]; isPattern: boolean } {
  const lines = name
    .split("\n")
    .map((l) => l.trimEnd())
    .filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { title: name, rest: [], isPattern: false };
  const isPattern = /^pattern\s*:/i.test(lines[0]);
  let title = lines[0].replace(/^pattern\s*:\s*/i, "").trim();
  let restStart = 1;
  if (!title && lines.length > 1) {
    title = lines[1].trim();
    restStart = 2;
  }
  return { title, rest: lines.slice(restStart), isPattern };
}

/** Lowercase + strip Vietnamese diacritics, for forgiving search ("tu vung" matches "Từ vựng"). */
export function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "medium" });
}
