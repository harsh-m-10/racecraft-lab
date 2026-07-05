import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center gap-4 py-24 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">
        Off track
      </p>
      <h1 className="text-3xl font-bold">Page not found</h1>
      <p className="text-ink-2">That one went straight into the gravel.</p>
      <Link
        href="/"
        className="mt-2 rounded-md bg-card-2 px-4 py-2 text-sm font-medium hover:text-brand"
      >
        Back to the rankings
      </Link>
    </div>
  );
}
