"use client";

// Default fetcher used by SWR everywhere. Throws on non-2xx so SWR exposes the
// error via its `error` field; otherwise parses JSON.
export async function fetcher(url, init) {
  const res = await fetch(url, init);
  if (!res.ok) {
    const err = new Error(`Request failed: ${res.status}`);
    err.status = res.status;
    try {
      err.body = await res.json();
    } catch {
      err.body = null;
    }
    throw err;
  }
  return res.json();
}

// Shared SWR config — keepPreviousData makes back/forward navigation feel
// instant; revalidateOnFocus refreshes stale data when the user returns;
// dedupingInterval coalesces bursts of identical fetches.
export const swrConfig = {
  fetcher,
  revalidateOnFocus: true,
  revalidateOnReconnect: true,
  keepPreviousData: true,
  dedupingInterval: 4000,
  shouldRetryOnError: false,
};
