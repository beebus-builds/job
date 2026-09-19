"use client";

import Link from "next/link";
import { useState } from "react";
import { LangToggle, T } from "./lang";
import { initials, useAuth } from "./auth";

export default function Nav() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center gap-6 px-6 py-3 text-sm">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-base font-black text-white shadow-sm">⚡</span>
          <span className="text-base font-extrabold tracking-tight text-slate-900">AutomateJob</span>
        </Link>
        <Link href="/jobs" className="hidden text-slate-600 hover:text-slate-900 sm:block"><T k="nav.find" /></Link>
        <Link href="/companies" className="hidden text-slate-600 hover:text-slate-900 sm:block"><T k="nav.companies" /></Link>
        <Link href="/interview" className="hidden text-slate-600 hover:text-slate-900 sm:block"><T k="nav.interview" /></Link>
        <Link href="/alerts" className="hidden text-slate-600 hover:text-slate-900 sm:block"><T k="nav.alerts" /></Link>
        <Link href="/employers" className="hidden text-slate-600 hover:text-slate-900 sm:block"><T k="nav.employers" /></Link>
        <span className="ml-auto flex items-center gap-2">
          <LangToggle />
          {user ? (
            <div className="relative">
              <button onClick={() => setOpen(!open)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 text-xs font-bold text-white">
                {initials(user.name, user.email)}
              </button>
              {open && (
                <div className="absolute right-0 mt-2 w-52 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                  <div className="border-b border-slate-100 px-4 py-3">
                    <div className="truncate text-sm font-bold text-slate-900">{user.name || user.email}</div>
                    <div className="truncate text-xs text-slate-500">{user.email}</div>
                  </div>
                  <Link href="/app" onClick={() => setOpen(false)} className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"><T k="nav.dashboard" /></Link>
                  <Link href="/profile" onClick={() => setOpen(false)} className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"><T k="auth.profile" /></Link>
                  <Link href="/cv" onClick={() => setOpen(false)} className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"><T k="nav.cv" /></Link>
                  <Link href="/company" onClick={() => setOpen(false)} className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"><T k="nav.company" /></Link>
                  <Link href={`/u/${user.slug}`} onClick={() => setOpen(false)} className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"><T k="auth.view_public" /></Link>
                  <button onClick={() => { logout(); setOpen(false); }} className="block w-full px-4 py-2 text-left text-sm text-rose-600 hover:bg-slate-50"><T k="auth.logout" /></button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link href="/login" className="rounded-full px-4 py-1.5 font-semibold text-slate-700 hover:bg-slate-100"><T k="auth.login" /></Link>
              <Link href="/employers" className="hidden rounded-full bg-slate-900 px-4 py-1.5 font-semibold text-white hover:bg-slate-700 md:block"><T k="foot.post" /></Link>
            </>
          )}
        </span>
      </div>
    </nav>
  );
}
