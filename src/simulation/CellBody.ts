// CellBody - represents a single pixel in the physics simulation
// Matches Rust: src/app/morph_sim.rs:84-222

import type { SeedPos } from '../types';
import { clamp } from '../utils/math';

const PERSONAL_SPACE = 0.95;
const MAX_VELOCITY = 6.0;

function factorCurve(x: number): number {
  return Math.min(1000.0, x ** 3);
}

export class CellBody {
  srcx: number;
  srcy: number;
  dstx: number;
  dsty: number;
  velx: number;
  vely: number;
  accx: number;
  accy: number;
  dstForce: number;
  age: number;
  strokeId: number;

  constructor(srcx: number, srcy: number, dstx: number, dsty: number, dstForce: number) {
    this.srcx = srcx;
    this.srcy = srcy;
    this.dstx = dstx;
    this.dsty = dsty;
    this.dstForce = dstForce;
    this.velx = 0;
    this.vely = 0;
    this.accx = 0;
    this.accy = 0;
    this.age = 0;
    this.strokeId = 0;
  }

  update(pos: SeedPos): void {
    // Euler integration
    this.velx += this.accx;
    this.vely += this.accy;

    this.accx = 0;
    this.accy = 0;

    // Velocity damping (97% retention)
    this.velx *= 0.97;
    this.vely *= 0.97;

    // Update position (with clamped velocity)
    pos.xy[0] += clamp(this.velx, -MAX_VELOCITY, MAX_VELOCITY);
    pos.xy[1] += clamp(this.vely, -MAX_VELOCITY, MAX_VELOCITY);

    this.age++;
  }

  applyDstForce(pos: SeedPos, sidelen: number): void {
    const elapsed = this.age / 60.0;
    const factor =
      this.dstForce === 0 ? 0.1 : factorCurve(elapsed * this.dstForce);

    const dx = this.dstx - pos.xy[0];
    const dy = this.dsty - pos.xy[1];
    const dist = Math.sqrt(dx * dx + dy * dy);

    this.accx += (dx * dist * factor) / sidelen;
    this.accy += (dy * dist * factor) / sidelen;
  }

  applyNeighbourForce(pos: SeedPos, other: SeedPos, pixelSize: number): number {
    const dx = other.xy[0] - pos.xy[0];
    const dy = other.xy[1] - pos.xy[1];
    const dist = Math.sqrt(dx * dx + dy * dy);
    const personalSpace = pixelSize * PERSONAL_SPACE;

    let weight = 0;
    if (dist > 0 && dist < personalSpace) {
      weight = (1 / dist) * ((personalSpace - dist) / personalSpace);
    }

    if (dist > 0 && dist < personalSpace) {
      this.accx -= dx * weight;
      this.accy -= dy * weight;
    } else if (dist === 0) {
      // If exactly on top of each other, push in random direction
      const seed = (this.posToBits(pos.xy[0]) ^ (this.posToBits(pos.xy[1]) << 32)) >>> 0;
      const r1 = this.seededRandom(seed);
      const r2 = this.seededRandom(seed + 1);

      this.accx += (r1 - 0.5) * 0.1;
      this.accy += (r2 - 0.5) * 0.1;
    }

    return Math.max(0, weight);
  }

  applyWallForce(pos: SeedPos, sidelen: number, pixelSize: number): void {
    const personalSpace = pixelSize * PERSONAL_SPACE * 0.5;

    if (pos.xy[0] < personalSpace) {
      this.accx += (personalSpace - pos.xy[0]) / personalSpace;
    } else if (pos.xy[0] > sidelen - personalSpace) {
      this.accx -= (pos.xy[0] - (sidelen - personalSpace)) / personalSpace;
    }

    if (pos.xy[1] < personalSpace) {
      this.accy += (personalSpace - pos.xy[1]) / personalSpace;
    } else if (pos.xy[1] > sidelen - personalSpace) {
      this.accy -= (pos.xy[1] - (sidelen - personalSpace)) / personalSpace;
    }
  }

  applyStrokeAttraction(pos: SeedPos, otherCell: SeedPos, weight: number): void {
    const ALIGNMENT_FACTOR = 0.8;
    this.accx += (otherCell.xy[0] - pos.xy[0]) * weight * ALIGNMENT_FACTOR;
    this.accy += (otherCell.xy[1] - pos.xy[1]) * weight * ALIGNMENT_FACTOR;
  }

  private posToBits(x: number): number {
    const buffer = new ArrayBuffer(8);
    const float64 = new Float64Array(buffer);
    const uint32 = new Uint32Array(buffer);
    float64[0] = x;
    return uint32[0];
  }

  private seededRandom(seed: number): number {
    // Simple seeded random
    let s = seed + 0x6d2b79f5;
    s = Math.imul(s ^ (s >>> 15), s | 1);
    s ^= s + Math.imul(s ^ (s >>> 7), s | 61);
    return ((s ^ (s >>> 14)) >>> 0) / 4294967296;
  }
}
