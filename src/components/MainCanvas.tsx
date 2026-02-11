import { useEffect, useRef } from 'react';
import type { SeedPos, SeedColor } from '../types';
import { renderVoronoiOptimized } from '../rendering/voronoi';

interface MainCanvasProps {
  seeds: SeedPos[];
  colors: SeedColor[];
  width: number;
  height: number;
  className?: string;
  previewImage?: ImageData;
}

export function MainCanvas({
  seeds,
  colors,
  width,
  height,
  className = '',
  previewImage,
}: MainCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (previewImage) {
      ctx.putImageData(previewImage, 0, 0);
    } else if (seeds.length > 0 && colors.length > 0) {
      renderVoronoiOptimized(ctx, seeds, colors, width, height);
    }
  }, [seeds, colors, width, height, previewImage]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={className}
    />
  );
}
