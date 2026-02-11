// Real-time drawing mode worker
// Matches Rust: src/app/calculate/drawing_process.rs

import type { UnprocessedPreset, GenerationSettings, ProgressMsgType, SeedColor } from '../types';
import { heuristic, SeededRNG } from '../utils/math';
import { extractRGB, applyCropScale } from '../utils/image';

interface DrawingWorkerMessage {
  type: 'process';
  source: UnprocessedPreset;
  settings: GenerationSettings;
  colors: SeedColor[];
  pixelData: Array<{ strokeId: number; lastEdited: number }>;
  currentId: number;
  myId: number;
}

const DRAWING_CANVAS_SIZE = 128;
const STROKE_REWARD = -10000000000;

function strokeReward(
  newPos: number,
  oldPos: number,
  pixelData: Array<{ strokeId: number; lastEdited: number }>,
  pixels: Array<{ srcX: number; srcY: number; h: number }>,
): number {
  const x = (newPos % DRAWING_CANVAS_SIZE);
  const y = Math.floor(newPos / DRAWING_CANVAS_SIZE);

  const data = pixelData[pixels[oldPos].srcX + pixels[oldPos].srcY * DRAWING_CANVAS_SIZE];
  const strokeId = data.strokeId;

  // Check 4-connected neighbors
  for (const [dx, dy] of [
    [0, -1],
    [-1, 0],
    [1, 0],
    [0, 1],
  ] as const) {
    const nx = x + dx;
    const ny = y + dy;

    if (nx < 0 || nx >= DRAWING_CANVAS_SIZE || ny < 0 || ny >= DRAWING_CANVAS_SIZE) {
      continue;
    }

    const nIndex = ny * DRAWING_CANVAS_SIZE + nx;
    const neighborData = pixelData[pixels[nIndex].srcX + pixels[nIndex].srcY * DRAWING_CANVAS_SIZE];

    if (neighborData.strokeId === strokeId) {
      return STROKE_REWARD;
    }
  }

  return 0;
}

// Max distance based on pixel age
function maxDist(age: number): number {
  return Math.round(((DRAWING_CANVAS_SIZE / 4) * Math.pow(0.99, age / 30)));
}

self.onmessage = async (e: MessageEvent<DrawingWorkerMessage>) => {
  const msg = e.data;

  if (msg.type === 'process') {
    const { source, settings, colors, pixelData, myId } = msg;

    const sourceImg = applyCropScale(
      source.sourceImg,
      source.width,
      source.height,
      settings.sidelen,
      settings.sourceCropScale,
    );

    const sourcePixels = extractRGB(sourceImg, settings.sidelen, settings.sidelen);

    // Get target pixels
    const targetPixels = sourcePixels; // Drawing mode uses source as target
    const weights = targetPixels.map(() => 255);

    // Initialize pixels
    interface Pixel {
      srcX: number;
      srcY: number;
      h: number;
    }

    const pixels: Pixel[] = sourcePixels.map((_, i) => {
      const x = (i % settings.sidelen);
      const y = Math.floor(i / settings.sidelen);
      const colorRgb: [number, number, number] = [
        Math.floor(colors[i].rgba[0] * 256),
        Math.floor(colors[i].rgba[1] * 256),
        Math.floor(colors[i].rgba[2] * 256),
      ];
      const h =
        heuristic(
          { x, y },
          { x, y },
          colorRgb,
          targetPixels[i],
          weights[i],
          settings.proximityImportance,
        ) + STROKE_REWARD;

      return { srcX: x, srcY: y, h };
    });

    const rng = new SeededRNG(12345);
    const swapsPerGeneration = 128 * pixels.length;

    // Main loop - continuous until cancelled
    let loopCount = 0;
    while (true) {
      // Check if we should stop (new drawing started)
      if (loopCount++ % 100 === 0 && myId !== msg.currentId) {
        self.postMessage({
          type: 'cancelled' as ProgressMsgType.Cancelled,
        });
        return;
      }

      let swapsMade = 0;

      for (let i = 0; i < swapsPerGeneration; i++) {
        const apos = rng.range(0, pixels.length);
        const ax = apos % settings.sidelen;
        const ay = Math.floor(apos / settings.sidelen);

        const maxDistA = maxDist(0 - (pixelData[apos]?.lastEdited ?? 0));

        const bx = Math.floor(
          Math.min(
            settings.sidelen - 1,
            Math.max(0, ax + rng.range(-maxDistA, maxDistA + 1)),
          ),
        );
        const by = Math.floor(
          Math.min(
            settings.sidelen - 1,
            Math.max(0, ay + rng.range(-maxDistA, maxDistA + 1)),
          ),
        );
        const bpos = by * settings.sidelen + bx;

        const maxDistB = maxDist(0 - (pixelData[bpos]?.lastEdited ?? 0));

        if (
          Math.abs(bx - ax) > maxDistB ||
          Math.abs(by - ay) > maxDistB
        ) {
          continue;
        }

        const tA = targetPixels[apos];
        const tB = targetPixels[bpos];

        const aOnBH = heuristic(
          { x: bx, y: by },
          { x: ax, y: ay },
          [Math.floor(colors[apos].rgba[0] * 256), Math.floor(colors[apos].rgba[1] * 256), Math.floor(colors[apos].rgba[2] * 256)],
          tB,
          weights[bpos],
          settings.proximityImportance,
        ) + strokeReward(bpos, apos, pixelData, pixels);

        const bOnAH = heuristic(
          { x: ax, y: ay },
          { x: bx, y: by },
          [Math.floor(colors[bpos].rgba[0] * 256), Math.floor(colors[bpos].rgba[1] * 256), Math.floor(colors[bpos].rgba[2] * 256)],
          tA,
          weights[apos],
          settings.proximityImportance,
        ) + strokeReward(apos, bpos, pixelData, pixels);

        const improvementA = pixels[apos].h - bOnAH;
        const improvementB = pixels[bpos].h - aOnBH;

        if (improvementA + improvementB > 0) {
          // Swap
          const temp = pixels[apos];
          pixels[apos] = pixels[bpos];
          pixels[bpos] = temp;
          pixels[apos].h = aOnBH;
          pixels[bpos].h = bOnAH;
          swapsMade++;
        }
      }

      if (swapsMade > 0) {
        const assignments = pixels.map((p) => p.srcY * settings.sidelen + p.srcX);
        self.postMessage({
          type: 'update_assignments' as ProgressMsgType.UpdateAssignments,
          assignments,
        });
      }

      // Small delay to prevent UI blocking
      if (loopCount % 10 === 0) {
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
      }
    }
  }
};

export {};
