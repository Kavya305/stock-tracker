"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { apiFetch } from "../lib-client";

interface Portfolio {
  id: number;
  name: string;
}

export default function PortfoliosPage() {
  const [lists, setLists] = useState<Portfolio[]>([]);
  const [newName, setNewName] = useState("");

  const load = useCallback(async () => {
    setLists(await apiFetch("/api/portfolios").then((r) => r.json()));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const create = async () => {
    if (!newName.trim()) return;
    const res = await apiFetch("/api/portfolios", {
      method: "POST",
      body: JSON.stringify({ name: newName }),
    });
    if (res.ok) {
      setNewName("");
      load();
    } else {
      alert((await res.json()).error);
    }
  };

  const remove = async (id: number) => {
    if (!confirm("Delete this portfolio and all its transactions?")) return;
    await apiFetch(`/api/portfolios/${id}`, { method: "DELETE" });
    load();
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Portfolios</h1>

      <div className="flex gap-2 mb-6">
        <input
          className="w-64 rounded bg-gray-900 border border-gray-700 px-3 py-1.5 text-sm outline-none focus:border-emerald-500"
          placeholder="New portfolio name…"
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
        <p className="text-gray-500">No portfolios yet. Create one above.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {lists.map((p) => (
            <div
              key={p.id}
              className="rounded-lg border border-gray-800 bg-gray-900/50 p-4 flex items-center justify-between"
            >
              <Link
                href={`/portfolios/${p.id}`}
                className="font-medium hover:text-emerald-400"
              >
                {p.name}
              </Link>
              <button
                onClick={() => remove(p.id)}
                className="text-xs text-gray-500 hover:text-red-400"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
