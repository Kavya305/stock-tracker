"use client";

const KEY = "activeProfileId";

export function getActiveProfile(): number {
  if (typeof window === "undefined") return 1;
  return Number(localStorage.getItem(KEY) || "1");
}

export function setActiveProfile(id: number) {
  localStorage.setItem(KEY, String(id));
}

// Wrapper around fetch that tags each request with the active profile so the
// server returns only that profile's watchlists / portfolios.
export function apiFetch(url: string, opts: RequestInit = {}) {
  const headers = new Headers(opts.headers);
  headers.set("x-profile-id", String(getActiveProfile()));
  return fetch(url, { ...opts, headers });
}
