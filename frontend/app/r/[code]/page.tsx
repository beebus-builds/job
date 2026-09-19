import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import RefCta from "./RefCta";

export const dynamic = "force-dynamic";

const API = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

async function sender(code: string): Promise<string | null> {
  try {
    const r = await fetch(`${API}/api/referral/by-code/${encodeURIComponent(code)}`, { cache: "no-store" });
    if (!r.ok) return null;
    const j = await r.json();
    return j.error ? null : j.name;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  return { title: "Join AutomateJob — get 3 free SMS alerts", description: "A friend invited you to Nepal's AI job platform. Join free, you both earn SMS alert credits." };
}

export default async function RefLanding({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const name = await sender(code);
  if (!name) notFound();

  return (
    <main className="hero-grid flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl shadow-indigo-100">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-2xl text-white">🎁</div>
        <h1 className="mt-4 text-2xl font-extrabold tracking-tight">{name} invited you</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Join AutomateJob with this invite and you <b>both get 3 free SMS job alerts</b> —
          AI-ranked matches texted straight to your phone.
        </p>
        <RefCta code={code} />
        <p className="mt-3 text-xs text-slate-400">Free forever · English + Nepali · No spam, unsubscribe anytime</p>
      </div>
    </main>
  );
}
