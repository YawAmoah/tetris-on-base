"use client";

import { useEffect, useRef } from "react";
import styles from "./AnimatedBackground.module.css";

const BASE_LOGO_URL = "https://cdn.brandfetch.io/id6XsSOVVS/theme/light/logo.svg?c=1dxbfHSJFAPEGdCLU4o5B";

// Tetris block shapes (I, O, T, S, Z, J, L) - simplified for background
const tetrisShapes = [
  // I piece (line)
  [[1, 1, 1, 1]],
  // O piece (square)
  [[1, 1], [1, 1]],
  // T piece
  [[0, 1, 0], [1, 1, 1]],
  // S piece
  [[0, 1, 1], [1, 1, 0]],
  // Z piece
  [[1, 1, 0], [0, 1, 1]],
  // J piece
  [[1, 0, 0], [1, 1, 1]],
  // L piece
  [[0, 0, 1], [1, 1, 1]],
];

interface BlockData {
  element: HTMLDivElement;
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  isLogo: boolean;
}

function AnimatedBackground() {
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const blocksRef = useRef<BlockData[]>([]);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const blocks: BlockData[] = [];
    blocksRef.current = blocks;

    // Calculate block dimensions (20% bigger)
    const blockSize = 36 * 1.2; // 43.2px per cell (20% increase)
    const logoSize = 144 * 1.2; // 172.8px (20% increase)

    // Create initial blocks
    const createBlock = (): BlockData | null => {
      const block = document.createElement("div");
      block.className = styles.fallingBlock;
      block.style.position = "absolute";
      block.style.willChange = "transform";
      
      // About 1 in 5 blocks will be a logo (20% chance)
      const isLogo = Math.random() < 0.2;
      let width = 0;
      let height = 0;
      
      if (isLogo) {
        // Create a logo block - same size as Tetris shapes
        const logoContainer = document.createElement("div");
        logoContainer.className = styles.logoContainer;
        const logoImg = document.createElement("img");
        logoImg.src = BASE_LOGO_URL;
        logoImg.alt = "Base Logo";
        logoImg.className = styles.logoImage;
        logoImg.style.width = `${logoSize}px`;
        logoImg.style.height = `${logoSize}px`;
        logoImg.crossOrigin = "anonymous";
        logoContainer.appendChild(logoImg);
        block.appendChild(logoContainer);
        width = height = logoSize;
      } else {
        // Create a Tetris shape block
        const shape = tetrisShapes[Math.floor(Math.random() * tetrisShapes.length)];
        
        // Create the shape structure
        const shapeContainer = document.createElement("div");
        shapeContainer.className = styles.shapeContainer;
        
        shape.forEach((row, rowIdx) => {
          row.forEach((cell, colIdx) => {
            if (cell === 1) {
              const cellDiv = document.createElement("div");
              cellDiv.className = styles.cell;
              cellDiv.style.width = `${blockSize}px`;
              cellDiv.style.height = `${blockSize}px`;
              cellDiv.style.left = `${colIdx * blockSize}px`;
              cellDiv.style.top = `${rowIdx * blockSize}px`;
              shapeContainer.appendChild(cellDiv);
            }
          });
        });
        
        block.appendChild(shapeContainer);
        width = shape[0].length * blockSize;
        height = shape.length * blockSize;
      }
      
      // Random starting position
      const startX = Math.random() * Math.max(100, container.offsetWidth - width);
      const startY = -height - Math.random() * 200;
      
      block.style.left = `${startX}px`;
      block.style.top = `${startY}px`;
      
      // Random opacity for subtlety (increased by 20% for better visibility)
      const opacity = isLogo 
        ? (0.35 + Math.random() * 0.2)
        : (0.4 + Math.random() * 0.3);
      block.style.opacity = opacity.toString();
      
      container.appendChild(block);
      
      // Random initial velocity (slower for smoother movement)
      const vx = (Math.random() - 0.5) * 0.3; // Small horizontal drift
      const vy = 0.8 + Math.random() * 1.2; // Falling speed
      
      const blockData: BlockData = {
        element: block,
        x: startX,
        y: startY,
        vx,
        vy,
        width,
        height,
        isLogo,
      };
      
      blocks.push(blockData);
      return blockData;
    };

    // Check collision between two blocks (optimized)
    const checkCollision = (a: BlockData, b: BlockData): boolean => {
      return (
        a.x < b.x + b.width &&
        a.x + a.width > b.x &&
        a.y < b.y + b.height &&
        a.y + a.height > b.y
      );
    };

    // Handle collision with bouncing (optimized)
    const handleCollision = (a: BlockData, b: BlockData) => {
      if (!checkCollision(a, b)) return;

      // Calculate centers
      const aCenterX = a.x + a.width / 2;
      const aCenterY = a.y + a.height / 2;
      const bCenterX = b.x + b.width / 2;
      const bCenterY = b.y + b.height / 2;
      
      // Calculate separation needed
      const dx = bCenterX - aCenterX;
      const dy = bCenterY - aCenterY;
      const distanceSquared = dx * dx + dy * dy;
      
      if (distanceSquared === 0) {
        // Exact overlap, separate randomly
        const randomAngle = Math.random() * Math.PI * 2;
        a.x -= Math.cos(randomAngle) * 2;
        a.y -= Math.sin(randomAngle) * 2;
        b.x += Math.cos(randomAngle) * 2;
        b.y += Math.sin(randomAngle) * 2;
        return;
      }
      
      // Calculate overlap amounts for AABB collision
      const overlapX = Math.min(
        a.x + a.width - b.x,
        b.x + b.width - a.x
      );
      const overlapY = Math.min(
        a.y + a.height - b.y,
        b.y + b.height - a.y
      );
      
      // Separate along the axis of minimum overlap
      if (overlapX < overlapY) {
        // Separate horizontally
        const separationX = overlapX * 0.5 + 1; // Add 1px gap
        if (dx < 0) {
          a.x += separationX;
          b.x -= separationX;
        } else {
          a.x -= separationX;
          b.x += separationX;
        }
        // Reduce horizontal velocity
        const avgVx = (a.vx + b.vx) / 2;
        a.vx = avgVx + (a.vx - avgVx) * 0.3;
        b.vx = avgVx + (b.vx - avgVx) * 0.3;
      } else {
        // Separate vertically
        const separationY = overlapY * 0.5 + 1; // Add 1px gap
        if (dy < 0) {
          a.y += separationY;
          b.y -= separationY;
        } else {
          a.y -= separationY;
          b.y += separationY;
        }
        // Reduce vertical velocity
        const avgVy = (a.vy + b.vy) / 2;
        a.vy = avgVy + (a.vy - avgVy) * 0.3;
        b.vy = avgVy + (b.vy - avgVy) * 0.3;
      }
      
      // Only apply bounce if we have valid normal
      const distance = Math.sqrt(distanceSquared);
      if (distance > 0) {
        const nx = dx / distance;
        const ny = dy / distance;

        // Simple bounce (only if moving towards each other)
        const relativeVx = b.vx - a.vx;
        const relativeVy = b.vy - a.vy;
        const approachSpeed = relativeVx * nx + relativeVy * ny;
        
        if (approachSpeed > 0) {
          // They're moving towards each other, apply bounce
          const bounceStrength = 0.15; // Reduced for smoother movement
          const impulse = approachSpeed * bounceStrength;
          
          a.vx += impulse * nx;
          a.vy += impulse * ny;
          b.vx -= impulse * nx;
          b.vy -= impulse * ny;
          
          // Limit velocity to prevent wild bouncing
          const maxVel = 3;
          a.vx = Math.max(-maxVel, Math.min(maxVel, a.vx));
          a.vy = Math.max(-maxVel, Math.min(maxVel, a.vy));
          b.vx = Math.max(-maxVel, Math.min(maxVel, b.vx));
          b.vy = Math.max(-maxVel, Math.min(maxVel, b.vy));
        }
      }
    };

    // Animation loop (optimized)
    const animate = () => {
      const containerWidth = container.offsetWidth;
      const containerHeight = container.offsetHeight;

      // Process collisions first (iterate backwards to safely remove items)
      for (let i = blocks.length - 1; i >= 0; i--) {
        const block = blocks[i];
        
        // Skip if block or element is invalid
        if (!block || !block.element) {
          blocks.splice(i, 1);
          continue;
        }
        
        // Update position
        block.x += block.vx;
        block.y += block.vy;

        // Boundary collision (bounce off walls)
        if (block.x < 0) {
          block.x = 0;
          block.vx *= -0.3;
        }
        if (block.x + block.width > containerWidth) {
          block.x = containerWidth - block.width;
          block.vx *= -0.3;
        }

        // Remove block if it falls off screen
        if (block.y > containerHeight + 200) {
          try {
            if (block.element && block.element.parentNode) {
              block.element.parentNode.removeChild(block.element);
            }
          } catch {
            // Element may have already been removed, ignore
          }
          blocks.splice(i, 1);
          continue;
        }

        // Check collision with other blocks (only check once per pair)
        for (let j = i + 1; j < blocks.length; j++) {
          if (blocks[j] && blocks[j].element) {
            handleCollision(block, blocks[j]);
          }
        }
      }

      // Update all element positions after physics calculations
      blocks.forEach(block => {
        try {
          if (block && block.element && block.element.parentNode) {
            block.element.style.transform = `translate(${block.x}px, ${block.y}px) rotate(${(block.y / 10) % 360}deg)`;
          }
        } catch {
          // Element may have been removed, ignore
        }
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    // Start animation
    animate();

    // Create blocks periodically - always maintain 12 shapes (20% increase)
    const interval = setInterval(() => {
      // Keep creating blocks until we have at least 12
      while (blocks.length < 12) {
        createBlock();
      }
    }, 500); // Check frequently to maintain 12 blocks

    // Initial batch of blocks - start with 12
    for (let i = 0; i < 12; i++) {
      setTimeout(() => createBlock(), i * 200);
    }

    return () => {
      clearInterval(interval);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      blocks.forEach(block => {
        try {
          if (block.element && block.element.parentNode) {
            block.element.parentNode.removeChild(block.element);
          }
        } catch {
          // Element may have already been removed, ignore
        }
      });
    };
  }, []);

  return <div ref={containerRef} className={styles.background} />;
}

export default AnimatedBackground;
