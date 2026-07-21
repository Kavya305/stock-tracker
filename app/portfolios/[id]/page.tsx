"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Reports from "../../components/Reports";
import Performance from "../../components/Performance";
import Review from "../../components/Review";
import NewsResults from "../../components/NewsResults";
import Quarterly from "../../components/Quarterly";
import StockPicker from "../../components/StockPicker";
import { useSortable, SortTh } from "../../components/sortable";
import { SignalBadge, RatingStars } from "../../components/StockTable";
import {
  PortfolioDetail,
  AnalysisResponse,
  CompanyResults,
  NewsItem,
  QuarterInfo,
  QuarterReport,
  Txn,
  Holding,
} from "../../components/portfolio-types";
import { UNIVERSE } from "@/lib/universe";
import { apiFetch } from "../../lib-client";

type Tab =
  | "holdings"
  | "performance"
  | "review"
  | "news"
  | "quarterly"
  | "reports"
  | "transactions";

const TABS: { id: Tab; label: string }[] = [
  { id: "holdings", label: "Holdings" },
  { id: "performance", label: "Performance" },
  { id: "review", label: "Review" },
  { id: "news", label: "News & Results" },
  { id: "quarterly", label: "Quarterly" },
  { id: "reports", label: "Allocation" },
  { id: "transactions", label: "Transactions" },
];

const fmt = (n: number | null | undefined, d = 2) =>
  n == null ? "—" : n.toLocaleString("en-IN", { maximumFractionDigits: d });
const pct = (n: number | null) =>
  n == null ? "—" : `${(n * 100).toFixed(2)}%`;

