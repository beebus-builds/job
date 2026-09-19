"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "../lib/api";
import { useLang } from "../components/lang";

export default function AdminQueue() {
  const { t } = useLang();
  const [token, setToken] = useState("");
  const [reps, setReps] = useState<any[] | null>(null);
  const [msg, setMsg] = useState("");

  const load = async () => {
    if (!token) { setMsg(t("adm.need")); return; }
    try {
      const d = await api.adminReports(token);
      if (d.error) { setMsg(d.error); return; }
      setReps(d.results ?? []); setMsg("");
    } catch (e) { setMsg(String(e)); }
  };

  const act = async (fn: Promise<any>) => {
    await fn.catch((e: any) => setMsg(String(e)));
    load();
  };

  return (
    <main className="mx-auto max-w-4xl space-y-4 px-6 py-10">
      <h1 className="text-3xl font-extrabold tracking-tight">{t("adm.title")}</h1>
      <div className="flex gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <input type="password" value={token} onChange={(e) => setToken(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load()}
          placeholder={t("adm.token")}
          className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-400" />
        <button onClick={load} className="rounded-xl bg-slate-900 px-5 py-2 text-sm font-bold text-white">{t("adm.load")}</button>
      </div>
      {msg && <div className="rounded-xl bg-rose-50 px-4 py-2 text-sm text-rose-700">{msg}</div>}
      {reps && !reps.length && <p className="text-sm text-slate-400">{t("adm.empty")}</p>}
      {!!reps?.length && (
        <div className="grid gap-2">
          {reps.map((r) => (
            <div key={r.id} className="rounded-2xl border border-slate-200 bg-white p-4 text-sm shadow-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-700">{r.reason}</span>
                <Link href={`/jobs/${r.job_id}`} className="font-bold text-slate-900 hover:text-indigo-700">
                  {r.job_title || `#${r.job_id}`}
                </Link>
                <span className="text-xs text-slate-400">@ {r.job_company} · {new Date(r.created_at * 1000).toLocaleString()}</span>
                <span className="ml-auto flex gap-2">
                  <button onClick={() => act(api.adminDismiss(r.id, token))} className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{t("adm.dismiss")}</button>
                  <button onClick={() => act(api.adminDeletePost(r.job_id, token).then(() => api.adminDismiss(r.id, token)))} className="rounded-lg bg-rose-600 px-3 py-1 text-xs font-bold text-white">{t("adm.del_post")}</button>
                </span>
              </div>
              {r.details && <p className="mt-1 text-xs text-slate-500">“{r.details}”</p>}
            </div>
          ))}
        </div>
      )}
      <FeaturedQueue token={token} />
      <MailPanel token={token} />
      <SocialPack />
    </main>
  );
}

