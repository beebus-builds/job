"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, parseResume, getActiveResume, setActiveResume } from "../lib/api";
import { useLang } from "../components/lang";
import { useAuth } from "../components/auth";

type Job = {
  title: string; company: string; location: string; url: string;
  source: string; tags: string[]; description: string;
  score?: number; matched_skills?: string[]; missing_skills?: string[];
  posted?: string; salary?: string;
};

const SAMPLE_RESUME = `Alex Carter — Full-Stack Developer
Python, FastAPI, React, TypeScript, PostgreSQL, Docker, AWS.
Built SaaS billing API serving 20k req/day, cut p95 latency 40%.
Led CI/CD with GitHub Actions, Jest + PyTest coverage 85%.`;

const SAMPLE_JD = `Hiring Backend Engineer (Python): FastAPI, PostgreSQL, Docker, AWS, REST APIs, PyTest, CI/CD. React a plus. 2+ years experience building reliable services.`;

const tabs = ["Find Jobs", "Matcher", "Cover Letter", "Tracker", "Post a Job"] as const;
const TAB_KEYS: Record<(typeof tabs)[number], string> = {
  "Find Jobs": "tab.find", "Matcher": "tab.match", "Cover Letter": "tab.cover",
  "Tracker": "tab.track", "Post a Job": "tab.post",
};
const STATUSES = ["saved", "applied", "interview", "offer", "rejected"] as const;

