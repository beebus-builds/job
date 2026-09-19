import type { Metadata } from "next";
import CvBuilder from "./Client";

export const metadata: Metadata = {
  title: "CV Builder — templates + PDF export",
  description: "Build a beautiful CV in minutes: three templates, live preview, one-click PDF.",
};

export default function CvPage() {
  return <CvBuilder />;
}
