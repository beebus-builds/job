"use client";

import { useState } from "react";
import { api } from "../lib/api";
import { useLang } from "../components/lang";

export default function InterviewPrep() {
  const { t, lang } = useLang();
  const [jd, setJd] = useState("");
  const [data, setData] = useState<any>(null);
  const [tab, setTab] = useState<"tech" | "beh">("tech");
  const [sel, setSel] = useState<string | null>(null);
  const [answer, setAnswer] = useState("");
  const [fb, setFb] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  const gen = async () => {
    if (!jd.trim()) return;
    setBusy(true); setFb(null); setSel(null);
    try { setData(await api.ivQuestions(jd, lang)); }
    finally { setBusy(false); }
  };

  const score = async () => {
    if (!sel || !answer.trim()) return;
    setBusy(true);
    try { setFb(await api.ivFeedback(sel, answer, lang)); }
    finally { setBusy(false); }
  };

  const list = tab === "tech" ? data?.technical ?? [] : data?.behavioral ?? [];

  return (
    <main className="mx-auto max-w-4xl space-y-4 px-6 py-10">
      <div className="rounded-3xl bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 p-8 text-white">
        <h1 className="text-3xl font-extrabold tracking-tight">{t("iv.title")}</h1>
        <p className="mt-1 text-sm text-indigo-100">{t("iv.sub")}</p>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <textarea value={jd} onChange={(e) => setJd(e.target.value)} rows={5} placeholder={t("iv.jd_ph")}
          className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none focus:border-indigo-400" />
        <button onClick={gen} disabled={busy}
          className="mt-2 rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-bold text-white hover:bg-slate-700">
          {busy ? "…" : t("iv.gen")}</button>
      </div>

      {data && (
        <>
          <div className="flex gap-2">
            {(["tech", "beh"] as const).map((tb) => (
              <button key={tb} onClick={() => { setTab(tb); setSel(null); setFb(null); }}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold ${tab === tb ? "bg-slate-900 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"}`}>
                {t(tb === "tech" ? "iv.tech" : "iv.beh")} ({tb === "tech" ? data.technical.length : data.behavioral.length})
              </button>
            ))}
          </div>
          <div className="grid gap-2">
            {list.map((q: string, i: number) => (
              <button key={i} onClick={() => { setSel(q); setFb(null); }}
                className={`rounded-2xl border p-4 text-left text-sm ${sel === q ? "border-indigo-400 bg-indigo-50" : "border-slate-200 bg-white hover:border-slate-300"}`}>
                <span className="mr-2 font-black text-indigo-300">{i + 1}</span>
                <span className="font-medium text-slate-800">{q}</span>
                {sel === q && <span className="ml-2 text-xs font-bold text-indigo-600">↓ {t("iv.practice")}</span>}
              </button>
            ))}
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <b className="text-sm text-amber-900">{t("iv.tips")}</b>
            <ul className="mt-1 list-disc pl-5 text-sm text-amber-900">
              {data.tips.map((x: string, i: number) => <li key={i}>{x}</li>)}
            </ul>
          </div>
        </>
      )}

      {sel && (
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-bold text-slate-900">{sel}</p>
          <textarea value={answer} onChange={(e) => setAnswer(e.target.value)} rows={6} placeholder={t("iv.answer_ph")}
            className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none focus:border-indigo-400" />
          <button onClick={score} disabled={busy}
            className="mt-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-2.5 text-sm font-bold text-white hover:opacity-90">
            {busy ? "…" : t("iv.score")}</button>
          {fb && (
            <div className="mt-3 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
              <div className="flex items-center gap-3">
                <span className={`rounded-full px-3 py-1 text-lg font-black ${fb.score >= 70 ? "bg-emerald-600 text-white" : fb.score >= 45 ? "bg-amber-400 text-amber-950" : "bg-slate-200 text-slate-600"}`}>
                  {fb.score}
                </span>
                <span className="text-xs text-slate-500">
                  {fb.words} {t("iv.words")} · keywords {fb.keyword_hits} · fillers {fb.filler_words}{fb.has_numbers ? " · ✓ numbers" : ""}
                </span>
              </div>
              <ul className="mt-2 list-disc pl-5 text-sm text-slate-600">
                {fb.tips.map((x: string, i: number) => <li key={i}>{x}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
