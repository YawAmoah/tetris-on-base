"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { SaveScore } from "./SaveScore";
import styles from "./Tetris.module.css";

// Tetris pieces (tetrominoes) - each piece is defined as an array of positions
// Using original Tetris game colors
const TETROMINOES = [
  {
    // I piece - Cyan
    shape: [[1, 1, 1, 1]],
    color: "#00FFFF", // Cyan
    outlineLight: "#B0FFFF", // Light cyan for top/left
    outlineDark: "#0080FF", // Dark cyan for bottom/right
  },
  {
    // O piece - Yellow
    shape: [
      [1, 1],
      [1, 1],
    ],
    color: "#FFFF00", // Yellow
    outlineLight: "#FFFFB0", // Light yellow for top/left
    outlineDark: "#808000", // Dark yellow/olive for bottom/right
  },
  {
    // T piece - Magenta/Purple
    shape: [
      [0, 1, 0],
      [1, 1, 1],
    ],
    color: "#FF00FF", // Magenta
    outlineLight: "#FFB0FF", // Light magenta for top/left
    outlineDark: "#800080", // Dark magenta/purple for bottom/right
  },
  {
    // S piece - Green
    shape: [
      [0, 1, 1],
      [1, 1, 0],
    ],
    color: "#00FF00", // Green
    outlineLight: "#B0FFB0", // Light green for top/left
    outlineDark: "#008000", // Dark green for bottom/right
  },
  {
    // Z piece - Red
    shape: [
      [1, 1, 0],
      [0, 1, 1],
    ],
    color: "#FF0000", // Red
    outlineLight: "#FFB0B0", // Light red for top/left
    outlineDark: "#800000", // Dark red for bottom/right
  },
  {
    // J piece - Blue
    shape: [
      [1, 0, 0],
      [1, 1, 1],
    ],
    color: "#0000FF", // Blue
    outlineLight: "#B0B0FF", // Light blue for top/left
    outlineDark: "#000080", // Dark blue for bottom/right
  },
  {
    // L piece - Orange
    shape: [
      [0, 0, 1],
      [1, 1, 1],
    ],
    color: "#FF8000", // Orange
    outlineLight: "#FFD0B0", // Light orange for top/left
    outlineDark: "#804000", // Dark orange for bottom/right
  },
];

const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20;

const createBoard = () =>
  Array(BOARD_HEIGHT)
    .fill(null)
    .map(() => Array(BOARD_WIDTH).fill(0));

const createPiece = (type: number) => ({
  shape: TETROMINOES[type].shape,
  x: Math.floor(BOARD_WIDTH / 2) - Math.floor(TETROMINOES[type].shape[0].length / 2),
  y: 0,
  type,
});

interface TetrisProps {
  onGameStartedChange?: (started: boolean) => void;
  startNewGameRef?: React.MutableRefObject<(() => void) | null>;
  showStartButton?: boolean;
  onStartClick?: () => void;
  onLeaderboardClick?: () => void;
}

