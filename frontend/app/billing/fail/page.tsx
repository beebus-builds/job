import Link from "next/link";

export const metadata = { title: "Payment failed" };

export default function BillingFail() {
  return (
    <main className="mx-auto max-w-md px-6 py-16 text-center">
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="text-4xl">❌</div>
        <h1 className="mt-2 text-xl font-extrabold">Payment didn&apos;t go through</h1>
        <p className="mt-1 text-sm text-slate-500">No charge was made. Try again or request manual review from your dashboard.</p>
        <Link href="/employers" className="mt-4 inline-block rounded-xl bg-slate-900 px-5 py-2 text-sm font-bold text-white">Back →</Link>
      </div>
    </main>
  );
}
