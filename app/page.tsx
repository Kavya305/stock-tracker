"use client";
import { useEffect, useState, useCallback } from "react";
import StockTable, { Stock } from "./components/StockTable";
import { apiFetch } from "./lib-client";
import { INDICES } from "@/lib/universe";

interface Watchlist {
  id: number;
  name: string;
  symbols: string[];
}

const INDEX_SIZE: Record<string, number> = {
  "Nifty 50": 50,
  "Nifty Next 50": 50,
  "Nifty Midcap 150": 150,
  "Nifty Smallcap 250": 250,
  "Nifty Microcap 250": 251,
};

// "Custom" holds stocks added by hand that aren't in any NSE index list.
const VIEWS = [...INDICES, "Custom"] as const;
type ViewName = (typeof VIEWS)[number];

export default function Home() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [index, setIndex] = useState<ViewName>("Nifty 50");

  const load = useCallback(async (idx: ViewName) => {
    setLoading(true);
    const [s, w] = await Promise.all([
      apiFetch(`/api/stocks?index=${encodeURIComponent(idx)}`).then((r) =>
        r.json()
      ),
      apiFetch("/api/watchlists").then((r) => r.json()),
    ]);
    setStocks(s);
    setWatchlists(w);
    setLoading(false);
  }, []);

  useEffect(() => {
    load(index);
  }, [load, index]);

  const addToWatchlist = async (wlId: number, symbol: string) => {
    await apiFetch(`/api/watchlists/${wlId}`, {
      method: "PUT",
      body: JSON.stringify({ add: symbol }),
    });
    setMenuFor(null);
    load(index);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Universal Stock List</h1>
          <p className="text-sm text-gray-400">
            {index} · {INDEX_SIZE[index] ? `${INDEX_SIZE[index]} stocks · ` : ""}live quotes & fundamentals
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={index}
            onChange={(e) => setIndex(e.target.value as ViewName)}
            className="input"
          >
            {VIEWS.map((i) => (
              <option key={i} value={i}>
                {i}{INDEX_SIZE[i] ? ` (${INDEX_SIZE[i]})` : ""}
              </option>
            ))}
          </select>
          <button
            onClick={() => load(index)}
            className="text-sm rounded bg-gray-800 hover:bg-gray-700 px-3 py-1.5"
          >
            ↻ Refresh
          </button>
        </div>
      </div>
      {(index === "Nifty Smallcap 250" || index === "Nifty Microcap 250") &&
        loading && (
          <p className="mb-3 text-xs text-amber-400/80">
            Loading {INDEX_SIZE[index]} stocks with fundamentals — the first load
            of a large index can take a while; it's cached afterwards.
          </p>
        )}

      {loading ? (
        <div className="py-20 text-center text-gray-500">Loading market data…</div>
      ) : index === "Custom" && stocks.length === 0 ? (
        <div className="py-16 text-center text-gray-500 text-sm">
          No stocks added yet. Use{" "}
          <span className="text-gray-300">Search any stock</span> when adding a
          transaction in a portfolio — anything you add there shows up here.
        </div>
      ) : (
        <div className="relative">
          <StockTable
            stocks={stocks}
            actionLabel="+ Watchlist"
            onAction={(symbol) =>
              setMenuFor(menuFor === symbol ? null : symbol)
            }
          />
          {menuFor && (
            <div
              className="fixed inset-0 z-20"
              onClick={() => setMenuFor(null)}
            >
              <div
                className="absolute right-8 top-40 w-56 rounded-lg border border-gray-700 bg-gray-900 p-2 shadow-xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="text-xs text-gray-400 px-2 pb-1">
                  Add {menuFor.replace(".NS", "")} to:
                </div>
                {watchlists.length === 0 && (
                  <div className="text-xs text-gray-500 px-2 py-2">
                    No watchlists yet. Create one on the Watchlists page.
                  </div>
                )}
                {watchlists.map((w) => (
                  <button
                    key={w.id}
                    onClick={() => addToWatchlist(w.id, menuFor)}
                    className="block w-full text-left text-sm rounded px-2 py-1.5 hover:bg-gray-800"
                  >
                    {w.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
