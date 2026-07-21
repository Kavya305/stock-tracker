"use client";
import { useEffect, useRef, useState } from "react";
import { getActiveProfile, setActiveProfile } from "../lib-client";

interface Profile {
  id: number;
  name: string;
}

export default function ProfileSwitcher() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [active, setActive] = useState(1);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const load = async () => {
    const p: Profile[] = await fetch("/api/profiles").then((r) => r.json());
    setProfiles(p);
  };

  useEffect(() => {
    setActive(getActiveProfile());
    load();
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const switchTo = (id: number) => {
    setActiveProfile(id);
    window.location.reload();
  };

  const create = async () => {
    if (!name.trim()) return;
    const res = await fetch("/api/profiles", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      const c = await res.json();
      setActiveProfile(c.id);
      window.location.reload();
    } else {
      alert((await res.json()).error);
    }
  };

  const remove = async (id: number, pname: string) => {
    if (!confirm(`Delete profile "${pname}" and all of its data?`)) return;
    await fetch(`/api/profiles/${id}`, { method: "DELETE" });
    if (id === active) {
      setActiveProfile(1);
      window.location.reload();
    } else {
      load();
    }
  };

  const activeName =
    profiles.find((p) => p.id === active)?.name ?? "Default";

  return (
    <div className="relative ml-auto" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-sm rounded bg-gray-800 hover:bg-gray-700 px-3 py-1.5"
      >
        <span className="text-gray-400">Profile:</span>
        <span className="font-medium">{activeName}</span>
        <span className="text-xs text-gray-500">▾</span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-60 rounded-lg border border-gray-700 bg-gray-900 p-2 shadow-xl z-30">
          <div className="text-xs text-gray-500 px-2 pb-1">Switch profile</div>
          {profiles.map((p) => (
            <div
              key={p.id}
              className={`group flex items-center justify-between rounded px-2 py-1.5 text-sm ${
                p.id === active ? "bg-emerald-800/40" : "hover:bg-gray-800"
              }`}
            >
              <button
                onClick={() => switchTo(p.id)}
                className="flex-1 text-left"
              >
                {p.name}
                {p.id === active && (
                  <span className="ml-1 text-xs text-emerald-400">● active</span>
                )}
              </button>
              {p.id !== 1 && (
                <button
                  onClick={() => remove(p.id, p.name)}
                  className="text-xs text-gray-600 hover:text-red-400 px-1 opacity-0 group-hover:opacity-100"
                  title="Delete profile"
                >
                  ✕
                </button>
              )}
            </div>
          ))}

          <div className="border-t border-gray-800 mt-2 pt-2">
            {creating ? (
              <div className="flex gap-1">
                <input
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && create()}
                  placeholder="Profile name…"
                  className="flex-1 rounded bg-gray-800 border border-gray-700 px-2 py-1 text-sm outline-none focus:border-emerald-500"
                />
                <button
                  onClick={create}
                  className="text-sm rounded bg-emerald-700 hover:bg-emerald-600 px-2"
                >
                  Add
                </button>
              </div>
            ) : (
              <button
                onClick={() => setCreating(true)}
                className="w-full text-left text-sm rounded px-2 py-1.5 text-emerald-400 hover:bg-gray-800"
              >
                + New profile
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
