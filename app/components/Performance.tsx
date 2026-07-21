"use client";
import { useState } from "react";
import { AnalysisResponse, HoldingPeriod } from "./portfolio-types";
import { useSortable, SortTh } from "./sortable";

const PERF_COLS: Record<string, (r: HoldingPeriod) => unknown> = {
  name: (r) => r.name,
  priceReturn: (r) => r.priceReturn,
  vsBenchmark: (r) => r.vsBenchmark,
  contribution: (r) => r.contribution,
  weight: (r) => r.weight,
};

const pct = (n: number | null) =>
  n == null ? "—" : `${n >= 0 ? "+" : ""}${(n * 100).toFixed(2)}%`;
const inr = (n: number) =>
  `₹${Math.round(n).toLocaleString("en-IN")}`;
const tone = (n: number | null | undefined) =>
  n == null ? "text-gray-400" : n >= 0 ? "text-emerald-400" : "text-red-400";

export default function Performance({ data }: { data: AnalysisResponse }) {
  const [active, setActive] = useState(data.periods[0]?.label ?? "3M");
  const rows = data.breakdown[active] ?? [];
  const period = data.periods.find((p) => p.label === active);
  const { sorted, sortKey, asc, toggle } = useSortable(rows, PERF_COLS, {
    key: "contribution",
  });

  return (
    <div>
      {/* Period summary cards */}
      <div className="grid gap-3 sm:grid-cols-3 mb-6">
        {data.periods.map((p) => {
          const beat =
            p.portfolioReturn != null && p.benchmarkReturn != null
              ? p.portfolioReturn - p.benchmarkReturn
              : null;
          return (
            <button
              key={p.label}
              onClick={() => setActive(p.label)}
              className={`text-left rounded-lg border p-4 transition ${
                active === p.label
                  ? "border-emerald-600 bg-emerald-950/30"
                  : "border-gray-800 bg-gray-900/50 hover:border-gray-700"
              }`}
            >
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-semibold">{p.label}</span>
                {p.sinceInception && (
                  <span className="text-[10px] text-amber-400/80">
                    since inception
                  </span>
                )}
              </div>
              <div className={`text-2xl font-bold mt-1 ${tone(p.portfolioReturn)}`}>
                {pct(p.portfolioReturn)}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {p.benchmarkName}: {pct(p.benchmarkReturn)}
              </div>
              {beat != null && (
                <div className={`text-xs mt-1 ${tone(beat)}`}>
                  {beat >= 0 ? "Ahead of" : "Behind"} index by{" "}
                  {Math.abs(beat * 100).toFixed(1)}%
                </div>
              )}
            </button>
          );
        })}
      </div>

      {period && (
        <div className="grid gap-3 sm:grid-cols-4 mb-5 text-sm">
          <Stat label="Value at start" value={inr(period.startValue)} />
          <Stat label="Value now" value={inr(period.endValue)} />
          <Stat label="Money added" value={inr(period.netInvested)} />
          <Stat
            label="Gain / loss"
            value={inr(period.gain)}
            className={tone(period.gain)}
          />
        </div>
      )}

      <h3 className="text-sm font-semibold mb-2">
        Stock-by-stock over {active}
      </h3>
      {rows.length === 0 ? (
        <p className="text-gray-500 text-sm">No data for this period.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-800">
          <table className="w-full text-sm">
            <thead className="bg-gray-900 text-gray-400">
              <tr>
                {[
                  ["Stock", "name"],
                  ["Price return", "priceReturn"],
                  ["vs Nifty 50", "vsBenchmark"],
                  ["Contribution ₹", "contribution"],
                  ["Weight now", "weight"],
                ].map(([label, col]) => (
                  <SortTh
                    key={col}
                    label={label}
                    col={col}
                    sortKey={sortKey}
                    asc={asc}
                    onSort={toggle}
                  />
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((r) => (
                <tr key={r.symbol} className="border-t border-gray-800">
                  <td className="px-3 py-2">
                    <div className="font-medium">{r.name}</div>
                    <div className="text-xs text-gray-500">
                      {r.symbol.replace(".NS", "")} · {r.sector}
                      {!r.held && " · sold"}
                    </div>
                  </td>
                  <td className={`px-3 py-2 ${tone(r.priceReturn)}`}>
                    {pct(r.priceReturn)}
                  </td>
                  <td className={`px-3 py-2 ${tone(r.vsBenchmark)}`}>
                    {pct(r.vsBenchmark)}
                  </td>
                  <td className={`px-3 py-2 ${tone(r.contribution)}`}>
                    {inr(r.contribution)}
                  </td>
                  <td className="px-3 py-2 text-gray-400">
                    {(r.weight * 100).toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-3 text-xs text-gray-500">
        Returns are time-weighted, so money you added or withdrew doesn&apos;t
        count as performance. Benchmark is the {period?.benchmarkName ?? "Nifty 50"}.
      </p>
    </div>
  );
}

function Stat({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-3">
      <div className="text-xs text-gray-400">{label}</div>
      <div className={`font-semibold mt-0.5 ${className}`}>{value}</div>
    </div>
  );
}
