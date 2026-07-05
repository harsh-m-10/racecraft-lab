const COUNTRY_ISO: Record<string, string> = {
  Australia: "au",
  Austria: "at",
  Azerbaijan: "az",
  Bahrain: "bh",
  Belgium: "be",
  Brazil: "br",
  Canada: "ca",
  China: "cn",
  France: "fr",
  Germany: "de",
  Hungary: "hu",
  Italy: "it",
  Japan: "jp",
  Mexico: "mx",
  Monaco: "mc",
  Netherlands: "nl",
  Portugal: "pt",
  Qatar: "qa",
  Russia: "ru",
  "Saudi Arabia": "sa",
  Singapore: "sg",
  Spain: "es",
  Turkey: "tr",
  "United Arab Emirates": "ae",
  "United Kingdom": "gb",
  "United States": "us",
  USA: "us",
  Vietnam: "vn",
};

/** Country name → lowercase ISO code (null when unknown). */
export function countryIso(country: string | null | undefined): string | null {
  return (country && COUNTRY_ISO[country]) || null;
}

/** Small inline flag image (emoji flags don't render on Windows). */
export function Flag({ country }: { country: string | null | undefined }) {
  const iso = countryIso(country);
  if (!iso) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://flagcdn.com/w40/${iso}.png`}
      alt={country ?? ""}
      width={20}
      height={15}
      loading="lazy"
      className="inline-block rounded-[2px] align-baseline"
    />
  );
}
