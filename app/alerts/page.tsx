"use client";
import { useEffect, useState, useCallback } from "react";
import StockPicker from "../components/StockPicker";
import { apiFetch } from "../lib-client";

interface ThresholdStatus {
  id: number;
  symbol: string;
  name: string;
  price: number | null;
  buyBelow: number | null;
  sellAbove: number | null;
  note: string | null;
  buyTriggered: boolean;
  sellTriggered: boolean;
  buyGapPct: number | null;
  sellGapPct: number | null;
}

const fmt = (n: number | null | undefined, d = 2) =>
  n == null ? "—" : n.toLocaleString("en-IN", { maximumFractionDigits: d });

export default function AlertsPage() {
  const [list, setList] = useState<ThresholdStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [symbol, setSymbol] = useState("RELIANCE.NS");
  const [buyBelow, setBuyBelow] = useState("");
  const [sellAbove, setSellAbove] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const d = await apiFetch("/api/thresholds").then((r) => r.json());
    setList(Array.isArray(d) ? d : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    setError(null);
    setSaving(true);
    const res = await apiFetch("/api/thresholds", {
      method: "POST",
      body: JSON.stringify({ symbol, buyBelow, sellAbove, note }),
    });
    setSaving(false);
    if (!res.ok) {
      setError((await res.json()).error ?? "Could not save");
      return;
    }
    setBuyBelow("");
    setSellAbove("");
    setNote("");
    load();
  };

  const remove = async (id: number) => {
    await apiFetch("/api/thresholds", {
      method: "DELETE",
      body: JSON.stringify({ id }),
    });
    load();
  };

  const triggered = list.filter((t) => t.buyTriggered || t.sellTriggered);
  const watching = list.filter((t) => !t.buyTriggered && !t.sellTriggered);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Price Alerts</h1>
      <p className="text-sm text-gray-400 mb-5">
        Set your own buy/sell target prices. Alerts are evaluated against the
        latest price whenever you open the app.
      </p>

      {/* Add / update form */}
      <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4 mb-6">
        <h3 className="font-semibold mb-3 text-sm">Set an alert</h3>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-gray-400">Stock</span>
            <StockPicker value={symbol} onChange={setSymbol} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-gray-400">Buy if price ≤ ₹</span>
            <input
              type="number"
              value={buyBelow}
              onChange={(e) => setBuyBelow(e.target.value)}
              className="input w-32"
              placeholder="optional"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-gray-400">Sell if price ≥ ₹</span>
            <input
              type="number"
              value={sellAbove}
              onChange={(e) => setSellAbove(e.target.value)}
              className="input w-32"
              placeholder="optional"
            />
          </label>
          <label className="flex flex-col gap-1 flex-1 min-w-[160px]">
            <span className="text-xs text-gray-400">Note</span>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="input w-full"
              placeholder="optional reminder"
            />
          </label>
          <button
            onClick={save}
            disabled={saving}
            className="rounded bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 px-4 py-1.5 text-sm h-[34px]"
          >
            {saving ? "Saving…" : "Save alert"}
          </button>
        </div>
        {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
        <p className="mt-2 text-xs text-gray-500">
          Setting an alert for a stock you already have replaces its targets.
        </p>
      </div>

      {loading ? (
        <div className="py-16 text-center text-gray-500">Loading…</div>
      ) : list.length === 0 ? (
        <p className="text-gray-500 text-sm">
          No alerts yet. Set one above — you can search for any stock, including
          ones outside the main list.
        </p>
      ) : (
        <>
          {triggered.length > 0 && (
            <section className="mb-6">
              <h2 className="text-sm font-semibold mb-2 text-red-300">
                Triggered now ({triggered.length})
              </h2>
              <div className="space-y-2">
                {triggered.map((t) => (
                  <Row key={t.id} t={t} onRemove={remove} />
                ))}
              </div>
            </section>
          )}
          <section>
            <h2 className="text-sm font-semibold mb-2 text-gray-300">
              Watching ({watching.length})
            </h2>
            {watching.length === 0 ? (
              <p className="text-sm text-gray-500">
                All your alerts are currently triggered.
              </p>
            ) : (
              <div className="space-y-2">
                {watching.map((t) => (
                  <Row key={t.id} t={t} onRemove={remove} />
                ))}
              </div>
            )}
          </section>
        </>
      )}

      <p className="mt-6 text-xs text-gray-500">
        Alerts are personal price reminders, not trade instructions or advice.
      </p>
    </div>
  );
}

// Only shown for not-yet-triggered targets: a buy target needs the price to
// fall to it, a sell target needs it to rise. Direction is fixed by kind, so
// just show the magnitude of the move required.
function gapText(gapPct: number | null, kind: "buy" | "sell") {
  if (gapPct == null) return "";
  const p = Math.abs(gapPct * 100).toFixed(1);
  return kind === "buy" ? `needs to fall ${p}%` : `needs to rise ${p}%`;
}

function Row({
  t,
  onRemove,
}: {
  t: ThresholdStatus;
  onRemove: (id: number) => void;
}) {
  const hot = t.buyTriggered || t.sellTriggered;
  return (
    <div
      className={`rounded-lg border p-3 flex items-center justify-between gap-4 flex-wrap ${
        hot ? "border-red-800 bg-red-950/20" : "border-gray-800 bg-gray-900/40"
      }`}
    >
      <div className="min-w-[160px]">
        <div className="font-medium">{t.name}</div>
        <div className="text-xs text-gray-500">
          {t.symbol.replace(".NS", "")} · now ₹{fmt(t.price)}
        </div>
        {t.note && <div className="text-xs text-gray-400 mt-0.5">{t.note}</div>}
      </div>

      <div className="flex items-center gap-4 text-sm">
        {t.buyBelow != null && (
          <div>
            <span
              className={`text-xs px-2 py-0.5 rounded font-semibold ${
                t.buyTriggered
                  ? "bg-emerald-800 text-emerald-200"
                  : "bg-gray-800 text-emerald-300"
              }`}
            >
              {t.buyTriggered ? "BUY hit" : "Buy"} ≤ ₹{fmt(t.buyBelow)}
            </span>
            {!t.buyTriggered && (
              <div className="text-[11px] text-gray-500 mt-0.5">
                {gapText(t.buyGapPct, "buy")}
              </div>
            )}
          </div>
        )}
        {t.sellAbove != null && (
          <div>
            <span
              className={`text-xs px-2 py-0.5 rounded font-semibold ${
                t.sellTriggered
                  ? "bg-red-800 text-red-200"
                  : "bg-gray-800 text-red-300"
              }`}
            >
              {t.sellTriggered ? "SELL hit" : "Sell"} ≥ ₹{fmt(t.sellAbove)}
            </span>
            {!t.sellTriggered && (
              <div className="text-[11px] text-gray-500 mt-0.5">
                {gapText(t.sellGapPct, "sell")}
              </div>
            )}
          </div>
        )}
      </div>

      <button
        onClick={() => onRemove(t.id)}
        className="text-xs text-gray-500 hover:text-red-400"
      >
        Delete
      </button>
    </div>
  );
}
