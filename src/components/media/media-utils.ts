/** Helpers for showing media URLs without ever printing a (huge) data URL. */

const EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/wave": "wav",
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/ogg": "ogg",
  "audio/webm": "webm",
  "audio/aac": "aac",
};

function parseDataUrl(url: string): { mime: string; bytes: number } | null {
  if (!url.startsWith("data:")) return null;
  const comma = url.indexOf(",");
  if (comma < 0) return null;
  const header = url.slice(5, comma);
  const mime = header.split(";")[0] || "application/octet-stream";
  const payload = url.length - comma - 1;
  let bytes: number;
  if (header.includes(";base64")) bytes = Math.floor((payload * 3) / 4);
  else {
    // percent-encoded: each %XX is one byte
    const encoded = (url.slice(comma + 1).match(/%[0-9a-f]{2}/gi) ?? []).length;
    bytes = payload - encoded * 2;
  }
  return { mime, bytes };
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

/** Short label: "data:image/svg+xml… (3.1 KB)" for data URLs, the path for normal URLs. */
export function describeUrl(url: string): string {
  const d = parseDataUrl(url);
  if (d) return `data:${d.mime}… (${formatBytes(d.bytes)})`;
  return url.length > 60 ? `${url.slice(0, 57)}…` : url;
}

/** File name for a download link, extension derived from the data URL mime or the path. */
export function downloadName(base: string, url: string): string {
  const d = parseDataUrl(url);
  let ext = d ? EXT[d.mime] : undefined;
  if (!ext) ext = /\.([a-z0-9]{2,4})(?:[?#]|$)/i.exec(url)?.[1]?.toLowerCase();
  return `${base}.${ext ?? "bin"}`;
}