export default function Tetris({ onGameStartedChange, startNewGameRef, showStartButton, onStartClick, onLeaderboardClick }: TetrisProps) {
  const [board, setBoard] = useState(createBoard());
  const [currentPiece, setCurrentPiece] = useState(() => createPiece(Math.floor(Math.random() * TETROMINOES.length)));
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [level, setLevel] = useState(1);
  const [linesCleared, setLinesCleared] = useState(0);
  const dropTimeRef = useRef<number | null>(null);
  const lastTimeRef = useRef(0);
  const lastBaseScanCallRef = useRef(0);
  const lastLevelRef = useRef(1);

  // Helper function to call BaseScan API (for metrics tracking)
  const callBaseScanAPI = useCallback(async (action: string = 'latest_block') => {
    try {
      // Only call if enough time has passed (throttle to avoid too many calls)
      const now = Date.now();
      if (now - lastBaseScanCallRef.current < 5000) return; // Max once per 5 seconds
      lastBaseScanCallRef.current = now;
      
      await fetch(`/api/basescan?action=${action}`).catch(() => {
        // Silently fail - we don't want API calls to affect gameplay
      });
    } catch {
      // Silently fail
    }
  }, []);

  const rotate = (matrix: number[][]) => {
    const rows = matrix.length;
    const cols = matrix[0].length;
    const rotated: number[][] = [];

    for (let i = 0; i < cols; i++) {
      rotated[i] = [];
      for (let j = rows - 1; j >= 0; j--) {
        rotated[i][rows - 1 - j] = matrix[j][i];
      }
    }

    return rotated;
  };

  const isValidMove = (piece: typeof currentPiece, board: number[][], dx = 0, dy = 0, rotatedShape?: number[][]) => {
    const shape = rotatedShape || piece.shape;
    const newX = piece.x + dx;
    const newY = piece.y + dy;

    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (shape[y][x]) {
          const boardX = newX + x;
          const boardY = newY + y;

          if (
            boardX < 0 ||
            boardX >= BOARD_WIDTH ||
            boardY >= BOARD_HEIGHT ||
            (boardY >= 0 && board[boardY][boardX])
          ) {
            return false;
          }
        }
      }
    }
    return true;
  };

  const placePiece = (piece: typeof currentPiece, board: number[][]) => {
    const newBoard = board.map((row) => [...row]);
    piece.shape.forEach((row, y) => {
      row.forEach((cell, x) => {
        if (cell && piece.y + y >= 0) {
          newBoard[piece.y + y][piece.x + x] = piece.type + 1;
        }
      });
    });
    return newBoard;
  };

  const clearLines = (board: number[][]) => {
    const newBoard = board.filter((row) => row.some((cell) => cell === 0));
    const linesRemoved = board.length - newBoard.length;
    const emptyRows = Array(linesRemoved)
      .fill(null)
      .map(() => Array(BOARD_WIDTH).fill(0));
    return { board: [...emptyRows, ...newBoard], linesRemoved };
  };

  const boardRef = useRef(board);
  useEffect(() => {
    boardRef.current = board;
  }, [board]);

  const dropPiece = useCallback(() => {
    if (isPaused || gameOver || !gameStarted) return;

    setCurrentPiece((prevPiece) => {
      const currentBoard = boardRef.current;
      if (isValidMove(prevPiece, currentBoard, 0, 1)) {
        // Piece can still move down
        return { ...prevPiece, y: prevPiece.y + 1 };
      }

      // Piece has landed, place it on the board
      const newBoard = placePiece(prevPiece, currentBoard);
      const { board: clearedBoard, linesRemoved } = clearLines(newBoard);

      setBoard(clearedBoard);

      if (linesRemoved > 0) {
        setLinesCleared((prevLines) => {
          const newLines = prevLines + linesRemoved;
          const newLevel = Math.floor(newLines / 10) + 1;
          setScore((prevScore) => prevScore + linesRemoved * 100 * level);
          setLevel(newLevel);
          
          // Call BaseScan API when leveling up
          if (newLevel > lastLevelRef.current) {
            lastLevelRef.current = newLevel;
            callBaseScanAPI('gas_price');
          }
          
          return newLines;
        });
      }

      // Check game over
      if (prevPiece.y <= 0) {
        setGameOver(true);
        // Call BaseScan API when game ends
        callBaseScanAPI('block_count');
        return prevPiece;
      }

      // Create new piece
      return createPiece(Math.floor(Math.random() * TETROMINOES.length));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPaused, gameOver, level, gameStarted]);

  useEffect(() => {
    const update = (time: number) => {
      if (!dropTimeRef.current) {
        dropTimeRef.current = time;
      }

      const delta = time - lastTimeRef.current;
      // 8% speed increase per level: each level is 8% faster (interval is 92% of previous)
      const dropInterval = Math.max(50, 1000 * Math.pow(0.92, level - 1));

      if (delta > dropInterval && !isPaused && !gameOver && gameStarted) {
        dropPiece();
        lastTimeRef.current = time;
      }

      dropTimeRef.current = requestAnimationFrame(update);
    };

    dropTimeRef.current = requestAnimationFrame(update);
    return () => {
      if (dropTimeRef.current) {
        cancelAnimationFrame(dropTimeRef.current);
      }
    };
  }, [dropPiece, isPaused, gameOver, level, gameStarted]);

  // Periodic BaseScan API calls during gameplay (every 30 seconds)
  useEffect(() => {
    if (!gameStarted || gameOver || isPaused) return;

    const interval = setInterval(() => {
      callBaseScanAPI('latest_block');
    }, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, [gameStarted, gameOver, isPaused, callBaseScanAPI]);

  const movePiece = useCallback((dx: number) => {
    if (isPaused || gameOver || !gameStarted) return;
    setCurrentPiece((prev) => {
      const currentBoard = boardRef.current;
      if (isValidMove(prev, currentBoard, dx, 0)) {
        return { ...prev, x: prev.x + dx };
      }
      return prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPaused, gameOver, gameStarted]);

  const rotatePiece = useCallback(() => {
    if (isPaused || gameOver || !gameStarted) return;
    setCurrentPiece((prev) => {
      const currentBoard = boardRef.current;
      const rotated = rotate(prev.shape);
      if (isValidMove(prev, currentBoard, 0, 0, rotated)) {
        return { ...prev, shape: rotated };
      }
      return prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPaused, gameOver, gameStarted]);

  const dropDown = useCallback(() => {
    if (isPaused || gameOver || !gameStarted) return;
    setCurrentPiece((prev) => {
      const currentBoard = boardRef.current;
      let newY = prev.y;
      while (isValidMove({ ...prev, y: newY }, currentBoard, 0, 1)) {
        newY++;
      }
      return { ...prev, y: newY };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPaused, gameOver, gameStarted]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Don't handle keys when overlay is showing
      if (!gameStarted || isPaused || gameOver) {
        // Only allow P key to unpause
        if ((e.key === "p" || e.key === "P") && isPaused) {
          setIsPaused(false);
        }
        return;
      }
      
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        movePiece(-1);
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        movePiece(1);
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        dropPiece();
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        rotatePiece();
      }
      if (e.key === " ") {
        e.preventDefault();
        dropDown();
      }
      if (e.key === "p" || e.key === "P") {
        e.preventDefault();
        setIsPaused((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [gameStarted, isPaused, gameOver, movePiece, rotatePiece, dropDown, dropPiece]);

  const resetGame = () => {
    setBoard(createBoard());
    setCurrentPiece(createPiece(Math.floor(Math.random() * TETROMINOES.length)));
    setScore(0);
    setGameOver(false);
    setIsPaused(false);
    setGameStarted(false);
    setLevel(1);
    setLinesCleared(0);
    lastLevelRef.current = 1;
    lastBaseScanCallRef.current = 0;
  };

  const startNewGame = useCallback(() => {
    setBoard(createBoard());
    setCurrentPiece(createPiece(Math.floor(Math.random() * TETROMINOES.length)));
    setScore(0);
    setGameOver(false);
    setIsPaused(false);
    setGameStarted(true);
    setLevel(1);
    setLinesCleared(0);
    lastLevelRef.current = 1;
    lastBaseScanCallRef.current = 0;
    
    // Call BaseScan API when game starts
    callBaseScanAPI('latest_block');
  }, [callBaseScanAPI]);

  // Expose startNewGame to parent via ref
  useEffect(() => {
    if (startNewGameRef) {
      startNewGameRef.current = startNewGame;
    }
  }, [startNewGameRef, startNewGame]);

  // Notify parent of game started state changes
  useEffect(() => {
    if (onGameStartedChange) {
      onGameStartedChange(gameStarted);
    }
  }, [gameStarted, onGameStartedChange]);

  const [isMounted, setIsMounted] = useState(false);
  
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const renderCell = (cell: number, rowIndex: number, colIndex: number) => {
    // Only check current piece after mount to prevent hydration mismatch
    const isCurrentPiece = isMounted && gameStarted &&
      currentPiece.shape.some((row, y) =>
        row.some((val, x) => {
          const boardX = currentPiece.x + x;
          const boardY = currentPiece.y + y;
          return val && boardY === rowIndex && boardX === colIndex && boardY >= 0;
        })
      ) && !gameOver;

    if (cell || (isMounted && isCurrentPiece)) {
      const pieceIndex = isMounted && isCurrentPiece ? currentPiece.type : cell - 1;
      const piece = TETROMINOES[pieceIndex];
      
      return (
        <div
          key={`${rowIndex}-${colIndex}`}
          className={`${styles.cell} ${styles.filled} ${isMounted && isCurrentPiece ? styles.currentPiece : ""}`}
          style={isMounted ? {
            backgroundColor: isCurrentPiece
              ? piece.color
              : piece.color,
            '--outline-light': piece.outlineLight,
            '--outline-dark': piece.outlineDark,
          } as React.CSSProperties : cell ? {
            backgroundColor: piece.color,
            '--outline-light': piece.outlineLight,
            '--outline-dark': piece.outlineDark,
          } as React.CSSProperties : {}}
          suppressHydrationWarning
        >
          {(cell || (isMounted && isCurrentPiece)) && (
            <Image
              src="https://pbs.twimg.com/profile_images/1945608199500910592/rnk6ixxH_400x400.jpg"
              alt="Logo"
              width={20}
              height={20}
              className={styles.logoCell}
              unoptimized
              priority={false}
            />
          )}
        </div>
      );
    }

    return <div key={`${rowIndex}-${colIndex}`} className={styles.cell} suppressHydrationWarning />;
  };

  return (
    <div className={styles.tetrisContainer}>
      <div className={styles.gameInfo}>
        <div className={styles.infoBox}>
          <h3>Score</h3>
          <p>{score}</p>
        </div>
        <div className={styles.infoBox}>
          <h3>Level</h3>
          <p>{level}</p>
        </div>
        <div className={styles.infoBox}>
          <h3>Lines</h3>
          <p>{linesCleared}</p>
        </div>
      </div>

      <div className={styles.gameBoardWrapper}>
        <div className={styles.gameBoard}>
          <div className={styles.gameBoardGrid}>
            {board.map((row, rowIndex) => (
              <div key={rowIndex} className={styles.row}>
                {row.map((cell, colIndex) => renderCell(cell, rowIndex, colIndex))}
              </div>
            ))}
            {showStartButton && (
              <>
                <button 
                  onClick={onStartClick} 
                  className={styles.startButtonOverlay}
                >
                  Start New Game
                </button>
                {onLeaderboardClick && (
                  <button 
                    onClick={onLeaderboardClick}
                    className={styles.leaderboardButtonOverlay}
                  >
                    Leaderboard
                  </button>
                )}
              </>
            )}
          </div>
          
          <div className={styles.controls}>
            <div className={styles.controlButtons}>
              <button onClick={() => movePiece(-1)} className={styles.controlBtn}>
                ←
              </button>
              <div className={styles.middleButtons}>
                <button onClick={rotatePiece} className={styles.controlBtn}>
                  ↻
                </button>
                <button onClick={() => movePiece(1)} className={styles.controlBtn}>
                  →
                </button>
              </div>
              <button onClick={dropDown} className={styles.controlBtn}>
                ↓
              </button>
            </div>
          </div>
        </div>
      </div>

      {(gameOver || isPaused) && (
        <div className={styles.overlay}>
          <div className={styles.overlayContent}>
            {gameOver ? (
              <>
                <h2>Game Over</h2>
                <p className={styles.finalScore}>Score: {score.toLocaleString()}</p>
                <SaveScore 
                  score={score} 
                  level={level} 
                  linesCleared={linesCleared} 
                />
                <button onClick={resetGame} className={styles.resetButton}>
                  Home
                </button>
              </>
            ) : (
              <>
                <h2>Paused</h2>
                <button onClick={() => setIsPaused(false)} className={styles.resetButton}>
                  Resume
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

