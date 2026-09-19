"use client";

import { useState } from "react";
import { api, getActiveResume } from "../lib/api";
import { useLang } from "../components/lang";

const CATS = ["", "Engineering", "Design", "Marketing", "Finance", "HR", "Sales", "Support", "Internship", "Other"];
const input = "mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-400";

export default function AlertsClient() {
  const { t, lang } = useLang();
  const [email, setEmail] = useState("");
  const [query, setQuery] = useState("python");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const [minScore, setMinScore] = useState(50);
  const [useResume, setUseResume] = useState(true);
  const [phone, setPhone] = useState("");
  const [channel, setChannel] = useState("email");
  const [alerts, setAlerts] = useState<any[]>([]);
  const [msg, setMsg] = useState("");

  const subscribe = async () => {
    if (!email.includes("@")) return setMsg(t("a.valid_email"));
    if (channel !== "email" && !/^\d{10}$/.test(phone.replace(/[\s\-+]/g, "").replace(/^977/, "")))
      return setMsg(t("a.bad_phone"));
    try {
      const r = await api.alertCreate({
        email, query, category, location, min_score: useResume ? minScore : 0,
        resume_text: useResume ? getActiveResume() : "", lang, phone, channel,
      });
      if (r.error) return setMsg(r.error);
      setMsg(t("a.subscribed", { email }));
      load();
    } catch (e) { setMsg(String(e)); }
  };

  const load = async () => {
    if (!email.includes("@")) return setMsg(t("a.enter_manage"));
    try {
      const d = await api.alertList(email);
      setAlerts(d.results ?? []);
      setMsg(d.results?.length ? `${d.results.length} ${t("a.active")}` : t("a.no_alerts"));
    } catch (e) { setMsg(String(e)); }
  };

  return (
    <main className="mx-auto max-w-3xl space-y-5 px-6 py-10">
      <div className="rounded-3xl bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 p-8 text-white">
        <h1 className="text-3xl font-extrabold tracking-tight">{t("alerts.title")}</h1>
        <p className="mt-1 text-sm text-indigo-100">{t("alerts.sub")}</p>
      </div>

      {msg && <div className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm shadow-sm">{msg}</div>}

      <div className="space-y-3 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <label className="block text-xs font-semibold text-slate-500">{t("a.email")}
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className={input} /></label>
        <div className="grid gap-3 md:grid-cols-3">
          <label className="text-xs font-semibold text-slate-500">{t("a.keyword")}<input value={query} onChange={(e) => setQuery(e.target.value)} className={input} /></label>
          <label className="text-xs font-semibold text-slate-500">{t("a.category")}
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={input}>
              {CATS.map((c) => <option key={c} value={c}>{c || t("a.any")}</option>)}
            </select></label>
          <label className="text-xs font-semibold text-slate-500">{t("a.location")}<input value={location} onChange={(e) => setLocation(e.target.value)} placeholder={t("a.kathmandu")} className={input} /></label>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <label className="text-xs font-semibold text-slate-500">{t("a.phone")}<input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="9841234567" className={input} /></label>
          <label className="text-xs font-semibold text-slate-500">{t("a.channel")}
            <select value={channel} onChange={(e) => setChannel(e.target.value)} className={input}>
              <option value="email">{t("a.ch_email")}</option>
              <option value="sms">{t("a.ch_sms")}</option>
              <option value="both">{t("a.ch_both")}</option>
            </select></label>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={useResume} onChange={(e) => setUseResume(e.target.checked)} className="accent-indigo-600" />
          {t("a.check")}
        </label>
        {useResume && (
          <label className="block text-xs font-semibold text-slate-500">{t("a.min")}: {minScore}
            <input type="range" min={0} max={90} step={10} value={minScore} onChange={(e) => setMinScore(Number(e.target.value))} className="ml-2 accent-indigo-600" /></label>
        )}
        <div className="flex gap-2">
          <button onClick={subscribe} className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-2.5 text-sm font-bold text-white hover:opacity-90">{t("a.subscribe")}</button>
          <button onClick={load} className="rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-200">{t("a.manage")}</button>
        </div>
      </div>

      {!!alerts.length && (
        <div className="space-y-2">
          {alerts.map((a) => (
            <div key={a.id} className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-4 text-sm shadow-sm">
              <span><b className="text-slate-900">{a.query || a.category || "All jobs"}</b> <span className="text-slate-500">· {a.location || "anywhere"} · min {a.min_score} · {a.channel || "email"}{a.phone ? ` → ${a.phone}` : ""}</span></span>
              <button onClick={() => api.alertDelete(a.id).then(load)} className="ml-auto text-xs font-semibold text-rose-600 hover:text-rose-800">{t("a.unsubscribe")}</button>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
