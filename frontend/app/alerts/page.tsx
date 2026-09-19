import type { Metadata } from "next";
import AlertsClient from "./AlertsClient";

export const metadata: Metadata = {
  title: "Free Job Alerts in Nepal & Remote",
  description:
    "Get new jobs in your inbox. AI match-scored against your resume. Free forever — smarter than MeroJob alerts.",
};

export default function AlertsPage() {
  return <AlertsClient />;
}
