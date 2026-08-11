"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "../lib-client";

interface T {
  buyTriggered: boolean;
  sellTriggered: boolean;
}

// "Alerts" nav link with a badge showing how many thresholds are currently hit.
export default function AlertsNav() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let alive = true;
    const check = () =>
      apiFetch("/api/thresholds")
        .then((r) => r.json())
        .then((list: T[]) => {
          if (alive && Array.isArray(list))
            setCount(list.filter((t) => t.buyTriggered || t.sellTriggered).length);
        })
        .catch(() => {});
    check();
    const iv = setInterval(check, 5 * 60 * 1000); // refresh every 5 min
    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, []);

  return (
    <Link href="/alerts" className="text-sm hover:text-emerald-400 flex items-center gap-1">
      Alerts
      {count > 0 && (
        <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[11px] font-semibold">
          {count}
        </span>
      )}
    </Link>
  );
}
