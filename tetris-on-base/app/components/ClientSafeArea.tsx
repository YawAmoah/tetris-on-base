"use client";

import { SafeArea } from "@coinbase/onchainkit/minikit";

export function ClientSafeArea({ children }: { children: React.ReactNode }) {
  return <SafeArea>{children}</SafeArea>;
}

