"use client";

import { useLang } from "../components/lang";

const CATS = ["", "Engineering", "Design", "Marketing", "Finance", "HR", "Sales", "Support", "Internship", "Other"];

export default function JobsFilter({ q, category, location }: { q: string; category: string; location: string }) {
  const { t } = useLang();
  const cls = "rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-400";
  return (
    <form method="get" className="mt-4 grid gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm md:grid-cols-4">
      <input name="q" defaultValue={q} placeholder={t("jobs.kw")} className={cls} />
      <select name="category" defaultValue={category} className={cls}>
        {CATS.map((c) => <option key={c} value={c}>{c || t("jobs.allcat")}</option>)}
      </select>
      <input name="location" defaultValue={location} placeholder={t("jobs.loc")} className={cls} />
      <button className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-700">{t("jobs.search")}</button>
    </form>
  );
}
