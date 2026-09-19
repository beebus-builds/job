import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import MatchButton from "./MatchButton";
import ApplyModal from "./ApplyModal";
import ReportButton from "./ReportButton";
import ShareJob from "./ShareJob";
import { T } from "../../components/lang";

export const dynamic = "force-dynamic";

const API = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";
const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

type BoardJob = {
  id: number; title: string; company: string; location: string;
  work_type: string; category: string; salary: string;
  description: string; skills: string[]; apply_url: string;
  contact_email: string; views: number; applies: number; created_at: number; featured?: boolean;
};

async function getJob(id: string): Promise<BoardJob | null> {
  try {
    const r = await fetch(`${API}/api/board/${id}`, { cache: "no-store" });
    if (!r.ok) return null;
    const j = await r.json();
    return j.error ? null : j;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const j = await getJob(id);
  if (!j) return { title: "Job not found" };
  return {
    title: `${j.title} at ${j.company} (${j.location})`,
    description: `${j.title} — ${j.company}, ${j.location}. ${j.salary}. ${(j.description || "").slice(0, 150)}`,
    openGraph: {
      title: `${j.title} at ${j.company}`,
      description: `${j.location} · ${j.work_type} · ${j.salary}`,
      url: `${SITE}/jobs/${j.id}`,
      type: "article",
    },
  };
}

export default async function JobDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const j = await getJob(id);
  if (!j) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: j.title,
    hiringOrganization: { "@type": "Organization", name: j.company },
    jobLocation: { "@type": "Place", address: j.location },
    employmentType: j.work_type,
    description: j.description,
    datePosted: new Date((j.created_at || Date.now() / 1000) * 1000).toISOString(),
    validThrough: new Date(Date.now() + 60 * 864e5).toISOString(),
  };

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Link href="/jobs" className="text-sm font-semibold text-slate-500 hover:text-slate-900"><T k="job.back" /></Link>

      <div className="mt-3 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="h-2 bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600" />
        <div className="p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight">{j.title}</h1>
              {j.featured && <span className="mt-2 inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">⭐ Featured post</span>}
              <p className="mt-1 text-slate-500">{j.company} · {j.location} · {j.work_type} · {j.category}</p>
              {j.salary && <p className="mt-2 inline-block rounded-full bg-emerald-50 px-3 py-1 text-sm font-bold text-emerald-700 ring-1 ring-emerald-200">{j.salary}</p>}
            </div>
            <div className="flex flex-col gap-2">
              <ApplyModal jobId={j.id} title={j.title} />
              {j.apply_url
                ? <a href={j.apply_url} target="_blank" className="text-center text-xs font-semibold text-slate-500 hover:text-slate-800"><T k="ats.or_site" /></a>
                : <a href={`mailto:${j.contact_email}?subject=Application: ${encodeURIComponent(j.title)}`} className="text-center text-xs font-semibold text-slate-500 hover:text-slate-800"><T k="ats.or_email" /></a>}
              <Link href="/app" className="rounded-xl bg-slate-100 px-4 py-2.5 text-center text-sm font-semibold text-slate-700 hover:bg-slate-200"><T k="job.match_cta" /></Link>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {j.skills.map((s) => <span key={s} className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">{s}</span>)}
          </div>
        </div>
      </div>

      <article className="mt-4 whitespace-pre-wrap rounded-3xl border border-slate-200 bg-white p-6 text-sm leading-7 text-slate-700 shadow-sm sm:p-8">{j.description}</article>

      <MatchButton jobTitle={j.title} company={j.company} jobText={`${j.title} ${j.skills.join(" ")} ${j.description}`} />

      <div className="mt-4 flex justify-center">
        <ShareJob title={j.title} company={j.company} url={`${SITE}/jobs/${j.id}`} />
      </div>

      <p className="mt-3 flex items-center justify-center gap-3 text-center text-xs text-slate-400">
        <span><T k="job.stats" vars={{ v: j.views, a: j.applies, id: j.id }} /></span>
        <ReportButton jobId={j.id} />
      </p>
    </main>
  );
}
