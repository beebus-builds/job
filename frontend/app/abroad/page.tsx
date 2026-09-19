import type { Metadata } from "next";
import Link from "next/link";
import { T } from "../components/lang";

export const dynamic = "force-dynamic";

const API = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

export const metadata: Metadata = {
  title: "Jobs abroad — Gulf, Malaysia, Korea, Japan",
  description: "Foreign employment openings with scam-safety first. Qatar, UAE, Saudi, Malaysia, Korea, Japan.",
};

const DESTS = ["Qatar", "UAE", "Saudi Arabia", "Malaysia", "South Korea", "Japan", "Other abroad"];

export default async function Abroad({
  searchParams,
}: {
  searchParams: Promise<{ d?: string }>;
}) {
  const { d = "" } = await searchParams;
  let jobs: any[] = [];
  try {
    const r = await fetch(`${API}/api/board?destination=${encodeURIComponent(d || "Qatar")}`, { cache: "no-store" });
    if (r.ok) jobs = (await r.json()).results ?? [];
  } catch { /* offline */ }
  const all: any[] = [];
  try {
    const r = await fetch(`${API}/api/board`, { cache: "no-store" });
    if (r.ok) {
      const list = (await r.json()).results ?? [];
      for (const j of list) if (j.destination) all.push(j);
    }
  } catch { /* offline */ }

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="overflow-hidden rounded-3xl bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-600 p-8 text-white sm:p-10">
        <h1 className="text-3xl font-extrabold tracking-tight"><T k="ab.title" /></h1>
        <p className="mt-1 max-w-2xl text-sm text-sky-100"><T k="ab.sub" /></p>
        <div className="mt-4 flex flex-wrap gap-2">
          {DESTS.map((x) => (
            <Link key={x} href={`/abroad?d=${encodeURIComponent(x)}`}
              className={`rounded-full px-4 py-1.5 text-xs font-bold ${(d || "Qatar") === x ? "bg-white text-sky-700" : "bg-white/20 text-white hover:bg-white/30"}`}>
              {x}</Link>
          ))}
        </div>
      </div>

      <div className="mt-4 rounded-3xl border border-amber-200 bg-amber-50 p-5">
        <b className="text-sm text-amber-900">🛡️ <T k="ab.safe" /></b>
        <ul className="mt-1 list-disc pl-5 text-sm text-amber-900">
          <li><T k="ab.safe1" /></li>
          <li><T k="ab.safe2" /></li>
          <li><T k="ab.safe3" /></li>
          <li><T k="ab.safe4" /></li>
        </ul>
      </div>

      <h2 className="mt-6 text-lg font-extrabold tracking-tight">{d || "Qatar"} ({jobs.length})</h2>
      <div className="mt-2 grid gap-3">
        {jobs.map((j: any) => (
          <Link key={j.id} href={`/jobs/${j.id}`} className="card-hover block rounded-2xl border border-slate-200 bg-white p-5">
            <div className="text-lg font-extrabold text-slate-900">{j.title}</div>
            <div className="text-sm text-slate-500">{j.company} · {j.location}
              {j.salary ? <> · <span className="font-bold text-emerald-700">{j.salary}</span></> : null}</div>
          </Link>
        ))}
        {!jobs.length && <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-400">No openings here yet.</p>}
      </div>

      {!!all.length && (
        <p className="mt-4 text-xs text-slate-400">{all.length} abroad openings total across all destinations.</p>
      )}
    </main>
  );
}
