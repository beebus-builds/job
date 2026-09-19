"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "../lib/api";
import { useLang } from "../components/lang";
import { useAuth } from "../components/auth";

type Exp = { role: string; org: string; period: string; desc: string };
type Edu = { school: string; period: string; desc: string };

const input = "mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-400";

export default function CvBuilder() {
  const { t } = useLang();
  const { user, loading } = useAuth();
  const router = useRouter();
  const [f, setF] = useState({ name: "", email: "", phone: "", location: "", summary: "", skills: "", template: "modern" });
  const [exps, setExps] = useState<Exp[]>([]);
  const [edus, setEdus] = useState<Edu[]>([]);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
    if (user) api.cvGet().then((d) => {
      if (d.error) return;
      setF({
        name: d.name || user.name || "", email: d.email || user.email || "",
        phone: d.phone || "", location: d.location || user.location || "",
        summary: d.summary || "", skills: (d.skills || []).join(", "),
        template: d.template || "modern",
      });
      setExps(d.experience ?? []);
      setEdus(d.education ?? []);
    }).catch(() => {});
  }, [user, loading, router]);

  if (loading || !user) return <main className="mx-auto max-w-6xl px-6 py-16 text-sm text-slate-400">…</main>;

  const save = async () => {
    try {
      await api.cvSave({
        ...f,
        skills: f.skills.split(",").map((s) => s.trim()).filter(Boolean),
        experience: exps, education: edus,
      });
      setMsg(t("cv.saved"));
    } catch (e) { setMsg(String(e)); }
  };

  const cv = {
    ...f,
    skills: f.skills.split(",").map((s) => s.trim()).filter(Boolean),
    experience: exps, education: edus,
  };

  return (
    <main className="mx-auto max-w-6xl space-y-4 px-6 py-10">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">{t("cv.title")}</h1>
          <p className="mt-1 text-sm text-slate-500">{t("cv.sub")}</p>
        </div>
        <div className="no-print ml-auto flex gap-2">
          <button onClick={save} className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-slate-700">{t("cv.save")}</button>
          <button onClick={() => window.print()} className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-2.5 text-sm font-bold text-white hover:opacity-90">🖨️ {t("cv.pdf")}</button>
        </div>
      </div>
      {msg && <div className="no-print rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm shadow-sm">{msg}</div>}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="no-print space-y-3 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="block text-xs font-semibold text-slate-500">{t("auth.name")}<input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className={input} /></label>
            <label className="block text-xs font-semibold text-slate-500">{t("auth.email")}<input value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} className={input} /></label>
            <label className="block text-xs font-semibold text-slate-500">{t("cv.phone")}<input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} className={input} /></label>
            <label className="block text-xs font-semibold text-slate-500">{t("auth.location")}<input value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} className={input} /></label>
          </div>
          <label className="block text-xs font-semibold text-slate-500">{t("cv.summary")}
            <textarea value={f.summary} onChange={(e) => setF({ ...f, summary: e.target.value })} rows={3} className={input} /></label>
          <label className="block text-xs font-semibold text-slate-500">{t("auth.skills")}
            <input value={f.skills} onChange={(e) => setF({ ...f, skills: e.target.value })} className={input} /></label>
          <label className="block text-xs font-semibold text-slate-500">{t("cv.template")}
            <select value={f.template} onChange={(e) => setF({ ...f, template: e.target.value })} className={input}>
              <option value="modern">Modern</option>
              <option value="classic">Classic</option>
              <option value="minimal">Minimal</option>
            </select></label>

          <ExpEditor exps={exps} setExps={setExps} />
          <EduEditor edus={edus} setEdus={setEdus} />
        </div>

        <div className="lg:sticky lg:top-20 lg:self-start">
          <CvPreview cv={cv} />
        </div>
      </div>
    </main>
  );
}