export default function PortfolioDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [data, setData] = useState<PortfolioDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("holdings");

  // Lazily-loaded tab data (these calls hit historical price / news APIs)
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [newsData, setNewsData] = useState<{
    results: CompanyResults[];
    news: NewsItem[];
  } | null>(null);
  const [newsLoading, setNewsLoading] = useState(false);
  const [quarters, setQuarters] = useState<QuarterInfo[]>([]);
  const [report, setReport] = useState<QuarterReport | null>(null);
  const [quarterKey, setQuarterKey] = useState("");
  const [quarterLoading, setQuarterLoading] = useState(false);

  // add-transaction form
  const [symbol, setSymbol] = useState(UNIVERSE[0].symbol);
  const [type, setType] = useState<"BUY" | "SELL">("BUY");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [units, setUnits] = useState("");
  const [price, setPrice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const d = await apiFetch(`/api/portfolios/${id}`).then((r) => r.json());
    setData(d);
    setLoading(false);
    // Holdings may have changed — drop cached tab data so it refetches.
    setAnalysis(null);
    setNewsData(null);
    setQuarters([]);
    setReport(null);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const loadQuarter = useCallback(
    async (year?: number, q?: number) => {
      setQuarterLoading(true);
      const qs = year && q ? `?year=${year}&q=${q}` : "";
      const d = await apiFetch(`/api/portfolios/${id}/quarterly${qs}`).then((r) =>
        r.json()
      );
      setQuarters(d.quarters ?? []);
      setReport(d.report ?? null);
      if (d.report) setQuarterKey(`${d.report.quarter.year}-${d.report.quarter.q}`);
      setQuarterLoading(false);
    },
    [id]
  );

  // Fetch each tab's data the first time it's opened.
  useEffect(() => {
    if ((tab === "performance" || tab === "review") && !analysis && !analysisLoading) {
      setAnalysisLoading(true);
      apiFetch(`/api/portfolios/${id}/analysis`)
        .then((r) => r.json())
        .then((d) => setAnalysis(d))
        .finally(() => setAnalysisLoading(false));
    }
    if (tab === "news" && !newsData && !newsLoading) {
      setNewsLoading(true);
      apiFetch(`/api/portfolios/${id}/news`)
        .then((r) => r.json())
        .then((d) => setNewsData(d))
        .finally(() => setNewsLoading(false));
    }
    if (tab === "quarterly" && quarters.length === 0 && !quarterLoading) {
      loadQuarter();
    }
  }, [
    tab,
    id,
    analysis,
    analysisLoading,
    newsData,
    newsLoading,
    quarters.length,
    quarterLoading,
    loadQuarter,
  ]);

  const addTxn = async () => {
    const u = parseFloat(units),
      p = parseFloat(price);
    if (!(u > 0) || !(p > 0)) {
      alert("Enter valid units and price.");
      return;
    }
    const res = await apiFetch(`/api/portfolios/${id}/transactions`, {
      method: "POST",
      body: JSON.stringify({ symbol, type, date, units: u, price: p }),
    });
    if (res.ok) {
      setUnits("");
      setPrice("");
      load();
    } else {
      alert((await res.json()).error);
    }
  };

  const saveTxn = async (
    txnId: number,
    fields: { symbol: string; type: "BUY" | "SELL"; date: string; units: number; price: number }
  ) => {
    if (!(fields.units > 0) || !(fields.price > 0)) {
      alert("Enter valid units and price.");
      return false;
    }
    const res = await apiFetch(`/api/portfolios/${id}/transactions`, {
      method: "PUT",
      body: JSON.stringify({ txnId, ...fields }),
    });
    if (!res.ok) {
      alert((await res.json()).error ?? "Could not save");
      return false;
    }
    load();
    return true;
  };

  const delTxn = async (txnId: number) => {
    await apiFetch(`/api/portfolios/${id}/transactions`, {
      method: "DELETE",
      body: JSON.stringify({ txnId }),
    });
    load();
  };

  if (loading) return <div className="py-20 text-center text-gray-500">Loading…</div>;
  if (!data || (data as { error?: string }).error)
    return (
      <div>
        <p className="text-gray-400">Portfolio not found.</p>
        <Link href="/portfolios" className="text-emerald-400 text-sm">
          ← Back to portfolios
        </Link>
      </div>
    );

  const gain = data.totalCurrent - data.totalInvested;
  const gainPct = data.totalInvested > 0 ? gain / data.totalInvested : 0;

  return (
    <div>
      <Link href="/portfolios" className="text-sm text-gray-400 hover:text-emerald-400">
        ← Portfolios
      </Link>
      <h1 className="text-2xl font-bold mt-1 mb-4">{data.name}</h1>

      {/* Summary cards */}
      <div className="grid gap-3 sm:grid-cols-4 mb-6">
        <Card label="Invested" value={`₹${fmt(data.totalInvested, 0)}`} />
        <Card label="Current Value" value={`₹${fmt(data.totalCurrent, 0)}`} />
        <Card
          label="Unrealised P/L"
          value={`₹${fmt(gain, 0)} (${(gainPct * 100).toFixed(1)}%)`}
          tone={gain >= 0 ? "up" : "down"}
        />
        <Card
          label="Portfolio XIRR"
          value={pct(data.xirr)}
          tone={(data.xirr ?? 0) >= 0 ? "up" : "down"}
        />
      </div>

      {/* Add transaction */}
      <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4 mb-6">
        <h3 className="font-semibold mb-3 text-sm">Add Transaction</h3>
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Stock">
            <StockPicker value={symbol} onChange={setSymbol} />
          </Field>
          <Field label="Type">
            <select
              value={type}
              onChange={(e) => setType(e.target.value as "BUY" | "SELL")}
              className="input w-24"
            >
              <option value="BUY">BUY</option>
              <option value="SELL">SELL</option>
            </select>
          </Field>
          <Field label="Date">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="input w-40"
            />
          </Field>
          <Field label="Units">
            <input
              type="number"
              value={units}
              onChange={(e) => setUnits(e.target.value)}
              className="input w-24"
              placeholder="0"
            />
          </Field>
          <Field label="Price ₹">
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="input w-28"
              placeholder="0.00"
            />
          </Field>
          <button
            onClick={addTxn}
            className="rounded bg-emerald-700 hover:bg-emerald-600 px-4 py-1.5 text-sm h-[34px]"
          >
            Add
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-gray-800 flex-wrap">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3.5 py-2 text-sm -mb-px border-b-2 whitespace-nowrap ${
              tab === t.id
                ? "border-emerald-500 text-emerald-400"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "holdings" && <HoldingsTable data={data} />}
      {tab === "reports" && <Reports holdings={data.holdings} />}
      {tab === "transactions" && (
        <TransactionsTable data={data} onDelete={delTxn} onSave={saveTxn} />
      )}

      {tab === "performance" &&
        (analysisLoading ? (
          <Loading text="Fetching price history and calculating returns…" />
        ) : !analysis || analysis.empty ? (
          <p className="text-gray-500 text-sm">
            Add some transactions to see performance.
          </p>
        ) : (
          <Performance data={analysis} />
        ))}

      {tab === "review" &&
        (analysisLoading ? (
          <Loading text="Analysing holdings and watchlists…" />
        ) : !analysis || analysis.empty ? (
          <p className="text-gray-500 text-sm">
            Add some transactions to get review suggestions.
          </p>
        ) : (
          <Review
            reduce={analysis.suggestions.reduce}
            add={analysis.suggestions.add}
            watchlistCount={analysis.watchlistCount}
          />
        ))}

      {tab === "news" &&
        (newsLoading ? (
          <Loading text="Fetching quarterly results and news…" />
        ) : !newsData ? (
          <p className="text-gray-500 text-sm">No data.</p>
        ) : (
          <NewsResults results={newsData.results} news={newsData.news} />
        ))}

      {tab === "quarterly" && (
        <Quarterly
          quarters={quarters}
          report={report}
          selected={quarterKey}
          loading={quarterLoading}
          onSelect={(y, q) => loadQuarter(y, q)}
        />
      )}

      <p className="mt-4 text-xs text-gray-500">
        Ratings, buy/sell signals and XIRR are informational indicators computed
        from public data — not investment advice.
      </p>
    </div>
  );
}

