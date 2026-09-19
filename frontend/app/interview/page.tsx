import type { Metadata } from "next";
import InterviewPrep from "./Client";

export const metadata: Metadata = {
  title: "Interview prep — questions + feedback",
  description: "Generate interview questions from any job description and get instant feedback on your answers.",
};

export default function InterviewPage() {
  return <InterviewPrep />;
}
