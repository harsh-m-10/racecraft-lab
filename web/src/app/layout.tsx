import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://racecraft-lab.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Racecraft — F1 schedule, results, standings & news",
    template: "%s | Racecraft",
  },
  description:
    "Everything Formula 1 in one place: race weekend countdown, session results, championship standings, news — plus the lap-data debrief you won't find anywhere else.",
};

const NAV = [
  { href: "/schedule", label: "Schedule" },
  { href: "/standings", label: "Standings" },
  { href: "/races", label: "Results" },
  { href: "/news", label: "News" },
] as const;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="sticky top-0 z-50 border-b border-line bg-page/90 backdrop-blur">
          <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
            <Link href="/" className="flex items-center gap-2">
              <span className="inline-block h-4 w-1.5 -skew-x-12 bg-accent" />
              <span className="text-[15px] font-black tracking-[0.16em] uppercase">
                Racecraft
              </span>
            </Link>
            <nav className="flex items-center gap-0.5 text-sm sm:gap-1">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-md px-2 py-1.5 font-medium text-ink-2 transition-colors hover:bg-card-2 hover:text-ink sm:px-3"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
          {children}
        </main>
        <footer className="border-t border-line py-6">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-1 px-4 text-xs text-mute sm:px-6">
            <p>
              Results and standings from official timing data. Updated
              throughout every race weekend.
            </p>
            <p>
              Unofficial fan project; not associated with Formula 1 or the FIA.{" "}
              <Link href="/about" className="hover:text-ink-2">
                About
              </Link>
            </p>
          </div>
        </footer>
        <Analytics />
      </body>
    </html>
  );
}
