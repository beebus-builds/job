import Link from 'next/link'
import { ArrowLeft, Sparkles, WandSparkles } from 'lucide-react'

export default function NewJobPage() {
  return (
    <main className="min-h-screen bg-[#08090d] px-6 py-8 text-white lg:px-10">
      <div className="mx-auto max-w-4xl">
        <Link href="/employer" className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-white"><ArrowLeft size={15}/> Hiring dashboard</Link>
        <div className="mt-10 rounded-3xl border border-white/10 bg-white/[.035] p-7 lg:p-10">
          <div className="flex items-start justify-between gap-6"><div><div className="flex items-center gap-2 text-sm text-zinc-400"><Sparkles size={15}/> AI-assisted hiring</div><h1 className="mt-3 text-4xl font-semibold tracking-tight">Create a role</h1><p className="mt-3 max-w-2xl text-zinc-500">Describe the outcome you need. JobOS will turn it into a structured role, screening criteria and candidate-matching workflow.</p></div></div>
          <form className="mt-10 space-y-6">
            <Field label="Job title" placeholder="e.g. Senior Frontend Engineer" />
            <div className="grid gap-6 sm:grid-cols-2"><Field label="Location" placeholder="Remote / New York / London" /><Field label="Employment type" placeholder="Full-time" /></div>
            <Field label="Salary range" placeholder="$90,000 — $130,000" />
            <div><label className="text-sm text-zinc-300">What will this person do?</label><textarea rows={7} placeholder="Describe the problem, responsibilities, team and outcomes..." className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-black/20 p-4 text-sm outline-none placeholder:text-zinc-700 focus:border-white/25" /></div>
            <div><label className="text-sm text-zinc-300">Must-have skills</label><input placeholder="React, TypeScript, Next.js, PostgreSQL" className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 p-4 text-sm outline-none placeholder:text-zinc-700 focus:border-white/25" /></div>
            <div className="rounded-2xl border border-white/10 bg-white/[.025] p-5"><div className="flex items-center gap-2 font-medium"><WandSparkles size={17}/> AI hiring workflow</div><p className="mt-2 text-sm leading-6 text-zinc-500">After publishing, JobOS can score applicants against the role, explain each score, generate screening questions and move strong candidates into your shortlist.</p></div>
            <button type="button" className="w-full rounded-2xl bg-white px-5 py-4 font-medium text-black hover:bg-zinc-200">Generate role & continue</button>
          </form>
        </div>
      </div>
    </main>
  )
}

function Field({label,placeholder}:{label:string,placeholder:string}) { return <div><label className="text-sm text-zinc-300">{label}</label><input placeholder={placeholder} className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 p-4 text-sm outline-none placeholder:text-zinc-700 focus:border-white/25" /></div> }
