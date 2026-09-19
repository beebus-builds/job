"use client";

import { useState } from "react";
import { api } from "../lib/api";
import { useLang } from "../components/lang";

function fmt(n: number) {
  if (n >= 100000) return `Rs. ${(n / 100000).toFixed(1)}L`;
  return `Rs. ${Math.round(n / 1000)}k`;
}

export default function SalaryPage() {
  const { t } = useLang();
  const [q, setQ] = useState("python");
  const [res, setRes] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  const go = async () => {
    setBusy(true);
    try { setRes(await api.salary({ q })); }
    finally { setBusy(false); }
  };

  return (
    <main className="mx-auto max-w-3xl space-y-4 px-6 py-10">
      <div className="rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 p-8 text-white">
        <h1 className="text-3xl font-extrabold tracking-tight">{t("sal.title")}</h1>
        <p className="mt-1 text-sm text-emerald-50">{t("sal.sub")}</p>
      </div>

      <div className="flex gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <input value={q} onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && go()}
          placeholder={t("sal.role")}
          className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-400" />
        <button onClick={go} disabled={busy} className="rounded-xl bg-slate-900 px-5 py-2 text-sm font-bold text-white">{busy ? "…" : t("sal.go")}</button>
      </div>

      {res && res.count === 0 && <p className="text-sm text-slate-400">{t("sal.none")}</p>}
      {res && res.count > 0 && (
        <>
          <div className="rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm">
            <div className="text-xs font-bold uppercase tracking-widest text-slate-400">{t("sal.median")} · {t("sal.per")}</div>
            <div className="mt-1 text-4xl font-black tracking-tight text-slate-900">
              {fmt(res.median_low)} – {fmt(res.median_high)}
            </div>
            <div className="mt-1 text-xs text-slate-400">{t("sal.based", { n: res.count })}</div>
            {res.count < 3 && <div className="mt-2 text-xs text-amber-700">{t("sal.thin")}</div>}
          </div>
          <div className="grid gap-2">
            {res.samples.map((s: any, i: number) => (
              <div key={i} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm">
                <div className="min-w-0">
                  <b className="text-slate-900">{s.title}</b>
                  <span className="text-slate-500"> @ {s.company}</span>
                </div>
                <span className="ml-auto shrink-0 font-bold text-emerald-700">{fmt(s.low)} – {fmt(s.high)}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
