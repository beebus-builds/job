import type { Metadata } from "next";
import Link from "next/link";
import JobsFilter from "./JobsFilter";
import { T } from "../components/lang";

export const dynamic = "force-dynamic";

const API = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

export const metadata: Metadata = {
  title: "Browse Jobs in Nepal & Remote",
  description:
    "Engineering, design, marketing, finance & internship jobs in Kathmandu, Lalitpur, Pokhara and remote. Employers post free.",
};

type BoardJob = {
  id: number; title: string; company: string; location: string;
  work_type: string; category: string; salary: string;
  description: string; skills: string[]; views: number; applies: number; featured?: boolean;
};

async function getJobs(q: string, category: string, location: string) {
  try {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (category) sp.set("category", category);
    if (location) sp.set("location", location);
    const r = await fetch(`${API}/api/board?${sp.toString()}`, { cache: "no-store" });
    if (!r.ok) return { results: [], categories: [] };
    return r.json();
  } catch {
    return { results: [], categories: [] };
  }
}

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; location?: string }>;
}) {
  const { q = "", category = "", location = "" } = await searchParams;
  const data = await getJobs(q, category, location);
  const jobs: BoardJob[] = data.results ?? [];

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="text-3xl font-extrabold tracking-tight"><T k="jobs.title" /></h1>
      <p className="mt-1 text-sm text-slate-500"><T k="jobs.sub" vars={{ n: jobs.length }} /></p>
      <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
        🔔 <b><T k="jobs.cta" /></b> <Link href="/alerts" className="font-bold underline"><T k="jobs.cta_link" /></Link> <T k="jobs.cta_tail" />
      </div>

      <JobsFilter q={q} category={category} location={location} />

      <div className="mt-6 grid gap-3">
        {jobs.map((j) => (
          <Link key={j.id} href={`/jobs/${j.id}`}
            className="card-hover block rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-lg font-extrabold tracking-tight text-slate-900">{j.title}</span>
              {j.featured && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">⭐ Featured</span>}
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">{j.category}</span>
            </div>
            <div className="mt-1 text-sm text-slate-500">
              {j.company} · {j.location} · {j.work_type}
              {j.salary ? <> · <span className="font-bold text-emerald-700">{j.salary}</span></> : null}
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {j.skills.slice(0, 6).map((s) => (
                <span key={s} className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">{s}</span>
              ))}
            </div>
            <div className="mt-3 text-xs text-slate-400">
              {j.views} <T k="jobs.views" /> · {j.applies} <T k="jobs.applies" /> →
            </div>
          </Link>
        ))}
        {!jobs.length && (
          <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
            <T k="jobs.none" /> <Link href="/employers" className="font-semibold text-indigo-600 underline"><T k="jobs.none_link" /></Link>
          </p>
        )}
      </div>
    </main>
  );
}
