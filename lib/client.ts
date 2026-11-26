import { createClient, SupabaseClient } from "@supabase/supabase-js";
let instance: SupabaseClient | undefined;
export function supabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Thiếu cấu hình Supabase frontend. Kiểm tra .env.local / Vercel.");
  if (key.startsWith("sb_secret_")) throw new Error("Không được sử dụng secret key ở frontend");
  instance ??= createClient(url, key);
  return instance;
}
export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const { data: { session } } = await supabase().auth.getSession();
  if (!session) throw new Error("Vui lòng đăng nhập");
  const base = process.env.NEXT_PUBLIC_AI_CORE_URL;
  if (!base) throw new Error("Thiếu NEXT_PUBLIC_AI_CORE_URL");
  const response = await fetch(base.replace(/\/$/, "") + path, {
    ...options, headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}`, ...options.headers },
  });
  const body = await response.json();
  if (!response.ok) throw new Error(typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail));
  return body as T;
}
