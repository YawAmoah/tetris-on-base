"use client";

import { ReactNode } from "react";
import { RootProvider } from "../rootProvider";
import { SafeArea } from "@coinbase/onchainkit/minikit";

export function ClientProviders({ children }: { children: ReactNode }) {
  // Always render the same structure to prevent hydration mismatch
  // The providers are safe to render on both server and client now
  // thanks to the localStorage polyfill
  return (
    <RootProvider>
      <div suppressHydrationWarning>
        <SafeArea>{children}</SafeArea>
      </div>
    </RootProvider>
  );
}

