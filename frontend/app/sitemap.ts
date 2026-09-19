import type { MetadataRoute } from "next";
import { CATEGORIES, LOCATIONS } from "./components/places";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const API = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base: MetadataRoute.Sitemap = [
    { url: `${SITE}/`, changeFrequency: "daily", priority: 1 },
    { url: `${SITE}/jobs`, changeFrequency: "hourly", priority: 0.9 },
    { url: `${SITE}/companies`, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE}/interview`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${SITE}/salary`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${SITE}/chat`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE}/alerts`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${SITE}/employers`, changeFrequency: "weekly", priority: 0.7 },
    ...LOCATIONS.map((l) => ({
      url: `${SITE}/jobs-in/${l.slug}`, changeFrequency: "daily" as const, priority: 0.85,
    })),
    ...CATEGORIES.map((c) => ({
      url: `${SITE}/category/${encodeURIComponent(c)}`, changeFrequency: "daily" as const, priority: 0.8,
    })),
  ];
  try {
    const opt = { next: { revalidate: 3600 }, signal: AbortSignal.timeout(8000) };
    const [b, co] = await Promise.all([
      fetch(`${API}/api/board`, opt),
      fetch(`${API}/api/company-sites`, opt),
    ]);
    const urls = [...base];
    if (b.ok) {
      const d = await b.json();
      for (const j of d.results ?? []) {
        urls.push({ url: `${SITE}/jobs/${j.id}`, changeFrequency: "daily" as const, priority: 0.8 });
      }
    }
    if (co.ok) {
      const d = await co.json();
      for (const s of d.results ?? []) {
        urls.push({ url: `${SITE}/c/${s.slug}`, changeFrequency: "daily" as const, priority: 0.7 });
      }
    }
    return urls;
  } catch {
    return base;
  }
}
