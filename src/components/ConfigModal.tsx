import { useState, useRef, useEffect } from 'react';
import type { GenerationSettings, Algorithm, CropScale, UnprocessedPreset } from '../types';

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStart: (settings: GenerationSettings, source: UnprocessedPreset) => void;
}

const DEFAULT_RESOLUTION = 1024;

export function ConfigModal({ isOpen, onClose, onStart }: ConfigModalProps) {
  const [name, setName] = useState('my-obamify');
  const [algorithm, setAlgorithm] = useState<Algorithm>('genetic');
  const [proximityImportance, setProximityImportance] = useState(13);
  const [resolution, setResolution] = useState(DEFAULT_RESOLUTION);
  const [cropScale, setCropScale] = useState<CropScale>({ x: 0, y: 0, scale: 1 });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [sourceImage, setSourceImage] = useState<UnprocessedPreset | null>(null);

  useEffect(() => {
    if (!isOpen) {
      // Reset state when modal closes
      setName('my-obamify');
      setAlgorithm('genetic');
      setProximityImportance(13);
      setResolution(DEFAULT_RESOLUTION);
      setCropScale({ x: 0, y: 0, scale: 1 });
      setPreviewImage(null);
      setSourceImage(null);
    }
  }, [isOpen]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setPreviewImage(url);

    // Load image data
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, img.width, img.height);

      // Convert RGBA to RGB
      const rgbData = new Uint8Array((img.width * img.height) * 3);
      let rgbIdx = 0;
      for (let i = 0; i < imageData.data.length; i += 4) {
        rgbData[rgbIdx++] = imageData.data[i];
        rgbData[rgbIdx++] = imageData.data[i + 1];
        rgbData[rgbIdx++] = imageData.data[i + 2];
      }

      setSourceImage({
        name: file.name.replace(/\.[^/.]+$/, ''),
        width: img.width,
        height: img.height,
        sourceImg: rgbData,
      });
    };
    img.src = url;
  };

  const handleStart = () => {
    if (!sourceImage) {
      alert('Please select an image first');
      return;
    }

    const settings: GenerationSettings = {
      id: crypto.randomUUID(),
      name,
      proximityImportance,
      algorithm,
      sidelen: resolution,
      targetCropScale: cropScale,
      sourceCropScale: { x: 0, y: 0, scale: 1 },
    };

    onStart(settings, sourceImage);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-6">✨ Obamify New Image</h2>

          {/* Image selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">
              Source Image
            </label>
            <div className="flex gap-4 items-start">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept="image/*"
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
              >
                📁 Choose File
              </button>
              {previewImage && (
                <img
                  src={previewImage}
                  alt="Preview"
                  className="max-w-xs max-h-48 object-contain rounded border border-gray-600"
                />
              )}
            </div>
          </div>

          {/* Name */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              Preset Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Algorithm selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              Algorithm
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="algorithm"
                  value="genetic"
                  checked={algorithm === 'genetic'}
                  onChange={() => setAlgorithm('genetic')}
                  className="w-4 h-4"
                />
                <span>Genetic (Faster)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="algorithm"
                  value="optimal"
                  checked={algorithm === 'optimal'}
                  onChange={() => setAlgorithm('optimal')}
                  className="w-4 h-4"
                />
                <span>Optimal (Slower, Better Quality)</span>
              </label>
            </div>
          </div>

          {/* Resolution */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              Resolution: {resolution}x{resolution}
            </label>
            <input
              type="range"
              min={64}
              max={2048}
              step={64}
              value={resolution}
              onChange={(e) => setResolution(Number(e.target.value))}
              className="w-full"
            />
          </div>

          {/* Proximity importance */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              Proximity Importance: {proximityImportance}
            </label>
            <input
              type="range"
              min={1}
              max={50}
              value={proximityImportance}
              onChange={(e) => setProximityImportance(Number(e.target.value))}
              className="w-full"
            />
            <p className="text-xs text-gray-400 mt-1">
              Higher = keep pixel positions more important, Lower = match colors more
              important
            </p>
          </div>

          {/* Crop controls */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">
              Target Crop & Scale
            </label>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-gray-400">Zoom</label>
                <input
                  type="range"
                  min={1}
                  max={5}
                  step={0.1}
                  value={cropScale.scale}
                  onChange={(e) =>
                    setCropScale({ ...cropScale, scale: Number(e.target.value) })
                  }
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400">X Offset</label>
                <input
                  type="range"
                  min={-1}
                  max={1}
                  step={0.1}
                  value={cropScale.x}
                  onChange={(e) =>
                    setCropScale({ ...cropScale, x: Number(e.target.value) })
                  }
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400">Y Offset</label>
                <input
                  type="range"
                  min={-1}
                  max={1}
                  step={0.1}
                  value={cropScale.y}
                  onChange={(e) =>
                    setCropScale({ ...cropScale, y: Number(e.target.value) })
                  }
                  className="w-full"
                />
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleStart}
              disabled={!sourceImage}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded font-medium transition-colors"
            >
              🚀 Start Transformation
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
