import type { UnprocessedPreset, CropScale } from '../types';
import { clamp } from './math';

// Extract RGB pixels from image data
export function extractRGB(data: Uint8Array, width: number, height: number): [number, number, number][] {
  const pixels: [number, number, number][] = [];
  for (let i = 0; i < data.length; i += 3) {
    pixels.push([data[i], data[i + 1], data[i + 2]]);
  }
  return pixels;
}

// Load image from URL and return as UnprocessedPreset
export async function loadImage(url: string): Promise<UnprocessedPreset> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous'; // Handle CORS if needed

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Failed to get 2D context'));
        return;
      }

      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, img.width, img.height);

      // Detect if image is grayscale (all RGB channels are same)
      let isGrayscale = true;
      for (let i = 0; i < imageData.data.length; i += 4) {
        if (imageData.data[i] !== imageData.data[i + 1] ||
            imageData.data[i] !== imageData.data[i + 2]) {
          isGrayscale = false;
          break;
        }
      }

      // Convert to RGB (grayscale will have same value in all 3 channels)
      const rgbData = new Uint8Array((img.width * img.height) * 3);
      let rgbIdx = 0;
      for (let i = 0; i < imageData.data.length; i += 4) {
        if (isGrayscale) {
          // For grayscale, use the same value for all RGB channels
          rgbData[rgbIdx++] = imageData.data[i];
          rgbData[rgbIdx++] = imageData.data[i];
          rgbData[rgbIdx++] = imageData.data[i];
        } else {
          // For color images, skip alpha channel
          rgbData[rgbIdx++] = imageData.data[i];
          rgbData[rgbIdx++] = imageData.data[i + 1];
          rgbData[rgbIdx++] = imageData.data[i + 2];
        }
      }

      console.log(`Loaded image: ${url}`, {
        width: img.width,
        height: img.height,
        isGrayscale,
        pixels: img.width * img.height
      });

      resolve({
        name: url.split('/').pop()?.replace(/\.[^/.]+$/, '') || 'unknown',
        width: img.width,
        height: img.height,
        sourceImg: rgbData,
      });
    };

    img.onerror = () => {
      reject(new Error(`Failed to load image: ${url}`));
    };

    img.src = url;
  });
}

// Load weights image (for default target)
export async function loadWeights(url: string, width: number, height: number): Promise<number[]> {
  const response = await fetch(url);
  const blob = await response.blob();
  const bitmap = await createImageBitmap(blob);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // Draw scaled to target resolution
  ctx.drawImage(bitmap, 0, 0, width, height);
  const imageData = ctx.getImageData(0, 0, width, height);

  const weights: number[] = [];
  for (let i = 0; i < imageData.data.length; i += 4) {
    weights.push(imageData.data[i]); // Red channel contains weight
  }
  return weights;
}

// Apply crop/scale transform to image
// Matches Rust: src/app/calculate/util.rs:90-117
export function applyCropScale(
  sourceImg: Uint8Array,
  sourceWidth: number,
  sourceHeight: number,
  targetSideLen: number,
  cropScale: CropScale,
): Uint8Array {
  const s = Math.max(1.0, cropScale.scale);
  const baseSide = Math.min(sourceWidth, sourceHeight);
  let cropSide = Math.floor(Math.max(1.0, Math.min(baseSide / s, sourceWidth, sourceHeight)));

  const maxOffX = Math.max(0, sourceWidth - cropSide);
  const maxOffY = Math.max(0, sourceHeight - cropSide);

  const xn = clamp(cropScale.x, -1.0, 1.0) * 0.5 + 0.5;
  const yn = clamp(cropScale.y, -1.0, 1.0) * 0.5 + 0.5;

  const x0 = Math.floor(xn * maxOffX);
  const y0 = Math.floor(yn * maxOffY);

  // Create canvas for cropping
  const canvas = document.createElement('canvas');
  canvas.width = cropSide;
  canvas.height = cropSide;
  const ctx = canvas.getContext('2d')!;

  // Put source image on temporary canvas
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = sourceWidth;
  tempCanvas.height = sourceHeight;
  const tempCtx = tempCanvas.getContext('2d')!;

  // Convert RGB to RGBA for ImageData
  const rgbaData = new Uint8ClampedArray(sourceWidth * sourceHeight * 4);
  for (let i = 0, j = 0; i < sourceImg.length; i += 3, j += 4) {
    rgbaData[j] = sourceImg[i];
    rgbaData[j + 1] = sourceImg[i + 1];
    rgbaData[j + 2] = sourceImg[i + 2];
    rgbaData[j + 3] = 255;
  }

  const tempImageData = new ImageData(rgbaData, sourceWidth, sourceHeight);
  tempCtx.putImageData(tempImageData, 0, 0);

  // Crop the image
  const croppedData = tempCtx.getImageData(x0, y0, cropSide, cropSide);
  ctx.putImageData(croppedData, 0, 0);

  // Resize if needed
  if (cropSide === targetSideLen) {
    return sourceImg; // Already correct size
  }

  const resizedCanvas = document.createElement('canvas');
  resizedCanvas.width = targetSideLen;
  resizedCanvas.height = targetSideLen;
  const resizedCtx = resizedCanvas.getContext('2d')!;

  // Use better quality resizing
  resizedCtx.imageSmoothingEnabled = true;
  resizedCtx.imageSmoothingQuality = 'high';
  resizedCtx.drawImage(canvas, 0, 0, targetSideLen, targetSideLen);

  const resizedImageData = resizedCtx.getImageData(0, 0, targetSideLen, targetSideLen);
  const result = new Uint8Array(targetSideLen * targetSideLen * 3);
  let resultIdx = 0;
  for (let i = 0; i < resizedImageData.data.length; i += 4) {
    result[resultIdx++] = resizedImageData.data[i];
    result[resultIdx++] = resizedImageData.data[i + 1];
    result[resultIdx++] = resizedImageData.data[i + 2];
  }

  return result;
}

// Create new image from assignments
export function makeNewImage(
  sourcePixels: [number, number, number][],
  assignments: number[],
  width: number,
  height: number,
): Uint8Array {
  const img = new Uint8Array(width * height * 3);
  for (let targetIdx = 0; targetIdx < assignments.length; targetIdx++) {
    const sourceIdx = assignments[targetIdx];
    const [r, g, b] = sourcePixels[sourceIdx];
    const base = targetIdx * 3;
    img[base] = r;
    img[base + 1] = g;
    img[base + 2] = b;
  }
  return img;
}
