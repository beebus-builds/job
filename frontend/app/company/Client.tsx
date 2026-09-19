"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "../lib/api";
import { useLang } from "../components/lang";
import { useAuth } from "../components/auth";

const THEMES = ["indigo", "emerald", "sky", "amber", "rose", "violet"];
const input = "mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-400";

export default function CompanyEditor() {
  const { t } = useLang();
  const { user, loading } = useAuth();
  const router = useRouter();
  const [f, setF] = useState({ slug: "", company: "", tagline: "", theme: "indigo", emoji: "🏢", about: "", location: "", website: "", benefits: "", logo: "" });
  const [msg, setMsg] = useState("");
  const [live, setLive] = useState("");

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
    if (user) api.companyOwn().then((d) => {
      if (!d.error && !d.exists) return;
      if (d.slug) {
        setF({ slug: d.slug || "", company: d.company || "", tagline: d.tagline || "", theme: d.theme || "indigo", emoji: d.emoji || "🏢", about: d.about || "", location: d.location || "", website: d.website || "", benefits: d.benefits || "", logo: d.logo || "" });
        setLive(d.slug);
      }
    }).catch(() => {});
  }, [user, loading, router]);

  if (loading || !user) return <main className="mx-auto max-w-3xl px-6 py-16 text-sm text-slate-400">…</main>;

  const save = async () => {
    if (!f.company) { setMsg(t("e.required")); return; }
    try {
      const d = await api.companySave(f);
      setLive(d.slug);
      setMsg(`${t("co.saved")} /c/${d.slug}`);
    } catch (e) { setMsg(String(e)); }
  };

  const set = (k: keyof typeof f, v: string) => setF({ ...f, [k]: v });

  return (
    <main className="mx-auto max-w-3xl space-y-4 px-6 py-10">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">{t("co.title")}</h1>
        <p className="mt-1 text-sm text-slate-500">{t("co.sub")} {t("co.link_hint")}</p>
      </div>
      {msg && <div className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm shadow-sm">{msg}</div>}
      {live && <Link href={`/c/${live}`} className="inline-block rounded-full bg-emerald-600 px-5 py-2 text-sm font-bold text-white hover:bg-emerald-500">{t("co.view")} →</Link>}
      <div className="grid gap-3 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-2">
        <label className="block text-xs font-semibold text-slate-500">{t("co.company")}
          <input value={f.company} onChange={(e) => set("company", e.target.value)} className={input} /></label>
        <label className="block text-xs font-semibold text-slate-500">{t("co.slug")} (/c/…)
          <input value={f.slug} onChange={(e) => set("slug", e.target.value)} placeholder="acme-co" className={input} /></label>
        <label className="block text-xs font-semibold text-slate-500">{t("co.tagline")}
          <input value={f.tagline} onChange={(e) => set("tagline", e.target.value)} className={input} /></label>
        <label className="block text-xs font-semibold text-slate-500">{t("co.location")}
          <input value={f.location} onChange={(e) => set("location", e.target.value)} className={input} /></label>
        <label className="block text-xs font-semibold text-slate-500">{t("co.emoji")}
          <input value={f.emoji} onChange={(e) => set("emoji", e.target.value)} className={input} /></label>
        <label className="block text-xs font-semibold text-slate-500">Logo image (max 400KB)
          <input type="file" accept="image/*" onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file || file.size > 400000) { setMsg("max 400KB"); return; }
            const rd = new FileReader();
            rd.onload = () => setF({ ...f, logo: String(rd.result) });
            rd.readAsDataURL(file);
          }} className={`${input} file:mr-2 file:rounded-lg file:border-0 file:bg-slate-200 file:px-2 file:py-1 file:text-xs`} /></label>
        <label className="block text-xs font-semibold text-slate-500">{t("co.theme")}
          <select value={f.theme} onChange={(e) => set("theme", e.target.value)} className={input}>
            {THEMES.map((th) => <option key={th}>{th}</option>)}
          </select></label>
        <label className="block text-xs font-semibold text-slate-500 md:col-span-2">{t("co.website")}
          <input value={f.website} onChange={(e) => set("website", e.target.value)} placeholder="https://" className={input} /></label>
        <label className="block text-xs font-semibold text-slate-500 md:col-span-2">{t("co.about")}
          <textarea value={f.about} onChange={(e) => set("about", e.target.value)} rows={5} className={input} /></label>
        <label className="block text-xs font-semibold text-slate-500 md:col-span-2">{t("co.benefits")}
          <textarea value={f.benefits} onChange={(e) => set("benefits", e.target.value)} rows={3} className={input} /></label>
      </div>
      <button onClick={save} className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-2.5 text-sm font-bold text-white hover:opacity-90">{t("co.save")}</button>
      <TeamManager />
    </main>
  );
}

function TeamManager() {
  const { t } = useLang();
  const [members, setMembers] = useState<any[]>([]);
  const [email, setEmail] = useState("");
  const load = () => api.members().then((d) => setMembers(d.results ?? [])).catch(() => {});
  useEffect(() => { load(); }, []);
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="font-extrabold tracking-tight">👥 {t("team.title")}</h2>
      {members.length ? members.map((m) => (
        <div key={m.user_id} className="mt-1 flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm ring-1 ring-slate-200/70">
          <b>{m.name || m.email}</b><span className="text-xs text-slate-500">{m.role}</span>
          <button onClick={() => api.memberDrop(m.user_id).then(load)} className="ml-auto text-xs font-semibold text-rose-600">{t("team.remove")}</button>
        </div>
      )) : <p className="mt-1 text-sm text-slate-400">{t("team.empty")}</p>}
      <div className="mt-2 flex gap-2">
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("team.add_ph")}
          className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none" />
        <button onClick={() => api.memberAdd(email).then(() => { setEmail(""); load(); })}
          className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white">+ {t("team.add")}</button>
      </div>
    </div>
  );
}
