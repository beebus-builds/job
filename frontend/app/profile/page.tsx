"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "../lib/api";
import { useLang } from "../components/lang";
import { initials, useAuth } from "../components/auth";

export default function ProfilePage() {
  const { t } = useLang();
  const { user, loading, refresh } = useAuth();
  const router = useRouter();
  const [f, setF] = useState({ name: "", headline: "", location: "", bio: "", skills: "" });
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
    if (user) setF({
      name: user.name || "", headline: user.headline || "", location: user.location || "",
      bio: user.bio || "", skills: (user.skills || []).join(", "),
    });
  }, [user, loading, router]);

  if (loading || !user) return <main className="mx-auto max-w-3xl px-6 py-16 text-sm text-slate-400">…</main>;

  const save = async () => {
    try {
      await api.saveProfile({ ...f, skills: f.skills.split(",").map((s) => s.trim()).filter(Boolean) });
      await refresh();
      setMsg(t("auth.saved"));
    } catch (e) { setMsg(String(e)); }
  };

  const input = "mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-400";

  return (
    <main className="mx-auto max-w-3xl space-y-4 px-6 py-10">
      <div className="flex items-center gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        {user.avatar ? (
          <img src={user.avatar} alt="" className="h-16 w-16 rounded-2xl object-cover ring-1 ring-slate-200" />
        ) : (
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-xl font-black text-white">
            {initials(user.name, user.email)}
          </span>
        )}
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight">
            {user.name || user.email}
            {user.email_verified ? (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">✓ {t("vrf.badge")}</span>
            ) : (
              <button onClick={() => api.verifySend().then(() => setMsg(t("vrf.sent"))).catch((e) => setMsg(String(e)))}
                className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">{t("vrf.unverified")} — {t("vrf.send")}</button>
            )}
          </h1>
          <p className="text-sm text-slate-500">{user.headline || user.email} · {t("auth.member_since")} {new Date().getFullYear()}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Link href={`/u/${user.slug}`} className="text-sm font-semibold text-indigo-600 hover:text-indigo-800">
              {t("auth.public_hint")}: /u/{user.slug} →
            </Link>
            <label className="cursor-pointer text-xs font-semibold text-slate-500 hover:text-slate-800">
              📷 {t("ava.change")}
              <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file || file.size > 400000) { setMsg("max 400KB"); return; }
                const rd = new FileReader();
                rd.onload = async () => {
                  try { await api.saveProfile({ avatar: String(rd.result) }); await refresh(); }
                  catch (er) { setMsg(String(er)); }
                };
                rd.readAsDataURL(file);
              }} />
            </label>
          </div>
        </div>
      </div>

      {msg && <div className="rounded-xl bg-emerald-50 px-4 py-2 text-sm text-emerald-800 ring-1 ring-emerald-200">{msg}</div>}

      <div className="space-y-3 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-3 md:grid-cols-2">
          <label className="block text-xs font-semibold text-slate-500">{t("auth.name")}
            <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className={input} /></label>
          <label className="block text-xs font-semibold text-slate-500">{t("auth.headline")}
            <input value={f.headline} onChange={(e) => setF({ ...f, headline: e.target.value })} placeholder="Backend Engineer" className={input} /></label>
        </div>
        <label className="block text-xs font-semibold text-slate-500">{t("auth.location")}
          <input value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} placeholder="Kathmandu" className={input} /></label>
        <label className="block text-xs font-semibold text-slate-500">{t("auth.bio")}
          <textarea value={f.bio} onChange={(e) => setF({ ...f, bio: e.target.value })} rows={4} className={input} /></label>
        <label className="block text-xs font-semibold text-slate-500">{t("auth.skills")}
          <input value={f.skills} onChange={(e) => setF({ ...f, skills: e.target.value })} placeholder="Python, FastAPI, React" className={input} /></label>
        <button onClick={save} className="rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-bold text-white hover:bg-slate-700">{t("auth.save")}</button>
      </div>

      <PortfolioEditors />
      <ReferralCard />
      <PushCard />
      <Leaderboard />
      <DangerZone />
    </main>
  );
}

