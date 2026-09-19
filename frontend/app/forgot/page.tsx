"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "../lib/api";
import { useLang } from "../components/lang";

export default function ForgotPage() {
  const { t } = useLang();
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);

  const send = async () => {
    await api.forgot(email).catch(() => {});
    setDone(true);
  };

  return (
    <main className="hero-grid flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl shadow-indigo-100">
        <h1 className="text-2xl font-extrabold tracking-tight">{t("auth.forgot_t")}</h1>
        <p className="mt-1 text-sm text-slate-500">{t("auth.forgot_d")}</p>
        {done ? (
          <div className="mt-4 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800 ring-1 ring-emerald-200">{t("auth.link_sent")}</div>
        ) : (
          <div className="mt-4 space-y-3">
            <label className="block text-xs font-semibold text-slate-500">{t("auth.email")}
              <input value={email} onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder="you@example.com"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-indigo-400" /></label>
            <button onClick={send} className="w-full rounded-xl bg-slate-900 py-2.5 text-sm font-bold text-white hover:bg-slate-700">
              {t("auth.send_link")}</button>
          </div>
        )}
        <Link href="/login" className="mt-4 block text-center text-sm font-semibold text-indigo-600">{t("auth.login")} →</Link>
      </div>
    </main>
  );
}
