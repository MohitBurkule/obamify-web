// Heuristic function for computing pixel match quality
// Matches Rust: src/app/calculate/mod.rs:27-40
export function heuristic(
  apos: { x: number; y: number },
  bpos: { x: number; y: number },
  a: [number, number, number], // RGB 0-255
  b: [number, number, number], // RGB 0-255
  colorWeight: number,
  spatialWeight: number,
): number {
  const spatial =
    (apos.x - bpos.x) ** 2 + (apos.y - bpos.y) ** 2;
  const color =
    (a[0] - b[0]) ** 2 +
    (a[1] - b[1]) ** 2 +
    (a[2] - b[2]) ** 2;
  return color * colorWeight + (spatial * spatialWeight) ** 2;
}

// Seeded RNG for reproducibility (matches frand::Rand with_seed)
export class SeededRNG {
  private state: number;

  constructor(seed: number) {
    this.state = seed;
  }

  // Simple seeded RNG (Mulberry32)
  private next(): number {
    let t = this.state += 0x6d2b79f5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  // Generate random integer in range [min, max)
  range(min: number, max: number): number {
    return Math.floor(this.next() * (max - min)) + min;
  }

  // Generate random float in range [min, max)
  rangeFloat(min: number, max: number): number {
    return this.next() * (max - min) + min;
  }
}

// Hash function for strings to numbers
export function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

// Clamp value between min and max
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// Point to line segment distance (for drawing mode brush)
export function pointToLineDist(
  px: number,
  py: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): number {
  const dx = x1 - x0;
  const dy = y1 - y0;

  if (dx === 0 && dy === 0) {
    // It's a point not a line segment
    return Math.hypot(px - x0, py - y0);
  }

  // Calculate t that minimizes distance
  const t = ((px - x0) * dx + (py - y0) * dy) / (dx * dx + dy * dy);

  if (t < 0) {
    // Beyond 'x0,y0' end of segment
    return Math.hypot(px - x0, py - y0);
  } else if (t > 1) {
    // Beyond 'x1,y1' end of segment
    return Math.hypot(px - x1, py - y1);
  } else {
    // Projection falls on segment
    const projX = x0 + t * dx;
    const projY = y0 + t * dy;
    return Math.hypot(px - projX, py - projY);
  }
}
