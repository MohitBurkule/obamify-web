import type { Preset } from '../types';
import { loadImage } from './image';

// Generate identity assignments for a given size
function generateIdentityAssignments(size: number): number[] {
  return Array.from({ length: size * size }, (_, i) => i);
}

// Load all available presets
export async function loadPresets(): Promise<Preset[]> {
  try {
    const response = await fetch('/presets/index.json');
    if (!response.ok) {
      // If index doesn't exist, try common preset names
      const commonNames = ['wisetree', 'blackhole', 'cat', 'cat2', 'colorful'];
      const presets: Preset[] = [];

      for (const name of commonNames) {
        try {
          const preset = await loadPreset(name);
          if (preset) presets.push(preset);
        } catch (e) {
          // Skip missing presets
          console.warn(`Could not load preset: ${name}`);
        }
      }
      return presets;
    }

    const presetNames: string[] = await response.json();
    const presetPromises = presetNames.map((name) => loadPreset(name));
    const results = await Promise.all(presetPromises);
    return results.filter((p) => p !== null) as Preset[];
  } catch (error) {
    console.error('Failed to load presets:', error);
    return [];
  }
}

async function loadPreset(name: string): Promise<Preset | null> {
  try {
    const sourceImg = await loadImage(`/presets/${name}/source.png`);
    console.log(`Loaded image for preset ${name}:`, sourceImg.width, 'x', sourceImg.height);

    // Try to load assignments, fall back to identity
    let assignments: number[];
    try {
      const response = await fetch(`/presets/${name}/assignments.json`);
      if (response.ok) {
        assignments = await response.json();
        console.log(`Loaded assignments for preset ${name}:`, assignments.length, 'entries');
      } else {
        console.warn(`Assignments not found for ${name}, using identity`);
        throw new Error('Assignments not found');
      }
    } catch (e) {
      // Generate identity assignments based on image size
      const size = Math.sqrt(sourceImg.width * sourceImg.height);
      console.log(`Generating identity assignments for ${name}:`, size, 'x', size);
      assignments = generateIdentityAssignments(size);
    }

    return {
      inner: sourceImg,
      assignments,
    };
  } catch (error) {
    console.error(`Failed to load preset ${name}:`, error);
    return null;
  }
}

// Save preset to browser storage (IndexedDB would be better for large data)
export async function savePreset(preset: Preset): Promise<void> {
  // For now, just trigger download
  const { inner, assignments } = preset;

  // Save source image
  const sourceBlob = await rgbToBlob(inner.sourceImg, inner.width, inner.height);
  downloadBlob(sourceBlob, `${inner.name}_source.png`);

  // Save assignments
  const assignmentsJson = JSON.stringify(assignments);
  const assignmentsBlob = new Blob([assignmentsJson], { type: 'application/json' });
  downloadBlob(assignmentsBlob, `${inner.name}_assignments.json`);
}

function rgbToBlob(rgb: Uint8Array, width: number, height: number): Promise<Blob> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    const imageData = new ImageData(
      new Uint8ClampedArray(Array.from(rgb).flatMap((v, i) => {
        const idx = Math.floor(i / 3);
        const pixelIdx = idx * 4;
        const channelIdx = i % 3;
        if (channelIdx === 0) return [rgb[i], 255];
        if (channelIdx === 1) return [rgb[i], 255];
        return [rgb[i], 255];
      }).flat()),
      width,
      height,
    );

    ctx.putImageData(imageData, 0, 0);
    canvas.toBlob((blob) => resolve(blob!), 'image/png');
  });
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
