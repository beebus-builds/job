import Link from 'next/link'
import { ArrowRight, Github, Globe, MapPin, Pencil, Plus, Sparkles } from 'lucide-react'

const skills = ['React', 'Next.js', 'TypeScript', 'Node.js', 'PostgreSQL', 'Tailwind CSS', 'GitHub', 'Figma']

export default function ProfilePage() {
  return (
    <main className="min-h-screen bg-[#08090d] px-6 py-8 text-white lg:px-10">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between">
          <Link href="/dashboard" className="text-sm text-zinc-400 hover:text-white">← Dashboard</Link>
          <button className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm"><Pencil size={15}/> Edit profile</button>
        </div>

        <section className="mt-12 grid gap-5 lg:grid-cols-[1fr_320px]">
          <div className="rounded-3xl border border-white/10 bg-white/[.035] p-7">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="grid h-16 w-16 place-items-center rounded-2xl bg-white text-2xl font-semibold text-black">BP</div>
                <h1 className="mt-5 text-4xl font-semibold tracking-tight">Bibash Poudel</h1>
                <p className="mt-2 text-lg text-zinc-400">Web Developer · React · Next.js</p>
                <div className="mt-4 flex flex-wrap gap-4 text-sm text-zinc-500"><span className="flex items-center gap-2"><MapPin size={15}/> Nepal · Remote</span><span className="flex items-center gap-2"><Globe size={15}/> Available globally</span></div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-right"><Sparkles size={18} className="ml-auto text-zinc-300"/><div className="mt-2 text-3xl font-semibold">92%</div><div className="text-xs text-zinc-500">profile strength</div></div>
            </div>

            <div className="mt-10 border-t border-white/10 pt-8"><h2 className="text-sm font-medium uppercase tracking-[.16em] text-zinc-500">About</h2><p className="mt-4 max-w-3xl leading-7 text-zinc-300">Web developer focused on building fast, polished products with modern JavaScript frameworks. Looking for remote frontend and full-stack opportunities where product quality and engineering craft matter.</p></div>
            <div className="mt-8 border-t border-white/10 pt-8"><h2 className="text-sm font-medium uppercase tracking-[.16em] text-zinc-500">Skills</h2><div className="mt-4 flex flex-wrap gap-2">{skills.map((skill)=><span key={skill} className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-300">{skill}</span>)}</div></div>
            <div className="mt-8 flex flex-wrap gap-3"><a href="https://github.com" className="flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm"><Github size={16}/> GitHub</a><button className="flex items-center gap-2 rounded-full border border-dashed border-white/15 px-4 py-2 text-sm text-zinc-400"><Plus size={16}/> Add portfolio</button></div>
          </div>

          <aside className="space-y-5">
            <div className="rounded-3xl border border-white/10 bg-white/[.035] p-6"><div className="text-sm text-zinc-500">AI preferences</div><div className="mt-5 space-y-4 text-sm"><Row label="Target roles" value="Frontend, Full Stack"/><Row label="Work mode" value="Remote"/><Row label="Experience" value="2+ years"/><Row label="Minimum salary" value="$60k"/></div><button className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-medium text-black">Tune preferences <ArrowRight size={15}/></button></div>
            <div className="rounded-3xl border border-white/10 bg-white/[.035] p-6"><div className="text-sm text-zinc-500">Career agent</div><div className="mt-3 text-lg font-medium">Actively discovering</div><p className="mt-2 text-sm leading-6 text-zinc-500">Your profile is being matched against new roles automatically.</p><Link href="/automation" className="mt-5 block text-sm text-zinc-300 hover:text-white">Manage automations →</Link></div>
          </aside>
        </section>
      </div>
    </main>
  )
}

function Row({label,value}:{label:string,value:string}) { return <div className="flex items-center justify-between gap-4 border-b border-white/5 pb-3"><span className="text-zinc-500">{label}</span><span className="text-right text-zinc-200">{value}</span></div> }
