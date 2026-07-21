"use client";
import { CompanyResults, NewsItem } from "./portfolio-types";

const compact = (n: number | null) =>
  n == null
    ? "—"
    : Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 2 }).format(n);

const tone = (n: number | null) =>
  n == null ? "text-gray-400" : n >= 0 ? "text-emerald-400" : "text-red-400";

export default function NewsResults({
  results,
  news,
}: {
  results: CompanyResults[];
  news: NewsItem[];
}) {
  const withData = results.filter((r) => r.available);
  const without = results.filter((r) => !r.available);
  const upcoming = results
    .filter((r) => r.nextEarningsDate)
    .sort((a, b) => (a.nextEarningsDate ?? "").localeCompare(b.nextEarningsDate ?? ""));

  return (
    <div className="space-y-8">
      {upcoming.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold mb-2">Next results due</h3>
          <div className="flex flex-wrap gap-2">
            {upcoming.map((r) => (
              <span
                key={r.symbol}
                className="text-xs rounded border border-gray-800 bg-gray-900/50 px-2.5 py-1.5"
              >
                <span className="text-gray-300">{r.name}</span>{" "}
                <span className="text-emerald-400">{r.nextEarningsDate}</span>
              </span>
            ))}
          </div>
        </section>
      )}

      <section>
        <h3 className="text-sm font-semibold mb-2">Quarterly results</h3>
        {withData.length === 0 ? (
          <p className="text-sm text-gray-500">
            No quarterly results available for your holdings.
          </p>
        ) : (
          <div className="space-y-5">
            {withData.map((r) => (
              <div key={r.symbol} className="rounded-lg border border-gray-800">
                <div className="px-3 py-2 bg-gray-900 text-sm font-medium">
                  {r.name}{" "}
                  <span className="text-xs text-gray-500">
                    {r.symbol.replace(".NS", "")}
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-gray-400">
                      <tr>
                        {["Quarter", "Reported", "EPS", "Estimate", "Surprise", "Revenue", "Margin"].map(
                          (h) => (
                            <th key={h} className="px-3 py-2 text-left whitespace-nowrap font-normal">
                              {h}
                            </th>
                          )
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {r.quarters.map((q) => (
                        <tr key={q.period} className="border-t border-gray-800">
                          <td className="px-3 py-2 font-medium">{q.period}</td>
                          <td className="px-3 py-2 text-gray-400">
                            {q.reportedDate ?? "—"}
                          </td>
                          <td className="px-3 py-2">{q.epsActual ?? "—"}</td>
                          <td className="px-3 py-2 text-gray-400">
                            {q.epsEstimate != null ? q.epsEstimate.toFixed(2) : "—"}
                          </td>
                          <td className={`px-3 py-2 ${tone(q.surprisePct)}`}>
                            {q.surprisePct != null
                              ? `${q.surprisePct >= 0 ? "+" : ""}${q.surprisePct}%`
                              : "—"}
                          </td>
                          <td className="px-3 py-2">{compact(q.revenue)}</td>
                          <td className="px-3 py-2 text-gray-400">
                            {q.profitMargin != null
                              ? `${(q.profitMargin * 100).toFixed(1)}%`
                              : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
        {without.length > 0 && (
          <p className="mt-3 text-xs text-amber-400/80">
            No results data published for: {without.map((r) => r.name).join(", ")}.
            Coverage is thinner for smaller companies.
          </p>
        )}
        <p className="mt-2 text-xs text-gray-500">
          Revenue is shown as reported by the data source — companies report in
          different currencies (e.g. Infosys reports in USD), so don&apos;t
          compare revenue across companies directly.
        </p>
      </section>

      <section>
        <h3 className="text-sm font-semibold mb-2">Latest news</h3>
        {news.length === 0 ? (
          <p className="text-sm text-gray-500">
            No recent news found for your holdings.
          </p>
        ) : (
          <ul className="space-y-2">
            {news.map((n, i) => (
              <li
                key={i}
                className="rounded-lg border border-gray-800 bg-gray-900/40 p-3"
              >
                <a
                  href={n.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm hover:text-emerald-400"
                >
                  {n.title}
                </a>
                <div className="text-xs text-gray-500 mt-1">
                  {n.company} · {n.publisher}
                  {n.published ? ` · ${n.published}` : ""}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
