/**
 * Initialize wallet detection as early as possible
 * This script runs before React to ensure wallets are detected
 */
import { ensureWalletProviders, detectInjectedWallets } from "@/lib/wallet-detection";

// Run immediately
if (typeof window !== "undefined") {
  ensureWalletProviders();

  // Log detected wallets for debugging
  if (process.env.NODE_ENV === "development") {
    const wallets = detectInjectedWallets();
    console.log("🔍 Detected wallets:", {
      rabby: !!wallets.rabby,
      trustWallet: !!wallets.trustWallet,
      metaMask: !!wallets.metaMask,
      ethereum: !!wallets.ethereum,
    });
  }

  // Listen for wallet injection events
  window.addEventListener("ethereum#initialized", () => {
    ensureWalletProviders();
    if (process.env.NODE_ENV === "development") {
      console.log("✅ Wallet provider initialized");
    }
  });

  // Also check periodically for wallets that inject late
  let checkCount = 0;
  const maxChecks = 5;
  const checkInterval = setInterval(() => {
    checkCount++;
    ensureWalletProviders();
    
    if (checkCount >= maxChecks) {
      clearInterval(checkInterval);
    }
  }, 500);
}

