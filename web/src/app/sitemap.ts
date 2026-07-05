import type { MetadataRoute } from "next";
import { getDriverSlugs, getSeasonYears } from "@/lib/data";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://racecraft-lab.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages = ["", "/drivers", "/seasons", "/methodology"].map(
    (p) => ({
      url: `${SITE_URL}${p}`,
      changeFrequency: "weekly" as const,
      priority: p === "" ? 1 : 0.8,
    }),
  );
  const drivers = getDriverSlugs().map((slug) => ({
    url: `${SITE_URL}/drivers/${slug}`,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));
  const seasons = getSeasonYears().map((y) => ({
    url: `${SITE_URL}/seasons/${y}`,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));
  return [...staticPages, ...drivers, ...seasons];
}
