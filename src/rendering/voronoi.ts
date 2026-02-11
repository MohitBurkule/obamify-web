// CPU-based Voronoi diagram rendering
// Simplified version that doesn't use GPU shaders

import type { SeedPos, SeedColor } from '../types';

// Brute-force nearest seed for each pixel
// Simple but may be slow with many seeds
export function renderVoronoi(
  ctx: CanvasRenderingContext2D,
  seeds: SeedPos[],
  colors: SeedColor[],
  width: number,
  height: number,
): void {
  const imageData = ctx.createImageData(width, height);
  const data = imageData.data;

  // For each pixel, find nearest seed
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let minDist = Infinity;
      let nearestSeed = 0;

      // Brute-force nearest seed
      for (let i = 0; i < seeds.length; i++) {
        const sx = seeds[i].xy[0];
        const sy = seeds[i].xy[1];
        const dx = sx - x;
        const dy = sy - y;
        const dist = dx * dx + dy * dy;

        if (dist < minDist) {
          minDist = dist;
          nearestSeed = i;
        }
      }

      // Set pixel color from nearest seed
      const color = colors[nearestSeed].rgba;
      const idx = (y * width + x) * 4;
      data[idx] = Math.floor(color[0] * 255);
      data[idx + 1] = Math.floor(color[1] * 255);
      data[idx + 2] = Math.floor(color[2] * 255);
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);
}

// Optimized version using spatial hashing for better performance
export function renderVoronoiOptimized(
  ctx: CanvasRenderingContext2D,
  seeds: SeedPos[],
  colors: SeedColor[],
  width: number,
  height: number,
): void {
  const imageData = ctx.createImageData(width, height);
  const data = imageData.data;

  // Build spatial grid for faster lookup
  const cellSize = Math.ceil(Math.sqrt((width * height) / seeds.length));
  const gridCols = Math.ceil(width / cellSize);
  const gridRows = Math.ceil(height / cellSize);

  // 2D array of seed indices
  const grid: number[][] = Array.from({ length: gridRows * gridCols }, () => []);

  for (let i = 0; i < seeds.length; i++) {
    const sx = Math.floor(seeds[i].xy[0] / cellSize);
    const sy = Math.floor(seeds[i].xy[1] / cellSize);
    const cellY = Math.min(sy, gridRows - 1);
    const cellX = Math.min(sx, gridCols - 1);
    const cellIndex = cellY * gridCols + cellX;
    grid[cellIndex].push(i);
  }

  // For each pixel, find nearest seed
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let minDist = Infinity;
      let nearestSeed = 0;

      // Check cells within reasonable distance
      const cellX = Math.floor(x / cellSize);
      const cellY = Math.floor(y / cellSize);
      const searchRadius = 2;

      for (let dy = -searchRadius; dy <= searchRadius; dy++) {
        for (let dx = -searchRadius; dx <= searchRadius; dx++) {
          const cy = cellY + dy;
          const cx = cellX + dx;

          if (cx < 0 || cx >= gridCols || cy < 0 || cy >= gridRows) {
            continue;
          }

          const cellIndex = cy * gridCols + cx;

          for (const seedIdx of grid[cellIndex]) {
            const sx = seeds[seedIdx].xy[0];
            const sy = seeds[seedIdx].xy[1];
            const distX = sx - x;
            const distY = sy - y;
            const dist = distX * distX + distY * distY;

            if (dist < minDist) {
              minDist = dist;
              nearestSeed = seedIdx;
            }
          }
        }
      }

      // Set pixel color from nearest seed
      const color = colors[nearestSeed].rgba;
      const idx = (y * width + x) * 4;
      data[idx] = Math.floor(color[0] * 255);
      data[idx + 1] = Math.floor(color[1] * 255);
      data[idx + 2] = Math.floor(color[2] * 255);
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);
}

// Simple point rendering (for debugging or low-resolution preview)
export function renderSeeds(
  ctx: CanvasRenderingContext2D,
  seeds: SeedPos[],
  colors: SeedColor[],
  width: number,
  height: number,
  pointSize: number,
): void {
  // Clear background
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, width, height);

  // Draw each seed as a colored rectangle
  for (let i = 0; i < seeds.length; i++) {
    const color = colors[i].rgba;
    const x = seeds[i].xy[0];
    const y = seeds[i].xy[1];

    ctx.fillStyle = `rgb(${color[0] * 255}, ${color[1] * 255}, ${color[2] * 255})`;
    ctx.fillRect(
      Math.floor(x - pointSize / 2),
      Math.floor(y - pointSize / 2),
      pointSize,
      pointSize,
    );
  }
}