function Loading({ text }: { text: string }) {
  return (
    <div className="py-16 text-center text-gray-500 text-sm">{text}</div>
  );
}

function Card({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "up" | "down";
}) {
  const color =
    tone === "up" ? "text-emerald-400" : tone === "down" ? "text-red-400" : "";
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-3">
      <div className="text-xs text-gray-400">{label}</div>
      <div className={`text-lg font-semibold mt-0.5 ${color}`}>{value}</div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-gray-400">{label}</span>
      {children}
    </label>
  );
}

const HOLDING_COLS: Record<string, (h: Holding) => unknown> = {
  name: (h) => h.name,
  units: (h) => h.balanceUnits,
  firstBuy: (h) => h.firstBuy,
  invested: (h) => h.invested,
  price: (h) => h.currentPrice,
  value: (h) => h.currentValue,
  pl: (h) => (h.currentValue != null ? h.currentValue - h.invested : null),
  plPct: (h) =>
    h.currentValue != null && h.invested > 0
      ? h.currentValue / h.invested - 1
      : null,
  xirr: (h) => h.xirr,
  rating: (h) => h.rating,
  signal: (h) => h.signal,
};

function HoldingsTable({ data }: { data: PortfolioDetail }) {
  const held = data.holdings.filter((h) => h.balanceUnits > 0.0000001);
  const { sorted, sortKey, asc, toggle } = useSortable(held, HOLDING_COLS, {
    key: "value",
  });

  if (held.length === 0)
    return <p className="text-gray-500">No open holdings. Add a BUY transaction.</p>;
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-800">
      <table className="w-full text-sm">
        <thead className="bg-gray-900 text-gray-400">
          <tr>
            {[
              ["Stock", "name"],
              ["Units", "units"],
              ["First Buy", "firstBuy"],
              ["Invested", "invested"],
              ["Cur. Price", "price"],
              ["Cur. Value", "value"],
              ["P/L", "pl"],
              ["P/L %", "plPct"],
              ["XIRR", "xirr"],
              ["Rating", "rating"],
              ["Signal", "signal"],
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
          {sorted.map((h) => {
            const pl =
              h.currentValue != null ? h.currentValue - h.invested : null;
            return (
              <tr key={h.symbol} className="border-t border-gray-800">
                <td className="px-3 py-2">
                  <div className="font-medium">{h.name}</div>
                  <div className="text-xs text-gray-500">
                    {h.symbol.replace(".NS", "")} · {h.sector} · {h.capCategory}
                  </div>
                </td>
                <td className="px-3 py-2">{fmt(h.balanceUnits, 4)}</td>
                <td className="px-3 py-2 text-gray-400">{h.firstBuy}</td>
                <td className="px-3 py-2">₹{fmt(h.invested, 0)}</td>
                <td className="px-3 py-2">{fmt(h.currentPrice)}</td>
                <td className="px-3 py-2">
                  {h.currentValue == null ? "—" : `₹${fmt(h.currentValue, 0)}`}
                </td>
                <td
                  className={`px-3 py-2 ${
                    pl == null ? "" : pl >= 0 ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {pl == null ? "—" : `₹${fmt(pl, 0)}`}
                </td>
                <td
                  className={`px-3 py-2 ${
                    pl == null ? "" : pl >= 0 ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {pl == null || h.invested <= 0
                    ? "—"
                    : `${pl >= 0 ? "+" : ""}${((h.currentValue! / h.invested - 1) * 100).toFixed(1)}%`}
                </td>
                <td
                  className={`px-3 py-2 ${
                    (h.xirr ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {pct(h.xirr)}
                </td>
                <td className="px-3 py-2">
                  <RatingStars rating={h.rating} />
                </td>
                <td className="px-3 py-2">
                  <SignalBadge signal={h.signal} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const TXN_COLS: Record<string, (t: Txn) => unknown> = {
  date: (t) => t.date,
  symbol: (t) => t.symbol,
  type: (t) => t.type,
  units: (t) => t.units,
  price: (t) => t.price,
  value: (t) => t.units * t.price,
};

function TransactionsTable({
  data,
  onDelete,
  onSave,
}: {
  data: PortfolioDetail;
  onDelete: (id: number) => void;
  onSave: (
    id: number,
    fields: { symbol: string; type: "BUY" | "SELL"; date: string; units: number; price: number }
  ) => Promise<boolean>;
}) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const { sorted, sortKey, asc, toggle } = useSortable(
    data.transactions,
    TXN_COLS,
    { key: "date" }
  );

  if (data.transactions.length === 0)
    return <p className="text-gray-500">No transactions yet.</p>;
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-800">
      <table className="w-full text-sm">
        <thead className="bg-gray-900 text-gray-400">
          <tr>
            {[
              ["Date", "date"],
              ["Stock", "symbol"],
              ["Type", "type"],
              ["Units", "units"],
              ["Price", "price"],
              ["Value", "value"],
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
            <th className="px-3 py-2" />
          </tr>
        </thead>
        <tbody>
          {sorted.map((t) =>
            editingId === t.id ? (
              <EditRow
                key={t.id}
                txn={t}
                onCancel={() => setEditingId(null)}
                onSave={async (fields) => {
                  const ok = await onSave(t.id, fields);
                  if (ok) setEditingId(null);
                }}
              />
            ) : (
              <tr key={t.id} className="border-t border-gray-800">
                <td className="px-3 py-2 text-gray-400">{t.date}</td>
                <td className="px-3 py-2">{t.symbol.replace(".NS", "")}</td>
                <td className="px-3 py-2">
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-semibold ${
                      t.type === "BUY"
                        ? "bg-emerald-900 text-emerald-300"
                        : "bg-red-900 text-red-300"
                    }`}
                  >
                    {t.type}
                  </span>
                </td>
                <td className="px-3 py-2">{fmt(t.units, 4)}</td>
                <td className="px-3 py-2">₹{fmt(t.price)}</td>
                <td className="px-3 py-2">₹{fmt(t.units * t.price, 0)}</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <button
                    onClick={() => setEditingId(t.id)}
                    className="text-xs text-gray-500 hover:text-emerald-400 mr-3"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onDelete(t.id)}
                    className="text-xs text-gray-500 hover:text-red-400"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            )
          )}
        </tbody>
      </table>
    </div>
  );
}

function EditRow({
  txn,
  onSave,
  onCancel,
}: {
  txn: Txn;
  onSave: (fields: {
    symbol: string;
    type: "BUY" | "SELL";
    date: string;
    units: number;
    price: number;
  }) => void;
  onCancel: () => void;
}) {
  const [symbol, setSymbol] = useState(txn.symbol);
  const [type, setType] = useState<"BUY" | "SELL">(txn.type);
  const [date, setDate] = useState(txn.date);
  const [units, setUnits] = useState(String(txn.units));
  const [price, setPrice] = useState(String(txn.price));

  return (
    <tr className="border-t border-emerald-800 bg-emerald-950/20 align-top">
      <td className="px-3 py-2">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="input w-36"
        />
      </td>
      <td className="px-3 py-2">
        <StockPicker value={symbol} onChange={setSymbol} />
      </td>
      <td className="px-3 py-2">
        <select
          value={type}
          onChange={(e) => setType(e.target.value as "BUY" | "SELL")}
          className="input w-24"
        >
          <option value="BUY">BUY</option>
          <option value="SELL">SELL</option>
        </select>
      </td>
      <td className="px-3 py-2">
        <input
          type="number"
          value={units}
          onChange={(e) => setUnits(e.target.value)}
          className="input w-24"
        />
      </td>
      <td className="px-3 py-2">
        <input
          type="number"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="input w-28"
        />
      </td>
      <td className="px-3 py-2 text-gray-500">
        ₹{fmt(parseFloat(units) * parseFloat(price) || 0, 0)}
      </td>
      <td className="px-3 py-2 whitespace-nowrap">
        <button
          onClick={() =>
            onSave({
              symbol,
              type,
              date,
              units: parseFloat(units),
              price: parseFloat(price),
            })
          }
          className="text-xs rounded bg-emerald-700 hover:bg-emerald-600 px-2 py-1 mr-2"
        >
          Save
        </button>
        <button
          onClick={onCancel}
          className="text-xs text-gray-400 hover:text-gray-200"
        >
          Cancel
        </button>
      </td>
    </tr>
  );
}
