"use client";
import { useMemo, useState } from "react";

/**
 * Shared column sorting for tables. Accessors let a column sort on a computed
 * value (e.g. profit/loss) rather than a raw field. Blanks always sort last.
 */
export function useSortable<T>(
  rows: T[],
  accessors: Record<string, (row: T) => unknown>,
  initial?: { key: string; asc?: boolean }
) {
  const [sortKey, setSortKey] = useState<string | null>(initial?.key ?? null);
  const [asc, setAsc] = useState(initial?.asc ?? false);

  const sorted = useMemo(() => {
    if (!sortKey || !accessors[sortKey]) return rows;
    const get = accessors[sortKey];
    return [...rows].sort((x, y) => {
      const a = get(x);
      const b = get(y);
      if (a == null && b == null) return 0;
      if (a == null) return 1; // blanks last, whichever direction
      if (b == null) return -1;
      const c =
        typeof a === "number" && typeof b === "number"
          ? a - b
          : String(a).localeCompare(String(b));
      return asc ? c : -c;
    });
  }, [rows, sortKey, asc, accessors]);

  const toggle = (key: string) => {
    if (sortKey === key) setAsc(!asc);
    else {
      setSortKey(key);
      setAsc(false); // new column starts high-to-low
    }
  };

  return { sorted, sortKey, asc, toggle };
}

export function SortTh({
  label,
  col,
  sortKey,
  asc,
  onSort,
  className = "",
}: {
  label: string;
  col: string;
  sortKey: string | null;
  asc: boolean;
  onSort: (key: string) => void;
  className?: string;
}) {
  const active = sortKey === col;
  return (
    <th
      onClick={() => onSort(col)}
      className={`px-3 py-2 text-left whitespace-nowrap cursor-pointer select-none hover:text-emerald-400 ${
        active ? "text-emerald-400" : ""
      } ${className}`}
    >
      {label}
      <span className="ml-1 text-[10px]">{active ? (asc ? "▲" : "▼") : "↕"}</span>
    </th>
  );
}
