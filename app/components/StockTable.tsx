"use client";
import { useState } from "react";

export interface Stock {
  symbol: string;
  name: string;
  sector: string;
  index: string;
  price: number | null;
  peg: number | null;
  pe: number | null;
  fiveYrAvgPe: number | null;
  roe: number | null;
  roce: number | null;
  marketCap: number | null;
  capCategory: string | null;
  rating: number | null;
  signal: "BUY" | "SELL" | "HOLD" | null;
}

const fmt = (n: number | null | undefined, d = 2) =>
  n == null ? "—" : n.toLocaleString("en-IN", { maximumFractionDigits: d });
const fmtCap = (n: number | null) =>
  n == null ? "—" : `₹${(n / 1e7).toLocaleString("en-IN", { maximumFractionDigits: 0 })} Cr`;
const INDEX_ABBR: Record<string, string> = {
  "Nifty 50": "N50",
  "Nifty Next 50": "Next50",
  "Nifty Midcap 150": "Mid150",
  "Nifty Smallcap 250": "Small250",
  "Nifty Microcap 250": "Micro250",
  Custom: "Custom",
};

export function SignalBadge({ signal }: { signal: Stock["signal"] }) {
  if (!signal) return <span className="text-gray-500">—</span>;
  const cls =
    signal === "BUY"
      ? "bg-emerald-900 text-emerald-300"
      : signal === "SELL"
      ? "bg-red-900 text-red-300"
      : "bg-gray-800 text-gray-400";
  return <span className={`px-2 py-0.5 rounded text-xs font-semibold ${cls}`}>{signal}</span>;
}

export function RatingStars({ rating }: { rating: number | null }) {
  if (rating == null) return <span className="text-gray-500">—</span>;
  const color =
    rating >= 7 ? "text-emerald-400" : rating >= 4 ? "text-yellow-400" : "text-red-400";
  return <span className={`font-semibold ${color}`}>{rating}/10</span>;
}

type SortKey = keyof Stock;

export default function StockTable({
  stocks,
  actionLabel,
  onAction,
}: {
  stocks: Stock[];
  actionLabel?: string;
  onAction?: (symbol: string) => void;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("marketCap");
  const [asc, setAsc] = useState(false);
  const [filter, setFilter] = useState("");

  const sorted = [...stocks]
    .filter(
      (s) =>
        s.name.toLowerCase().includes(filter.toLowerCase()) ||
        s.symbol.toLowerCase().includes(filter.toLowerCase()) ||
        s.sector.toLowerCase().includes(filter.toLowerCase())
    )
    .sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey];
      if (av == null) return 1;
      if (bv == null) return -1;
      const cmp = typeof av === "number" ? av - (bv as number) : String(av).localeCompare(String(bv));
      return asc ? cmp : -cmp;
    });

  const th = (label: string, key: SortKey) => (
    <th
      className="px-3 py-2 text-left cursor-pointer select-none hover:text-emerald-400 whitespace-nowrap"
      onClick={() => (sortKey === key ? setAsc(!asc) : (setSortKey(key), setAsc(false)))}
    >
      {label} {sortKey === key ? (asc ? "↑" : "↓") : ""}
    </th>
  );

  return (
    <div>
      <input
        className="mb-3 w-72 rounded bg-gray-900 border border-gray-700 px-3 py-1.5 text-sm outline-none focus:border-emerald-500"
        placeholder="Filter by name / symbol / sector…"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />
      <div className="overflow-x-auto rounded-lg border border-gray-800">
        <table className="w-full text-sm">
          <thead className="bg-gray-900 text-gray-400">
            <tr>
              {th("Stock", "name")}
              {th("Sector", "sector")}
              {th("Index", "index")}
              {th("Price ₹", "price")}
              {th("PE", "pe")}
              {th("PEG", "peg")}
              {th("5Y Avg PE", "fiveYrAvgPe")}
              {th("ROE %", "roe")}
              {th("ROCE* %", "roce")}
              {th("Mkt Cap", "marketCap")}
              {th("Cap", "capCategory")}
              {th("Rating", "rating")}
              {th("Signal", "signal")}
              {actionLabel && <th className="px-3 py-2" />}
            </tr>
          </thead>
          <tbody>
            {sorted.map((s) => (
              <tr key={s.symbol} className="border-t border-gray-800 hover:bg-gray-900/60">
                <td className="px-3 py-2">
                  <div className="font-medium">{s.name}</div>
                  <div className="text-xs text-gray-500">{s.symbol.replace(".NS", "")}</div>
                </td>
                <td className="px-3 py-2 text-gray-400">{s.sector}</td>
                <td className="px-3 py-2">
                  <span className="text-xs rounded bg-gray-800 text-gray-300 px-1.5 py-0.5 whitespace-nowrap">
                    {INDEX_ABBR[s.index] ?? s.index}
                  </span>
                </td>
                <td className="px-3 py-2">{fmt(s.price)}</td>
                <td className="px-3 py-2">{fmt(s.pe, 1)}</td>
                <td className="px-3 py-2">{fmt(s.peg)}</td>
                <td className="px-3 py-2">{fmt(s.fiveYrAvgPe, 1)}</td>
                <td className="px-3 py-2">{fmt(s.roe, 1)}</td>
                <td className="px-3 py-2">{fmt(s.roce, 1)}</td>
                <td className="px-3 py-2 whitespace-nowrap">{fmtCap(s.marketCap)}</td>
                <td className="px-3 py-2">{s.capCategory ?? "—"}</td>
                <td className="px-3 py-2"><RatingStars rating={s.rating} /></td>
                <td className="px-3 py-2"><SignalBadge signal={s.signal} /></td>
                {actionLabel && (
                  <td className="px-3 py-2">
                    <button
                      onClick={() => onAction?.(s.symbol)}
                      className="text-xs rounded bg-emerald-700 hover:bg-emerald-600 px-2 py-1"
                    >
                      {actionLabel}
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-gray-500">
        *ROCE is approximated from return on assets. Rating & signals are rule-based indicators, not investment advice.
      </p>
    </div>
  );
}
