import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { LangProvider } from "./components/lang";
import { AuthProvider } from "./components/auth";
import SwRegister from "./components/sw";
import Nav from "./components/nav";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "AutomateJob — Jobs in Nepal & Remote | Search + Post Smarter",
    template: "%s | AutomateJob",
  },
  description:
    "Find jobs in Kathmandu, Lalitpur, Pokhara & remote. AI-matched rankings, free employer postings. Smarter than MeroJob.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  openGraph: {
    title: "AutomateJob — Jobs in Nepal & Remote",
    description: "AI-ranked job matches. Employers post free.",
    type: "website",
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "AutomateJob", statusBarStyle: "default" },
};

export const viewport = {
  themeColor: "#4f46e5",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${jakarta.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-[#f6f7fb] text-slate-900">
        <LangProvider>
          <AuthProvider>
            <SwRegister />
            <Nav />
            <div className="flex flex-1 flex-col">{children}</div>
            <footer className="border-t border-slate-200 bg-white">
              <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-6 py-8 text-sm text-slate-500">
                <span className="flex items-center gap-2 font-extrabold text-slate-900">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 text-xs text-white">⚡</span>
                  AutomateJob
                </span>
                <span>© 2026</span>
                <span className="ml-auto flex gap-4">
                  <Link href="/jobs" className="hover:text-slate-900">Jobs</Link>
                  <Link href="/companies" className="hover:text-slate-900">Companies</Link>
                  <Link href="/interview" className="hover:text-slate-900">Interview prep</Link>
                  <Link href="/salary" className="hover:text-slate-900">Salaries</Link>
                  <Link href="/chat" className="hover:text-slate-900">AI chat</Link>
                  <Link href="/applications" className="hover:text-slate-900">My applications</Link>
                  <Link href="/alerts" className="hover:text-slate-900">Alerts</Link>
                  <Link href="/cv" className="hover:text-slate-900">CV Builder</Link>
                  <Link href="/employers" className="hover:text-slate-900">Employers</Link>
                  <Link href="/app" className="hover:text-slate-900">Dashboard</Link>
                </span>
              </div>
            </footer>
          </AuthProvider>
        </LangProvider>
      </body>
    </html>
  );
}
