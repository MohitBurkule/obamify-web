import { useRef, useEffect, useState } from 'react';
import type { SeedPos, SeedColor } from '../types';
import { pointToLineDist } from '../utils/math';

interface DrawingModeProps {
  seeds: SeedPos[];
  colors: SeedColor[];
  onColorUpdate: (index: number, color: [number, number, number, number]) => void;
  onPixelUpdate: (index: number, strokeId: number, dstForce: number) => void;
  width: number;
  height: number;
}

const DRAWING_COLORS: [number, number, number, number][] = [
  [1, 0, 0, 0.5], // Red
  [0, 1, 0, 0.5], // Green
  [0, 0, 1, 0.5], // Blue
  [1, 1, 0, 0.5], // Yellow
  [0, 0, 0, 0.5], // Black/Eraser
];

export function DrawingMode({
  seeds,
  colors,
  onColorUpdate,
  onPixelUpdate,
  width,
  height,
}: DrawingModeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedColor, setSelectedColor] = useState(0);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastPos, setLastPos] = useState<{ x: number; y: number } | null>(null);
  const strokeCountRef = useRef(0);

  // Draw canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear and redraw
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);

    // Draw pixels as colored rectangles
    const pixelSize = width / Math.sqrt(seeds.length);

    for (let i = 0; i < seeds.length; i++) {
      const [x, y] = seeds[i].xy;
      const [r, g, b, a] = colors[i].rgba;

      ctx.fillStyle = `rgba(${r * 255}, ${g * 255}, ${b * 255}, ${a})`;
      ctx.fillRect(
        Math.floor(x - pixelSize / 2),
        Math.floor(y - pixelSize / 2),
        Math.ceil(pixelSize),
        Math.ceil(pixelSize),
      );
    }
  }, [seeds, colors, width, height]);

  const getCanvasPos = (e: React.MouseEvent<HTMLCanvasElement>): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const scaleX = width / rect.width;
    const scaleY = height / rect.height;

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handleDraw = (pos: { x: number; y: number }) => {
    const pixelSize = width / Math.sqrt(seeds.length);
    const brushSize = selectedColor === 4 ? 30 : 50; // Eraser is smaller
    const transition = 10;
    const color = DRAWING_COLORS[selectedColor];

    for (let i = 0; i < seeds.length; i++) {
      const [sx, sy] = seeds[i].xy;
      const prev = lastPos || pos;

      const dist = pointToLineDist(sx, sy, prev.x, prev.y, pos.x, pos.y);

      if (dist < brushSize + transition) {
        const alpha = ((brushSize + transition - dist) / transition) * color[3];
        const blend = (c1: number, c2: number, a: number) =>
          (1 - a) * c1 + a * c2;

        const [r, g, b] = colors[i].rgba;
        const newColor: [number, number, number, number] = [
          blend(r, color[0], alpha),
          blend(g, color[1], alpha),
          blend(b, color[2], alpha),
          1,
        ];

        onColorUpdate(i, newColor);

        const strokeId = isDrawing ? strokeCountRef.current : ++strokeCountRef.current;
        const dstForce = 0.05 + Math.sqrt(strokeId * 0.004);

        onPixelUpdate(i, strokeId, dstForce);
      }
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getCanvasPos(e);
    if (!pos) return;

    setIsDrawing(true);
    setLastPos(null);
    handleDraw(pos);
    setLastPos(pos);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const pos = getCanvasPos(e);
    if (!pos) return;

    handleDraw(pos);
    setLastPos(pos);
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
    setLastPos(null);
  };

  const handleMouseLeave = () => {
    setIsDrawing(false);
    setLastPos(null);
  };

  // Keyboard shortcuts for color selection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key;
      if (key >= '1' && key <= '5') {
        setSelectedColor(Number(key) - 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="flex flex-col gap-4">
      {/* Color palette */}
      <div className="flex gap-2 items-center">
        <span className="text-sm font-medium">Colors (1-5):</span>
        {DRAWING_COLORS.map((color, idx) => (
          <button
            key={idx}
            onClick={() => setSelectedColor(idx)}
            className={`w-10 h-10 rounded border-2 transition-all ${
              selectedColor === idx
                ? 'border-white scale-110'
                : 'border-gray-600 hover:scale-105'
            }`}
            style={{
              backgroundColor: `rgba(${color[0] * 255}, ${color[1] * 255}, ${color[2] * 255}, ${color[3]})`,
            }}
            title={`Color ${idx + 1} (Press ${idx + 1})`}
          />
        ))}
      </div>

      {/* Instructions */}
      <div className="text-sm text-gray-400">
        <p>🖱️ Click and drag to draw on the canvas</p>
        <p>⌨️ Press keys 1-5 to change colors</p>
        <p>🎨 Watch pixels morph in real-time!</p>
      </div>

      {/* Drawing canvas */}
      <div className="relative bg-black rounded overflow-hidden">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="w-full cursor-crosshair"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
        />
      </div>
    </div>
  );
}
