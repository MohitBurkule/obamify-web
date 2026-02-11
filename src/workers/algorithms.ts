// Worker script for running image transformation algorithms
// Matches Rust: src/app/calculate/mod.rs

import type {
  UnprocessedPreset,
  GenerationSettings,
  ProgressMsg,
  ProgressMsgType,
} from '../types';
import { heuristic, SeededRNG } from '../utils/math';
import { extractRGB, applyCropScale, makeNewImage } from '../utils/image';

// Types for worker messages
interface WorkerProcessRequest {
  type: 'process';
  source: UnprocessedPreset;
  settings: GenerationSettings;
}

interface WorkerCancelRequest {
  type: 'cancel';
}

type WorkerMessage = WorkerProcessRequest | WorkerCancelRequest;

// Genetic algorithm implementation
// Matches Rust: src/app/calculate/mod.rs:352-471
function processGenetic(
  source: UnprocessedPreset,
  settings: GenerationSettings,
  postMessage: (msg: ProgressMsg) => void,
  cancelFlag: { cancelled: boolean },
): void {
  // Apply crop/scale to source
  const sourceImg = applyCropScale(
    source.sourceImg,
    source.width,
    source.height,
    settings.sidelen,
    settings.sourceCropScale,
  );

  const sourcePixels = extractRGB(sourceImg, settings.sidelen, settings.sidelen);

  // Get target pixels and weights
  const targetPixels = settings.customTarget
    ? extractRGB(
        applyCropScale(
          settings.customTarget.sourceImg,
          settings.customTarget.width,
          settings.customTarget.height,
          settings.sidelen,
          settings.targetCropScale,
        ),
        settings.sidelen,
        settings.sidelen,
      )
    : sourcePixels;

  // For custom targets, use uniform weights
  const weights = settings.customTarget
    ? new Array(targetPixels.length).fill(255)
    : targetPixels.map(() => 255); // TODO: Load actual weights image

  const sidelen = settings.sidelen;

  // Initialize pixels with heuristic values
  interface Pixel {
    srcX: number;
    srcY: number;
    rgb: [number, number, number];
    h: number; // current heuristic value
  }

  const pixels: Pixel[] = sourcePixels.map((rgb, i) => {
    const x = (i % sidelen);
    const y = Math.floor(i / sidelen);
    const h = heuristic(
      { x, y },
      { x, y },
      rgb,
      targetPixels[i],
      weights[i],
      settings.proximityImportance,
    );
    return { srcX: x, srcY: y, rgb, h };
  });

  // Seeded RNG for reproducibility
  const seed = hashCode(settings.id);
  const rng = new SeededRNG(seed);
  const swapsPerGeneration = 128 * pixels.length;
  let maxDist = sidelen;

  // Helper: hashCode
  function hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  // Helper: clamp
  function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  while (!cancelFlag.cancelled) {
    let swapsMade = 0;

    for (let i = 0; i < swapsPerGeneration; i++) {
      const apos = rng.range(0, pixels.length);
      const ax = apos % sidelen;
      const ay = Math.floor(apos / sidelen);

      // Random nearby position
      const bx = clamp(ax + rng.range(-maxDist, maxDist + 1), 0, sidelen - 1);
      const by = clamp(ay + rng.range(-maxDist, maxDist + 1), 0, sidelen - 1);
      const bpos = by * sidelen + bx;

      // Compute heuristic values
      const tA = targetPixels[apos];
      const tB = targetPixels[bpos];

      const aOnBH = heuristic(
        { x: bx, y: by },
        { x: ax, y: ay },
        pixels[apos].rgb,
        tB,
        weights[bpos],
        settings.proximityImportance,
      );

      const bOnAH = heuristic(
        { x: ax, y: ay },
        { x: bx, y: by },
        pixels[bpos].rgb,
        tA,
        weights[apos],
        settings.proximityImportance,
      );

      const improvementA = pixels[apos].h - bOnAH;
      const improvementB = pixels[bpos].h - aOnBH;

      if (improvementA + improvementB > 0) {
        // Swap pixels
        const temp = pixels[apos];
        pixels[apos] = pixels[bpos];
        pixels[bpos] = temp;
        pixels[apos].h = aOnBH;
        pixels[bpos].h = bOnAH;
        swapsMade++;
      }
    }

    // Send progress update
    const assignments = pixels.map((p) => p.srcY * sidelen + p.srcX);
    const imageData = makeNewImage(sourcePixels, assignments, sidelen, sidelen);
    postMessage({
      type: 'update_preview' as ProgressMsgType.UpdatePreview,
      width: sidelen,
      height: sidelen,
      data: Array.from(imageData),
    });

    // Check termination
    if (maxDist < 4 && swapsMade < 10) {
      break;
    }

    maxDist = Math.max(2, Math.floor(maxDist * 0.99));
    const progress = 1 - maxDist / sidelen;
    postMessage({
      type: 'progress' as ProgressMsgType.Progress,
      value: progress,
    });
  }

  if (cancelFlag.cancelled) {
    postMessage({
      type: 'cancelled' as ProgressMsgType.Cancelled,
    });
    return;
  }

  postMessage({
    type: 'done' as ProgressMsgType.Done,
    preset: {
      inner: {
        name: source.name,
        width: settings.sidelen,
        height: settings.sidelen,
        sourceImg: Array.from(sourceImg) as unknown as Uint8Array,
      },
      assignments: pixels.map((p) => p.srcY * sidelen + p.srcX),
    },
  });
}

