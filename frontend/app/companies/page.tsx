import type { Metadata } from "next";
import Link from "next/link";
import { T } from "../components/lang";
import { grad } from "../components/themes";

export const dynamic = "force-dynamic";

const API = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

export const metadata: Metadata = {
  title: "Companies hiring now",
  description: "Company career sites built on AutomateJob — brand, story and open roles.",
};

async function getCompanies() {
  try {
    const r = await fetch(`${API}/api/company-sites`, { next: { revalidate: 300 } });
    if (!r.ok) return [];
    return (await r.json()).results ?? [];
  } catch {
    return [];
  }
}

export default async function Companies() {
  const list: any[] = await getCompanies();
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="text-3xl font-extrabold tracking-tight"><T k="co.all" /></h1>
      <p className="mt-1 text-sm text-slate-500"><T k="co.all_sub" /></p>
      <Link href="/company" className="mt-4 inline-block rounded-full bg-slate-900 px-5 py-2 text-sm font-bold text-white hover:bg-slate-700">
        <T k="co.make" /> →
      </Link>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((s) => (
          <Link key={s.slug} href={`/c/${s.slug}`} className="card-hover overflow-hidden rounded-3xl border border-slate-200 bg-white">
            <div className={`bg-gradient-to-r ${grad(s.theme)} px-5 py-6 text-white`}>
              <span className="text-3xl">{s.emoji || "🏢"}</span>
              <div className="mt-2 flex items-center gap-2 text-lg font-extrabold tracking-tight">
                {s.company}
                {s.verified ? <span className="rounded-full bg-white/25 px-2 py-0.5 text-[10px] font-bold">✓</span> : null}
              </div>
              <div className="text-xs opacity-90">{s.location}</div>
            </div>
            <div className="p-5">
              <p className="line-clamp-2 text-sm text-slate-600">{s.tagline}</p>
              <span className="mt-2 inline-block rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                {s.openings} open roles
              </span>
            </div>
          </Link>
        ))}
      </div>
      {!list.length && <p className="mt-6 text-sm text-slate-400">No company sites yet — yours could be first.</p>}
    </main>
  );
}
