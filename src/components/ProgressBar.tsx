
interface ProgressBarProps {
  isOpen: boolean;
  progress: number;
  previewImage?: ImageData;
  message?: string;
  onCancel?: () => void;
}

export function ProgressBar({
  isOpen,
  progress,
  previewImage,
  message,
  onCancel,
}: ProgressBarProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg p-6 max-w-lg w-full">
        <h3 className="text-xl font-bold mb-4">⚙️ Processing...</h3>

        {/* Progress bar */}
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-400 mb-2">
            <span>Progress</span>
            <span>{Math.round(progress * 100)}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-4 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        </div>

        {/* Preview */}
        {previewImage && (
          <div className="mb-4">
            <p className="text-sm text-gray-400 mb-2">Live Preview:</p>
            <div className="bg-black rounded overflow-hidden flex justify-center">
              <canvas
                ref={(canvas) => {
                  if (canvas && previewImage) {
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                      canvas.width = previewImage.width;
                      canvas.height = previewImage.height;
                      ctx.putImageData(previewImage, 0, 0);
                    }
                  }
                }}
                className="max-w-full max-h-64"
              />
            </div>
          </div>
        )}

        {/* Message */}
        {message && (
          <p className="text-sm text-gray-300 mb-4">{message}</p>
        )}

        {/* Cancel button */}
        {onCancel && (
          <button
            onClick={onCancel}
            className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 rounded font-medium transition-colors"
          >
            ✕ Cancel
          </button>
        )}
      </div>
    </div>
  );
}
