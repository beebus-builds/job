"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "../lib/api";
import { useLang } from "../components/lang";
import { useAuth } from "../components/auth";

const CATS = ["Engineering", "Design", "Marketing", "Finance", "HR", "Sales", "Support", "Internship", "Other"];
const input = "mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-400";

export default function EmployersClient() {
  const { t } = useLang();
  const { user } = useAuth();
  const [f, setF] = useState({
    title: "", company: "", location: "Kathmandu", work_type: "Full-time",
    category: "Engineering", salary: "", skills: "",
    description: "", apply_url: "", contact_email: "", deadline: "", destination: "",
  });
  const [posts, setPosts] = useState<any[]>([]);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const load = () => api.board().then((d) => setPosts(d.results ?? [])).catch((e) => setMsg(String(e)));
  useEffect(() => { load(); }, []);

  const set = (k: keyof typeof f, v: string) => setF({ ...f, [k]: v });

  const draftWithAI = async () => {
    if (!f.title || !f.company) return setMsg(t("e.enter_first"));
    setBusy(true);
    try {
      const d = await api.genPost({
        title: f.title, company: f.company, location: f.location,
        work_type: f.work_type, salary: f.salary,
        skills: f.skills.split(",").map((s) => s.trim()).filter(Boolean),
        responsibilities: "",
      });
      setF({ ...f, description: d.posting });
      setMsg(t("e.draft_ready"));
    } catch (e) { setMsg(String(e)); } finally { setBusy(false); }
  };

  const publish = async () => {
    if (!f.title || !f.company || !f.description) return setMsg(t("e.required"));
    setBusy(true);
    try {
      const j = await api.boardPost({ ...f, skills: f.skills.split(",").map((s) => s.trim()).filter(Boolean) });
      setMsg(`${t("e.published")} /jobs/${j.id}`);
      setF({ ...f, title: "", description: "", skills: "" });
      load();
    } catch (e) { setMsg(String(e)); } finally { setBusy(false); }
  };

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-6 py-10">
      <div className="overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 p-8 text-white sm:p-10">
        <h1 className="max-w-xl text-3xl font-extrabold tracking-tight">{t("emp.title")}</h1>
        <p className="mt-2 max-w-xl text-sm text-indigo-100">{t("emp.sub")}</p>
      </div>

      {msg && <div className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm shadow-sm">{msg}</div>}

      {!user ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {t("co.own_hint")} <Link href="/login" className="font-bold underline">Log in →</Link>
          {" · "}<Link href="/company" className="font-bold underline">Company site →</Link>
        </div>
      ) : (
        <Link href="/company" className="inline-block rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50">
          🏢 {t("nav.company")} →
        </Link>
      )}

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-3 md:grid-cols-3">
          <label className="text-xs font-semibold text-slate-500">{t("e.title")}<input value={f.title} onChange={(e) => set("title", e.target.value)} placeholder="Backend Engineer" className={input} /></label>
          <label className="text-xs font-semibold text-slate-500">{t("e.company")}<input value={f.company} onChange={(e) => set("company", e.target.value)} placeholder="Himal Data" className={input} /></label>
          <label className="text-xs font-semibold text-slate-500">{t("e.location")}<input value={f.location} onChange={(e) => set("location", e.target.value)} className={input} /></label>
          <label className="text-xs font-semibold text-slate-500">{t("dest.label")}
            <select value={f.destination} onChange={(e) => set("destination", e.target.value)} className={input}>
              <option value="">{t("dest.nepal")}</option>
              {["Qatar", "UAE", "Saudi Arabia", "Malaysia", "South Korea", "Japan", "Other abroad"].map((d) => <option key={d}>{d}</option>)}
            </select></label>
          <label className="text-xs font-semibold text-slate-500">{t("e.worktype")}
            <select value={f.work_type} onChange={(e) => set("work_type", e.target.value)} className={input}>
              {["Full-time", "Part-time", "Contract", "Internship", "Freelance"].map((w) => <option key={w}>{w}</option>)}
            </select></label>
          <label className="text-xs font-semibold text-slate-500">{t("e.category")}
            <select value={f.category} onChange={(e) => set("category", e.target.value)} className={input}>
              {CATS.map((c) => <option key={c}>{c}</option>)}
            </select></label>
          <label className="text-xs font-semibold text-slate-500">{t("e.salary")}<input value={f.salary} onChange={(e) => set("salary", e.target.value)} placeholder="Rs. 80k–120k/month" className={input} /></label>
          <label className="text-xs font-semibold text-slate-500 md:col-span-2">{t("e.skills")}<input value={f.skills} onChange={(e) => set("skills", e.target.value)} placeholder="Python, FastAPI, PostgreSQL" className={input} /></label>
          <label className="text-xs font-semibold text-slate-500">{t("e.apply_url")}<input value={f.apply_url} onChange={(e) => set("apply_url", e.target.value)} placeholder="https://…" className={input} /></label>
        </div>
        <label className="mt-3 block text-xs font-semibold text-slate-500">{t("e.contact")}<input value={f.contact_email} onChange={(e) => set("contact_email", e.target.value)} placeholder="hiring@company.com" className={input} /></label>
        <label className="mt-3 block text-xs font-semibold text-slate-500">{t("co.deadline")}<input type="date" value={f.deadline} onChange={(e) => set("deadline", e.target.value)} className={input} /></label>
        <label className="mt-3 block text-xs font-semibold text-slate-500">{t("e.desc")}
          <textarea value={f.description} onChange={(e) => set("description", e.target.value)} rows={8} placeholder={t("e.desc_ph")}
            className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none focus:border-indigo-400" /></label>
        <div className="mt-3 flex flex-wrap gap-2">
          <button onClick={draftWithAI} disabled={busy} className="rounded-xl bg-slate-100 px-5 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-200">
            {busy ? "…" : t("e.draft")}</button>
          <button onClick={publish} disabled={busy} className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-2.5 text-sm font-bold text-white hover:opacity-90">
            {t("e.publish")}</button>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-extrabold tracking-tight">{t("e.live")} ({posts.length})</h2>
        <div className="mt-2 grid gap-2">
          {posts.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm shadow-sm">
              <div className="min-w-0">
                <Link href={`/jobs/${p.id}`} className="font-bold text-slate-900 hover:text-indigo-700">{p.title}</Link>
                {p.featured && <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">⭐ {t("co.featured")}</span>}
                <span className="text-slate-500"> @ {p.company} · {p.location}</span>
                <span className="text-xs text-slate-400"> · {p.views} views · {p.applies} applies</span>
              </div>
              <span className="ml-auto flex gap-3">
                {!p.featured && (
                  <button onClick={async () => {
                    try {
                      const cfg = await api.billingConfig();
                      if (cfg.esewa_enabled) {
                        const init = await api.esewaInitiate(p.id, 7);
                        if (init.error) { setMsg(init.error); return; }
                        setMsg(`${t("bill.pay_now")} — Rs. ${init.amount}. ${t("bill.paid_note")}`);
                        const form = document.createElement("form");
                        form.method = "POST"; form.action = init.endpoint;
                        for (const [k, v] of Object.entries(init.fields as Record<string, string>)) {
                          const i = document.createElement("input");
                          i.type = "hidden"; i.name = k; i.value = v; form.appendChild(i);
                        }
                        document.body.appendChild(form); form.submit();
                      } else {
                        await api.featurePost(p.id, 7);
                        setMsg(t("bill.free_note"));
                      }
                    } catch (e) { setMsg(String(e)); }
                  }}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800">🚀 {t("co.feature")}</button>
                )}
                <button onClick={() => api.boardDelete(p.id).then(load)} className="text-xs font-semibold text-rose-600 hover:text-rose-800">{t("e.delete")}</button>
              </span>
            </div>
          ))}
        </div>
      </div>

      <Analytics posts={posts} />

      <ApplicantsInbox posts={posts} />
    </main>
  );
}

