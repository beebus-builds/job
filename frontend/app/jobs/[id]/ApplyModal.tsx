"use client";

import { useState } from "react";
import Link from "next/link";
import { api, getActiveResume, parseResume } from "../../lib/api";
import { useLang } from "../../components/lang";

export default function ApplyModal({ jobId, title }: { jobId: number; title: string }) {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: "", email: "", phone: "", resume_text: "", cover_note: "", filename: "" });
  const [done, setDone] = useState<any>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const openModal = () => {
    setErr(""); setDone(null);
    if (!f.resume_text) {
      const saved = getActiveResume();
      if (saved) setF({ ...f, resume_text: saved });
    }
    setOpen(true);
  };

  const submit = async () => {
    if (!f.resume_text.trim()) { setErr(t("ats.need_resume")); return; }
    setBusy(true); setErr("");
    try {
      const r = await api.applyFull(jobId, f);
      if (r.error) setErr(r.error);
      else setDone(r);
    } catch (e) { setErr(String(e)); } finally { setBusy(false); }
  };

  const input = "mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-400";

  return (
    <>
      <button onClick={openModal}
        className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-2.5 text-center text-sm font-bold text-white hover:opacity-90">
        {t("ats.apply_now")}
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={() => setOpen(false)}>
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            {!done ? (
              <>
                <h3 className="text-lg font-extrabold tracking-tight">{t("ats.apply_title")} — {title}</h3>
                {err && <div className="mt-2 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{err}</div>}
                <div className="mt-3 space-y-2.5">
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    <label className="block text-xs font-semibold text-slate-500">{t("d.name")}
                      <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className={input} /></label>
                    <label className="block text-xs font-semibold text-slate-500">{t("auth.email")}
                      <input value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} className={input} /></label>
                  </div>
                  <label className="block text-xs font-semibold text-slate-500">{t("a.phone")}
                    <input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="9841234567" className={input} /></label>
                  <label className="block text-xs font-semibold text-slate-500">{t("d.upload")}
                    <input type="file" accept=".pdf,.docx,.txt,.md" onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        const d = await parseResume(file);
                        if (!d.error && d.resume_text) setF({ ...f, resume_text: d.resume_text, filename: file.name });
                        else setErr(d.error || "parse failed");
                      } catch (er) { setErr(String(er)); }
                    }} className={`${input} file:mr-2 file:rounded-lg file:border-0 file:bg-slate-200 file:px-2 file:py-1 file:text-xs`} /></label>
                  <label className="block text-xs font-semibold text-slate-500">{t("ats.resume")}
                    <textarea value={f.resume_text} onChange={(e) => setF({ ...f, resume_text: e.target.value })} rows={5} className={input} /></label>
                  <label className="block text-xs font-semibold text-slate-500">{t("ats.cover")}
                    <textarea value={f.cover_note} onChange={(e) => setF({ ...f, cover_note: e.target.value })} rows={3} className={input} /></label>
                  <div className="flex gap-2">
                    <button onClick={submit} disabled={busy}
                      className="flex-1 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 py-2.5 text-sm font-bold text-white hover:opacity-90">
                      {busy ? "…" : t("ats.submit")}</button>
                    <button onClick={() => setOpen(false)} className="rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-200">✕</button>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl">✓</div>
                <h3 className="mt-3 text-lg font-extrabold">{t("ats.sent")}</h3>
                <p className="mt-1 text-sm text-slate-500">{t("ats.your_score")}: <b className="text-slate-900">{done.score}/100</b></p>
                <div className="mt-4 flex justify-center gap-2">
                  <Link href="/applications" className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-bold text-white">{t("my.title")} →</Link>
                  <button onClick={() => setOpen(false)} className="rounded-xl bg-slate-900 px-6 py-2 text-sm font-bold text-white">{t("ats.close")}</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
