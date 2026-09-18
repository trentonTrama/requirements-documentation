"use client";

import { useEffect, useState } from "react";
import { formatDateTime, relativeTime } from "@/lib/utils";

/**
 * Relative timestamps are computed from `Date.now()`, so rendering one during
 * SSR and again at hydration produces two different strings. Render the stable
 * absolute time first and switch to the relative form once mounted.
 */
export function TimeAgo({ value, className }: { value: Date | string; className?: string }) {
  const absolute = formatDateTime(value);
  const [label, setLabel] = useState(absolute);

  useEffect(() => {
    setLabel(relativeTime(value));
  }, [value]);

  return (
    <span className={className} title={absolute} suppressHydrationWarning>
      {label}
    </span>
  );
}