function FeaturedQueue({ token }: { token: string }) {
  const { t } = useLang();
  const [rows, setRows] = useState<any[] | null>(null);
  const load = async () => {
    if (!token) return;
    try {
      const d = await api.adminFeatured(token);
      if (!d.error) setRows(d.results ?? []);
    } catch { /* noop */ }
  };
  useEffect(() => { load(); }, [token]);
  if (!rows?.length) return null;
  return (
    <div>
      <h2 className="text-lg font-extrabold tracking-tight">⭐ Boost requests</h2>
      <div className="mt-2 grid gap-2">
        {rows.filter((r) => r.status === "pending").map((r) => (
          <div key={r.id} className="flex flex-wrap items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm">
            <Link href={`/jobs/${r.job_id}`} className="font-bold text-slate-900">{r.job_title} @ {r.job_company}</Link>
            <span className="text-xs text-slate-500">{r.days}d · {r.status}</span>
            <span className="ml-auto flex gap-2">
              <button onClick={() => api.adminFeatureDecide(r.id, true, token).then(load)} className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-bold text-white">Approve</button>
              <button onClick={() => api.adminFeatureDecide(r.id, false, token).then(load)} className="rounded-lg bg-slate-200 px-3 py-1 text-xs font-bold text-slate-600">Reject</button>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MailPanel({ token }: { token: string }) {
  const { t } = useLang();
  const [st, setSt] = useState<any>(null);
  const [to, setTo] = useState("");
  const [msg, setMsg] = useState("");
  useEffect(() => {
    if (token) api.adminMailStatus(token).then(setSt).catch(() => {});
  }, [token]);
  const send = async () => {
    try {
      const r = await api.adminTestEmail(to, token);
      setMsg(r.sent ? t("mail.sent") : r.detail || r.error || "failed");
    } catch (e) { setMsg(String(e)); }
  };
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-extrabold tracking-tight">✉️ {t("mail.title")}</h2>
      <p className="mt-1 text-sm text-slate-500">
        {st ? (st.provider === "none" ? t("mail.not_configured")
          : `${st.provider} · ${st.host} · ${st.user_set ? "user ✓" : "no user"} · ${st.pass_set ? "password ✓" : "no password"}`)
          : "…"}
      </p>
      <div className="mt-2 flex gap-2">
        <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="you@example.com"
          className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none" />
        <button onClick={send} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white">{t("mail.send_test")}</button>
      </div>
      {msg && <p className="mt-2 text-sm text-slate-600">{msg}</p>}
    </div>
  );
}

function SocialPack() {  const { t } = useLang();
  const [pack, setPack] = useState<any>(null);
  const [copied, setCopied] = useState("");
  useEffect(() => { api.socialWeekly().then(setPack).catch(() => {}); }, []);
  if (!pack) return null;
  const copy = async (key: string, text: string) => {
    try { await navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied(""), 2000); } catch { /* noop */ }
  };
  const card = () => {
    const cv = document.createElement("canvas");
    cv.width = 1080; cv.height = 1350;
    const g = cv.getContext("2d")!;
    const bg = g.createLinearGradient(0, 0, 1080, 1350);
    bg.addColorStop(0, "#4f46e5"); bg.addColorStop(1, "#7c3aed");
    g.fillStyle = bg; g.fillRect(0, 0, 1080, 1350);
    g.fillStyle = "#fff"; g.font = "800 64px system-ui,sans-serif";
    g.fillText("⚡ AutomateJob", 80, 140);
    g.font = "900 72px system-ui,sans-serif";
    g.fillText("TOP PAYING", 80, 260); g.fillText("JOBS THIS WEEK", 80, 340);
    g.font = "400 40px system-ui,sans-serif";
    (pack.top ?? []).slice(0, 3).forEach((j: any, i: number) => {
      g.fillStyle = "rgba(255,255,255,0.16)";
      g.fillRect(80, 400 + i * 220, 920, 180);
      g.fillStyle = "#fff"; g.font = "700 44px system-ui,sans-serif";
      g.fillText(`${i + 1}. ${(j.title ?? "").slice(0, 30)}`, 110, 470 + i * 220);
      g.font = "400 36px system-ui,sans-serif";
      g.fillStyle = "rgba(255,255,255,0.85)";
      g.fillText(`${j.company ?? ""} · ${j.salary ?? ""}`.slice(0, 42), 110, 525 + i * 220);
    });
    g.fillStyle = "#fff"; g.font = "400 34px system-ui,sans-serif";
    g.fillText("Check your match score free", 80, 1240);
    const a = document.createElement("a");
    a.href = cv.toDataURL("image/png");
    a.download = "top-jobs-week.png"; a.click();
  };
  return (
    <div>
      <h2 className="text-lg font-extrabold tracking-tight">{t("soc.title")} ({pack.count} live)</h2>
      <button onClick={card} className="mt-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white">🖼️ {t("soc.card")}</button>
      <div className="mt-2 grid gap-2">
        {(pack.captions ?? []).map((c: any, i: number) => (
          <div key={i} className="rounded-2xl border border-slate-200 bg-white p-4 text-sm shadow-sm">
            <div className="flex items-center gap-2">
              <b>{c.label_en} / {c.label_ne}</b>
              <span className="ml-auto flex gap-1">
                <button onClick={() => copy(`en${i}`, c.en)} className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold">EN: {copied === `en${i}` ? t("soc.copied") : t("soc.copy")}</button>
                <button onClick={() => copy(`ne${i}`, c.ne)} className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold">NE: {copied === `ne${i}` ? t("soc.copied") : t("soc.copy")}</button>
              </span>
            </div>
            <pre className="mt-1 whitespace-pre-wrap text-xs text-slate-500">{c.en}</pre>
          </div>
        ))}
      </div>
    </div>
  );
}
