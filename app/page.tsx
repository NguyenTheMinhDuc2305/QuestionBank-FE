"use client";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { api, supabase } from "../lib/client";

type LO = { id: string; code: string; unit: number; specific_name: string; content: string };
type Job = { id: string; status: string; config: { count: number; question_type: string }; completed_count: number; error?: string; questions?: { id: string; question_type: string; status: string }[] };
type Question = { id: string; question_type: string; status: string; instruction_text: string; hint: string; explanation: string; detail: Record<string, unknown>; items: Record<string, unknown>[]; media: Record<string, { kind: string; url: string; transcript?: string; prompt?: string; description?: string }> };
type Config = { text_model: string; audio_model: string; missing_text_settings: string[]; missing_media_settings: string[] };
const types = ["COMP_SEL", "TYPING", "MATCH", "ORDER", "LISTEN"];
const message = (e: unknown) => e instanceof Error ? e.message : String(e);

export default function Page() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [grade, setGrade] = useState(1);
  const [los, setLos] = useState<LO[]>([]);
  const [loId, setLoId] = useState("");
  const [type, setType] = useState("COMP_SEL");
  const [bloom, setBloom] = useState(1);
  const [count, setCount] = useState(1);
  const [images, setImages] = useState(false);
  const [audio, setAudio] = useState(false);
  const [instructions, setInstructions] = useState("");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [question, setQuestion] = useState<Question | null>(null);
  const [config, setConfig] = useState<Config | null>(null);
  // Retain idempotency key when retrying a request whose response was lost.
  const [pending, setPending] = useState<{ signature: string; key: string } | null>(null);

  useEffect(() => {
    try {
      const client = supabase();
      client.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true); });
      const { data } = client.auth.onAuthStateChange((_event, next) => setSession(next));
      return () => data.subscription.unsubscribe();
    } catch (e) { setError(message(e)); setReady(true); }
  }, []);

  useEffect(() => {
    if (!session) return;
    let active = true;
    Promise.all([api<LO[]>(`/v1/learning-objectives?grade=${grade}&limit=1000`), api<Config>("/v1/config")])
      .then(([rows, conf]) => { if (active) { setLos(rows); setLoId(rows[0]?.id ?? ""); setConfig(conf); } })
      .catch(e => { if (active) setError(message(e)); });
    return () => { active = false; };
  }, [session?.user.id, grade]);

  useEffect(() => {
    if (!session) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        const rows = await api<Job[]>("/v1/jobs");
        if (active) setJobs(rows);
        if (selectedJob?.id) {
          const detail = await api<Job>(`/v1/jobs/${selectedJob.id}`);
          if (active) setSelectedJob(detail);
        }
      } catch (e) { if (active) setError(message(e)); }
      if (active) timer = setTimeout(poll, 5000);
    }
    poll();
    return () => { active = false; clearTimeout(timer); };
  }, [session?.user.id, selectedJob?.id]);

  async function login(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError("");
    try {
      const { error } = await supabase().auth.signInWithPassword({ email, password });
      if (error) throw error;
      setPassword("");
    } catch (e) { setError(message(e)); } finally { setBusy(false); }
  }
  async function generate(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError("");
    const body = { lo_id: loId, question_type: type, bloom_level: bloom, count,
      include_images: type === "LISTEN" || (type !== "ORDER" && images),
      include_audio: type === "LISTEN" || audio, instructions };
    const signature = JSON.stringify(body);
    const key = pending?.signature === signature ? pending.key : crypto.randomUUID();
    setPending({ signature, key });
    try {
      const job = await api<Job>("/v1/jobs", { method: "POST", body: JSON.stringify({ ...body, request_key: key }) });
      setSelectedJob(job); setPending(null); setQuestion(null);
    } catch (e) { setError(message(e)); } finally { setBusy(false); }
  }
  async function openQuestion(id: string) {
    try { setQuestion(await api<Question>(`/v1/questions/${id}`)); } catch (e) { setError(message(e)); }
  }
  async function review(status: string) {
    if (!question || !confirm(`Xác nhận ${status}? Bạn đã kiểm tra đáp án, ảnh và audio?`)) return;
    try {
      await api(`/v1/questions/${question.id}/review`, { method: "PATCH", body: JSON.stringify({ status }) });
      await openQuestion(question.id);
    } catch (e) { setError(message(e)); }
  }
  if (!ready) return <main>Đang tải…</main>;
  if (!session) return <main className="login"><section><h1>QuestionBank Studio</h1><p className="muted">POC nội bộ · Tài khoản do quản trị viên cấp</p>
    {error && <p className="error" role="alert">{error}</p>}
    <form onSubmit={login}><label>Email</label><input type="email" required value={email} onChange={e => setEmail(e.target.value)} autoComplete="username" />
    <label>Mật khẩu</label><input type="password" required value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" />
    <p><button disabled={busy}>Đăng nhập</button></p></form></section></main>;
  const selectedLO = los.find(lo => lo.id === loId);
  return <main>
    <header><div><h1>QuestionBank Studio</h1><small>Draft → kiểm tra → duyệt · {session.user.email}</small></div>
      <button className="secondary" onClick={async () => { await supabase().auth.signOut(); setQuestion(null); setJobs([]); setSelectedJob(null); }}>Đăng xuất</button></header>
    {error && <p className="error" role="alert">{error} <button onClick={() => setError("")}>Đóng</button></p>}
    {config && config.missing_media_settings.length > 0 && <p className="notice">Cấu hình backend còn thiếu: {config.missing_media_settings.join(", ")}. Không tự chọn model hoặc phát sinh phí khi thiếu cấu hình.</p>}
    <div className="grid"><section><h2>Tạo câu hỏi</h2><form onSubmit={generate}>
      <label>Khối</label><select value={grade} onChange={e => setGrade(Number(e.target.value))}>{[1,2,3,4].map(g => <option key={g}>{g}</option>)}</select>
      <label>Learning objective</label><select required value={loId} onChange={e => setLoId(e.target.value)}>{los.length === 0 && <option value="">Chưa có LO — chạy bootstrap</option>}{los.map(lo => <option key={lo.id} value={lo.id}>U{lo.unit} · {lo.specific_name} · {lo.content.slice(0,75)}</option>)}</select>
      {selectedLO && <details><summary>Chi tiết LO</summary><pre>{selectedLO.content}</pre></details>}
      <label>Dạng bài</label><select value={type} onChange={e => setType(e.target.value)}>{types.map(t => <option key={t}>{t}</option>)}</select>
      <label>Bloom (thang nội bộ)</label><select value={bloom} onChange={e => setBloom(Number(e.target.value))}>{["1 · Nhận biết","2 · Thông hiểu","3 · Vận dụng","4 · Vận dụng cao"].map((x,i) => <option key={x} value={i+1}>{x}</option>)}</select>
      <label>Số câu (1–10)</label><input type="number" min={1} max={10} required value={count} onChange={e => setCount(Number(e.target.value))} />
      <label><input type="checkbox" checked={type === "LISTEN" || (type !== "ORDER" && images)} disabled={type === "LISTEN" || type === "ORDER"} onChange={e => setImages(e.target.checked)} /> Tạo ảnh</label>
      <label><input type="checkbox" checked={type === "LISTEN" || audio} disabled={type === "LISTEN"} onChange={e => setAudio(e.target.checked)} /> Audio riêng cho từng đáp án/item</label>
      <label>Yêu cầu bổ sung</label><textarea maxLength={2000} value={instructions} onChange={e => setInstructions(e.target.value)} />
      <p className="muted">Bấm tạo sẽ gọi provider có tính phí khi worker hoạt động. Kết quả luôn ở trạng thái draft.</p>
      <button disabled={busy || !loId || !config || config.missing_text_settings.length > 0}>Tạo generation job</button>
    </form></section>
    <section><h2>Generation jobs</h2>{jobs.length === 0 && <p>Chưa có job.</p>}{jobs.map(j => <button className="job" key={j.id} onClick={() => { setSelectedJob(j); setQuestion(null); }}>{j.config.question_type} · {j.status} · {j.completed_count}/{j.config.count}<br/><small>{j.id}</small></button>)}
    {selectedJob && <div><h3>{selectedJob.status}</h3>{selectedJob.error && <p className="error">{selectedJob.error}</p>}{selectedJob.questions?.map(q => <button key={q.id} onClick={() => openQuestion(q.id)}>{q.question_type} · {q.status}</button>)}</div>}</section></div>
    {question && <section><h2>Preview nội bộ · {question.question_type} · {question.status}</h2><p>{question.instruction_text}</p>
      <p className="notice">Preview hiển thị đáp án đúng. Không phải màn hình dành cho học viên. URL media hết hạn sau 10 phút; mở lại câu để làm mới.</p>
      <pre>{JSON.stringify({ detail: question.detail, items: question.items }, null, 2)}</pre>
      <div className="media">{Object.entries(question.media).map(([id, m]) => <article key={id}><small>{id}</small>{m.kind === "images" ? <img src={m.url} alt="Generated draft — verify against the question" /> : <audio controls src={m.url} preload="none" />}<p>{m.transcript || m.prompt}</p></article>)}</div>
      <p><strong>Hint:</strong> {question.hint}</p><p><strong>Explanation:</strong> {question.explanation}</p>
      <button onClick={() => review("approved")}>Duyệt sau khi kiểm tra</button><button className="secondary" onClick={() => review("retired")}>Ngừng sử dụng</button>
    </section>}
  </main>;
}
