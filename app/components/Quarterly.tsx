"use client";
import { QuarterInfo, QuarterReport } from "./portfolio-types";

const pct = (n: number | null) =>
  n == null ? "—" : `${n >= 0 ? "+" : ""}${(n * 100).toFixed(2)}%`;
const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
const tone = (n: number | null | undefined) =>
  n == null ? "text-gray-400" : n >= 0 ? "text-emerald-400" : "text-red-400";

export default function Quarterly({
  quarters,
  report,
  selected,
  onSelect,
  loading,
}: {
  quarters: QuarterInfo[];
  report: QuarterReport | null;
  selected: string;
  onSelect: (year: number, q: number) => void;
  loading: boolean;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        <label className="text-sm text-gray-400">Quarter</label>
        <select
          className="input"
          value={selected}
          onChange={(e) => {
            const [y, q] = e.target.value.split("-").map(Number);
            onSelect(y, q);
          }}
        >
          {quarters.map((q) => (
            <option key={`${q.year}-${q.q}`} value={`${q.year}-${q.q}`}>
              {q.label}
            </option>
          ))}
        </select>
        {report?.isPartial && (
          <span className="text-xs text-amber-400/80">
            quarter still in progress — figures are to date
          </span>
        )}
      </div>

      {loading ? (
        <div className="py-16 text-center text-gray-500">Building report…</div>
      ) : !report ? (
        <p className="text-gray-500 text-sm">No report available.</p>
      ) : (
        <div className="space-y-7">
          <div className="grid gap-3 sm:grid-cols-4">
            <Stat label="Value at start" value={inr(report.startValue)} />
            <Stat label="Value at end" value={inr(report.endValue)} />
            <Stat label="Money added" value={inr(report.netInvested)} />
            <Stat
              label="Gain / loss"
              value={inr(report.gain)}
              className={tone(report.gain)}
            />
          </div>

          <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4">
            <div className="flex flex-wrap items-baseline gap-x-8 gap-y-2">
              <div>
                <div className="text-xs text-gray-400">Portfolio return</div>
                <div className={`text-2xl font-bold ${tone(report.portfolioReturn)}`}>
                  {pct(report.portfolioReturn)}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-400">{report.benchmarkName}</div>
                <div className={`text-2xl font-bold ${tone(report.benchmarkReturn)}`}>
                  {pct(report.benchmarkReturn)}
                </div>
              </div>
              {report.portfolioReturn != null && report.benchmarkReturn != null && (
                <div>
                  <div className="text-xs text-gray-400">Difference</div>
                  <div
                    className={`text-2xl font-bold ${tone(
                      report.portfolioReturn - report.benchmarkReturn
                    )}`}
                  >
                    {pct(report.portfolioReturn - report.benchmarkReturn)}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <ContribList title="Biggest contributors" rows={report.contributors} />
            <ContribList title="Biggest detractors" rows={report.detractors} />
          </div>

          <section>
            <h3 className="text-sm font-semibold mb-2">Sector allocation drift</h3>
            <div className="overflow-x-auto rounded-lg border border-gray-800">
              <table className="w-full text-sm">
                <thead className="bg-gray-900 text-gray-400">
                  <tr>
                    {["Sector", "Start of quarter", "End of quarter", "Change"].map((h) => (
                      <th key={h} className="px-3 py-2 text-left whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {report.allocation.map((a) => (
                    <tr key={a.sector} className="border-t border-gray-800">
                      <td className="px-3 py-2">{a.sector}</td>
                      <td className="px-3 py-2 text-gray-400">
                        {(a.startWeight * 100).toFixed(1)}%
                      </td>
                      <td className="px-3 py-2">{(a.endWeight * 100).toFixed(1)}%</td>
                      <td className={`px-3 py-2 ${tone(a.drift)}`}>
                        {a.drift >= 0 ? "+" : ""}
                        {(a.drift * 100).toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h3 className="text-sm font-semibold mb-2">
              Results reported this quarter
            </h3>
            {report.results.length === 0 ? (
              <p className="text-sm text-gray-500">
                None of your holdings reported results in this quarter.
              </p>
            ) : (
              <div className="space-y-2">
                {report.results.map((r) => (
                  <div
                    key={r.symbol}
                    className="rounded-lg border border-gray-800 bg-gray-900/40 p-3"
                  >
                    <div className="text-sm font-medium">{r.name}</div>
                    {r.quarters.map((q) => (
                      <div key={q.period} className="text-xs text-gray-400 mt-1">
                        {q.period} · reported {q.reportedDate} · EPS {q.epsActual}
                        {q.surprisePct != null && (
                          <span className={tone(q.surprisePct)}>
                            {" "}
                            ({q.surprisePct >= 0 ? "+" : ""}
                            {q.surprisePct}% vs estimate)
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function ContribList({
  title,
  rows,
}: {
  title: string;
  rows: { symbol: string; name: string; contribution: number; priceReturn: number | null }[];
}) {
  return (
    <section>
      <h3 className="text-sm font-semibold mb-2">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-gray-500">None.</p>
      ) : (
        <div className="rounded-lg border border-gray-800 divide-y divide-gray-800">
          {rows.map((r) => (
            <div key={r.symbol} className="flex items-center justify-between px-3 py-2">
              <div>
                <div className="text-sm">{r.name}</div>
                <div className="text-xs text-gray-500">{pct(r.priceReturn)}</div>
              </div>
              <div className={`text-sm font-medium ${tone(r.contribution)}`}>
                {inr(r.contribution)}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
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