const ATS_STAGES = ["new", "reviewing", "shortlisted", "interview", "hired", "rejected"];

function ApplicantsInbox({ posts }: { posts: any[] }) {
  const { t } = useLang();
  const [sel, setSel] = useState<number | null>(null);
  const [apps, setApps] = useState<any[]>([]);
  const [funnel, setFunnel] = useState<any>(null);
  const [openId, setOpenId] = useState<number | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const [notes, setNotes] = useState("");
  const [msgSubj, setMsgSubj] = useState("");
  const [msgBody, setMsgBody] = useState("");
  const [sched, setSched] = useState("");
  const [msg, setMsg] = useState("");

  const load = async (jobId: number) => {
    setSel(jobId); setOpenId(null); setDetail(null); setMsg("");
    try {
      const d = await api.applicants(jobId);
      if (d.error) { setMsg(d.error); setApps([]); return; }
      setApps(d.results ?? []); setFunnel(d.funnel);
    } catch (e) { setMsg(String(e)); }
  };

  const openDetail = async (id: number) => {
    try {
      const d = await api.applicantGet(id);
      setDetail(d); setOpenId(id); setNotes(d.notes || ""); setSched("");
    } catch (e) { setMsg(String(e)); }
  };

  const move = async (id: number, status: string) => {
    await api.applicantPatch(id, { status });
    if (sel) load(sel);
    if (openId === id) openDetail(id);
  };
  const saveNotes = async () => {
    if (!openId) return;
    await api.applicantPatch(openId, { notes });
    setMsg(t("auth.saved"));
    if (sel) load(sel);
  };
  const sendMsg = async () => {
    if (!openId || !msgBody.trim()) return;
    try {
      await api.messageApplicant(openId, { subject: msgSubj, body: msgBody });
      setMsg(t("ats.msg_sent")); setMsgSubj(""); setMsgBody("");
    } catch (e) { setMsg(String(e)); }
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-extrabold tracking-tight">{t("ats.inbox")}</h2>
      <p className="mt-1 text-sm text-slate-500">{t("ats.pick")} · ✉️ {t("ats.notify_note")}</p>
      <select value={sel ?? ""} onChange={(e) => e.target.value && load(Number(e.target.value))}
        className="mt-3 w-full max-w-md rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none md:w-auto">
        <option value="">—</option>
        {posts.map((p) => <option key={p.id} value={p.id}>{p.title} @ {p.company}</option>)}
      </select>
      {msg && <div className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">{msg}</div>}
      {funnel && (
        <p className="mt-2 text-sm text-slate-600">
          <b className="text-slate-900">{funnel.total}</b> {t("ats.total")} ·{" "}
          {ATS_STAGES.map((s) => `${s}: ${funnel.by_status?.[s]?.count ?? 0}`).join(" · ")}
        </p>
      )}
      {!!apps.length && (
        <div className="mt-3 grid gap-2 md:grid-cols-3 xl:grid-cols-6">
          {ATS_STAGES.map((s) => (
            <div key={s} className="rounded-2xl bg-slate-50 p-2 ring-1 ring-slate-200/70">
              <div className="px-1 py-1 text-xs font-bold uppercase tracking-wide text-slate-500">
                {s} ({apps.filter((a) => a.status === s).length})
              </div>
              <div className="space-y-2">
                {apps.filter((a) => a.status === s).map((a) => (
                  <button key={a.id} onClick={() => openDetail(a.id)}
                    className={`w-full rounded-xl border bg-white p-2 text-left text-xs shadow-sm ${openId === a.id ? "border-indigo-400" : "border-slate-200 hover:border-slate-300"}`}>
                    <div className="font-bold text-slate-900">{a.name || a.email || `#${a.id}`}</div>
                    <div className="text-slate-500">{a.email}</div>
                    <span className={`mt-1 inline-block rounded-full px-2 py-0.5 font-bold ${a.score >= 60 ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{a.score}/100</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      {sel && !apps.length && !msg && <p className="mt-3 text-sm text-slate-400">{t("ats.empty")}</p>}
      {detail && (
        <div className="mt-4 rounded-2xl border border-indigo-200 bg-indigo-50/50 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <b className="text-slate-900">{detail.name || detail.email}</b>
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">{detail.score}/100</span>
            <span className="text-xs text-slate-500">{detail.email} · {detail.phone}</span>
            <button onClick={() => api.applicantDel(detail.id).then(() => { setDetail(null); setOpenId(null); if (sel) load(sel); })}
              className="ml-auto text-xs font-semibold text-rose-600">{t("ats.remove")}</button>
          </div>
          {!!detail.matched_skills?.length && (
            <div className="mt-2 flex flex-wrap gap-1">
              {detail.matched_skills.map((s: string) => (
                <span key={s} className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700">{s}</span>
              ))}
            </div>
          )}
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div>
              <div className="text-xs font-bold text-slate-500">{t("ats.resume_view")}</div>
              <pre className="mt-1 max-h-56 overflow-y-auto whitespace-pre-wrap rounded-xl bg-white p-3 text-xs leading-5 text-slate-700 ring-1 ring-slate-200">{detail.resume_text}</pre>
            </div>
            <div>
              <div className="text-xs font-bold text-slate-500">{t("ats.cover_view")}</div>
              <pre className="mt-1 whitespace-pre-wrap rounded-xl bg-white p-3 text-xs leading-5 text-slate-700 ring-1 ring-slate-200">{detail.cover_note || "—"}</pre>
              <div className="mt-2 text-xs font-bold text-slate-500">{t("ats.notes")}</div>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2 text-xs outline-none focus:border-indigo-400" />
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button onClick={saveNotes} className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white">{t("ats.save_notes")}</button>
                <label className="text-xs text-slate-500">{t("ats.move")}
                  <select value={detail.status} onChange={(e) => move(detail.id, e.target.value)}
                    className="ml-1 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs">
                    {ATS_STAGES.map((s) => <option key={s}>{s}</option>)}
                  </select></label>
              </div>
              <div className="mt-3 rounded-xl bg-white p-3 ring-1 ring-slate-200">
                <div className="text-xs font-bold text-slate-500">📅 {t("sched.title")}
                  {detail.interview_at ? <span className="ml-2 text-emerald-700">{t("sched.set")}: {new Date(detail.interview_at * 1000).toLocaleString()}</span> : null}
                </div>
                <div className="mt-1 flex gap-2">
                  <input type="datetime-local" value={sched} onChange={(e) => setSched(e.target.value)}
                    className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs outline-none" />
                  <button onClick={() => api.applicantPatch(detail.id, { interview_at: sched, status: "interview" }).then(() => openDetail(detail.id)).then(() => { if (sel) load(sel); })}
                    className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white">{t("sched.send")}</button>
                </div>
              </div>
              <div className="mt-3 rounded-xl bg-white p-3 ring-1 ring-slate-200">
                <div className="text-xs font-bold text-slate-500">✉️ {t("ats.msg_body")}</div>
                <input value={msgSubj} onChange={(e) => setMsgSubj(e.target.value)} placeholder={t("ats.msg_subj")}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs outline-none" />
                <textarea value={msgBody} onChange={(e) => setMsgBody(e.target.value)} rows={2} placeholder={t("ats.msg_body")}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs outline-none" />
                <button onClick={sendMsg} className="mt-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white">{t("ats.msg_send")}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Analytics({ posts }: { posts: any[] }) {
  const { t } = useLang();
  const [summary, setSummary] = useState<any>(null);
  const [sel, setSel] = useState<number | null>(null);
  const [detail, setDetail] = useState<any>(null);

  useEffect(() => {
    api.boardSummary().then(setSummary).catch(() => {});
  }, [posts]);

  const open = async (id: number) => {
    setSel(id);
    try { setDetail(await api.boardAnalytics(id, 14)); } catch { setDetail(null); }
  };

  const max = Math.max(1, ...(detail?.series ?? []).map((s: any) => s.views));

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-extrabold tracking-tight">{t("e.analytics")}</h2>
      {summary && (
        <p className="mt-1 text-sm text-slate-500">
          {t("e.total_line", { v: summary.total_views, a: summary.total_applies, n: summary.count })} {t("e.click_chart")}
        </p>
      )}
      <div className="mt-3 grid gap-2">
        {(summary?.jobs ?? posts).map((p: any) => (
          <button key={p.id} onClick={() => open(p.id)}
            className={`rounded-xl border px-4 py-2.5 text-left text-sm ${sel === p.id ? "border-indigo-400 bg-indigo-50" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"}`}>
            <b className="text-slate-900">{p.title}</b> <span className="text-slate-500">@ {p.company}</span>
            <span className="ml-2 text-xs text-slate-500">{p.views} views · {p.applies} applies</span>
            {p.apply_rate_pct != null && <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">{p.apply_rate_pct}% apply rate</span>}
          </button>
        ))}
      </div>
      {detail && (
        <div id="analytics-report" className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-sm font-bold text-slate-900">{detail.title} — {t("e.last_days", { n: detail.days })}
              <span className="ml-2 text-xs font-normal text-slate-500">{detail.totals.views} views · {detail.totals.applies} applies · {detail.apply_rate_pct}% rate</span>
            </div>
            <button onClick={() => window.print()} className="no-print ml-auto rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-700">{t("e.pdf")}</button>
          </div>
          <div className="report-date text-xs text-slate-400">AutomateJob · {detail.company} · {new Date().toLocaleDateString()}</div>
          <div className="mt-3 flex h-28 items-end gap-1">
            {detail.series.map((s: any) => (
              <div key={s.date} className="flex flex-1 flex-col items-center justify-end gap-1" title={`${s.date}: ${s.views} views, ${s.applies} applies`}>
                <div className="bar w-full rounded-t bg-emerald-500/80" style={{ height: `${Math.max(2, (s.views / max) * 90)}px` }} />
                {s.applies > 0 && <div className="text-[10px] font-bold text-amber-600">{s.applies}✓</div>}
                <div className="text-[9px] text-slate-400">{s.date.slice(5)}</div>
              </div>
            ))}
          </div>
          <table className="report-table mt-3 w-full text-xs text-slate-700">
            <thead><tr className="text-left text-slate-400"><th>Date</th><th>Views</th><th>Applies</th></tr></thead>
            <tbody>
              {detail.series.map((s: any) => (
                <tr key={s.date} className="border-t border-slate-200"><td>{s.date}</td><td>{s.views}</td><td>{s.applies}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
