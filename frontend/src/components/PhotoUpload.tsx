import React, { useState, useRef } from "react";
import { Camera, Upload, X } from "lucide-react";

interface PhotoUploadProps {
  onUpload: (file: File) => Promise<string>;
  existingPhoto?: string;
  onRemove?: () => void;
}

const PhotoUpload: React.FC<PhotoUploadProps> = ({
  onUpload,
  existingPhoto,
  onRemove,
}) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageLoadError, setImageLoadError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setError("File size must be less than 5MB");
      return;
    }

    setUploading(true);
    setError(null);

    try {
      await onUpload(file);
      setImageLoadError(false);
    } catch (err) {
      console.error("Upload failed:", err);
      setError("Failed to upload photo. Please try again.");
    } finally {
      setUploading(false);
      // Clear the input so the same file can be selected again if needed
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleImageError = () => {
    console.error("Image failed to load:", existingPhoto);
    setImageLoadError(true);
  };

  const handleRemovePhoto = () => {
    if (onRemove) {
      onRemove();
      setImageLoadError(false);
      setError(null);
    }
  };

  return (
    <div className="space-y-3">
      {/* Upload Button */}
      <div className="flex items-center space-x-3">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center px-3 py-2 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-sm"
        >
          {uploading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 dark:border-blue-300 mr-2"></div>
              Uploading...
            </>
          ) : (
            <>
              <Camera className="h-4 w-4 mr-2" />
              Upload Photo
            </>
          )}
        </button>

        {existingPhoto && !imageLoadError && (
          <button
            type="button"
            onClick={handleRemovePhoto}
            className="flex items-center px-3 py-2 bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-800 transition-colors font-semibold text-sm"
          >
            <X className="h-4 w-4 mr-2" />
            Remove
          </button>
        )}
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Error Message */}
      {error && (
        <div className="text-red-600 dark:text-red-400 text-sm font-medium">
          {error}
        </div>
      )}

      {/* Photo Preview */}
      {existingPhoto && !imageLoadError && (
        <div className="relative inline-block">
          <img
            src={existingPhoto}
            alt="Expense receipt"
            className="w-32 h-32 object-cover rounded-lg border-2 border-slate-200 dark:border-slate-600"
            onError={handleImageError}
            onLoad={() => setImageLoadError(false)}
          />
          <button
            type="button"
            onClick={handleRemovePhoto}
            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Fallback for broken images */}
      {existingPhoto && imageLoadError && (
        <div className="w-32 h-32 bg-slate-100 dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 rounded-lg flex items-center justify-center">
          <div className="text-center">
            <Camera className="h-8 w-8 text-slate-400 mx-auto mb-1" />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Image unavailable
            </p>
          </div>
        </div>
      )}

      {/* Upload Instructions */}
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Supported formats: JPG, PNG, GIF. Max size: 5MB.
      </p>
    </div>
  );
};

export default PhotoUpload;
