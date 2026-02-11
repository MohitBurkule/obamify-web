import { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import type {
  SeedPos,
  SeedColor,
  Preset,
  ProgressMsg,
  UnprocessedPreset,
  GenerationSettings,
  GuiState,
} from './types';
import { ControlPanel } from './components/ControlPanel';
import { ConfigModal } from './components/ConfigModal';
import { ProgressBar } from './components/ProgressBar';
import { DrawingMode } from './components/DrawingMode';
import { Sim } from './simulation/Sim';
import { CellBody } from './simulation/CellBody';
import { loadPresets } from './utils/preset';
import { DEFAULT_RESOLUTION } from './types';
import { useGifRecorder } from './hooks/useGifRecorder';
import { renderVoronoiOptimized } from './rendering/voronoi';

// Worker type for algorithms
interface AlgorithmWorker {
  postMessage: (message: any, transfer?: any[]) => void;
  terminate: () => void;
  onmessage: ((e: MessageEvent<any>) => void) | null;
}

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
  },
);

MainCanvas.displayName = 'MainCanvas';

function App() {
  // GUI State
  const [gui, setGui] = useState<GuiState>({
    presets: [],
    currentPreset: 0,
    animate: true,
    reverse: false,
    mode: 'transform',
    drawingColor: [1, 0, 0, 0.5],
    showConfig: false,
    showProgress: false,
    progress: 0,
  });

  // Simulation state
  const [seeds, setSeeds] = useState<SeedPos[]>([]);
  const [colors, setColors] = useState<SeedColor[]>([]);
  const [sim, setSim] = useState<Sim | null>(null);
  const [previewImage, setPreviewImage] = useState<ImageData | undefined>(undefined);

  // Workers
  const algorithmWorkerRef = useRef<AlgorithmWorker | null>(null);

  // GIF recording
  const { isRecording, startRecording, captureFrame, finishRecording } = useGifRecorder();

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Load presets on mount
  useEffect(() => {
    loadPresets().then((loadedPresets) => {
      setGui((prev) => ({ ...prev, presets: loadedPresets }));
    });
  }, []);

  // Initialize simulation when presets load
  useEffect(() => {
    if (gui.presets.length === 0) return;

    const preset = gui.presets[gui.currentPreset];
    if (!preset) return;

    initSimulation(preset);
  }, [gui.presets, gui.currentPreset]);

  // Animation loop
  useEffect(() => {
    if (!gui.animate || !sim || gui.mode === 'draw') return;

    let animationId: number;
    let lastFrameTime = performance.now();
    const targetFPS = 60;
    const frameTime = 1000 / targetFPS;

    const animate = () => {
      const now = performance.now();
      const elapsed = now - lastFrameTime;

      if (elapsed >= frameTime) {
        // Update simulation
        const newSeeds = [...seeds];
        sim.update(newSeeds, DEFAULT_RESOLUTION);
        setSeeds(newSeeds);

        // Capture frame for GIF
        if (isRecording && canvasRef.current) {
          captureFrame(canvasRef.current);
        }

        lastFrameTime = now - (elapsed % frameTime);
      }

      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationId);
  }, [gui.animate, sim, seeds, isRecording]);

  const initSimulation = (preset: Preset) => {
    const { inner, assignments } = preset;
    const seedCount = inner.width * inner.height;
    const gridSize = Math.sqrt(seedCount);
    const pixelSize = DEFAULT_RESOLUTION / gridSize;

    // Initialize seeds and colors
    const newSeeds: SeedPos[] = [];
    const newColors: SeedColor[] = [];

    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        const i = y * gridSize + x;
        const idx = i * 3;
        newSeeds.push({
          xy: [(x + 0.5) * pixelSize, (y + 0.5) * pixelSize],
        });
        newColors.push({
          rgba: [
            inner.sourceImg[idx] / 255,
            inner.sourceImg[idx + 1] / 255,
            inner.sourceImg[idx + 2] / 255,
            1.0,
          ],
        });
      }
    }

    // Create simulation with cells
    const newSim = new Sim(inner.name);
    newSim.cells = Array.from({ length: seedCount }, () => new CellBody(0, 0, 0, 0, 0.13));
    newSim.setAssignments(assignments, DEFAULT_RESOLUTION);

    // Start animation from source positions (not destination)
    newSim.preparePlay(newSeeds, false);

    setSeeds(newSeeds);
    setColors(newColors);
    setSim(newSim);

    console.log(`Initialized simulation for ${inner.name}:`, {
      seedCount,
      gridSize,
      pixelSize,
      assignments: assignments.slice(0, 10) + '...',
      firstSeedPos: newSeeds[0],
      firstCellSrc: `(${newSim.cells[0].srcx.toFixed(2)}, ${newSim.cells[0].srcy.toFixed(2)})`,
      firstCellDst: `(${newSim.cells[0].dstx.toFixed(2)}, ${newSim.cells[0].dsty.toFixed(2)})`,
    });
  };

  const handlePresetChange = (index: number) => {
    setGui((prev) => ({ ...prev, currentPreset: index }));
  };

  const handleToggleAnimate = () => {
    setGui((prev) => ({ ...prev, animate: !prev.animate }));
  };

  const handleToggleReverse = () => {
    setGui((prev) => {
      const newReverse = !prev.reverse;
      sim?.preparePlay(seeds, newReverse);
      return { ...prev, reverse: newReverse };
    });
  };

  const handleOpenConfig = () => {
    setGui((prev) => ({ ...prev, showConfig: true }));
  };

  const handleCloseConfig = () => {
    setGui((prev) => ({ ...prev, showConfig: false }));
  };

  const handleToggleMode = () => {
    setGui((prev) => {
      const newMode = prev.mode === 'transform' ? 'draw' : 'transform';
      if (newMode === 'draw' && sim) {
        // Reset simulation for drawing
        sim.preparePlay(seeds, prev.reverse);
      }
      return { ...prev, mode: newMode, animate: newMode === 'transform' };
    });
  };

  const handleStartTransformation = (settings: GenerationSettings, source: UnprocessedPreset) => {
    // Start algorithm worker
    if (algorithmWorkerRef.current) {
      algorithmWorkerRef.current.terminate();
    }

    const worker = new Worker(
      new URL('./workers/algorithms.ts', import.meta.url),
      { type: 'module' },
    ) as AlgorithmWorker;

    worker.onmessage = (e: MessageEvent<ProgressMsg>) => {
      const msg = e.data;

      switch (msg.type) {
        case 'progress':
          setGui((prev) => ({ ...prev, progress: msg.value }));
          break;
        case 'update_preview':
          // Convert data to ImageData
          if (msg.width && msg.height && msg.data) {
            const imageData = new ImageData(
              new Uint8ClampedArray(
                msg.data.flatMap((rgb, i) => {
                  if (i % 3 === 0) return [rgb, 0, 0, 0]; // R
                  if (i % 3 === 1) return [0, rgb, 0, 0]; // G
                  return [0, 0, rgb, 0]; // B
                }),
              ),
              msg.width,
              msg.height,
            );
            setPreviewImage(imageData);
          }
          break;
        case 'done':
          // Add new preset and switch to it
          const newPreset: Preset = {
            inner: msg.preset.inner,
            assignments: msg.preset.assignments,
          };
          setGui((prev) => ({
            ...prev,
            presets: [...prev.presets, newPreset],
            currentPreset: prev.presets.length,
            showProgress: false,
          }));
          worker.terminate();
          algorithmWorkerRef.current = null;
          break;
        case 'error':
          console.error('Algorithm error:', msg.message);
          setGui((prev) => ({
            ...prev,
            errorMessage: msg.message,
            showProgress: false,
          }));
          break;
        case 'cancelled':
          setGui((prev) => ({ ...prev, showProgress: false }));
          worker.terminate();
          algorithmWorkerRef.current = null;
          break;
      }
    };

    worker.postMessage({ type: 'process', source, settings });
    algorithmWorkerRef.current = worker;

    setGui((prev) => ({
      ...prev,
      showProgress: true,
      progress: 0,
      errorMessage: undefined,
    }));
  };

  const handleCancelProcessing = () => {
    algorithmWorkerRef.current?.postMessage({ type: 'cancel' });
  };

  const handleColorUpdate = useCallback((index: number, color: [number, number, number, number]) => {
    setColors((prev) => {
      const newColors = [...prev];
      newColors[index] = { rgba: color };
      return newColors;
    });
  }, []);

  const handlePixelUpdate = useCallback((index: number, strokeId: number, dstForce: number) => {
    if (!sim) return;
    sim.cells[index].strokeId = strokeId;
    sim.cells[index].dstForce = dstForce;
    sim.cells[index].age = 0;
  }, [sim]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-gray-800 p-4 shadow-lg">
        <h1 className="text-2xl font-bold text-center">
          🎨 Obamify - Transform Any Image
        </h1>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col p-4 gap-4">
        {/* Controls */}
        <ControlPanel
          gui={gui}
          presets={gui.presets}
          onPresetChange={handlePresetChange}
          onToggleAnimate={handleToggleAnimate}
          onToggleReverse={handleToggleReverse}
          onOpenConfig={handleOpenConfig}
          onToggleMode={handleToggleMode}
        />

        {/* Canvas / Drawing Mode */}
        <div className="flex-1 flex justify-center items-center bg-black rounded-lg overflow-hidden">
          {gui.mode === 'transform' ? (
            <MainCanvas
              ref={canvasRef}
              seeds={seeds}
              colors={colors}
              width={DEFAULT_RESOLUTION}
              height={DEFAULT_RESOLUTION}
              className="max-w-full max-h-full"
              previewImage={previewImage}
            />
          ) : (
            <DrawingMode
              seeds={seeds}
              colors={colors}
              onColorUpdate={handleColorUpdate}
              onPixelUpdate={handlePixelUpdate}
              width={DEFAULT_RESOLUTION}
              height={DEFAULT_RESOLUTION}
            />
          )}
        </div>

        {/* GIF Recording Controls */}
        <div className="flex justify-center gap-4">
          {isRecording ? (
            <button
              onClick={() => finishRecording(gui.presets[gui.currentPreset]?.inner.name || 'obamify')}
              className="px-6 py-2 bg-red-600 hover:bg-red-700 rounded font-medium"
            >
              ⏹ Stop Recording
            </button>
          ) : (
            <button
              onClick={() =>
                startRecording({ width: DEFAULT_RESOLUTION, height: DEFAULT_RESOLUTION })
              }
              className="px-6 py-2 bg-green-600 hover:bg-green-700 rounded font-medium"
            >
              🔴 Record GIF
            </button>
          )}
        </div>
      </main>

      {/* Modals */}
      <ConfigModal
        isOpen={gui.showConfig}
        onClose={handleCloseConfig}
        onStart={handleStartTransformation}
      />

      <ProgressBar
        isOpen={gui.showProgress}
        progress={gui.progress}
        previewImage={previewImage}
        onCancel={handleCancelProcessing}
      />

      {/* Error display */}
      {gui.errorMessage && (
        <div className="fixed bottom-4 right-4 bg-red-600 text-white p-4 rounded-lg shadow-lg max-w-md">
          <p className="font-bold mb-2">Error</p>
          <p className="text-sm">{gui.errorMessage}</p>
          <button
            onClick={() => setGui((prev) => ({ ...prev, errorMessage: undefined }))}
            className="mt-3 px-3 py-1 bg-white/20 hover:bg-white/30 rounded"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