export default function Dashboard() {
  const { t } = useLang();
  const { user } = useAuth();
  const [tab, setTab] = useState<(typeof tabs)[number]>("Find Jobs");
  const [toast, setToast] = useState("");
  const notify = (m: string) => { setToast(m); setTimeout(() => setToast(""), 2500); };

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-extrabold tracking-tight">AI Dashboard <span className="font-normal text-slate-400">· {user ? user.email : "guest mode"}</span></h1>
            <p className="text-xs text-slate-500">{t("dash.tag")}</p>
          </div>
          {!user && (
            <Link href="/login" className="rounded-full bg-slate-900 px-4 py-1.5 text-xs font-bold text-white hover:bg-slate-700">
              {t("auth.login")}
            </Link>
          )}
        </div>
      </header>

      <nav className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-6 py-3">
          {tabs.map((tb) => (
            <button key={tb} onClick={() => setTab(tb)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold ${tab === tb ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
              {t(TAB_KEYS[tb])}
            </button>
          ))}
        </div>
      </nav>

      {toast && <div className="mx-auto max-w-6xl px-6 pt-3"><div className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm">{toast}</div></div>}

      <main className="mx-auto max-w-6xl px-6 py-6">
        {tab === "Find Jobs" && <Jobs notify={notify} />}
        {tab === "Matcher" && <Matcher notify={notify} />}
        {tab === "Cover Letter" && <Cover notify={notify} />}
        {tab === "Tracker" && <Tracker notify={notify} />}
        {tab === "Post a Job" && <Poster notify={notify} />}
      </main>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">{children}</div>;
}

function scoreColor(s?: number) {
  if (s == null) return "bg-slate-100 text-slate-600 ring-1 ring-slate-200";
  if (s >= 75) return "bg-emerald-600 text-white";
  if (s >= 50) return "bg-amber-100 text-amber-800 ring-1 ring-amber-200";
  return "bg-slate-100 text-slate-600 ring-1 ring-slate-200";
}

function ResumeBar({ resume, setResume, notify }: { resume: string; setResume: (s: string) => void; notify: (m: string) => void }) {
  const { t } = useLang();
  useEffect(() => {
    if (!resume) {
      const saved = getActiveResume() || SAMPLE_RESUME;
      setResume(saved);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const onFile = async (f: File | undefined) => {
    if (!f) return;
    try {
      const d = await parseResume(f);
      if (d.error) return notify(d.error);
      const txt = d.resume_text || "";
      setResume(txt); setActiveResume(txt);
      await api.addResume(f.name.replace(/\.\w+$/, ""), txt).catch(() => {});
      notify(t("d.loaded", { n: txt.length }));
    } catch (e) { notify(String(e)); }
  };
  return (
    <Card>
      <div className="flex flex-wrap items-center gap-2">
        <b className="text-sm text-slate-900">{t("d.resume_title")}</b>
        <span className="text-xs text-slate-500">{t("d.resume_meta", { n: resume.length })}</span>
        <label className="ml-auto cursor-pointer rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200">
          {t("d.upload")} <input type="file" className="hidden" accept=".pdf,.docx,.txt,.md" onChange={(e) => onFile(e.target.files?.[0])} />
        </label>
        <button className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200" onClick={() => { setActiveResume(resume); api.addResume("My Resume", resume).then(() => notify(t("d.saved_profile"))).catch((e) => notify(String(e))); }}>
          {t("d.save")}</button>
      </div>
      <textarea value={resume} onChange={(e) => { setResume(e.target.value); setActiveResume(e.target.value); }} rows={4}
        className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-900 outline-none focus:border-indigo-400" />
    </Card>
  );
}

function Jobs({ notify }: { notify: (m: string) => void }) {
  const { t, lang } = useLang();
  const [q, setQ] = useState("python");
  const [location, setLocation] = useState("");
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [source, setSource] = useState("");
  const [minScore, setMinScore] = useState(0);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [scored, setScored] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resume, setResume] = useState("");

  const load = async () => {
    setLoading(true); setScored(false);
    try {
      const d = await api.jobs({ q, location, remote_only: remoteOnly, source });
      setJobs(d.results ?? []);
    } catch (e) { notify(String(e)); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const scoreAll = async () => {
    const r = resume || getActiveResume() || SAMPLE_RESUME;
    if (!r) return notify(t("d.add_resume_first"));
    if (!jobs.length) return notify(t("d.search_first"));
    setLoading(true);
    try {
      const d = await api.rank(r, jobs, lang);
      setJobs(d.results ?? []); setScored(true);
      notify(t("d.ranked", { n: d.count }));
    } catch (e) { notify(String(e)); } finally { setLoading(false); }
  };

  const visible = jobs.filter((j) => (j.score ?? 0) >= minScore);
  const best = jobs.find((j) => j.score != null);

  return (
    <div className="space-y-4">
      <ResumeBar resume={resume} setResume={setResume} notify={notify} />
      <Card>
        <div className="grid gap-2 md:grid-cols-4">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("jobs.kw")}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-400" />
          <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder={t("jobs.loc")}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-400" />
          <select value={source} onChange={(e) => setSource(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none">
            <option value="">{t("d.all_sources")}</option>
            <option value="remotive">Remotive</option>
            <option value="arbeitnow">Arbeitnow</option>
            <option value="seed-np">{t("d.nepal_picks")}</option>
            <option value="seed">{t("d.global_seed")}</option>
          </select>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={remoteOnly} onChange={(e) => setRemoteOnly(e.target.checked)} className="accent-indigo-600" /> {t("d.remote_only")}
          </label>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button onClick={load} className="rounded-xl bg-slate-900 px-5 py-2 text-sm font-bold text-white hover:bg-slate-700">{loading ? "…" : t("d.search")}</button>
          <button onClick={scoreAll} className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-2 text-sm font-bold text-white hover:opacity-90">{t("d.score_all")}</button>
          <label className="ml-auto text-xs text-slate-500">{t("d.min_score")}: {minScore}
            <input type="range" min={0} max={80} step={10} value={minScore} onChange={(e) => setMinScore(Number(e.target.value))} className="ml-2 accent-indigo-600" />
          </label>
        </div>
      </Card>

      {scored && best && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="text-sm text-slate-800">🏆 <b>{t("d.best_match")}: {best.title}</b> @ {best.company} — <b>{best.score}/100</b>
          {best.matched_skills?.length ? <> · {t("d.fits")}: {best.matched_skills.slice(0, 5).join(", ")}</> : null}
          {best.missing_skills?.length ? <> · {t("d.to_add")}: {best.missing_skills.slice(0, 4).join(", ")}</> : null}</div>
        </div>
      )}

      <div className="grid gap-3">
        {visible.map((j, i) => (
          <Card key={i}>
            <div className="flex justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 font-bold text-slate-900">
                  {j.score != null && <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${scoreColor(j.score)}`}>{j.score}</span>}
                  <span>{j.title}</span>
                </div>
                <div className="text-sm text-slate-500">{j.company} · {j.location} · <span className="font-medium text-emerald-700">{j.source}</span></div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {(j.tags ?? []).slice(0, 6).map((tg) => <span key={tg} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{tg}</span>)}
                </div>
                {j.matched_skills != null && (
                  <div className="mt-1 text-xs text-slate-500">
                    <span className="text-emerald-700">✓ {j.matched_skills.join(", ") || "—"}</span>
                    {j.missing_skills?.length ? <span className="text-rose-600"> · ✗ {j.missing_skills.slice(0, 4).join(", ")}</span> : null}
                  </div>
                )}
              </div>
              <div className="flex shrink-0 flex-col gap-2">
                {j.url && <a href={j.url} target="_blank" className="rounded-lg bg-slate-100 px-3 py-1.5 text-center text-sm font-semibold text-slate-700 hover:bg-slate-200">{t("d.apply")}</a>}
                <button onClick={() => api.addApp({ title: j.title, company: j.company, location: j.location, url: j.url, status: "saved", score: j.score ?? 0, notes: (j.matched_skills ?? []).slice(0, 5).join(", ") }).then(() => notify(t("d.saved_tracker")))}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-bold text-white hover:bg-emerald-500">{t("d.track")}{j.score ? ` (${j.score})` : ""}</button>
              </div>
            </div>
          </Card>
        ))}
        {!visible.length && !loading && <p className="text-sm text-slate-400">{t("d.no_match")}</p>}
      </div>
    </div>
  );
}

function Matcher({ notify }: { notify: (m: string) => void }) {
  const { t, lang } = useLang();
  const [resume, setResume] = useState("");
  const [jd, setJd] = useState(SAMPLE_JD);
  const [res, setRes] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { setResume(getActiveResume() || SAMPLE_RESUME); }, []);
  const run = async () => {
    setBusy(true);
    try { const m = await api.match(resume, jd, lang); setRes(m); setActiveResume(resume); }
    catch (e) { notify(String(e)); } finally { setBusy(false); }
  };
  return (
    <div className="space-y-4">
      <ResumeBar resume={resume} setResume={setResume} notify={notify} />
      <Card>
        <h3 className="mb-2 text-sm font-bold text-slate-900">{t("d.jd")}</h3>
        <textarea value={jd} onChange={(e) => setJd(e.target.value)} rows={8}
          className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none focus:border-indigo-400" />
        <button onClick={run} className="mt-2 rounded-xl bg-slate-900 px-6 py-2 text-sm font-bold text-white hover:bg-slate-700">
          {busy ? t("d.scoring") : t("d.score_match")}</button>
      </Card>
      {res && (
        <Card>
          <div className="flex items-center gap-4">
            <div className="text-5xl font-black tracking-tight text-slate-900">{res.score}<span className="text-lg text-slate-400">/100</span></div>
            <div className="text-sm text-slate-500">cosine {res.cosine_similarity} · skill overlap {Math.round(res.skill_overlap * 100)}%</div>
          </div>
          <div className="mt-3 grid gap-3 text-sm md:grid-cols-2">
            <div className="text-slate-700"><b className="text-emerald-700">{t("d.matched")}</b> {res.matched_skills.join(", ") || "—"}</div>
            <div className="text-slate-700"><b className="text-rose-600">{t("d.missing")}</b> {res.missing_skills.join(", ") || "—"}</div>
          </div>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-600">
            {res.suggestions.map((s: string, i: number) => <li key={i}>{s}</li>)}
          </ul>
          <button className="mt-3 rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-200"
            onClick={() => api.addApp({ title: "Matched role", company: "", notes: jd.slice(0, 200), score: res.score }).then(() => notify(t("d.saved_tracker")))}>
            {t("d.save_score")}</button>
        </Card>
      )}
    </div>
  );
}

function Cover({ notify }: { notify: (m: string) => void }) {
  const { t, lang } = useLang();
  const [f, setF] = useState({ name: "Alex Carter", role: "Backend Engineer", company: "DataWorks", resume_text: "", job_description: SAMPLE_JD });
  const [out, setOut] = useState("");
  const PH: Record<string, string> = { name: t("d.name"), role: t("d.role"), company: t("d.company") };
  useEffect(() => { setF((p) => ({ ...p, resume_text: getActiveResume() || SAMPLE_RESUME })); }, []);
  return (
    <div className="space-y-4">
      <Card>
        <div className="grid gap-2 md:grid-cols-3">
          {(["name", "role", "company"] as const).map((k) => (
            <input key={k} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} placeholder={PH[k]}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-400" />
          ))}
        </div>
        <textarea value={f.resume_text} onChange={(e) => setF({ ...f, resume_text: e.target.value })} rows={4} placeholder={t("d.resume_ph")}
          className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none focus:border-indigo-400" />
        <textarea value={f.job_description} onChange={(e) => setF({ ...f, job_description: e.target.value })} rows={4} placeholder={t("d.jd_ph")}
          className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none focus:border-indigo-400" />
        <button onClick={() => api.cover({ ...f, lang }).then((d) => setOut(d.cover_letter)).catch((e) => notify(String(e)))}
          className="mt-2 rounded-xl bg-slate-900 px-6 py-2 text-sm font-bold text-white hover:bg-slate-700">{t("d.generate")}</button>
        <p className="mt-1 text-xs text-slate-400">{t("d.cover_note")}</p>
      </Card>
      {out && <Card><pre className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{out}</pre></Card>}
    </div>
  );
}

function Tracker({ notify }: { notify: (m: string) => void }) {
  const { t } = useLang();
  const [apps, setApps] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const load = async () => {
    try {
      const [a, s] = await Promise.all([api.apps(), api.stats()]);
      setApps(a.results ?? []); setStats(s);
    } catch (e) { notify(String(e)); }
  };
  useEffect(() => { load(); }, []);
  const setStatus = (id: number, status: string) => api.patchApp(id, { status }).then(load);
  return (
    <div className="space-y-4">
      {stats && (
        <Card>
          <div className="flex flex-wrap gap-4 text-sm text-slate-700">
            <span>📊 <b>{stats.total}</b> {t("d.tracked")}</span>
            <span>⭐ {t("d.avg")} <b>{stats.avg_score}</b></span>
            {STATUSES.map((s) => <span key={s} className="text-slate-500">{s}: <b className="text-slate-900">{stats.by_status?.[s]?.count ?? 0}</b></span>)}
            <button onClick={load} className="ml-auto rounded-lg bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200">{t("d.refresh")}</button>
          </div>
        </Card>
      )}
      <div className="grid gap-2 md:grid-cols-5">
        {STATUSES.map((s) => (
          <div key={s} className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
            <div className="px-1 py-1 text-xs font-bold uppercase tracking-wide text-slate-500">{s} ({apps.filter((a) => a.status === s).length})</div>
            <div className="space-y-2">
              {apps.filter((a) => a.status === s).map((a) => (
                <div key={a.id} className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs">
                  <div className="text-[13px] font-bold text-slate-900">{a.title}</div>
                  <div className="text-slate-500">{a.company}</div>
                  {a.score ? <span className={`mt-1 inline-block rounded-full px-2 py-0.5 font-bold ${scoreColor(a.score)}`}>{a.score}</span> : null}
                  <div className="mt-2 flex gap-1">
                    <select value={a.status} onChange={(e) => setStatus(a.id, e.target.value)}
                      className="rounded-lg border border-slate-300 bg-white px-1 py-0.5 text-xs">
                      {STATUSES.map((x) => <option key={x}>{x}</option>)}
                    </select>
                    <button onClick={() => api.delApp(a.id).then(load)} className="px-1 text-rose-500">✕</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      {!apps.length && <p className="text-sm text-slate-400">{t("d.empty")}</p>}
    </div>
  );
}

function Poster({ notify }: { notify: (m: string) => void }) {
  const { t } = useLang();
  const [f, setF] = useState({ title: "Backend Engineer (Python)", company: "Himal Data", location: "Kathmandu · Hybrid", work_type: "Full-time", skills: "Python, FastAPI, PostgreSQL, Docker, AWS", responsibilities: "- Design FastAPI services\n- Own PostgreSQL schemas\n- Ship with Docker + CI/CD", salary: "Rs. 120k–180k/month" });
  const [out, setOut] = useState(""); const [score, setScore] = useState<any>(null);
  const LBL: Record<string, string> = { title: t("e.title"), company: t("e.company"), location: t("e.location"), work_type: t("e.worktype"), skills: t("e.skills"), responsibilities: t("e.desc"), salary: t("e.salary") };
  const gen = async () => {
    try {
      const d = await api.genPost({ ...f, skills: f.skills.split(",").map((s) => s.trim()) });
      setOut(d.posting); setScore(d.score);
    } catch (e) { notify(String(e)); }
  };
  return (
    <div className="space-y-4">
      <Card>
        <div className="grid gap-2 md:grid-cols-2">
          {Object.entries(f).map(([k, v]) => (
            <label key={k} className="text-xs font-medium text-slate-500">{LBL[k] ?? k}
              <textarea value={v} rows={k === "responsibilities" ? 3 : 1}
                onChange={(e) => setF({ ...f, [k]: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-sm text-slate-900 outline-none focus:border-indigo-400" />
            </label>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <button onClick={gen} className="rounded-xl bg-slate-900 px-6 py-2 text-sm font-bold text-white hover:bg-slate-700">{t("d.gen_post")}</button>
          {out && <button onClick={() => api.scorePost(out).then(setScore)} className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200">{t("d.rescore")}</button>}
        </div>
      </Card>
      {score && <Card><div className="text-sm text-slate-700">Clarity {score.clarity} · Inclusivity {score.inclusivity} · SEO {score.seo} · {score.word_count} words</div>
        <ul className="mt-2 list-disc pl-5 text-sm text-slate-600">{score.tips.map((tip: string, i: number) => <li key={i}>{tip}</li>)}</ul></Card>}
      {out && <Card><pre className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{out}</pre></Card>}
    </div>
  );
}
