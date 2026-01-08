"use client";

import styles from "./TetrisTitle.module.css";

// Define letter patterns using grid cells (1 = filled square, 0 = empty)
const LETTER_PATTERNS: Record<string, number[][]> = {
  T: [
    [1, 1, 1, 1, 1],
    [0, 0, 1, 0, 0],
    [0, 0, 1, 0, 0],
    [0, 0, 1, 0, 0],
    [0, 0, 1, 0, 0],
  ],
  E: [
    [1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0],
    [1, 1, 1, 1, 0],
    [1, 0, 0, 0, 0],
    [1, 1, 1, 1, 1],
  ],
  R: [
    [1, 1, 1, 1, 0],
    [1, 0, 0, 0, 1],
    [1, 1, 1, 1, 0],
    [1, 0, 0, 1, 0],
    [1, 0, 0, 0, 1],
  ],
  I: [
    [1, 1, 1, 1, 1],
    [0, 0, 1, 0, 0],
    [0, 0, 1, 0, 0],
    [0, 0, 1, 0, 0],
    [1, 1, 1, 1, 1],
  ],
  S: [
    [0, 1, 1, 1, 1],
    [1, 0, 0, 0, 0],
    [0, 1, 1, 1, 0],
    [0, 0, 0, 0, 1],
    [1, 1, 1, 1, 0],
  ],
  O: [
    [0, 1, 1, 1, 0],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [0, 1, 1, 1, 0],
  ],
  N: [
    [1, 0, 0, 0, 1],
    [1, 1, 0, 0, 1],
    [1, 0, 1, 0, 1],
    [1, 0, 0, 1, 1],
    [1, 0, 0, 0, 1],
  ],
  B: [
    [1, 1, 1, 1, 0],
    [1, 0, 0, 0, 1],
    [1, 1, 1, 1, 0],
    [1, 0, 0, 0, 1],
    [1, 1, 1, 1, 0],
  ],
  A: [
    [0, 1, 1, 1, 0],
    [1, 0, 0, 0, 1],
    [1, 1, 1, 1, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
  ],
  " ": [
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
  ],
};

interface TetrisLetterProps {
  char: string;
  size?: 'normal' | 'small' | 'tiny';
  className?: string;
}

function TetrisLetter({ char, size = 'normal', className }: TetrisLetterProps) {
  const pattern = LETTER_PATTERNS[char.toUpperCase()] || LETTER_PATTERNS[" "];
  
  const sizeClass = size === 'small' ? styles.letterSmall : size === 'tiny' ? styles.letterTiny : '';
  
  return (
    <div className={`${styles.letter} ${sizeClass} ${className || ''}`}>
      {pattern.map((row, rowIndex) => (
        <div key={rowIndex} className={styles.letterRow}>
          {row.map((cell, colIndex) => (
            <div
              key={colIndex}
              className={`${styles.letterCell} ${cell ? styles.filled : ""}`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function TetrisTitle() {
  const tetrisText = "TETRIS";
  const onBaseText = "ON BASE";
  
  // Define sizes: "TETRIS" = small (15% reduction), "ON BASE" = tiny (increased by 15% more)
  const getLetterSize = (isTetris: boolean): 'normal' | 'small' | 'tiny' => {
    if (isTetris) return 'small';
    return 'tiny';
  };
  
  return (
    <div className={styles.titleContainer}>
      <div className={styles.titleRow}>
        {tetrisText.split("").map((char, index) => (
          <TetrisLetter 
            key={`tetris-${index}`} 
            char={char} 
            size={getLetterSize(true)}
          />
        ))}
      </div>
      <div className={styles.titleRow}>
        {onBaseText.split("").map((char, index) => (
          <TetrisLetter 
            key={`onbase-${index}`} 
            char={char} 
            size={getLetterSize(false)}
          />
        ))}
      </div>
    </div>
  );
}

