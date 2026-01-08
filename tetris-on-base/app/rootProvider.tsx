"use client";
import { ReactNode, useEffect } from "react";
import { base } from "wagmi/chains";
import { OnchainKitProvider } from "@coinbase/onchainkit";
import { ensureWalletProviders, detectInjectedWallets } from "@/lib/wallet-detection";
import "@coinbase/onchainkit/styles.css";

export function RootProvider({ children }: { children: ReactNode }) {
  // Suppress expected console warnings in Mini App iframe context
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const originalError = console.error;
      const originalWarn = console.warn;
      
      // Filter out expected origin mismatch warnings (common in iframe contexts)
      console.error = (...args: unknown[]) => {
        const message = args.join(' ');
        if (
          message.includes('origins don\'t match') ||
          message.includes('ERR_BLOCKED_BY_CLIENT') ||
          (message.includes('Failed to fetch') && message.includes('analytics')) ||
          message.includes('401') && message.includes('neynar') ||
          message.includes('solanaActionsContentScript') ||
          (message.includes('duplicate key value violates unique constraint') && message.includes('scores_tx_hash_key'))
        ) {
          // Suppress expected warnings and duplicate score errors (score already saved)
          return;
        }
        originalError.apply(console, args);
      };
      
      console.warn = (...args: unknown[]) => {
        const message = args.join(' ');
        if (
          message.includes('origins don\'t match') ||
          (message.includes('SVG') && message.includes('attribute width')) ||
          (message.includes('SVG') && message.includes('attribute height')) ||
          message.includes('Backpack couldn\'t override') ||
          message.includes('Module not found') && message.includes('async-storage') ||
          message.includes('react-native-async-storage') ||
          message.includes('React DevTools') ||
          message.includes('401') && message.includes('neynar')
        ) {
          // Suppress expected warnings
          return;
        }
        originalWarn.apply(console, args);
      };
      
      return () => {
        console.error = originalError;
        console.warn = originalWarn;
      };
    }
  }, []);

  // Ensure wallet providers are detected on mount
  useEffect(() => {
    ensureWalletProviders();
    
    // Also listen for wallet injection events
    const handleWalletInjection = () => {
      ensureWalletProviders();
      
      // Log detected wallets in development
      if (process.env.NODE_ENV === "development") {
        const wallets = detectInjectedWallets();
        console.log("🔍 Wallet injection detected:", {
          rabby: !!wallets.rabby,
          trustWallet: !!wallets.trustWallet,
          metaMask: !!wallets.metaMask,
        });
      }
    };
    
    window.addEventListener("ethereum#initialized", handleWalletInjection);
    
    // Try again after delays to catch wallets that inject later
    const timeouts = [
      setTimeout(ensureWalletProviders, 500),
      setTimeout(ensureWalletProviders, 1500),
      setTimeout(ensureWalletProviders, 3000),
    ];
    
    return () => {
      window.removeEventListener("ethereum#initialized", handleWalletInjection);
      timeouts.forEach(clearTimeout);
    };
  }, []);

  return (
    <OnchainKitProvider
      apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY}
      chain={base}
      config={{
        appearance: {
          mode: "auto",
        },
        wallet: {
          display: "modal",
          preference: "all", // Show all wallets including injected ones
          // Explicitly enable injected wallets like Rabby and Trust Wallet
          supportedWallets: {
            rabby: true, // Enable Rabby Wallet
            trust: true, // Enable Trust Wallet
            frame: true, // Enable Frame Wallet
          },
        },
      }}
      miniKit={{
        enabled: true,
        autoConnect: true,
        notificationProxyUrl: undefined,
      }}
    >
      {children}
    </OnchainKitProvider>
  );
}
