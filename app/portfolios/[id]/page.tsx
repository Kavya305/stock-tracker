"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Reports from "../../components/Reports";
import { SignalBadge, RatingStars } from "../../components/StockTable";
import { PortfolioDetail } from "../../components/portfolio-types";
import { UNIVERSE, INDICES } from "@/lib/universe";
import { apiFetch } from "../../lib-client";

const fmt = (n: number | null | undefined, d = 2) =>
  n == null ? "—" : n.toLocaleString("en-IN", { maximumFractionDigits: d });
const pct = (n: number | null) =>
  n == null ? "—" : `${(n * 100).toFixed(2)}%`;

export default function PortfolioDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [data, setData] = useState<PortfolioDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"holdings" | "reports" | "transactions">(
    "holdings"
  );

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
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

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
            <select
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              className="input w-52"
            >
              {INDICES.map((idx) => (
                <optgroup key={idx} label={idx}>
                  {UNIVERSE.filter((s) => s.index === idx).map((s) => (
                    <option key={s.symbol} value={s.symbol}>
                      {s.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
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
      <div className="flex gap-2 mb-4 border-b border-gray-800">
        {(["holdings", "reports", "transactions"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm capitalize -mb-px border-b-2 ${
              tab === t
                ? "border-emerald-500 text-emerald-400"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "holdings" && <HoldingsTable data={data} />}
      {tab === "reports" && <Reports holdings={data.holdings} />}
      {tab === "transactions" && (
        <TransactionsTable data={data} onDelete={delTxn} />
      )}

      <p className="mt-4 text-xs text-gray-500">
        Ratings, buy/sell signals and XIRR are informational indicators computed
        from public data — not investment advice.
      </p>
    </div>
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

function HoldingsTable({ data }: { data: PortfolioDetail }) {
  const held = data.holdings.filter((h) => h.balanceUnits > 0.0000001);
  if (held.length === 0)
    return <p className="text-gray-500">No open holdings. Add a BUY transaction.</p>;
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-800">
      <table className="w-full text-sm">
        <thead className="bg-gray-900 text-gray-400">
          <tr>
            {["Stock", "Units", "First Buy", "Invested", "Cur. Price", "Cur. Value", "P/L", "XIRR", "Rating", "Signal"].map(
              (h) => (
                <th key={h} className="px-3 py-2 text-left whitespace-nowrap">
                  {h}
                </th>
              )
            )}
          </tr>
        </thead>
        <tbody>
          {held.map((h) => {
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

function TransactionsTable({
  data,
  onDelete,
}: {
  data: PortfolioDetail;
  onDelete: (id: number) => void;
}) {
  if (data.transactions.length === 0)
    return <p className="text-gray-500">No transactions yet.</p>;
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-800">
      <table className="w-full text-sm">
        <thead className="bg-gray-900 text-gray-400">
          <tr>
            {["Date", "Stock", "Type", "Units", "Price", "Value", ""].map((h) => (
              <th key={h} className="px-3 py-2 text-left whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.transactions.map((t) => (
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
              <td className="px-3 py-2">
                <button
                  onClick={() => onDelete(t.id)}
                  className="text-xs text-gray-500 hover:text-red-400"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
