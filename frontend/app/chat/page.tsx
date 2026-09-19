import type { Metadata } from "next";
import Chat from "./Client";

export const metadata: Metadata = {
  title: "AI career chat",
  description: "Search jobs, check salaries and set alerts in plain words.",
};

export default function ChatPage() {
  return <Chat />;
}
