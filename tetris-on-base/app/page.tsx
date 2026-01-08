"use client";
import { useEffect, useState, useRef } from "react";
import { Wallet } from "@coinbase/onchainkit/wallet";
import { useMiniKit } from "@coinbase/onchainkit/minikit";
import { useAccount } from "wagmi";
import Tetris from "./components/Tetris";
import { Leaderboard } from "./components/Leaderboard";
import { TetrisTitle } from "./components/TetrisTitle";
import { NetworkIndicator } from "./components/NetworkIndicator";
import AnimatedBackground from "./components/AnimatedBackground";
import styles from "./page.module.css";

export default function Home() {
  const { setMiniAppReady, isMiniAppReady } = useMiniKit();
  const { isConnected } = useAccount();
  const [gameStarted, setGameStarted] = useState(false);
  const [currentView, setCurrentView] = useState<'game' | 'leaderboard'>('game');
  const startNewGameRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (setMiniAppReady && !isMiniAppReady) {
      setMiniAppReady();
    }
  }, [setMiniAppReady, isMiniAppReady]);

  const handleStartNewGame = () => {
    if (startNewGameRef.current) {
      startNewGameRef.current();
    }
  };

  return (
    <div className={styles.container}>
      <AnimatedBackground />
      <header className={styles.headerWrapper}>
        <div className={styles.headerRight}>
          {isConnected && <NetworkIndicator />}
          <Wallet />
        </div>
      </header>

      <div className={styles.content}>
        <div className={styles.combinedBox}>
          <TetrisTitle />
          {currentView === 'game' ? (
            <Tetris 
              onGameStartedChange={setGameStarted}
              startNewGameRef={startNewGameRef}
              showStartButton={!gameStarted}
              onStartClick={handleStartNewGame}
              onLeaderboardClick={() => setCurrentView('leaderboard')}
            />
          ) : (
            <div className={styles.leaderboardSection}>
              <Leaderboard onBack={() => setCurrentView('game')} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
