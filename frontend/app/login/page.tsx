"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { api } from "../lib/api";
import { useLang } from "../components/lang";
import { useAuth } from "../components/auth";
import GoogleButton from "../components/google";

function LoginInner() {
  const { t } = useLang();
  const { login, register, redeem, user } = useAuth();
  const router = useRouter();
  const magic = useSearchParams().get("magic");
  const [mode, setMode] = useState<"login" | "register" | "magic">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [magicSent, setMagicSent] = useState(false);

  useEffect(() => {
    if (magic && !user) {
      redeem(magic).then((e) => {
        if (e) setErr(e);
        else router.push("/app");
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [magic]);

  if (user) {
    router.replace("/app");
    return null;
  }

  const go = async () => {
    setBusy(true); setErr("");
    const e = mode === "login"
      ? await login(email, password)
      : await register(email, password, name);
    setBusy(false);
    if (e) setErr(e);
    else router.push("/app");
  };

  const sendMagic = async () => {
    if (!email.includes("@")) { setErr(t("a.valid_email")); return; }
    setBusy(true);
    await api.magic(email).catch((e) => setErr(String(e)));
    setBusy(false);
    setMagicSent(true);
  };

  const input = "mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-indigo-400";

  return (
    <main className="hero-grid flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl shadow-indigo-100">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-xl text-white">⚡</div>
        <h1 className="mt-4 text-2xl font-extrabold tracking-tight">{mode === "register" ? t("auth.join") : t("auth.welcome")}</h1>
        <p className="mt-1 text-sm text-slate-500">{t("auth.tagline")}</p>
        {err && <div className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-200">{err}</div>}
        {mode === "magic" ? (
          <div className="mt-4 space-y-3">
            {magicSent ? (
              <div className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800 ring-1 ring-emerald-200">{t("auth.magic_sent")}</div>
            ) : (
              <>
                <label className="block text-xs font-semibold text-slate-500">{t("auth.email")}
                  <input value={email} onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendMagic()}
                    placeholder="you@example.com" className={input} /></label>
                <button onClick={sendMagic} disabled={busy}
                  className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 py-2.5 text-sm font-bold text-white hover:opacity-90">
                  {busy ? "…" : t("auth.magic_btn")}</button>
              </>
            )}
            <button onClick={() => setMode("login")} className="w-full text-center text-sm font-semibold text-indigo-600">
              ← {t("auth.login")}</button>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {mode === "register" && (
              <label className="block text-xs font-semibold text-slate-500">{t("auth.name")}
                <input value={name} onChange={(e) => setName(e.target.value)} className={input} /></label>
            )}
            <label className="block text-xs font-semibold text-slate-500">{t("auth.email")}
              <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className={input} /></label>
            <label className="block text-xs font-semibold text-slate-500">{t("auth.password")}
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && go()} className={input} /></label>
            <button onClick={go} disabled={busy}
              className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 py-2.5 text-sm font-bold text-white hover:opacity-90">
              {busy ? "…" : mode === "login" ? t("auth.login") : t("auth.register")}</button>
            <button onClick={() => setMode(mode === "login" ? "register" : "login")}
              className="w-full text-center text-sm font-semibold text-indigo-600 hover:text-indigo-800">
              {mode === "login" ? t("auth.no_account") : t("auth.have_account")}</button>
            {mode === "login" && (
              <div className="flex justify-center gap-4 text-sm">
                <Link href="/forgot" className="text-slate-500 hover:text-slate-700">{t("auth.forgot")}</Link>
                <button onClick={() => setMode("magic")} className="font-semibold text-indigo-600 hover:text-indigo-800">{t("auth.magic_link")}</button>
              </div>
            )}
            <GoogleButton />
          </div>
        )}
        <Link href="/" className="mt-4 block text-center text-xs text-slate-400 hover:text-slate-600">← AutomateJob</Link>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginInner />
    </Suspense>
  );
}
