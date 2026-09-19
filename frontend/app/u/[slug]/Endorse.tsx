"use client";

import { useState } from "react";
import { api } from "../../lib/api";

export default function Endorse({ slug, skills }: { slug: string; skills: string[] }) {
  const [skill, setSkill] = useState(skills[0] ?? "");
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  if (!skills.length) return null;
  const go = async () => {
    if (!email.includes("@") || !skill) return;
    await api.endorse(slug, skill, email).catch(() => {});
    setDone(true);
  };
  if (done) return <p className="mt-3 text-sm font-semibold text-emerald-700">Thanks for endorsing! ✓</p>;
  return (
    <div className="mt-3 flex flex-wrap gap-1.5 rounded-2xl bg-slate-50 p-2.5 ring-1 ring-slate-200/70">
      <select value={skill} onChange={(e) => setSkill(e.target.value)}
        className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs">
        {skills.map((s) => <option key={s}>{s}</option>)}
      </select>
      <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your email"
        className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs outline-none" />
      <button onClick={go} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white">Endorse</button>
    </div>
  );
}
