"use client";

import Link from "next/link";

export default function RefCta({ code }: { code: string }) {
  const go = () => {
    localStorage.setItem("aj_ref", code);
  };
  return (
    <Link href="/login" onClick={go}
      className="mt-5 block w-full rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 py-2.5 text-sm font-bold text-white hover:opacity-90">
      Claim invite — create free account
    </Link>
  );
}
