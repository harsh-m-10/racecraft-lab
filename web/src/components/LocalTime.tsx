"use client";

import { useEffect, useState } from "react";

/** Renders a UTC timestamp in the viewer's timezone (after hydration). */
export function LocalTime({
  iso,
  mode = "datetime",
}: {
  iso: string;
  mode?: "datetime" | "time" | "date";
}) {
  const [label, setLabel] = useState<string>("");

  useEffect(() => {
    const d = new Date(iso);
    const opts: Intl.DateTimeFormatOptions =
      mode === "time"
        ? { hour: "2-digit", minute: "2-digit" }
        : mode === "date"
          ? { month: "short", day: "numeric" }
          : {
              weekday: "short",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            };
    setLabel(new Intl.DateTimeFormat(undefined, opts).format(d));
  }, [iso, mode]);

  return <span className="num">{label}</span>;
}
