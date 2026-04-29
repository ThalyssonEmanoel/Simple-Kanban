"use client";

import { SWRConfig } from "swr";
import { swrConfig } from "@/lib/swr-fetcher";

export default function SWRProvider({ children }) {
  return <SWRConfig value={swrConfig}>{children}</SWRConfig>;
}
