"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useAccount, useSwitchChain } from "wagmi";
import { base } from "wagmi/chains";
import styles from "./NetworkIndicator.module.css";

export function NetworkIndicator() {
  const { isConnected } = useAccount();
  const { switchChain } = useSwitchChain();
  const [isSwitching, setIsSwitching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actualChainId, setActualChainId] = useState<number | null>(null);

  // Query the actual wallet chain ID directly from the provider
  useEffect(() => {
    if (!isConnected) {
      setActualChainId(null);
      return;
    }

    const fetchChainId = async () => {
      try {
        if (typeof window !== 'undefined' && window.ethereum && typeof window.ethereum.request === 'function') {
          // Get the actual chain ID from the wallet provider
          const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' }) as string;
          const chainId = parseInt(chainIdHex, 16);
          setActualChainId(chainId);
          
          if (process.env.NODE_ENV === 'development') {
            console.log('NetworkIndicator: Wallet chainId:', chainId, 'base.id:', base.id, 'isOnBase:', chainId === base.id);
          }
        }
      } catch (err) {
        console.error('Error fetching chain ID:', err);
      }
    };

    fetchChainId();

    // Store reference to ethereum provider to avoid issues during cleanup
    const ethereum = window.ethereum as { 
      request?: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on?: (event: string, handler: (...args: unknown[]) => void) => void;
      removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
    } | undefined;

    // Listen for chain changes
    const handleChainChanged = (...args: unknown[]) => {
      const chainIdHex = args[0] as string;
      const chainId = parseInt(chainIdHex, 16);
      setActualChainId(chainId);
      if (process.env.NODE_ENV === 'development') {
        console.log('NetworkIndicator: Chain changed to:', chainId);
      }
    };

    if (ethereum && typeof ethereum.on === 'function') {
      ethereum.on('chainChanged', handleChainChanged);
    }

    return () => {
      // Safely remove listener if ethereum provider still exists
      try {
        if (ethereum && typeof ethereum.removeListener === 'function') {
          ethereum.removeListener('chainChanged', handleChainChanged);
        }
      } catch (err) {
        // Silently fail if removal fails (provider might be disconnected)
        console.debug('NetworkIndicator: Error removing chainChanged listener:', err);
      }
    };
  }, [isConnected]);

  const isOnBase = actualChainId === base.id;

  // Don't render if wallet is not connected
  if (!isConnected) {
    return null;
  }

  const handleSwitchToBase = async () => {
    try {
      setIsSwitching(true);
      setError(null);

      // First, try to switch to Base network
      try {
        await switchChain({ chainId: base.id });
        setIsSwitching(false);
      } catch (switchError: unknown) {
        // Check if the error indicates the chain is not added (error code 4902)
        const switchErr = switchError as { code?: number; shortMessage?: string; message?: string };
        const isChainNotAdded =
          switchErr?.code === 4902 ||
          switchErr?.shortMessage?.includes("Unrecognized chain") ||
          switchErr?.shortMessage?.includes("Unsupported chain") ||
          switchErr?.message?.includes("Unrecognized chain") ||
          switchErr?.message?.includes("Unsupported chain");

        if (isChainNotAdded && typeof window !== 'undefined' && window.ethereum && typeof window.ethereum.request === 'function') {
          // Try to add Base network first using window.ethereum.request
          try {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: `0x${base.id.toString(16)}`,
                chainName: base.name,
                nativeCurrency: base.nativeCurrency,
                rpcUrls: base.rpcUrls.default.http,
                blockExplorerUrls: base.blockExplorers?.default ? [base.blockExplorers.default.url] : undefined,
              }],
            } as { method: string; params: unknown[] });
            // Wait a moment, then try switching again
            await new Promise((resolve) => setTimeout(resolve, 500));
            await switchChain({ chainId: base.id });
            setIsSwitching(false);
          } catch (addError: unknown) {
            setIsSwitching(false);
            const addErr = addError as { name?: string; code?: number; message?: string; shortMessage?: string };
            if (
              addErr?.name === "UserRejectedRequestError" ||
              addErr?.code === 4001
            ) {
              setError("Adding Base network was cancelled");
            } else {
              setError(
                `Failed to add Base network: ${addErr?.message || addErr?.shortMessage || "Unknown error"}`
              );
            }
            // Clear error after 3 seconds
            setTimeout(() => setError(null), 3000);
          }
        } else {
          throw switchError;
        }
      }
    } catch (switchError: unknown) {
      setIsSwitching(false);
      const switchErr = switchError as { name?: string; code?: number; message?: string; shortMessage?: string };
      if (
        switchErr?.name === "UserRejectedRequestError" ||
        switchErr?.code === 4001
      ) {
        setError("Network switch was cancelled");
      } else {
        const errorMessage =
          switchErr?.message || switchErr?.shortMessage || "Failed to switch network";
        setError(`Unable to switch: ${errorMessage}`);
      }
      // Clear error after 3 seconds
      setTimeout(() => setError(null), 3000);
    }
  };

  if (isOnBase) {
    return (
      <div className={styles.networkIndicator}>
        <div className={styles.baseBadge}>
          <Image
            src="https://pbs.twimg.com/profile_images/1945608199500910592/rnk6ixxH_400x400.jpg"
            alt="Base"
            width={16}
            height={16}
            className={styles.baseLogo}
            unoptimized
          />
          <span className={styles.baseText}>Base</span>
        </div>
        {error && (
          <div className={styles.errorTooltip}>
            {error}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={styles.networkIndicator}>
      <button
        onClick={handleSwitchToBase}
        disabled={isSwitching}
        className={styles.switchButton}
        type="button"
      >
        {isSwitching ? (
          <>
            <div className={styles.spinner}></div>
            <span>Switching...</span>
          </>
        ) : (
          <>
            <Image
              src="https://pbs.twimg.com/profile_images/1945608199500910592/rnk6ixxH_400x400.jpg"
              alt="Base"
              width={16}
              height={16}
              className={styles.baseLogo}
              unoptimized
            />
            <span>Switch to Base</span>
          </>
        )}
      </button>
      {error && (
        <div className={styles.errorTooltip}>
          {error}
        </div>
      )}
    </div>
  );
}

