"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api } from "../lib/api";
import { useLang } from "../components/lang";

function ResetForm() {
  const { t } = useLang();
  const token = useSearchParams().get("token") ?? "";
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState(false);

  const go = async () => {
    try {
      const r = await api.resetPw(token, pw);
      if (r.error) setMsg(r.error);
      else { setOk(true); setMsg(t("auth.pw_updated")); }
    } catch (e) { setMsg(String(e)); }
  };

  return (
    <main className="hero-grid flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl shadow-indigo-100">
        <h1 className="text-2xl font-extrabold tracking-tight">{t("auth.forgot_t")}</h1>
        {!token ? (
          <p className="mt-2 text-sm text-rose-600">{t("auth.bad_link")}</p>
        ) : ok ? (
          <div className="mt-4 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800 ring-1 ring-emerald-200">{msg}</div>
        ) : (
          <div className="mt-4 space-y-3">
            {msg && <div className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-200">{msg}</div>}
            <label className="block text-xs font-semibold text-slate-500">{t("auth.new_pw")}
              <input type="password" value={pw} onChange={(e) => setPw(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && go()}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-indigo-400" /></label>
            <button onClick={go} className="w-full rounded-xl bg-slate-900 py-2.5 text-sm font-bold text-white hover:bg-slate-700">
              {t("auth.set_pw")}</button>
          </div>
        )}
        <Link href="/login" className="mt-4 block text-center text-sm font-semibold text-indigo-600">{t("auth.login")} →</Link>
      </div>
    </main>
  );
}

export default function ResetPage() {
  return (
    <Suspense>
      <ResetForm />
    </Suspense>
  );
}
