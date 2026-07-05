import type { MetadataRoute } from "next";
import { getSeason, getSeasonYears } from "@/lib/data";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://racecraft-lab.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages = [
    "",
    "/schedule",
    "/standings",
    "/races",
    "/news",
    "/about",
  ].map((p) => ({
    url: `${SITE_URL}${p}`,
    changeFrequency: "daily" as const,
    priority: p === "" ? 1 : 0.8,
  }));

  const years = getSeasonYears();
  const seasonPages = years.map((y) => ({
    url: `${SITE_URL}/races/${y}`,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));
  const racePages = years.flatMap((y) => {
    const season = getSeason(y);
    return (season?.events ?? []).map((ev) => ({
      url: `${SITE_URL}/races/${y}/${ev.round}`,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    }));
  });

  return [...staticPages, ...seasonPages, ...racePages];
}
