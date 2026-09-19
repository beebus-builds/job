import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { grad } from "../../components/themes";

export const dynamic = "force-dynamic";

const API = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";
const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

type Site = {
  slug: string; company: string; tagline: string; theme: string; emoji: string; logo?: string; verified?: number;
  about: string; location: string; website: string; benefits: string;
  jobs: { id: number; title: string; location: string; work_type: string; category: string; salary: string }[];
};

async function getSite(slug: string): Promise<Site | null> {
  try {
    const r = await fetch(`${API}/api/company-site/by-slug/${encodeURIComponent(slug)}`, { cache: "no-store" });
    if (!r.ok) return null;
    const j = await r.json();
    return j.error ? null : j;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const s = await getSite(slug);
  if (!s) return { title: "Company not found" };
  return {
    title: `${s.company} — careers`,
    description: `${s.company} · ${s.location}. ${s.tagline}. ${(s.about || "").slice(0, 140)}`,
    openGraph: { title: `${s.company} — careers`, url: `${SITE}/c/${s.slug}`, type: "website" },
  };
}

export default async function CompanySite({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const s = await getSite(slug);
  if (!s) notFound();

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className={`bg-gradient-to-r ${grad(s.theme)} px-6 py-10 text-white sm:px-10`}>
          <div className="flex items-center gap-4">
            {s.logo ? (
              <img src={s.logo} alt="" className="h-16 w-16 rounded-2xl bg-white/20 object-cover" />
            ) : (
              <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 text-3xl">{s.emoji || "🏢"}</span>
            )}
            <div>
              <h1 className="flex items-center gap-2 text-3xl font-extrabold tracking-tight">
                {s.company}
                {s.verified ? <span className="rounded-full bg-white/25 px-2.5 py-0.5 text-xs font-bold">✓ Verified</span> : null}
              </h1>
              <p className="text-sm opacity-90">{[s.tagline, s.location].filter(Boolean).join(" · ")}</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {s.website && <a href={s.website} target="_blank" className="rounded-full bg-white/20 px-4 py-1.5 text-xs font-bold hover:bg-white/30">{s.website.replace(/^https?:\/\//, "")} ↗</a>}
            <a href="#jobs" className="rounded-full bg-white px-4 py-1.5 text-xs font-bold text-slate-900">{s.jobs.length} open roles ↓</a>
          </div>
        </div>
        <div className="p-6 sm:p-8">
          {s.about && (
            <>
              <h2 className="font-extrabold tracking-tight">About</h2>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-7 text-slate-600">{s.about}</p>
            </>
          )}
          {s.benefits && (
            <>
              <h2 className="mt-6 font-extrabold tracking-tight">Why join us</h2>
              <ul className="mt-1 grid gap-1.5 sm:grid-cols-2">
                {s.benefits.split("\n").map((b) => b.trim()).filter(Boolean).map((b) => (
                  <li key={b} className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700 ring-1 ring-slate-200/70">✓ {b}</li>
                ))}
              </ul>
            </>
          )}
          <h2 id="jobs" className="mt-6 font-extrabold tracking-tight">Open roles ({s.jobs.length})</h2>
          <div className="mt-2 grid gap-2">
            {s.jobs.map((j) => (
              <Link key={j.id} href={`/jobs/${j.id}`} className="card-hover rounded-2xl border border-slate-200 p-4">
                <div className="font-bold text-slate-900">{j.title}</div>
                <div className="text-sm text-slate-500">{j.location} · {j.work_type} · {j.category}
                  {j.salary ? <> · <span className="font-bold text-emerald-700">{j.salary}</span></> : null}</div>
              </Link>
            ))}
            {!s.jobs.length && <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-400">No open roles right now.</p>}
          </div>
        </div>
      </div>
      <p className="mt-4 text-center text-xs text-slate-400">Company site powered by AutomateJob · <Link href="/companies" className="underline">all companies</Link></p>
    </main>
  );
}
