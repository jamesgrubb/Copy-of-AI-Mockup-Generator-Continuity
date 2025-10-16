import React, { useRef } from 'react';

interface ImageUploaderProps {
  onImageUpload: (file: File) => void;
  previewUrl: string | null;
  imageType: string | null;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageUpload, previewUrl, imageType }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onImageUpload(file);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-inner">
      <h2 className="text-xl font-semibold text-white mb-4">1. Upload Your Design</h2>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="image/png, image/jpeg, image/webp"
      />
      <div
        onClick={handleClick}
        className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:border-indigo-500 hover:bg-gray-700/50 transition-colors duration-300"
      >
        {previewUrl ? (
          <img src={previewUrl} alt="Preview" className="max-h-48 mx-auto rounded-md" />
        ) : (
          <div className="flex flex-col items-center text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p>Click to browse or drag & drop</p>
            <p className="text-sm text-gray-500">PNG, JPG, WEBP</p>
          </div>
        )}
      </div>
      {imageType && (
        <div className="mt-4 text-center bg-gray-700 text-indigo-300 text-sm font-medium py-2 px-4 rounded-full">
          Detected Format: <span className="font-bold capitalize">{imageType}</span>
        </div>
      )}
    </div>
  );
};

export default ImageUploader;
