"use client";

import { useState } from "react";
import Link from "next/link";
import { api, getActiveResume } from "../../lib/api";
import { useLang } from "../../components/lang";
import { shareScoreImage } from "../../components/share";

export default function MatchButton({ jobText, jobTitle, company }: { jobText: string; jobTitle: string; company: string }) {
  const { t, lang } = useLang();
  const [res, setRes] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const check = async () => {
    const resume = getActiveResume();
    if (!resume) {
      setErr(t("match.noresume"));
      return;
    }
    setBusy(true); setErr("");
    try {
      setRes(await api.match(resume, jobText, lang));
    } catch (e) { setErr(String(e)); } finally { setBusy(false); }
  };

  return (
    <div className="mt-4 rounded-3xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-violet-50 p-6 shadow-sm">
      {!res ? (
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={check} disabled={busy}
            className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-slate-700">
            {busy ? t("match.scoring") : t("match.check")}
          </button>
          <span className="text-xs text-slate-500">{t("match.hint")}</span>
          {err && <p className="w-full text-sm text-amber-700">{err} <Link href="/app" className="font-semibold underline">{t("match.open_dash")}</Link></p>}
        </div>
      ) : (
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <span className={`rounded-full px-4 py-1.5 text-xl font-black ${res.score >= 75 ? "bg-emerald-600 text-white" : res.score >= 50 ? "bg-amber-400 text-amber-950" : "bg-slate-200 text-slate-600"}`}>
              {res.score}/100
            </span>
            <span className="text-sm text-slate-500">skill overlap {Math.round(res.skill_overlap * 100)}%</span>
            <button
              onClick={() => api.addApp({ title: jobTitle, notes: jobText.slice(0, 200), score: res.score, status: "saved" })
                .then(() => setErr(t("match.saved"))).catch((e) => setErr(String(e)))}
              className="ml-auto text-sm rounded-lg bg-emerald-600 px-3 py-1.5 hover:bg-emerald-500">
              {t("match.track")}
            </button>
            <button
              onClick={() => shareScoreImage(res.score, jobTitle, company, window.location.href)}
              className="text-sm rounded-lg bg-indigo-600 px-3 py-1.5 font-bold text-white hover:bg-indigo-500">
              {t("match.share")}
            </button>
          </div>
          <div className="mt-3 text-sm text-slate-700">
            <span className="font-semibold text-emerald-700">✓ {res.matched_skills.join(", ") || "—"}</span>
            {res.missing_skills?.length ? <span className="text-rose-600"> · ✗ {t("match.missing")}: {res.missing_skills.slice(0, 5).join(", ")}</span> : null}
          </div>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
            {res.suggestions.slice(0, 3).map((s: string, i: number) => <li key={i}>{s}</li>)}
          </ul>
          {err && <p className="mt-2 text-sm font-semibold text-emerald-700">{err}</p>}
        </div>
      )}
    </div>
  );
}
