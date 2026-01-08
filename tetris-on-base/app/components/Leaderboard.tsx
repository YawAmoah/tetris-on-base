"use client";

import { useState, useEffect } from "react";
import { isAddress } from "viem";
import Image from "next/image";
import { NameDisplay, getENSAvatar } from "./NameDisplay";
import styles from "./Leaderboard.module.css";


interface ScoreEntry {
  address: string;
  score: number;
  level: number;
  linesCleared: number;
  timestamp: number;
  txHash: string;
}

interface LeaderboardEntry extends ScoreEntry {
  displayName: string;
  nameType: 'base' | 'ens' | 'address';
}

function formatAddress(address: string): string {
  if (!address || !isAddress(address)) return address;
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

function LeaderboardRow({ entry, rank }: { entry: LeaderboardEntry | null; rank: number }) {
  const [avatar, setAvatar] = useState<string | null>(null);

  // Determine medal class for top 3 positions
  const getMedalClass = () => {
    if (rank === 1) return styles.gold;
    if (rank === 2) return styles.silver;
    if (rank === 3) return styles.bronze;
    return '';
  };

  const medalClass = getMedalClass();

  // Fetch avatar when entry is available
  useEffect(() => {
    if (!entry || !isAddress(entry.address)) {
      setAvatar(null);
      return;
    }

    let cancelled = false;

    getENSAvatar(entry.address as `0x${string}`)
      .then((avatarUrl) => {
        if (!cancelled && avatarUrl) {
          setAvatar(avatarUrl);
        }
      })
      .catch(() => {
        // Silently fail
      });

    return () => {
      cancelled = true;
    };
  }, [entry?.address]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!entry) {
    return (
      <div className={`${styles.leaderboardRow} ${styles.emptyRow} ${medalClass}`}>
        <div className={`${styles.rank} ${medalClass}`}>#{rank}</div>
        <div className={styles.nameCell}>
          <div className={styles.avatarPlaceholder}>
            <Image
              src="https://pbs.twimg.com/profile_images/1945608199500910592/rnk6ixxH_400x400.jpg"
              alt="Base Logo"
              width={24}
              height={24}
              className={styles.avatarImage}
              unoptimized
            />
          </div>
          <div className={styles.name}>—</div>
        </div>
        <div className={styles.score}>—</div>
      </div>
    );
  }

  return (
    <div className={`${styles.leaderboardRow} ${medalClass}`}>
      <div className={`${styles.rank} ${medalClass}`}>#{rank}</div>
      <div className={styles.nameCell}>
        {avatar ? (
          <div className={styles.avatar}>
            <Image
              src={avatar}
              alt=""
              width={24}
              height={24}
              className={styles.avatarImage}
              unoptimized
            />
          </div>
        ) : (
          <div className={styles.avatarPlaceholder}>
            <Image
              src="https://pbs.twimg.com/profile_images/1945608199500910592/rnk6ixxH_400x400.jpg"
              alt="Base Logo"
              width={24}
              height={24}
              className={styles.avatarImage}
              unoptimized
            />
          </div>
        )}
        <div className={styles.name}>
          {isAddress(entry.address) ? (
            <NameDisplay address={entry.address as `0x${string}`} />
          ) : (
            entry.displayName
          )}
        </div>
      </div>
      <div className={styles.score}>{entry.score.toLocaleString()}</div>
    </div>
  );
}

interface LeaderboardProps {
  onBack?: () => void;
}

export function Leaderboard({ onBack }: LeaderboardProps) {
  const [scores, setScores] = useState<(LeaderboardEntry | null)[]>([]);
  const [_loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setLoading(true);
        
        let entries: ScoreEntry[] = [];
        
        // Fetch scores from global API (primary source)
        try {
          console.log('Leaderboard: Fetching scores from API...');
          const response = await fetch('/api/scores');
          const data = await response.json();
          
          console.log('Leaderboard: API response:', data);
          
          if (data.error) {
            console.error('Leaderboard: API returned error:', data.error);
            if (data.hint) {
              console.error('Leaderboard: Hint:', data.hint);
              setError(data.hint);
            } else {
              setError('Failed to load leaderboard: ' + data.error);
            }
          } else if (data.scores && Array.isArray(data.scores)) {
            entries = [...data.scores];
            console.log('Leaderboard: Loaded', entries.length, 'scores from API');
            console.log('Leaderboard: Score entries:', entries);
          } else {
            console.warn('Leaderboard: API response does not contain scores array:', data);
            if (data.error) {
              setError('Database error: ' + data.error);
            }
          }
        } catch (apiErr) {
          console.error('Leaderboard: API fetch failed:', apiErr);
          const errorMessage = apiErr instanceof Error ? apiErr.message : 'Network error';
          setError('Failed to load leaderboard: ' + errorMessage);
        }
        
        // Deduplicate by address+score+timestamp
        const seen = new Set<string>();
        entries = entries.filter(entry => {
          const key = `${entry.address}-${entry.score}-${entry.timestamp}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        
        // Sort and get top 10
        entries.sort((a, b) => b.score - a.score);
        const top10 = entries.slice(0, 10);
        
        console.log('Leaderboard: Processed entries:', entries.length, 'Top 10:', top10);
        
        // Prepare entries (Name component will resolve Base/ENS names)
        // Filter out scores of 0 - they should not be shown on leaderboard
        const resolvedEntries: LeaderboardEntry[] = top10
          .filter((entry) => entry.address && typeof entry.score === 'number' && entry.score > 0)
          .map((entry) => ({
            ...entry,
            displayName: formatAddress(entry.address),
            nameType: 'address' as const,
          }));
        
        // Always ensure we have exactly 10 entries (fill with nulls if needed)
        const paddedEntries: (LeaderboardEntry | null)[] = [...resolvedEntries];
        while (paddedEntries.length < 10) {
          paddedEntries.push(null);
        }
        
        console.log('Leaderboard: Setting scores to state:', resolvedEntries.length, 'entries (padded to 10)');
        setScores(paddedEntries);
        setError(null);
      } catch (err) {
        console.error('Error fetching leaderboard:', err);
        setError('Failed to load leaderboard');
      } finally {
        setLoading(false);
      }
    };

    let isFetching = false;
    
    const fetchWithDebounce = async () => {
      if (isFetching) return;
      isFetching = true;
      try {
        await fetchLeaderboard();
      } finally {
        isFetching = false;
      }
    };
    
    fetchWithDebounce();
    // Refresh every 30 seconds (reduced from 10 to prevent excessive calls)
    const interval = setInterval(fetchWithDebounce, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // Listen for new score submissions (debounced to prevent excessive calls)
  useEffect(() => {
    let debounceTimer: NodeJS.Timeout | null = null;
    
    const handleScoreSaved = () => {
      // Debounce the refresh to prevent multiple rapid calls
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      
      debounceTimer = setTimeout(() => {
        console.log('Leaderboard: Score saved event received, refreshing...');
        
        if (typeof window === 'undefined') return;
        
        // Fetch fresh scores from API
        fetch('/api/scores')
          .then(res => res.json())
          .then(data => {
            if (data.scores && Array.isArray(data.scores)) {
              const entries = data.scores;
              
              // Sort and get top 10
              const top10 = entries.slice(0, 10);
              
              const resolvedEntries: LeaderboardEntry[] = top10
                .filter((entry: ScoreEntry) => entry.address && typeof entry.score === 'number' && entry.score > 0)
                .map((entry: ScoreEntry) => ({
                  ...entry,
                  displayName: formatAddress(entry.address),
                  nameType: 'address' as const,
                }));
              
              // Always ensure we have exactly 10 entries (fill with nulls if needed)
              const paddedEntries: (LeaderboardEntry | null)[] = [...resolvedEntries];
              while (paddedEntries.length < 10) {
                paddedEntries.push(null);
              }
              
              setScores(paddedEntries);
              console.log('Leaderboard: Updated with', resolvedEntries.length, 'scores (padded to 10)');
            }
          })
          .catch(err => {
            console.error('Leaderboard: Error refreshing from API:', err);
          });
      }, 1000); // 1 second debounce
    };
    
    if (typeof window !== 'undefined') {
      console.log('Leaderboard: Setting up event listeners');
      
      window.addEventListener('scoreSaved', handleScoreSaved);
      // Only listen to storage events from our own domain
      const storageHandler = (e: StorageEvent) => {
        if (e.key === 'scoreSaved' && e.newValue) {
          handleScoreSaved();
        }
      };
      window.addEventListener('storage', storageHandler);
      
      return () => {
        window.removeEventListener('scoreSaved', handleScoreSaved);
        window.removeEventListener('storage', storageHandler);
        if (debounceTimer) {
          clearTimeout(debounceTimer);
        }
      };
    }
  }, []);

  // Don't block rendering if we have scores, even if loading
  // Show error only if there's an error and no scores
  const showError = error && scores.length === 0;

  return (
    <div className={styles.leaderboard}>
      <h2 className={styles.title}>Top 10 Leaderboard</h2>
      {showError ? (
        <div className={styles.error}>{error}</div>
      ) : (
        <div className={styles.table}>
          <div className={styles.header}>
            <div className={styles.headerRank}>#</div>
            <div className={styles.headerName}>PLAYER</div>
            <div className={styles.headerScore}>SCORE</div>
          </div>
          <div className={styles.rows}>
            {scores.length === 0 ? (
              // Show 10 empty rows if no scores at all (including during initial load)
              Array.from({ length: 10 }, (_, index) => (
                <LeaderboardRow key={`empty-${index}`} entry={null} rank={index + 1} />
              ))
            ) : (
              scores.map((entry, index) => (
                <LeaderboardRow 
                  key={entry ? `${entry.address}-${entry.score}-${entry.timestamp}` : `empty-${index}`} 
                  entry={entry} 
                  rank={index + 1} 
                />
              ))
            )}
          </div>
        </div>
      )}
      {onBack && (
        <button 
          onClick={onBack}
          className={styles.backButton}
        >
          ← Back
        </button>
      )}
    </div>
  );
}

