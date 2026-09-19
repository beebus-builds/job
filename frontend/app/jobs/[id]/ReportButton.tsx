"use client";

import { useState } from "react";
import { api } from "../../lib/api";
import { useLang } from "../../components/lang";

const REASONS = ["spam", "scam", "expired", "wrong-info", "other"];

export default function ReportButton({ jobId }: { jobId: number }) {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("spam");
  const [details, setDetails] = useState("");
  const [done, setDone] = useState(false);

  const send = async () => {
    await api.reportJob(jobId, { reason, details }).catch(() => {});
    setDone(true);
  };

  return (
    <>
      <button onClick={() => { setOpen(true); setDone(false); }} className="text-xs font-semibold text-slate-400 hover:text-rose-600">
        🚩 {t("rep.btn")}
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            {!done ? (
              <>
                <h3 className="font-extrabold tracking-tight">{t("rep.title")}</h3>
                <label className="mt-3 block text-xs font-semibold text-slate-500">{t("rep.reason")}
                  <select value={reason} onChange={(e) => setReason(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none">
                    {REASONS.map((r) => <option key={r}>{r}</option>)}
                  </select></label>
                <label className="mt-2 block text-xs font-semibold text-slate-500">{t("rep.details")}
                  <textarea value={details} onChange={(e) => setDetails(e.target.value)} rows={3}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none" /></label>
                <div className="mt-3 flex gap-2">
                  <button onClick={send} className="flex-1 rounded-xl bg-rose-600 py-2 text-sm font-bold text-white hover:bg-rose-500">{t("rep.send")}</button>
                  <button onClick={() => setOpen(false)} className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600">✕</button>
                </div>
              </>
            ) : (
              <div className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-xl">✓</div>
                <p className="mt-2 text-sm font-semibold">{t("rep.done")}</p>
                <button onClick={() => setOpen(false)} className="mt-3 rounded-xl bg-slate-900 px-5 py-1.5 text-sm font-bold text-white">OK</button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
