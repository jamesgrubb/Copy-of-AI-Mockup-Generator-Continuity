import React from 'react';

interface MockupDisplayProps {
  mockupUrl: string | null;
  isLoading: boolean;
  error: string | null;
  downloadFilename?: string;
}

const LoadingSpinner: React.FC = () => (
    <div className="flex flex-col items-center justify-center text-center text-gray-300">
        <svg className="animate-spin h-12 w-12 text-indigo-400 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="text-lg font-semibold">Generating your masterpiece...</p>
        <p className="text-sm text-gray-400">The AI is working its magic. This may take a moment.</p>
    </div>
);

const Placeholder: React.FC = () => (
    <div className="flex flex-col items-center justify-center text-center text-gray-500">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        <h3 className="text-xl font-medium">Your Mockup Will Appear Here</h3>
        <p className="mt-1 text-gray-400">Upload an image and choose a style to get started.</p>
    </div>
);

const MockupDisplay: React.FC<MockupDisplayProps> = ({ mockupUrl, isLoading, error, downloadFilename }) => {
  return (
    <div className="w-full h-full bg-gray-900/50 rounded-lg flex items-center justify-center p-4 min-h-[400px] lg:min-h-0">
      <div className="w-full h-full border-2 border-dashed border-gray-700 rounded-lg flex items-center justify-center">
        {isLoading ? (
          <LoadingSpinner />
        ) : error ? (
          <div className="text-center text-red-400 bg-red-900/50 p-6 rounded-lg">
            <h3 className="font-bold text-lg mb-2">Generation Failed</h3>
            <p>{error}</p>
          </div>
        ) : mockupUrl ? (
          <div className="relative w-full h-full group flex items-center justify-center">
            <img src={mockupUrl} alt="Generated Mockup" className="max-w-full max-h-full object-contain rounded-md shadow-2xl" />
            {downloadFilename && (
              <a
                href={mockupUrl}
                download={downloadFilename}
                className="absolute top-4 right-4 bg-indigo-600 text-white p-3 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform hover:scale-110"
                title="Download Mockup"
                aria-label="Download Mockup"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </a>
            )}
          </div>
        ) : (
          <Placeholder />
        )}
      </div>
    </div>
  );
};

export default MockupDisplay;