function PushCard() {
  const { t } = useLang();
  const [state, setState] = useState("idle");
  const enable = async () => {
    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) { setState("unsupported"); return; }
      const reg = await navigator.serviceWorker.ready;
      const { key } = await api.pushVapid();
      if (!key) { setState("nokeys"); return; }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: Uint8Array.from(atob(key.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0)),
      });
      const json = sub.toJSON() as any;
      await api.pushSub(json.endpoint, json.keys);
      setState("on");
    } catch { setState("denied"); }
  };
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="font-extrabold tracking-tight">🔔 {t("push.title")}</h2>
      {state === "on" ? <p className="mt-1 text-sm text-emerald-700">✓</p>
        : state === "idle" ? <button onClick={enable} className="mt-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white">{t("push.on")}</button>
        : <p className="mt-1 text-sm text-slate-400">{t("push.off")}</p>}
    </div>
  );
}

function Leaderboard() {
  const { t } = useLang();
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => { api.referralBoard().then((d) => setRows(d.results ?? [])).catch(() => {}); }, []);
  if (!rows.length) return null;
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="font-extrabold tracking-tight">🏆 {t("lb.title")}</h2>
      <div className="mt-2 space-y-1">
        {rows.slice(0, 5).map((r: any, i: number) => (
          <div key={r.slug} className="flex items-center gap-2 text-sm">
            <span className="font-black text-slate-400">#{i + 1}</span>
            <Link href={`/u/${r.slug}`} className="font-bold text-slate-900 hover:text-indigo-700">{r.name}</Link>
            <span className="ml-auto text-xs text-slate-500">{r.invites} invites</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DangerZone() {
  const { t } = useLang();
  const { logout } = useAuth();
  const router = useRouter();
  const [armed, setArmed] = useState(false);
  const [confirm, setConfirm] = useState("");
  const wipe = async () => {
    if (confirm !== "DELETE") return;
    await api.deleteAccount().catch(() => {});
    logout();
    router.replace("/");
  };
  return (
    <div className="rounded-3xl border border-rose-200 bg-rose-50/50 p-6">
      <h2 className="font-extrabold tracking-tight text-rose-800">⚠️ {t("del.zone")}</h2>
      {!armed ? (
        <button onClick={() => setArmed(true)} className="mt-2 rounded-xl bg-white px-4 py-2 text-sm font-bold text-rose-700 ring-1 ring-rose-200">{t("del.ask")}</button>
      ) : (
        <div className="mt-2 flex gap-2">
          <input value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder={t("del.confirm")}
            className="min-w-0 flex-1 rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm outline-none" />
          <button onClick={wipe} className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold text-white">OK</button>
        </div>
      )}
    </div>
  );
}

function ReferralCard() {
  const { t } = useLang();
  const [data, setData] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  useEffect(() => { api.referralMine().then(setData).catch(() => {}); }, []);
  if (!data?.code) return null;
  const site = typeof window !== "undefined" ? window.location.origin : "";
  const link = `${site}/r/${data.code}`;
  const copy = async () => {
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* noop */ }
  };
  const shareText = encodeURIComponent(`Join me on AutomateJob — AI job matches + free alerts ${link}`);
  return (
    <div className="rounded-3xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-violet-50 p-6 shadow-sm">
      <h2 className="font-extrabold tracking-tight">{t("ref.title")}</h2>
      <p className="mt-1 text-sm text-slate-600">{t("ref.sub", { n: data.bonus ?? 3 })}</p>
      <div className="mt-3 flex gap-2">
        <input readOnly value={link} className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" />
        <button onClick={copy} className="shrink-0 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white">
          {copied ? "✓" : t("ref.copy")}</button>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
        <a href={`https://wa.me/?text=${shareText}`} target="_blank" className="rounded-full bg-white px-3 py-1 font-bold text-slate-700 ring-1 ring-slate-200">WhatsApp</a>
        <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`} target="_blank" className="rounded-full bg-white px-3 py-1 font-bold text-slate-700 ring-1 ring-slate-200">Facebook</a>
        <span className="ml-auto font-semibold text-slate-500">
          {t("ref.joined", { n: data.invites?.length ?? 0 })} · {t("ref.credits", { n: data.sms_credits ?? 0 })}
        </span>
      </div>
    </div>
  );
}

function PortfolioEditors() {
  const { t } = useLang();
  const [projects, setProjects] = useState<any[]>([]);
  const [exps, setExps] = useState<any[]>([]);
  const [np, setNp] = useState({ title: "", description: "", link: "", tags: "" });
  const [ne, setNe] = useState({ role: "", org: "", period: "", description: "" });

  const load = async () => {
    try {
      const [p, e] = await Promise.all([api.projList(), api.expList()]);
      setProjects(p.results ?? []); setExps(e.results ?? []);
    } catch { /* logged out */ }
  };
  useEffect(() => { load(); }, []);

  const input = "mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-400";

  return (
    <>
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="font-extrabold tracking-tight">{t("pf.projects")}</h2>
        <div className="mt-2 space-y-2">
          {projects.map((p) => (
            <div key={p.id} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm ring-1 ring-slate-200/70">
              <b className="text-slate-900">{p.title}</b>
              <span className="truncate text-xs text-slate-500">{p.link}</span>
              <button onClick={() => api.projDel(p.id).then(load)} className="ml-auto text-xs font-semibold text-rose-600">{t("pf.delete")}</button>
            </div>
          ))}
          {!projects.length && <p className="text-sm text-slate-400">{t("pf.empty")}</p>}
        </div>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          <input value={np.title} onChange={(e) => setNp({ ...np, title: e.target.value })} placeholder={t("pf.projects")} className={input} />
          <input value={np.link} onChange={(e) => setNp({ ...np, link: e.target.value })} placeholder={t("pf.link")} className={input} />
          <input value={np.description} onChange={(e) => setNp({ ...np, description: e.target.value })} placeholder={t("cv.desc")} className={`${input} md:col-span-2`} />
          <input value={np.tags} onChange={(e) => setNp({ ...np, tags: e.target.value })} placeholder={t("pf.tags")} className={`${input} md:col-span-2`} />
        </div>
        <button onClick={() => api.projAdd({ ...np, tags: np.tags.split(",").map((s) => s.trim()).filter(Boolean) }).then(() => { setNp({ title: "", description: "", link: "", tags: "" }); load(); })}
          className="mt-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-500">+ {t("pf.add")}</button>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="font-extrabold tracking-tight">{t("pf.experience")}</h2>
        <div className="mt-2 space-y-2">
          {exps.map((x) => (
            <div key={x.id} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm ring-1 ring-slate-200/70">
              <b className="text-slate-900">{x.role}</b>
              <span className="truncate text-xs text-slate-500">@ {x.org} · {x.period}</span>
              <button onClick={() => api.expDel(x.id).then(load)} className="ml-auto text-xs font-semibold text-rose-600">{t("pf.delete")}</button>
            </div>
          ))}
          {!exps.length && <p className="text-sm text-slate-400">{t("pf.empty")}</p>}
        </div>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          <input value={ne.role} onChange={(e) => setNe({ ...ne, role: e.target.value })} placeholder={t("cv.role")} className={input} />
          <input value={ne.org} onChange={(e) => setNe({ ...ne, org: e.target.value })} placeholder={t("cv.org")} className={input} />
          <input value={ne.period} onChange={(e) => setNe({ ...ne, period: e.target.value })} placeholder="2022 – 2024" className={`${input} md:col-span-2`} />
          <input value={ne.description} onChange={(e) => setNe({ ...ne, description: e.target.value })} placeholder={t("cv.desc")} className={`${input} md:col-span-2`} />
        </div>
        <button onClick={() => api.expAdd(ne).then(() => { setNe({ role: "", org: "", period: "", description: "" }); load(); })}
          className="mt-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-500">+ {t("pf.add")}</button>
      </div>
    </>
  );
}
