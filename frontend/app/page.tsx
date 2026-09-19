import type { Metadata } from "next";
import Link from "next/link";
import { T } from "./components/lang";

export const dynamic = "force-dynamic";

const API = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

export const metadata: Metadata = {
  title: "AutomateJob — Jobs in Nepal & Remote",
  description: "AI-ranked job matches, smart alerts and free employer postings. English + Nepali.",
};

async function boardCount(): Promise<number> {
  try {
    const r = await fetch(`${API}/api/board`, { next: { revalidate: 300 } });
    if (!r.ok) return 0;
    return (await r.json()).count ?? 0;
  } catch {
    return 0;
  }
}

const FEATURES = [
  ["land.f1t", "land.f1d", "🎯"],
  ["land.f2t", "land.f2d", "🔔"],
  ["land.f3t", "land.f3d", "📝"],
  ["land.f4t", "land.f4d", "📋"],
  ["land.f5t", "land.f5d", "📄"],
  ["land.f6t", "land.f6d", "📊"],
];

const STEPS = [["land.s1t", "land.s1d"], ["land.s2t", "land.s2d"], ["land.s3t", "land.s3d"]];

export default async function Landing() {
  const count = await boardCount();
  return (
    <main>
      {/* HERO */}
      <section className="hero-grid border-b border-slate-200/70">
        <div className="mx-auto max-w-6xl px-6 pb-16 pt-16 text-center sm:pt-24">
          <span className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-4 py-1 text-xs font-bold text-indigo-700">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <T k="land.badge" />
          </span>
          <h1 className="mx-auto mt-5 max-w-3xl text-4xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-6xl">
            <T k="land.title" />
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-slate-600 sm:text-lg">
            <T k="land.sub" />
          </p>
          <form action="/jobs" method="get" className="mx-auto mt-8 flex max-w-xl gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-lg shadow-indigo-100">
            <input name="q" placeholder="python, designer, accountant…" className="min-w-0 flex-1 rounded-xl px-4 py-2.5 text-sm outline-none placeholder:text-slate-400" />
            <button className="shrink-0 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-2.5 text-sm font-bold text-white hover:opacity-90">
              <T k="land.search_btn" />
            </button>
          </form>
          <div className="mt-5 flex items-center justify-center gap-4 text-sm text-slate-500">
            <span><b className="text-slate-900">{count}</b> <T k="land.live" /></span>
            <span className="h-1 w-1 rounded-full bg-slate-300" />
            <Link href="/app" className="font-semibold text-indigo-600 hover:text-indigo-800"><T k="land.open_dash" /> →</Link>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="mx-auto max-w-6xl px-6 py-14">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(([t, d, icon]) => (
            <div key={t} className="card-hover rounded-2xl border border-slate-200 bg-white p-5">
              <div className="text-2xl">{icon}</div>
              <div className="mt-2 font-bold text-slate-900"><T k={t} /></div>
              <div className="mt-1 text-sm leading-6 text-slate-600"><T k={d} /></div>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="border-y border-slate-200/70 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <h2 className="text-center text-2xl font-extrabold tracking-tight text-slate-900"><T k="land.how" /></h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {STEPS.map(([t, d], i) => (
              <div key={t} className="relative rounded-2xl bg-slate-50 p-6 ring-1 ring-slate-200/70">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 text-sm font-black text-white">{i + 1}</span>
                <div className="mt-3 font-bold text-slate-900"><T k={t} /></div>
                <div className="mt-1 text-sm leading-6 text-slate-600"><T k={d} /></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* EMPLOYER CTA */}
      <section className="mx-auto max-w-6xl px-6 py-14">
        <div className="overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 p-8 text-white sm:p-12">
          <h2 className="max-w-xl text-2xl font-extrabold tracking-tight sm:text-3xl"><T k="land.emp_t" /></h2>
          <p className="mt-2 max-w-xl text-sm text-indigo-100"><T k="land.emp_d" /></p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/employers" className="rounded-full bg-white px-6 py-2.5 text-sm font-bold text-indigo-700 hover:bg-indigo-50"><T k="land.emp_btn" /></Link>
            <Link href="/jobs" className="rounded-full border border-white/40 px-6 py-2.5 text-sm font-bold text-white hover:bg-white/10"><T k="nav.find" /></Link>
          </div>
        </div>
      </section>
    </main>
  );
}
