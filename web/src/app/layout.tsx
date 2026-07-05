import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Racecraft Lab — telemetry-grade F1 driver rankings",
    template: "%s | Racecraft Lab",
  },
  description:
    "F1 driver rankings built from every clean racing lap since 2018: race pace, qualifying head-to-head, tyre management and more. No narratives — just lap times.",
};

const NAV = [
  { href: "/", label: "Rankings" },
  { href: "/drivers", label: "Drivers" },
  { href: "/seasons", label: "Seasons" },
  { href: "/methodology", label: "Methodology" },
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
        <header className="sticky top-0 z-50 border-b border-line bg-page/85 backdrop-blur">
          <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
            <Link href="/" className="flex items-baseline gap-1.5">
              <span className="text-[15px] font-bold tracking-[0.14em] uppercase">
                Racecraft
              </span>
              <span className="text-[15px] font-bold tracking-[0.14em] uppercase text-brand">
                Lab
              </span>
            </Link>
            <nav className="flex items-center gap-1 text-sm">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-md px-2.5 py-1.5 text-ink-2 transition-colors hover:bg-card-2 hover:text-ink sm:px-3"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
          {children}
        </main>
        <footer className="border-t border-line py-6">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-1 px-4 text-xs text-mute sm:px-6">
            <p>
              Built from FastF1 timing data, 2018–present. Updated after every
              race weekend.
            </p>
            <p>
              Racecraft Lab is a debate-starter, not a final answer. Unofficial;
              not associated with Formula 1.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
