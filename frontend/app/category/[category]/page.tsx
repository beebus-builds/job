import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CATEGORIES, LOCATIONS } from "../../components/places";

export const dynamic = "force-dynamic";

const API = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";
const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }): Promise<Metadata> {
  const { category } = await params;
  const cat = CATEGORIES.find((c) => c.toLowerCase() === decodeURIComponent(category).toLowerCase());
  if (!cat) return { title: "Jobs" };
  return {
    title: `${cat} jobs in Nepal & Remote`,
    description: `Latest ${cat.toLowerCase()} jobs in Kathmandu, Lalitpur, Pokhara and remote. AI match scores, salary info, free alerts on AutomateJob.`,
    openGraph: { title: `${cat} jobs`, url: `${SITE}/category/${encodeURIComponent(cat)}`, type: "website" },
  };
}

export default async function CategoryJobs({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  const cat = CATEGORIES.find((c) => c.toLowerCase() === decodeURIComponent(category).toLowerCase());
  if (!cat) notFound();

  let jobs: any[] = [];
  try {
    const r = await fetch(`${API}/api/board?category=${encodeURIComponent(cat)}`, { cache: "no-store" });
    if (r.ok) jobs = (await r.json()).results ?? [];
  } catch { /* offline */ }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${cat} jobs`,
    itemListElement: jobs.slice(0, 20).map((j: any, i: number) => ({
      "@type": "ListItem", position: i + 1, url: `${SITE}/jobs/${j.id}`, name: `${j.title} at ${j.company}`,
    })),
  };

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <h1 className="text-3xl font-extrabold tracking-tight">{cat} jobs</h1>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
        {jobs.length} open {cat.toLowerCase()} roles across Nepal and remote. Compare salaries,
        check your AI match score on each posting, and set a free alert so the next {cat.toLowerCase()} opening
        lands in your inbox or SMS.
      </p>
      <div className="mt-3">
        <Link href="/alerts" className="rounded-full bg-slate-900 px-4 py-1.5 text-xs font-bold text-white">Get {cat} alerts →</Link>
      </div>

      <div className="mt-6 grid gap-3">
        {jobs.map((j: any) => (
          <Link key={j.id} href={`/jobs/${j.id}`} className="card-hover block rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-lg font-extrabold text-slate-900">{j.title}</span>
              {j.featured && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">⭐ Featured</span>}
            </div>
            <div className="text-sm text-slate-500">{j.company} · {j.location} · {j.work_type}
              {j.salary ? <> · <span className="font-bold text-emerald-700">{j.salary}</span></> : null}</div>
          </Link>
        ))}
        {!jobs.length && <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-400">No {cat} roles yet — try the full board.</p>}
      </div>

      <div className="mt-10">
        <h2 className="text-sm font-extrabold uppercase tracking-wide text-slate-500">More categories</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          {CATEGORIES.filter((c) => c !== cat).map((c) => (
            <Link key={c} href={`/category/${encodeURIComponent(c)}`} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50">{c} jobs</Link>
          ))}
        </div>
      </div>
    </main>
  );
}