// Optimal (Hungarian) algorithm
// Matches Rust: src/app/calculate/mod.rs:113-295
function processOptimal(
  source: UnprocessedPreset,
  settings: GenerationSettings,
  postMessage: (msg: ProgressMsg) => void,
  cancelFlag: { cancelled: boolean },
): void {
  // For now, use a simplified greedy matching
  // Full Hungarian algorithm would be implemented here
  // TODO: Implement proper Kuhn-Munkres algorithm

  const sourceImg = applyCropScale(
    source.sourceImg,
    source.width,
    source.height,
    settings.sidelen,
    settings.sourceCropScale,
  );

  const sourcePixels = extractRGB(sourceImg, settings.sidelen, settings.sidelen);

  const targetPixels = settings.customTarget
    ? extractRGB(
        applyCropScale(
          settings.customTarget.sourceImg,
          settings.customTarget.width,
          settings.customTarget.height,
          settings.sidelen,
          settings.targetCropScale,
        ),
        settings.sidelen,
        settings.sidelen,
      )
    : sourcePixels;

  const weights = targetPixels.map(() => 255);
  const sidelen = settings.sidelen;
  const n = sidelen * sidelen;

  // Greedy assignment for now (suboptimal but faster)
  const assigned = new Set<number>();
  const assignments: number[] = [];

  for (let targetIdx = 0; targetIdx < n; targetIdx++) {
    if (cancelFlag.cancelled) {
      postMessage({
        type: 'cancelled' as ProgressMsgType.Cancelled,
      });
      return;
    }

    const tx = targetIdx % sidelen;
    const ty = Math.floor(targetIdx / sidelen);
    const targetColor = targetPixels[targetIdx];

    let bestSrcIdx = -1;
    let bestScore = Infinity;

    // Find best unassigned source pixel
    for (let srcIdx = 0; srcIdx < n; srcIdx++) {
      if (assigned.has(srcIdx)) continue;

      const sx = srcIdx % sidelen;
      const sy = Math.floor(srcIdx / sidelen);
      const sourceColor = sourcePixels[srcIdx];

      const score = heuristic(
        { x: sx, y: sy },
        { x: tx, y: ty },
        sourceColor,
        targetColor,
        weights[targetIdx],
        settings.proximityImportance,
      );

      if (score < bestScore) {
        bestScore = score;
        bestSrcIdx = srcIdx;
      }
    }

    if (bestSrcIdx >= 0) {
      assigned.add(bestSrcIdx);
      assignments.push(bestSrcIdx);
    }

    // Progress every 100 iterations
    if (targetIdx % 100 === 0) {
      postMessage({
        type: 'progress' as ProgressMsgType.Progress,
        value: targetIdx / n,
      });

      const imageData = makeNewImage(sourcePixels, assignments, sidelen, sidelen);
      postMessage({
        type: 'update_preview' as ProgressMsgType.UpdatePreview,
        width: sidelen,
        height: sidelen,
        data: Array.from(imageData),
      });
    }
  }

  // Fill remaining with identity
  while (assignments.length < n) {
    assignments.push(assignments.length);
  }

  if (cancelFlag.cancelled) {
    return;
  }

  postMessage({
    type: 'done' as ProgressMsgType.Done,
    preset: {
      inner: {
        name: source.name,
        width: settings.sidelen,
        height: settings.sidelen,
        sourceImg: Array.from(sourceImg) as unknown as Uint8Array,
      },
      assignments,
    },
  });
}

// Main worker entry point
let cancelFlag = { cancelled: false };

self.onmessage = (e: MessageEvent<WorkerMessage>) => {
  const msg = e.data;

  if (msg.type === 'cancel') {
    cancelFlag.cancelled = true;
    return;
  }

  if (msg.type === 'process') {
    cancelFlag.cancelled = false;

    const { source, settings } = msg;

    try {
      if (settings.algorithm === 'genetic') {
        processGenetic(source, settings, (m) => self.postMessage(m), cancelFlag);
      } else {
        processOptimal(source, settings, (m) => self.postMessage(m), cancelFlag);
      }
    } catch (error) {
      self.postMessage({
        type: 'error' as ProgressMsgType.Error,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }
};

export {};
