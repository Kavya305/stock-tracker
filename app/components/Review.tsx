"use client";
import { Suggestion } from "./portfolio-types";

function Card({ s }: { s: Suggestion }) {
  const isReduce = s.kind === "reduce";
  const accent = isReduce
    ? "border-red-900/60 bg-red-950/20"
    : "border-emerald-900/60 bg-emerald-950/20";
  const badge = isReduce
    ? "bg-red-900/60 text-red-300"
    : "bg-emerald-900/60 text-emerald-300";
  return (
    <div className={`rounded-lg border p-4 ${accent}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-medium">{s.name}</div>
          <div className="text-xs text-gray-500">
            {s.symbol.replace(".NS", "")} · {s.sector}
          </div>
        </div>
        <span className={`shrink-0 text-[10px] uppercase tracking-wide rounded px-2 py-0.5 font-semibold ${badge}`}>
          {s.strength}
        </span>
      </div>
      <ul className="mt-3 space-y-1">
        {s.reasons.map((r, i) => (
          <li key={i} className="text-sm text-gray-300 flex gap-2">
            <span className="text-gray-600">•</span>
            <span>{r}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Review({
  reduce,
  add,
  watchlistCount = 0,
}: {
  reduce: Suggestion[];
  add: Suggestion[];
  watchlistCount?: number;
}) {
  return (
    <div>
      <div className="rounded-lg border border-gray-800 bg-gray-900/40 p-3 mb-5">
        <p className="text-sm text-gray-300">
          These are <strong>prompts to look closer</strong>, generated from
          simple rules on public data — never instructions to trade. Every point
          shows the reason behind it so you can judge it yourself.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <h3 className="text-sm font-semibold mb-3">
            Worth reviewing for trimming or exit{" "}
            <span className="text-gray-500 font-normal">({reduce.length})</span>
          </h3>
          {reduce.length === 0 ? (
            <p className="text-sm text-gray-500">
              Nothing flagged — no holding tripped the review rules.
            </p>
          ) : (
            <div className="space-y-3">
              {reduce.map((s) => (
                <Card key={s.symbol} s={s} />
              ))}
            </div>
          )}
        </section>

        <section>
          <h3 className="text-sm font-semibold mb-3">
            Worth reviewing to add{" "}
            <span className="text-gray-500 font-normal">({add.length})</span>
          </h3>
          {watchlistCount === 0 ? (
            <p className="text-sm text-gray-500">
              Add stocks to a watchlist first — suggestions to add are drawn
              from the names you&apos;ve put on your watchlists.
            </p>
          ) : add.length === 0 ? (
            <p className="text-sm text-gray-500">
              Nothing on your watchlists currently meets the bar.
            </p>
          ) : (
            <div className="space-y-3">
              {add.map((s) => (
                <Card key={s.symbol} s={s} />
              ))}
            </div>
          )}
        </section>
      </div>

      <p className="mt-5 text-xs text-gray-500">
        Informational indicators computed from public data — not investment
        advice. You remain the decision-maker.
      </p>
    </div>
  );
}
