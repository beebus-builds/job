import type { Metadata } from "next";
import CompanyEditor from "./Client";

export const metadata: Metadata = {
  title: "Build your company site",
  description: "Free mini-website for your company: brand, story and open roles on AutomateJob.",
};

export default function CompanyPage() {
  return <CompanyEditor />;
}
