import type { Metadata } from "next";
import EmployersClient from "./EmployersClient";

export const metadata: Metadata = {
  title: "Post a Job Free — Reach Candidates in Nepal & Remote",
  description:
    "Free job posting for employers: publish in 60 seconds, get an SEO page, track views and applies. No account needed.",
};

export default function EmployersPage() {
  return <EmployersClient />;
}
