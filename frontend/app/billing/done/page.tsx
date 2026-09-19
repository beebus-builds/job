"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { API_BASE } from "../../lib/api";

function DoneInner() {
  const data = useSearchParams().get("data") ?? "";
  const [msg, setMsg] = useState("Verifying payment…");

  useEffect(() => {
    if (!data) { setMsg("No payment data received."); return; }
    fetch(`${API_BASE}/api/billing/esewa/success?data=${encodeURIComponent(data)}`)
      .then((r) => r.json())
      .then((j) => setMsg(j.ok ? `✅ Payment verified — post boosted! (Rs. ${j.amount})` : `❌ ${j.error ?? "verification failed"}`))
      .catch(() => setMsg("Could not verify — contact support with your transaction ID."));
  }, [data]);

  return (
    <main className="mx-auto max-w-md px-6 py-16 text-center">
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold">{msg}</p>
        <Link href="/employers" className="mt-4 inline-block rounded-xl bg-slate-900 px-5 py-2 text-sm font-bold text-white">Back to dashboard →</Link>
      </div>
    </main>
  );
}

export default function BillingDone() {
  return (
    <Suspense>
      <DoneInner />
    </Suspense>
  );
}
