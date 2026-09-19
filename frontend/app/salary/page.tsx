import type { Metadata } from "next";
import SalaryPage from "./Client";

export const metadata: Metadata = {
  title: "Salary insights — real ranges in NPR",
  description: "What do roles actually pay? Live ranges from postings, normalized to NPR/month.",
};

export default function SalaryRoute() {
  return <SalaryPage />;
}
