"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useAccount, useSendTransaction, useWaitForTransactionReceipt } from "wagmi";
import { base } from "wagmi/chains";
import { encodePacked } from "viem";
import styles from "./SaveScore.module.css";

interface SaveScoreProps {
  score: number;
  level: number;
  linesCleared: number;
}

export function SaveScore({ score, level, linesCleared }: SaveScoreProps) {
  const [error, setError] = useState<string | null>(null);
  const { address, isConnected } = useAccount();
  const [actualChainId, setActualChainId] = useState<number | null>(null);
  
  // Query the actual wallet chain ID directly from the provider
  useEffect(() => {
    if (!isConnected || !address) {
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
            console.log('SaveScore: Wallet chainId:', chainId, 'base.id:', base.id, 'isOnBase:', chainId === base.id);
          }
        }
      } catch (err) {
        console.error('SaveScore: Error fetching chain ID:', err);
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
      setError(null); // Clear any previous errors when chain changes
      if (process.env.NODE_ENV === 'development') {
        console.log('SaveScore: Chain changed to:', chainId);
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
        console.debug('SaveScore: Error removing chainChanged listener:', err);
      }
    };
  }, [isConnected, address]);
  
  // Check if user is on Base network
  const isOnBase = actualChainId === base.id;

  // Create transaction data
  const transactionData = useMemo(() => {
    if (!address) return null;

    try {
      const timestamp = BigInt(Math.floor(Date.now() / 1000));
      const data = encodePacked(
        ["uint256", "uint8", "uint16", "uint64", "string"],
        [
          BigInt(score),
          level,
          linesCleared,
          timestamp,
          `Base Tetris Score: ${score} | Level: ${level} | Lines: ${linesCleared}`
        ]
      );

      return {
        to: address as `0x${string}`,
        data: data as `0x${string}`,
        value: BigInt(0),
      };
    } catch (err) {
      console.error("Error creating score transaction:", err);
      return null;
    }
  }, [address, score, level, linesCleared]);

  // Use wagmi hooks for transaction
  const { 
    sendTransaction, 
    data: hash, 
    isPending: isSending,
    error: sendError 
  } = useSendTransaction();

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  // Track confirmation status and whether score was saved
  const [verifiedConfirmed, setVerifiedConfirmed] = useState(false);
  const [scoreSaved, setScoreSaved] = useState(false);
  
  // Function to save score to API (called once when transaction confirms)
  const saveScoreToAPI = useCallback(async () => {
    // Don't save scores of 0
    if (score === 0) {
      console.log('SaveScore: Skipping save - score is 0');
      return;
    }

    if (!hash || !address || scoreSaved) return;
    
    try {
      const scoreEntry = {
        address: address.toLowerCase(), // Normalize address
        score,
        level,
        linesCleared,
        timestamp: Math.floor(Date.now() / 1000),
        txHash: hash,
      };
      
      console.log('SaveScore: Submitting score to API:', scoreEntry);
      
      // Submit to API endpoint
      const response = await fetch('/api/scores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(scoreEntry),
      });
      
      const result = await response.json();
      
      if (response.ok) {
        console.log('SaveScore: Score saved to global leaderboard!', result);
        setScoreSaved(true);
        // Dispatch event to refresh leaderboard
        setTimeout(() => {
          console.log('SaveScore: Dispatching scoreSaved event');
          window.dispatchEvent(new Event('scoreSaved'));
        }, 500);
      } else {
        // Check if error is due to duplicate transaction hash (score already saved)
        const errorMessage = result.error || '';
        const isDuplicateError = errorMessage.includes('duplicate key value violates unique constraint') && 
                                 errorMessage.includes('scores_tx_hash_key');
        
        if (isDuplicateError) {
          // Score already saved - treat as success
          console.log('SaveScore: Score already exists in leaderboard (duplicate transaction hash)');
          setScoreSaved(true);
          // Dispatch event to refresh leaderboard
          setTimeout(() => {
            console.log('SaveScore: Dispatching scoreSaved event');
            window.dispatchEvent(new Event('scoreSaved'));
          }, 500);
        } else {
          // Actual error - log it
          console.error('SaveScore: Failed to save score:', result.error);
          console.error('SaveScore: Error details:', result);
        }
      }
    } catch (err) {
      console.error('SaveScore: Error saving score to API:', err);
    }
  }, [hash, address, score, level, linesCleared, scoreSaved]);
  
  // When wagmi confirms, immediately show as confirmed and save score
  useEffect(() => {
    if (isConfirmed && !verifiedConfirmed && hash && address) {
      console.log('SaveScore: Wagmi confirmed transaction');
      setVerifiedConfirmed(true);
      
      // Save score to API
      if (typeof window !== 'undefined') {
        saveScoreToAPI();
      }
    }
  }, [isConfirmed, verifiedConfirmed, hash, address, saveScoreToAPI]);

  // Also verify on-chain for extra confirmation using BaseScan API
  useEffect(() => {
    // Start checking once we have a transaction hash
    if (!hash || verifiedConfirmed) return;

    const verifyOnChain = async () => {
      try {
        // Use BaseScan API via server route (secret key stays on server)
        const baseScanResponse = await fetch(
          `/api/basescan?action=tx_receipt&txhash=${hash}`
        );
        
        const baseScanData = await baseScanResponse.json();
        console.log('SaveScore: BaseScan check result:', baseScanData);
        
        if (baseScanData.success && baseScanData.result) {
          const status = baseScanData.result.status;
          // Status can be '0x1', '0x01', '1', or 1
          if (status === '0x1' || status === '0x01' || status === '1' || status === 1) {
            console.log('SaveScore: Transaction confirmed via BaseScan');
            setVerifiedConfirmed(true);
            
            // Also save score if not already saved (in case wagmi didn't trigger)
            if (typeof window !== 'undefined' && address && !scoreSaved) {
              saveScoreToAPI();
            }
            return;
          } else if (status === '0x0' || status === '0') {
            setError('Transaction failed on-chain');
            return;
          }
        }

        // Fallback to RPC if BaseScan doesn't have the transaction yet
        const rpcResponse = await fetch('https://base-mainnet.g.alchemy.com/v2/demo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_getTransactionReceipt',
            params: [hash],
            id: 1,
          }),
        });
        
        const rpcData = await rpcResponse.json();
        console.log('SaveScore: RPC check result:', rpcData);
        
        if (rpcData.result) {
          const status = rpcData.result.status;
          if (status === '0x1' || status === '0x01' || status === '1' || status === 1) {
            console.log('SaveScore: Transaction confirmed via RPC');
            setVerifiedConfirmed(true);
            
            if (typeof window !== 'undefined' && address && !scoreSaved) {
              saveScoreToAPI();
            }
          } else if (status === '0x0' || status === '0') {
            setError('Transaction failed on-chain');
          }
        }
      } catch (err) {
        console.log('SaveScore: Transaction check error (non-critical):', err);
      }
    };

    // Check immediately, then every 2 seconds (BaseScan API will be called each time)
    verifyOnChain();
    const interval = setInterval(verifyOnChain, 2000);

    return () => clearInterval(interval);
  }, [hash, verifiedConfirmed, address, scoreSaved, saveScoreToAPI]);

  // Track transaction status
  const txStatus = verifiedConfirmed ? 'confirmed' : (isConfirming || isSending ? 'pending' : null);

  // Handle send errors
  useEffect(() => {
    if (sendError) {
      const errorMessage = sendError instanceof Error 
        ? sendError.message 
        : 'Transaction failed. Make sure you have Base ETH for gas fees.';
      setError(errorMessage);
    }
  }, [sendError]);

  const handleSave = () => {
    // Don't allow saving scores of 0
    if (score === 0) {
      setError('Cannot save a score of 0');
      return;
    }

    if (!transactionData) {
      setError('Failed to create transaction');
      return;
    }
    
    // CRITICAL: Check if user is on the correct network (Base) - prevent transactions on wrong network
    if (actualChainId !== null && !isOnBase) {
      setError(`You are connected to the wrong network (Chain ID: ${actualChainId}). Please switch to Base network (Chain ID: ${base.id}) using the network indicator in the header.`);
      return;
    }
    
    // If chain ID is not yet detected, wait for it
    if (actualChainId === null) {
      setError('Detecting network... Please wait.');
      return;
    }
    
    setError(null);
    setVerifiedConfirmed(false); // Reset verification when starting new transaction
    sendTransaction({ ...transactionData });
  };

  if (!address) {
    return (
      <div className={styles.saveContainer}>
        <p className={styles.connectWarning}>Connect your wallet to save your score on-chain</p>
      </div>
    );
  }

  return (
    <div className={styles.saveContainer}>
      {txStatus === 'confirmed' && hash ? (
        <div className={styles.confirmed}>
          <div className={styles.checkmark}>✓</div>
          <p className={styles.confirmedTitle}>Score Saved On-Chain</p>
          <a
            href={`https://basescan.org/tx/${hash}`}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.viewLink}
          >
            View on BaseScan →
          </a>
        </div>
      ) : txStatus === 'pending' && hash ? (
        <div className={styles.pending}>
          <div className={styles.spinner}></div>
          <p className={styles.pendingText}>Confirming on-chain...</p>
          <a
            href={`https://basescan.org/tx/${hash}`}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.viewLink}
          >
            View on BaseScan →
          </a>
        </div>
      ) : (
        <>
          {!isOnBase && actualChainId !== null ? (
            <div className={styles.networkWarning}>
              <p>⚠️ Switch to Base Network by clicking the highlighted button in the upper right corner</p>
            </div>
          ) : (
            <button
              onClick={handleSave}
              disabled={isSending || !transactionData || !isOnBase || actualChainId === null}
              className={styles.saveButton}
            >
              {isSending ? "Sending..." : "Save Score On-Chain"}
            </button>
          )}
          {error && (
            <div className={styles.error}>
              <p>{error}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}


