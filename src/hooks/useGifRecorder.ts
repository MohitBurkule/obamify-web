import { useState, useRef, useCallback } from 'react';

// GIF encoder worker (simplified - normally you'd use gif.js)
// For now, we'll capture frames and create a simple animated GIF

interface GIFRecorderOptions {
  width: number;
  height: number;
  quality?: number;
  frameRate?: number;
}

export function useGifRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const framesRef = useRef<ImageData[]>([]);
  const startTimeRef = useRef<number>(0);
  const optionsRef = useRef<GIFRecorderOptions | null>(null);

  const startRecording = useCallback((options: GIFRecorderOptions) => {
    framesRef.current = [];
    startTimeRef.current = Date.now();
    optionsRef.current = options;
    setIsRecording(true);
  }, []);

  const captureFrame = useCallback((canvas: HTMLCanvasElement) => {
    if (!isRecording) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    framesRef.current.push(imageData);
  }, [isRecording]);

  const finishRecording = useCallback((filename: string = 'obamify') => {
    if (framesRef.current.length === 0) return;

    // For a simple implementation, we'll save individual frames
    // In production, you'd use gif.js or a similar library

    const frames = framesRef.current;
    const duration = Date.now() - startTimeRef.current;

    console.log(`Captured ${frames.length} frames over ${duration}ms`);

    // Create a simple download link for first frame as preview
    const canvas = document.createElement('canvas');
    canvas.width = frames[0].width;
    canvas.height = frames[0].height;
    const ctx = canvas.getContext('2d')!;

    // Combine all frames into a simple animation
    let frameIndex = 0;
    const displayFrame = () => {
      ctx.putImageData(frames[frameIndex], 0, 0);
      frameIndex = (frameIndex + 1) % frames.length;
      requestAnimationFrame(displayFrame);
    };

    // Save first frame as PNG
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}_frame.png`;
        a.click();
        URL.revokeObjectURL(url);
      }
    }, 'image/png');

    // TODO: Use gif.js for proper GIF encoding
    // Example:
    // import GIF from 'gif.js';
    // const gif = new GIF({
    //   workers: 2,
    //   quality: 10,
    //   width: optionsRef.current?.width || 400,
    //   height: optionsRef.current?.height || 400,
    //   workerScript: '/gif.worker.js'
    // });
    // frames.forEach(frame => gif.addFrame(frame, { delay: 100 }));
    // gif.on('finished', (blob) => {
    //   // Download blob
    // });
    // gif.render();

    setIsRecording(false);
    framesRef.current = [];
  }, [isRecording]);

  return {
    isRecording,
    startRecording,
    captureFrame,
    finishRecording,
  };
}
