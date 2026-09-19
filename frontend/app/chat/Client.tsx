"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "../lib/api";
import { useLang } from "../components/lang";

type Msg = { from: "bot" | "you"; text: string; link?: string; linkLabel?: string };

const LOC_WORDS = ["kathmandu", "lalitpur", "pokhara", "chitwan", "butwal", "dharan", "remote", "nepal"];

export default function Chat() {
  const { t, lang } = useLang();
  const [msgs, setMsgs] = useState<Msg[]>([{ from: "bot", text: t("chat.hi") }]);
  const [inp, setInp] = useState("");
  const [busy, setBusy] = useState(false);

  const push = (m: Msg) => setMsgs((p) => [...p, m]);

  const send = async (raw?: string) => {
    const text = (raw ?? inp).trim();
    if (!text || busy) return;
    setInp(""); push({ from: "you", text });
    setBusy(true);
    try {
      const reply = await answer(text);
      push(reply);
    } finally { setBusy(false); }
  };

  const answer = async (text: string): Promise<Msg> => {
    const l = text.toLowerCase();
    const ne = lang === "ne";

    if (/(salary|pay|talab|तलब)/.test(l)) {
      const kw = l.replace(/(salary|pay|talab|तलब|jobs?|in|for|of|what|how|much|does|do|pay)/g, " ").trim().split(/\s+/).filter((w) => w.length > 2)[0] ?? "";
      try {
        const d = await api.salary({ q: kw });
        if (d.count > 0) {
          const fmt = (n: number) => n >= 100000 ? `Rs. ${(n / 100000).toFixed(1)}L` : `Rs. ${Math.round(n / 1000)}k`;
          return { from: "bot", text: ne
            ? `${kw || "यो"} भूमिकाको मध्यक: ${fmt(d.median_low)}–${fmt(d.median_high)}/महिना (${d.count} पोस्ट)।`
            : `Median for ${kw || "this"}: ${fmt(d.median_low)}–${fmt(d.median_high)}/month across ${d.count} posts.`,
            link: "/salary", linkLabel: ne ? "तलब पेज →" : "Salary page →" };
        }
      } catch { /* fallthrough */ }
      return { from: "bot", text: ne ? "त्यसका लागि तलब डेटा भेटिएन।" : "No salary data for that yet." };
    }

    if (/(interview|interview|अन्तर्वार्ता|question|prepare|tips)/.test(l)) {
      return { from: "bot", text: ne
        ? "जागिर विवरण पेस्ट गर्नुहोस् — म प्राविधिक + व्यवहारिक प्रश्न र अभ्यास दिन्छु।"
        : "Paste any job description and I'll generate technical + behavioral questions with practice.",
        link: "/interview", linkLabel: ne ? "तयारी सुरु →" : "Start prep →" };
    }

    if (/(alert|notify|sms|email|अलर्ट|जानकारी)/.test(l)) {
      return { from: "bot", text: ne
        ? "इमेल + SMS अलर्ट निःशुल्क छ — कीवर्ड र न्यूनतम स्कोर राखेर सदस्यता लिनुहोस्।"
        : "Email + SMS alerts are free — subscribe with a keyword and min score.",
        link: "/alerts", linkLabel: ne ? "अलर्ट →" : "Alerts →" };
    }

    if (/(cv|resume|रिजुमे|biodata)/.test(l)) {
      return { from: "bot", text: ne
        ? "CV बिल्डरमा ३ टेम्प्लेट, लाइभ प्रिभ्यू र PDF छन्।"
        : "The CV builder has 3 templates, live preview and PDF export.",
        link: "/cv", linkLabel: ne ? "CV बिल्डर →" : "CV builder →" };
    }

    if (/(hi|hello|hey|नमस्ते)/.test(l) && l.length < 12) {
      return { from: "bot", text: ne ? "नमस्ते! जागिर खोज्नुहोस्, तलब सोध्नुहोस्, वा अलर्ट मिलाउनुहोस्।" : "Hi! Search jobs, ask salaries, or set up alerts." };
    }

    // default: job search — extract location + keywords
    const loc = LOC_WORDS.find((w) => l.includes(w)) ?? "";
    const stop = new Set(["find", "me", "jobs", "job", "in", "for", "any", "with", "and", "the", "a", "show", "looking", "search", "nepal", "remote", "near", "at"]);
    const kw = l.replace(/[^a-z#+.\s]/g, " ").split(/\s+/).filter((w) => w.length > 2 && !stop.has(w) && !LOC_WORDS.includes(w)).slice(0, 3).join(" ");
    try {
      const d = await api.jobs({ q: kw, location: loc.replace("remote", "") === loc ? loc : "", remote_only: l.includes("remote") });
      const jobs = (d.results ?? []).slice(0, 3);
      if (!jobs.length) {
        return { from: "bot", text: ne ? "त्यससँग मिल्ने जागिर भेटिएन — अर्को कीवर्ड प्रयास गर्नुहोस्।" : "No matches for that — try another keyword." };
      }
      const top = jobs[0];
      return {
        from: "bot",
        text: (ne ? `उत्कृष्ट ${jobs.length} भेटियो: ` : `Top ${jobs.length} matches: `) +
          jobs.map((j: any) => `${j.title} @ ${j.company}`).join(" · "),
        link: `/jobs/${top.id}`, linkLabel: ne ? `हेर्नुहोस्: ${top.title} →` : `View: ${top.title} →`,
      };
    } catch {
      return { from: "bot", text: ne ? "केही गडबड भयो — फेरि प्रयास गर्नुहोस्।" : "Something hiccuped — try again." };
    }
  };

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-3xl font-extrabold tracking-tight">{t("chat.title")}</h1>
      <p className="mt-1 text-sm text-slate-500">{t("chat.sub")}</p>
      <div className="mt-4 space-y-2 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="max-h-[50vh] space-y-2 overflow-y-auto">
          {msgs.map((m, i) => (
            <div key={i} className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${m.from === "bot" ? "bg-slate-100 text-slate-800" : "ml-auto bg-indigo-600 text-white"}`}>
              {m.text}
              {m.link && <Link href={m.link} className={`mt-1 block text-xs font-bold ${m.from === "bot" ? "text-indigo-600" : "text-indigo-100"}`}>{m.linkLabel}</Link>}
            </div>
          ))}
          {busy && <div className="w-fit rounded-2xl bg-slate-100 px-4 py-2 text-sm text-slate-400">…</div>}
        </div>
        <div className="flex gap-2">
          <input value={inp} onChange={(e) => setInp(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder={t("chat.ph")}
            className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-indigo-400" />
          <button onClick={() => send()} disabled={busy} className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white">↑</button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(t("chat.chips") as unknown as string).split("|").map((c) => (
            <button key={c} onClick={() => send(c)} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-200">{c}</button>
          ))}
        </div>
      </div>
    </main>
  );
}
