import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Endorse from "./Endorse";

export const dynamic = "force-dynamic";

const API = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

type Bundle = {
  profile: {
    name: string; headline: string; location: string; bio: string;
    skills: string[]; slug: string; created_at: number; avatar?: string;
  };
  projects: { id: number; title: string; description: string; link: string; tags: string[] }[];
  experience: { id: number; role: string; org: string; period: string; description: string }[];
  endorsements: Record<string, number>;
  views: number;
};

async function getBundle(slug: string): Promise<Bundle | null> {
  try {
    const r = await fetch(`${API}/api/portfolio/by-slug/${encodeURIComponent(slug)}`, { cache: "no-store" });
    if (!r.ok) return null;
    const j = await r.json();
    return j.error ? null : j;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const b = await getBundle(slug);
  if (!b) return { title: "Profile not found" };
  const u = b.profile;
  const extra = b.projects.map((p) => p.title).slice(0, 3).join(", ");
  return {
    title: `${u.name || "Candidate"} — ${u.headline || "Professional"}`,
    description: `${u.name} · ${u.headline} · ${u.location}. ${(u.bio || "").slice(0, 120)}${extra ? ` Projects: ${extra}.` : ""}`,
  };
}

export default async function PublicProfile({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const b = await getBundle(slug);
  if (!b) notFound();
  const u = b.profile;
  const ini = ((u.name || "AJ").trim().split(/\s+/).map((w) => w[0]).join("") || "AJ").slice(0, 2).toUpperCase();

  return (
    <main className="mx-auto max-w-3xl space-y-4 px-6 py-10">
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="h-24 bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600" />
        <div className="px-6 pb-6">
          {u.avatar ? (
            <img src={u.avatar} alt="" className="-mt-8 h-16 w-16 rounded-2xl object-cover shadow-md ring-1 ring-slate-200" />
          ) : (
            <span className="-mt-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-xl font-black text-indigo-700 shadow-md ring-1 ring-slate-200">
              {ini}
            </span>
          )}
          <h1 className="mt-3 text-2xl font-extrabold tracking-tight">{u.name || "Candidate"}</h1>
          <p className="text-sm text-slate-500">{[u.headline, u.location].filter(Boolean).join(" · ")} · 👁 {b.views} views</p>
          {u.bio && <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-700">{u.bio}</p>}
          {!!u.skills?.length && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {u.skills.map((s) => (
                <span key={s} className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-100">
                  {s}{b.endorsements?.[s] ? ` · ${b.endorsements[s]}✓` : ""}
                </span>
              ))}
            </div>
          )}
          <Endorse slug={u.slug} skills={u.skills ?? []} />
          <Endorse slug={u.slug} skills={u.skills ?? []} />
          <p className="mt-4 text-xs text-slate-400">Member since {new Date((u.created_at || Date.now() / 1000) * 1000).getFullYear()} · via AutomateJob</p>
        </div>
      </div>

      {!!b.experience.length && (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-extrabold tracking-tight">Experience</h2>
          <div className="mt-3 space-y-4">
            {b.experience.map((x) => (
              <div key={x.id} className="border-l-2 border-indigo-200 pl-4">
                <div className="font-bold text-slate-900">{x.role} <span className="font-normal text-slate-500">@ {x.org}</span></div>
                <div className="text-xs text-slate-400">{x.period}</div>
                {x.description && <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-600">{x.description}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {!!b.projects.length && (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-extrabold tracking-tight">Projects</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {b.projects.map((p) => (
              <div key={p.id} className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200/70">
                <div className="font-bold text-slate-900">{p.title}</div>
                {p.description && <p className="mt-1 line-clamp-3 text-sm text-slate-600">{p.description}</p>}
                {!!p.tags.length && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {p.tags.map((tg) => <span key={tg} className="rounded-full bg-white px-2 py-0.5 text-xs text-slate-500 ring-1 ring-slate-200">{tg}</span>)}
                  </div>
                )}
                {p.link && <a href={p.link} target="_blank" className="mt-2 inline-block text-xs font-bold text-indigo-600">View ↗</a>}
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-center text-sm text-slate-500">
        Looking to hire? <Link href="/employers" className="font-semibold text-indigo-600">Post a job free →</Link>
      </p>
    </main>
  );
}
