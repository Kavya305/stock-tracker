"use client";
import { useEffect, useState } from "react";
import { UNIVERSE, INDICES } from "@/lib/universe";
import { apiFetch } from "../lib-client";

interface CustomStock {
  symbol: string;
  name: string;
  sector: string;
}
interface SearchHit {
  symbol: string;
  name: string;
  exchange: string;
  inUniverse: boolean;
}

/**
 * Picks a stock either from the NSE index universe or, via search, any listed
 * stock (which then gets saved so it shows up everywhere else too).
 */
export default function StockPicker({
  value,
  onChange,
  className = "",
}: {
  value: string;
  onChange: (symbol: string) => void;
  className?: string;
}) {
  const [mode, setMode] = useState<"list" | "search">("list");
  const [custom, setCustom] = useState<CustomStock[]>([]);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCustom = async () => {
    const c = await apiFetch("/api/custom-stocks").then((r) => r.json());
    setCustom(Array.isArray(c) ? c : []);
  };

  useEffect(() => {
    loadCustom();
  }, []);

  // Debounced search
  useEffect(() => {
    if (mode !== "search" || query.trim().length < 2) {
      setHits([]);
      return;
    }
    setSearching(true);
    const t = setTimeout(async () => {
      const r = await apiFetch(
        `/api/stocks/search?q=${encodeURIComponent(query)}`
      ).then((res) => res.json());
      setHits(Array.isArray(r) ? r : []);
      setSearching(false);
    }, 350);
    return () => clearTimeout(t);
  }, [query, mode]);

  const pick = async (hit: SearchHit) => {
    setError(null);
    if (hit.inUniverse) {
      onChange(hit.symbol);
      setMode("list");
      setQuery("");
      return;
    }
    setAdding(true);
    const res = await apiFetch("/api/custom-stocks", {
      method: "POST",
      body: JSON.stringify({ symbol: hit.symbol }),
    });
    setAdding(false);
    if (!res.ok) {
      setError((await res.json()).error ?? "Could not add that stock");
      return;
    }
    await loadCustom();
    onChange(hit.symbol);
    setMode("list");
    setQuery("");
  };

  return (
    <div className={className}>
      <div className="flex gap-1 mb-1">
        <button
          type="button"
          onClick={() => setMode("list")}
          className={`text-[11px] px-2 py-0.5 rounded ${
            mode === "list" ? "bg-emerald-700" : "bg-gray-800 hover:bg-gray-700"
          }`}
        >
          From list
        </button>
        <button
          type="button"
          onClick={() => setMode("search")}
          className={`text-[11px] px-2 py-0.5 rounded ${
            mode === "search" ? "bg-emerald-700" : "bg-gray-800 hover:bg-gray-700"
          }`}
        >
          Search any stock
        </button>
      </div>

      {mode === "list" ? (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="input w-56"
        >
          {custom.length > 0 && (
            <optgroup label="My added stocks">
              {custom.map((c) => (
                <option key={c.symbol} value={c.symbol}>
                  {c.name}
                </option>
              ))}
            </optgroup>
          )}
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
      ) : (
        <div className="relative w-56">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Company or symbol…"
            className="input w-56"
          />
          {(searching || adding || hits.length > 0 || error) && (
            <div className="absolute z-30 mt-1 w-72 rounded-lg border border-gray-700 bg-gray-900 shadow-xl max-h-72 overflow-y-auto">
              {adding && (
                <div className="px-3 py-2 text-xs text-gray-400">Adding…</div>
              )}
              {searching && !adding && (
                <div className="px-3 py-2 text-xs text-gray-400">Searching…</div>
              )}
              {error && (
                <div className="px-3 py-2 text-xs text-red-400">{error}</div>
              )}
              {!adding &&
                hits.map((h) => (
                  <button
                    key={h.symbol}
                    type="button"
                    onClick={() => pick(h)}
                    className="block w-full text-left px-3 py-2 hover:bg-gray-800"
                  >
                    <div className="text-sm">{h.name}</div>
                    <div className="text-xs text-gray-500">
                      {h.symbol} · {h.exchange}
                      {h.inUniverse && (
                        <span className="text-emerald-500"> · in main list</span>
                      )}
                    </div>
                  </button>
                ))}
              {!searching && !adding && query.length >= 2 && hits.length === 0 && (
                <div className="px-3 py-2 text-xs text-gray-500">
                  Nothing found. NSE symbols end in .NS, BSE in .BO
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
