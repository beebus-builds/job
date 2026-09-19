import type { Metadata } from "next";
import MyApplications from "./Client";

export const metadata: Metadata = {
  title: "My applications — track every stage",
  description: "Look up everything you've applied to with your email. Live stages, no account needed.",
};

export default function ApplicationsPage() {
  return <MyApplications />;
}