function ExpEditor({ exps, setExps }: { exps: Exp[]; setExps: (e: Exp[]) => void }) {
  const { t } = useLang();
  const [n, setN] = useState<Exp>({ role: "", org: "", period: "", desc: "" });
  return (
    <div>
      <h3 className="text-sm font-extrabold">{t("cv.exp")}</h3>
      {exps.map((x, i) => (
        <div key={i} className="mt-1 flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-1.5 text-sm ring-1 ring-slate-200/70">
          <b>{x.role}</b><span className="text-xs text-slate-500">@ {x.org}</span>
          <button onClick={() => setExps(exps.filter((_, j) => j !== i))} className="ml-auto text-xs font-semibold text-rose-600">✕</button>
        </div>
      ))}
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <input value={n.role} onChange={(e) => setN({ ...n, role: e.target.value })} placeholder={t("cv.role")} className={input} />
        <input value={n.org} onChange={(e) => setN({ ...n, org: e.target.value })} placeholder={t("cv.org")} className={input} />
        <input value={n.period} onChange={(e) => setN({ ...n, period: e.target.value })} placeholder={t("cv.period")} className={input} />
        <input value={n.desc} onChange={(e) => setN({ ...n, desc: e.target.value })} placeholder={t("cv.desc")} className={input} />
      </div>
      <button onClick={() => { if (n.role) { setExps([...exps, n]); setN({ role: "", org: "", period: "", desc: "" }); } }}
        className="mt-2 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white">+ {t("cv.add_exp")}</button>
    </div>
  );
}

function EduEditor({ edus, setEdus }: { edus: Edu[]; setEdus: (e: Edu[]) => void }) {
  const { t } = useLang();
  const [n, setN] = useState<Edu>({ school: "", period: "", desc: "" });
  return (
    <div>
      <h3 className="text-sm font-extrabold">{t("cv.edu")}</h3>
      {edus.map((x, i) => (
        <div key={i} className="mt-1 flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-1.5 text-sm ring-1 ring-slate-200/70">
          <b>{x.school}</b><span className="text-xs text-slate-500">{x.period}</span>
          <button onClick={() => setEdus(edus.filter((_, j) => j !== i))} className="ml-auto text-xs font-semibold text-rose-600">✕</button>
        </div>
      ))}
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <input value={n.school} onChange={(e) => setN({ ...n, school: e.target.value })} placeholder={t("cv.school")} className={input} />
        <input value={n.period} onChange={(e) => setN({ ...n, period: e.target.value })} placeholder={t("cv.period")} className={input} />
        <input value={n.desc} onChange={(e) => setN({ ...n, desc: e.target.value })} placeholder={t("cv.desc")} className={`${input} sm:col-span-2`} />
      </div>
      <button onClick={() => { if (n.school) { setEdus([...edus, n]); setN({ school: "", period: "", desc: "" }); } }}
        className="mt-2 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white">+ {t("cv.add_edu")}</button>
    </div>
  );
}

function CvPreview({ cv }: { cv: any }) {
  if (cv.template === "classic") return <ClassicCv cv={cv} />;
  if (cv.template === "minimal") return <MinimalCv cv={cv} />;
  return <ModernCv cv={cv} />;
}

