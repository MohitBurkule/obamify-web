import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import type { SeedPos, SeedColor } from '../types';
import { renderVoronoiOptimized } from '../rendering/voronoi';

// Canvas component with ref forwarding
interface MainCanvasProps {
  seeds: SeedPos[];
  colors: SeedColor[];
  width: number;
  height: number;
  className?: string;
  previewImage?: ImageData;
}

const MainCanvas = forwardRef<HTMLCanvasElement, MainCanvasProps>(
  ({ seeds, colors, width, height, className = '', previewImage }, ref) => {
    const internalRef = useRef<HTMLCanvasElement | null>(null);

    // Expose ref to parent
    useImperativeHandle<HTMLCanvasElement | null, HTMLCanvasElement | null>(ref, () => internalRef.current);

  useEffect(() => {
    const canvas = internalRef.current;
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
      ref={internalRef}
      width={width}
      height={height}
      className={className}
    />
  );
});

MainCanvas.displayName = 'MainCanvas';
