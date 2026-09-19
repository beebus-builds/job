import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CATEGORIES, LOCATIONS } from "../../components/places";

export const dynamic = "force-dynamic";

const API = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";
const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export async function generateMetadata({ params }: { params: Promise<{ location: string }> }): Promise<Metadata> {
  const { location } = await params;
  const loc = LOCATIONS.find((l) => l.slug === location.toLowerCase());
  if (!loc) return { title: "Jobs" };
  return {
    title: `Jobs in ${loc.label} — apply online`,
    description: `Latest jobs in ${loc.label}: engineering, marketing, design, finance and more. AI-matched rankings, free alerts. Updated daily on AutomateJob.`,
    openGraph: { title: `Jobs in ${loc.label}`, url: `${SITE}/jobs-in/${loc.slug}`, type: "website" },
  };
}

export default async function LocationJobs({ params }: { params: Promise<{ location: string }> }) {
  const { location } = await params;
  const loc = LOCATIONS.find((l) => l.slug === location.toLowerCase());
  if (!loc) notFound();

  let jobs: any[] = [];
  try {
    const r = await fetch(`${API}/api/board?location=${encodeURIComponent(loc.slug)}`, { cache: "no-store" });
    if (r.ok) jobs = (await r.json()).results ?? [];
  } catch { /* offline */ }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Jobs in ${loc.label}`,
    itemListElement: jobs.slice(0, 20).map((j: any, i: number) => ({
      "@type": "ListItem", position: i + 1, url: `${SITE}/jobs/${j.id}`, name: `${j.title} at ${j.company}`,
    })),
  };

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <h1 className="text-3xl font-extrabold tracking-tight">Jobs in {loc.label}</h1>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
        Looking for a job in {loc.label}? AutomateJob lists {jobs.length} open roles here right now —
        from engineering and design to marketing, finance and internships. Every posting shows salary
        where available, and you can check your AI match score before applying. New roles appear daily;
        set a free alert to never miss one.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link href="/alerts" className="rounded-full bg-slate-900 px-4 py-1.5 text-xs font-bold text-white">Get {loc.label} alerts →</Link>
        <Link href="/jobs" className="rounded-full bg-white px-4 py-1.5 text-xs font-bold text-slate-700 ring-1 ring-slate-200">All jobs</Link>
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
        {!jobs.length && <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-400">No roles in {loc.label} yet — try the full board.</p>}
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        <div>
          <h2 className="text-sm font-extrabold uppercase tracking-wide text-slate-500">More locations</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {LOCATIONS.filter((l) => l.slug !== loc.slug).map((l) => (
              <Link key={l.slug} href={`/jobs-in/${l.slug}`} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50">Jobs in {l.label}</Link>
            ))}
          </div>
        </div>
        <div>
          <h2 className="text-sm font-extrabold uppercase tracking-wide text-slate-500">Browse by category</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <Link key={c} href={`/category/${encodeURIComponent(c)}`} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50">{c} jobs</Link>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
