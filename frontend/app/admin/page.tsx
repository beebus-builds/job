import type { Metadata } from "next";
import AdminQueue from "./Client";

export const metadata: Metadata = {
  title: "Moderation",
  description: "Review reported postings.",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <AdminQueue />;
}
