"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "../lib/api";
import { useLang } from "../components/lang";

const STAGE_COLOR: Record<string, string> = {
  new: "bg-slate-100 text-slate-600",
  reviewing: "bg-sky-100 text-sky-700",
  shortlisted: "bg-indigo-100 text-indigo-700",
  interview: "bg-amber-100 text-amber-800",
  hired: "bg-emerald-100 text-emerald-700",
  rejected: "bg-rose-100 text-rose-600",
};

export default function MyApplications() {
  const { t } = useLang();
  const [email, setEmail] = useState("");
  const [apps, setApps] = useState<any[] | null>(null);
  const [msg, setMsg] = useState("");

  const go = async () => {
    if (!email.includes("@")) { setMsg(t("a.valid_email")); return; }
    try {
      const d = await api.myApplications(email);
      if (d.error) { setMsg(d.error); return; }
      setApps(d.results ?? []); setMsg("");
    } catch (e) { setMsg(String(e)); }
  };

  return (
    <main className="mx-auto max-w-3xl space-y-4 px-6 py-10">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">{t("my.title")}</h1>
        <p className="mt-1 text-sm text-slate-500">{t("my.sub")}</p>
      </div>
      <div className="flex gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <input value={email} onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && go()}
          placeholder="you@example.com"
          className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-400" />
        <button onClick={go} className="rounded-xl bg-slate-900 px-5 py-2 text-sm font-bold text-white hover:bg-slate-700">{t("my.go")}</button>
      </div>
      {msg && <div className="rounded-xl bg-rose-50 px-4 py-2 text-sm text-rose-700">{msg}</div>}
      {apps && !apps.length && <p className="text-sm text-slate-400">{t("my.empty")}</p>}
      {!!apps?.length && (
        <div className="grid gap-2">
          {apps.map((a) => (
            <div key={a.id} className="rounded-2xl border border-slate-200 bg-white p-4 text-sm shadow-sm">
              <div className="flex flex-wrap items-center gap-2">
                <Link href={`/jobs/${a.job_id}`} className="font-bold text-slate-900 hover:text-indigo-700">
                  {a.job_title || `#${a.job_id}`}
                </Link>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${STAGE_COLOR[a.status] ?? STAGE_COLOR.new}`}>
                  {a.status}
                </span>
                <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">{a.score}/100</span>
              </div>
              <div className="mt-1 text-xs text-slate-400">
                {a.job_company} · {t("my.applied")} {new Date(a.created_at * 1000).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