function ModernCv({ cv }: { cv: any }) {
  return (
    <div id="cv-paper" className="overflow-hidden rounded-2xl bg-white text-slate-900 shadow-lg ring-1 ring-slate-200">
      <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-5 text-white">
        <div className="text-2xl font-extrabold tracking-tight">{cv.name || "Your Name"}</div>
        <div className="mt-1 text-xs opacity-90">{[cv.email, cv.phone, cv.location].filter(Boolean).join(" · ")}</div>
      </div>
      <div className="space-y-4 p-6 text-sm">
        {cv.summary && <p className="leading-6 text-slate-700">{cv.summary}</p>}
        {!!cv.skills?.length && (
          <div><SecH>Skills</SecH>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {cv.skills.map((s: string) => <span key={s} className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">{s}</span>)}
            </div></div>
        )}
        {!!cv.experience?.length && (
          <div><SecH>Experience</SecH>
            {cv.experience.map((x: any, i: number) => (
              <div key={i} className="mt-2">
                <div className="font-bold">{x.role} <span className="font-normal text-slate-500">@ {x.org}</span></div>
                <div className="text-xs text-slate-400">{x.period}</div>
                {x.desc && <p className="mt-0.5 text-slate-600">{x.desc}</p>}
              </div>
            ))}</div>
        )}
        {!!cv.education?.length && (
          <div><SecH>Education</SecH>
            {cv.education.map((x: any, i: number) => (
              <div key={i} className="mt-1"><span className="font-bold">{x.school}</span> <span className="text-xs text-slate-400">{x.period}</span>
                {x.desc && <p className="text-slate-600">{x.desc}</p>}</div>
            ))}</div>
        )}
      </div>
    </div>
  );
}

function ClassicCv({ cv }: { cv: any }) {
  return (
    <div id="cv-paper" className="rounded-2xl bg-white p-8 text-center text-slate-900 shadow-lg ring-1 ring-slate-200" style={{ fontFamily: "Georgia, serif" }}>
      <div className="text-3xl font-bold tracking-wide">{cv.name || "Your Name"}</div>
      <div className="mt-1 text-xs uppercase tracking-widest text-slate-500">{[cv.email, cv.phone, cv.location].filter(Boolean).join(" · ")}</div>
      <hr className="my-4 border-slate-300" />
      <div className="space-y-4 text-left text-sm">
        {cv.summary && <p className="italic leading-6 text-slate-700">{cv.summary}</p>}
        {!!cv.experience?.length && (
          <div><div className="text-xs font-bold uppercase tracking-widest text-slate-500">Experience</div>
            {cv.experience.map((x: any, i: number) => (
              <div key={i} className="mt-2"><b>{x.role}</b>, {x.org} <span className="text-slate-500">({x.period})</span>
                {x.desc && <p className="text-slate-600">{x.desc}</p>}</div>
            ))}</div>
        )}
        {!!cv.education?.length && (
          <div><div className="text-xs font-bold uppercase tracking-widest text-slate-500">Education</div>
            {cv.education.map((x: any, i: number) => (
              <div key={i} className="mt-1"><b>{x.school}</b> <span className="text-slate-500">({x.period})</span></div>
            ))}</div>
        )}
        {!!cv.skills?.length && (
          <div><div className="text-xs font-bold uppercase tracking-widest text-slate-500">Skills</div>
            <p className="mt-1 text-slate-700">{cv.skills.join(", ")}</p></div>
        )}
      </div>
    </div>
  );
}

function MinimalCv({ cv }: { cv: any }) {
  return (
    <div id="cv-paper" className="rounded-2xl bg-white p-8 text-slate-900 shadow-lg ring-1 ring-slate-200">
      <div className="text-2xl font-extrabold tracking-tight">{cv.name || "Your Name"}</div>
      <div className="mt-0.5 text-sm text-slate-500">{[cv.email, cv.phone, cv.location].filter(Boolean).join(" · ")}</div>
      {cv.summary && <p className="mt-4 text-sm leading-6 text-slate-700">{cv.summary}</p>}
      {!!cv.experience?.length && (
        <div className="mt-5"><SecH>Experience</SecH>
          {cv.experience.map((x: any, i: number) => (
            <div key={i} className="mt-2 flex gap-4 text-sm">
              <span className="w-24 shrink-0 text-xs text-slate-400">{x.period}</span>
              <div><b>{x.role}</b> · {x.org}{x.desc && <p className="text-slate-600">{x.desc}</p>}</div>
            </div>
          ))}</div>
      )}
      {!!cv.education?.length && (
        <div className="mt-5"><SecH>Education</SecH>
          {cv.education.map((x: any, i: number) => (
            <div key={i} className="mt-1 text-sm"><b>{x.school}</b> <span className="text-slate-400">{x.period}</span></div>
          ))}</div>
      )}
      {!!cv.skills?.length && (
        <div className="mt-5"><SecH>Skills</SecH>
          <p className="mt-1 text-sm text-slate-700">{cv.skills.join(" · ")}</p></div>
      )}
    </div>
  );
}

function SecH({ children }: { children: React.ReactNode }) {
  return <div className="text-xs font-extrabold uppercase tracking-widest text-indigo-600">{children}</div>;
}
