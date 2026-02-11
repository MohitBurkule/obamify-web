// Sim - manages the particle physics simulation
// Matches Rust: src/app/morph_sim.rs:224-377

import type { SeedPos } from '../types';
import { CellBody } from './CellBody';

const ALIGNMENT_FACTOR = 0.8;

export class Sim {
  cells: CellBody[];
  name: string;
  reversed: boolean;

  constructor(name: string) {
    this.name = name;
    this.cells = [];
    this.reversed = false;
  }

  update(positions: SeedPos[], sidelen: number): void {
    const gridSize = Math.sqrt(this.cells.length);
    const pixelSize = sidelen / gridSize;

    // Build spatial grid for O(1) neighbor lookup
    const grid = this.buildGrid(positions, gridSize, pixelSize);

    // Apply wall and destination forces first
    for (let i = 0; i < this.cells.length; i++) {
      this.cells[i].applyWallForce(positions[i], sidelen, pixelSize);
      this.cells[i].applyDstForce(positions[i], sidelen);
    }

    // Apply neighbor forces with velocity alignment
    for (let i = 0; i < this.cells.length; i++) {
      const pos = positions[i].xy;
      const col = Math.floor(pos[0] / pixelSize);
      const row = Math.floor(pos[1] / pixelSize);
      let avgXvel = 0;
      let avgYvel = 0;
      let count = 0;

      // Check 3x3 grid neighbors
      for (let dy = 0; dy <= 2; dy++) {
        for (let dx = 0; dx <= 2; dx++) {
          const ncol = col + dx - 1;
          const nrow = row + dy - 1;

          if (
            ncol < 0 ||
            nrow < 0 ||
            ncol >= gridSize ||
            nrow >= gridSize
          ) {
            continue;
          }

          const nIndex = nrow * gridSize + ncol;

          for (const other of grid[nIndex]) {
            if (other === i) continue;

            const weight = this.cells[i].applyNeighbourForce(
              positions[i],
              positions[other],
              pixelSize,
            );

            // Stroke attraction: same strokes stay together
            if (this.cells[i].strokeId === this.cells[other].strokeId) {
              this.cells[i].applyStrokeAttraction(positions[i], positions[other], weight);
            }

            avgXvel += this.cells[other].velx * weight;
            avgYvel += this.cells[other].vely * weight;
            count += weight;
          }
        }
      }

      // Velocity alignment
      if (count > 0) {
        avgXvel /= count;
        avgYvel /= count;
        this.cells[i].accx += (avgXvel - this.cells[i].velx) * ALIGNMENT_FACTOR;
        this.cells[i].accy += (avgYvel - this.cells[i].vely) * ALIGNMENT_FACTOR;
      }
    }

    // Integrate physics
    for (let i = 0; i < this.cells.length; i++) {
      this.cells[i].update(positions[i]);
    }
  }

  preparePlay(positions: SeedPos[], reverse: boolean): void {
    if (this.reversed === reverse) {
      // Already in correct direction - reset to source
      for (let i = 0; i < this.cells.length; i++) {
        positions[i].xy[0] = this.cells[i].srcx;
        positions[i].xy[1] = this.cells[i].srcy;
        this.cells[i].age = 0;
      }
    } else {
      // Switch source/destination
      for (let i = 0; i < this.cells.length; i++) {
        positions[i].xy[0] = this.cells[i].dstx;
        positions[i].xy[1] = this.cells[i].dsty;
      }
      this.switch();
    }
  }

  switch(): void {
    for (const cell of this.cells) {
      [cell.srcx, cell.dstx] = [cell.dstx, cell.srcx];
      [cell.srcy, cell.dsty] = [cell.dsty, cell.srcy];
      cell.age = 0;
    }
    this.reversed = !this.reversed;
  }

  setAssignments(assignments: number[], sidelen: number): void {
    const width = Math.sqrt(this.cells.length);
    const pixelSize = sidelen / width;

    for (let dstIdx = 0; dstIdx < assignments.length; dstIdx++) {
      const srcIdx = assignments[dstIdx];
      const srcX = (srcIdx % width) + 0.5;
      const srcY = Math.floor(srcIdx / width) + 0.5;
      const dstX = (dstIdx % width) + 0.5;
      const dstY = Math.floor(dstIdx / width) + 0.5;

      const prev = this.cells[srcIdx];
      this.cells[srcIdx] = new CellBody(
        srcX * pixelSize,
        srcY * pixelSize,
        dstX * pixelSize,
        dstY * pixelSize,
        prev.dstForce,
      );
      this.cells[srcIdx].age = prev.age;
      this.cells[srcIdx].strokeId = prev.strokeId;
    }
  }

  private buildGrid(
    positions: SeedPos[],
    gridSize: number,
    pixelSize: number,
  ): number[][] {
    const grid: number[][] = Array.from({ length: this.cells.length }, () => []);

    for (let i = 0; i < positions.length; i++) {
      const x = Math.floor(positions[i].xy[0] / pixelSize);
      const y = Math.floor(positions[i].xy[1] / pixelSize);
      const index =
        Math.min(y, gridSize - 1) * gridSize + Math.min(x, gridSize - 1);
      grid[index].push(i);
    }

    return grid;
  }
}
