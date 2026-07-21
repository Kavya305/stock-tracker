"use client";
import { useEffect, useState, useCallback } from "react";
import StockTable, { Stock } from "../components/StockTable";
import { apiFetch } from "../lib-client";

interface Watchlist {
  id: number;
  name: string;
  symbols: string[];
}

export default function WatchlistsPage() {
  const [lists, setLists] = useState<Watchlist[]>([]);
  const [active, setActive] = useState<number | null>(null);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [newName, setNewName] = useState("");
  const [loadingStocks, setLoadingStocks] = useState(false);

  const loadLists = useCallback(async () => {
    const w: Watchlist[] = await apiFetch("/api/watchlists").then((r) => r.json());
    setLists(w);
    setActive((cur) => cur ?? (w[0]?.id ?? null));
  }, []);

  useEffect(() => {
    loadLists();
  }, [loadLists]);

  const loadStocks = useCallback(async (id: number) => {
    setLoadingStocks(true);
    const data = await apiFetch(`/api/watchlists/${id}`).then((r) => r.json());
    setStocks(data.stocks ?? []);
    setLoadingStocks(false);
  }, []);

  useEffect(() => {
    if (active != null) loadStocks(active);
  }, [active, loadStocks]);

  const create = async () => {
    if (!newName.trim()) return;
    const res = await apiFetch("/api/watchlists", {
      method: "POST",
      body: JSON.stringify({ name: newName }),
    });
    if (res.ok) {
      const created = await res.json();
      setNewName("");
      await loadLists();
      setActive(created.id);
    } else {
      alert((await res.json()).error);
    }
  };

  const remove = async (symbol: string) => {
    if (active == null) return;
    await apiFetch(`/api/watchlists/${active}`, {
      method: "PUT",
      body: JSON.stringify({ remove: symbol }),
    });
    loadStocks(active);
  };

  const deleteList = async (id: number) => {
    if (!confirm("Delete this watchlist?")) return;
    await apiFetch(`/api/watchlists/${id}`, { method: "DELETE" });
    setActive(null);
    setStocks([]);
    loadLists();
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Watchlists</h1>

      <div className="flex gap-2 mb-6">
        <input
          className="w-64 rounded bg-gray-900 border border-gray-700 px-3 py-1.5 text-sm outline-none focus:border-emerald-500"
          placeholder="New watchlist name…"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && create()}
        />
        <button
          onClick={create}
          className="text-sm rounded bg-emerald-700 hover:bg-emerald-600 px-4 py-1.5"
        >
          Create
        </button>
      </div>

      {lists.length === 0 ? (
        <p className="text-gray-500">
          No watchlists yet. Create one above, then add stocks from the Stocks page.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2 mb-5">
            {lists.map((l) => (
              <div key={l.id} className="flex items-center">
                <button
                  onClick={() => setActive(l.id)}
                  className={`text-sm rounded-l px-3 py-1.5 ${
                    active === l.id
                      ? "bg-emerald-700"
                      : "bg-gray-800 hover:bg-gray-700"
                  }`}
                >
                  {l.name}{" "}
                  <span className="text-xs opacity-70">({l.symbols.length})</span>
                </button>
                <button
                  onClick={() => deleteList(l.id)}
                  className={`text-sm rounded-r px-2 py-1.5 ${
                    active === l.id
                      ? "bg-emerald-800 hover:bg-red-800"
                      : "bg-gray-900 hover:bg-red-900"
                  }`}
                  title="Delete watchlist"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          {loadingStocks ? (
            <div className="py-16 text-center text-gray-500">Loading…</div>
          ) : stocks.length === 0 ? (
            <p className="text-gray-500">
              This watchlist is empty. Add stocks from the Stocks page using the
              “+ Watchlist” button.
            </p>
          ) : (
            <StockTable stocks={stocks} actionLabel="Remove" onAction={remove} />
          )}
        </>
      )}
    </div>
  );
}
