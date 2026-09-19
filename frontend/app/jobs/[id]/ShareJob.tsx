"use client";

import { useState } from "react";
import { shareLinks } from "../../components/share";

export default function ShareJob({ title, company, url }: { title: string; company: string; url: string }) {
  const [copied, setCopied] = useState(false);
  const links = shareLinks(url, `${title} @ ${company} — via AutomateJob`);
  const copy = async () => {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    catch { /* clipboard unavailable */ }
  };
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-xs font-semibold text-slate-400">Share:</span>
      {links.map((l) => (
        <a key={l.name} href={l.href} target="_blank" rel="noopener"
          className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-200">
          {l.name}</a>
      ))}
      <button onClick={copy} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-200">
        {copied ? "✓ Copied" : "Copy link"}</button>
    </div>
  );
}
