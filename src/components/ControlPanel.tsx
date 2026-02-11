import type { GuiState, Preset } from '../types';

interface ControlPanelProps {
  gui: GuiState;
  presets: Preset[];
  onPresetChange: (index: number) => void;
  onToggleAnimate: () => void;
  onToggleReverse: () => void;
  onOpenConfig: () => void;
  onToggleMode: () => void;
}

export function ControlPanel({
  gui,
  presets,
  onPresetChange,
  onToggleAnimate,
  onToggleReverse,
  onOpenConfig,
  onToggleMode,
}: ControlPanelProps) {
  const currentPreset = presets[gui.currentPreset];

  return (
    <div className="flex flex-wrap items-center gap-4 p-4 bg-gray-800 rounded-lg">
      {/* Preset selector */}
      <div className="flex items-center gap-2">
        <label htmlFor="preset-select" className="text-sm font-medium">
          Preset:
        </label>
        <select
          id="preset-select"
          value={gui.currentPreset}
          onChange={(e) => onPresetChange(Number(e.target.value))}
          className="bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {presets.map((preset, idx) => (
            <option key={idx} value={idx}>
              {preset.inner.name}
            </option>
          ))}
        </select>
      </div>

      {/* Mode toggle */}
      <button
        onClick={onToggleMode}
        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded font-medium transition-colors"
      >
        {gui.mode === 'transform' ? '🎨 Drawing Mode' : '🖼️ Transform Mode'}
      </button>

      {/* Play/Pause */}
      <button
        onClick={onToggleAnimate}
        className={`px-4 py-2 rounded font-medium transition-colors ${
          gui.animate
            ? 'bg-yellow-600 hover:bg-yellow-700'
            : 'bg-green-600 hover:bg-green-700'
        }`}
      >
        {gui.animate ? '⏸ Pause' : '▶ Play'}
      </button>

      {/* Reverse toggle */}
      <button
        onClick={onToggleReverse}
        className={`px-4 py-2 rounded font-medium transition-colors ${
          gui.reverse
            ? 'bg-purple-600 hover:bg-purple-700'
            : 'bg-gray-700 hover:bg-gray-600'
        }`}
      >
        {gui.reverse ? '↩️ Reverse' : '↪️ Forward'}
      </button>

      {/* Obamify new image */}
      <button
        onClick={onOpenConfig}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded font-medium transition-colors"
      >
        ✨ Obamify New Image
      </button>

      {/* Current preset info */}
      {currentPreset && (
        <div className="text-sm text-gray-400 ml-auto">
          {currentPreset.inner.name} ({currentPreset.inner.width}x{currentPreset.inner.height})
        </div>
      )}
    </div>
  );
}
