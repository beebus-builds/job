import { ArrowRight, Bot, BriefcaseBusiness, Building2, CheckCircle2, Search, Sparkles, Workflow } from 'lucide-react'

const seekerSteps = ['Create your career profile', 'Let AI discover and rank opportunities', 'Automate applications and follow-ups']
const employerSteps = ['Describe the role once', 'AI ranks and screens applicants', 'Automate interviews and candidate updates']

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#08090d] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(99,102,241,.22),transparent_32%),radial-gradient(circle_at_80%_20%,rgba(16,185,129,.12),transparent_28%)]" />
      <nav className="relative mx-auto flex max-w-7xl items-center justify-between px-6 py-6 lg:px-10">
        <div className="flex items-center gap-3 font-semibold tracking-tight"><span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-black"><Sparkles size={18}/></span>jobOS</div>
        <div className="hidden items-center gap-8 text-sm text-zinc-400 md:flex"><a href="#how">How it works</a><a href="#seekers">Job seekers</a><a href="#employers">Employers</a></div>
        <button className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm hover:bg-white/10">Sign in</button>
      </nav>

      <section className="relative mx-auto max-w-7xl px-6 pb-24 pt-16 lg:px-10 lg:pt-24">
        <div className="max-w-4xl">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[.04] px-4 py-2 text-sm text-zinc-300"><Bot size={15}/> AI-powered hiring automation</div>
          <h1 className="text-5xl font-semibold leading-[.98] tracking-[-.05em] sm:text-7xl lg:text-8xl">The operating system for <span className="text-zinc-500">getting hired.</span></h1>
          <p className="mt-8 max-w-2xl text-lg leading-8 text-zinc-400">One platform where candidates find better opportunities and companies find better people — while AI handles the repetitive work in between.</p>
          <div className="mt-10 flex flex-wrap gap-3"><button className="group flex items-center gap-2 rounded-full bg-white px-6 py-3 font-medium text-black">Get started <ArrowRight size={17} className="transition group-hover:translate-x-1"/></button><button className="rounded-full border border-white/15 px-6 py-3 text-zinc-200 hover:bg-white/5">Explore the platform</button></div>
        </div>

        <div className="mt-20 grid gap-4 md:grid-cols-3">
          <Metric label="Candidate matches" value="94%" detail="AI-ranked against your profile" />
          <Metric label="Hiring workflow" value="24/7" detail="Automations run in the background" />
          <Metric label="One marketplace" value="2-sided" detail="Candidates + employers together" />
        </div>
      </section>

      <section id="how" className="relative border-y border-white/10 bg-white/[.025] px-6 py-24 lg:px-10">
        <div className="mx-auto max-w-7xl"><p className="text-sm uppercase tracking-[.2em] text-zinc-500">One system · two agents</p><h2 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">Your job search and your hiring pipeline should run themselves.</h2>
          <div className="mt-14 grid gap-5 lg:grid-cols-2">
            <Panel id="seekers" icon={<BriefcaseBusiness/>} eyebrow="For job seekers" title="Your career agent" copy="Tell jobOS what you want. It discovers, understands, ranks and prepares opportunities around your actual experience." steps={seekerSteps}/>
            <Panel id="employers" icon={<Building2/>} eyebrow="For employers" title="Your hiring agent" copy="Define the outcome. jobOS turns the role into a hiring workflow, screens candidates and keeps the pipeline moving." steps={employerSteps}/>
          </div>
        </div>
      </section>

      <section className="relative mx-auto max-w-7xl px-6 py-24 lg:px-10"><div className="grid gap-12 lg:grid-cols-[.8fr_1.2fr] lg:items-center"><div><p className="text-sm uppercase tracking-[.2em] text-zinc-500">Automation layer</p><h2 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">If it happens repeatedly, automate it.</h2><p className="mt-5 leading-7 text-zinc-400">Build rules that connect triggers, AI decisions and actions. Start simple, then let agents take over the busywork.</p></div><div className="rounded-3xl border border-white/10 bg-white/[.035] p-5 shadow-2xl"><Workflow className="mb-5 text-zinc-400"/><div className="space-y-3"><Flow label="New job matches 85%+"/><Flow label="AI generates tailored application"/><Flow label="Candidate reviews and submits"/><Flow label="Follow-up scheduled automatically"/></div></div></div></section>

      <footer className="border-t border-white/10 px-6 py-8 text-sm text-zinc-500"><div className="mx-auto flex max-w-7xl justify-between"><span>jobOS</span><span>Built for the future of hiring.</span></div></footer>
    </main>
  )
}

function Metric({label,value,detail}:{label:string,value:string,detail:string}){return <div className="rounded-2xl border border-white/10 bg-white/[.035] p-5"><div className="text-sm text-zinc-500">{label}</div><div className="mt-2 text-3xl font-semibold">{value}</div><div className="mt-1 text-sm text-zinc-500">{detail}</div></div>}
function Panel({icon,eyebrow,title,copy,steps,id}:{icon:React.ReactNode,eyebrow:string,title:string,copy:string,steps:string[],id:string}){return <div id={id} className="rounded-3xl border border-white/10 bg-[#0d0f15] p-7 transition hover:-translate-y-1 hover:border-white/20"><div className="mb-8 flex items-center justify-between"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/10 text-zinc-200">{icon}</span><span className="text-xs uppercase tracking-[.16em] text-zinc-500">{eyebrow}</span></div><h3 className="text-2xl font-semibold">{title}</h3><p className="mt-3 min-h-14 leading-6 text-zinc-400">{copy}</p><div className="mt-8 space-y-3">{steps.map((s,i)=><div key={s} className="flex gap-3 rounded-2xl border border-white/5 bg-white/[.025] p-4 text-sm text-zinc-300"><span className="text-zinc-600">0{i+1}</span>{s}</div>)}</div></div>}
function Flow({label}:{label:string}){return <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 p-4"><CheckCircle2 size={17} className="text-zinc-300"/><span className="text-sm">{label}</span></div>}
