import React, { useState, useCallback, useEffect } from 'react';
import { ImageType, MockupStyle, DesignType } from './types';
import { MOCKUP_STYLES } from './constants';
import { generateMockup, removePersonFromImage } from './services/geminiService';
import Header from './components/Header';
import ImageUploader from './components/ImageUploader';
import StyleSelector from './components/StyleSelector';
import MockupDisplay from './components/MockupDisplay';
import Toast from './components/Toast';
import DesignTypeSelector from './components/DesignTypeSelector';
import ContinuitySelector from './components/ContinuitySelector';

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // remove data:mime/type;base64, part
      resolve(result.split(',')[1]);
    };
    reader.onerror = (error) => reject(error);
  });

const App: React.FC = () => {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [imageType, setImageType] = useState<ImageType | null>(null);
  const [selectedDesignType, setSelectedDesignType] = useState<DesignType | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<MockupStyle>(MockupStyle.MODERN);
  const [generatedMockup, setGeneratedMockup] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRepairing, setIsRepairing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ id: number; message: string; type: 'success' | 'error' } | null>(null);
  const [showImageRepairOption, setShowImageRepairOption] = useState<boolean>(false);
  
  // State for continuity feature
  const [previousMockup, setPreviousMockup] = useState<{ url: string; style: MockupStyle } | null>(null);
  const [showContinuityPrompt, setShowContinuityPrompt] = useState<boolean>(false);
  const [useContinuity, setUseContinuity] = useState<boolean | null>(null);


  const handleImageUpload = useCallback((file: File) => {
    // If there's a previously generated mockup, ask about continuity
    if (generatedMockup) {
      setPreviousMockup({ url: generatedMockup, style: selectedStyle });
      setShowContinuityPrompt(true);
    } else {
       setShowContinuityPrompt(false);
    }
    
    setUploadedFile(file);
    setGeneratedMockup(null);
    setError(null);
    setShowImageRepairOption(false);
    setImageType(null);
    setSelectedDesignType(null);
    setUseContinuity(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const aspectRatio = img.width / img.height;
        if (aspectRatio > 1.2) { // Landscape-like
          setImageType(ImageType.SPREAD);
        } else { // Portrait or square
          setImageType(ImageType.COVER);
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);

    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
    }
    setImagePreviewUrl(URL.createObjectURL(file));
  }, [imagePreviewUrl, generatedMockup, selectedStyle]);
  
  const handleContinuitySelection = (choice: boolean) => {
    setUseContinuity(choice);
    if (choice && previousMockup) {
      // If using continuity, lock in the style of the previous mockup
      setSelectedStyle(previousMockup.style);
    }
  };

  const triggerToast = (message: string, type: 'success' | 'error' = 'error') => {
    setToast({ id: Date.now(), message, type });
  };

  const handleGenerateClick = async (imageToProcess?: { base64: string; mimeType: string }) => {
    const fileForProcessing = uploadedFile;
    if (!fileForProcessing && !imageToProcess) {
      triggerToast("Please upload an image first.");
      return;
    }
    if (!imageType || !selectedDesignType) {
      triggerToast("Please select the design type (Book/Brochure).");
      return;
    }
     if (showContinuityPrompt && useContinuity === null) {
      triggerToast("Please make a choice regarding scene continuity.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setGeneratedMockup(null);
    setShowImageRepairOption(false);

    try {
      const base64Image = imageToProcess ? imageToProcess.base64 : await fileToBase64(fileForProcessing!);
      const mimeType = imageToProcess ? imageToProcess.mimeType : fileForProcessing!.type;

      const continuityImageBase64 = useContinuity && previousMockup
        ? previousMockup.url.split(',')[1]
        : undefined;

      const generatedImageBase64 = await generateMockup(
        base64Image,
        mimeType,
        imageType,
        selectedDesignType,
        selectedStyle,
        continuityImageBase64
      );
      const newMockupUrl = `data:image/png;base64,${generatedImageBase64}`;
      setGeneratedMockup(newMockupUrl);
      // On success, this generated image becomes the new "previous" for the next cycle
      setPreviousMockup({ url: newMockupUrl, style: selectedStyle });
      setShowContinuityPrompt(false); // Hide prompt after generation
    } catch (e: any) {
      const errorMessage = e.message || "An unknown error occurred.";
      setError(errorMessage);
      triggerToast(errorMessage, 'error');
      if (errorMessage.toLowerCase().includes('safety')) {
          setShowImageRepairOption(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRepairAndRetry = async () => {
    if (!uploadedFile) return;

    setIsRepairing(true);
    setShowImageRepairOption(false);
    setError(null);

    try {
      triggerToast("Attempting to repair the image with AI...", 'success');
      const base64Image = await fileToBase64(uploadedFile);
      const repairedImageBase64 = await removePersonFromImage(base64Image, uploadedFile.type);

      const repairedImageUrl = `data:${uploadedFile.type};base64,${repairedImageBase64}`;
      setImagePreviewUrl(repairedImageUrl);
      
      const blob = await (await fetch(repairedImageUrl)).blob();
      const newFile = new File([blob], `repaired_${uploadedFile.name}`, { type: uploadedFile.type });
      setUploadedFile(newFile);

      triggerToast("Image repaired! Retrying mockup generation...", 'success');
      
      await handleGenerateClick({ base64: repairedImageBase64, mimeType: newFile.type });

    } catch (e: any) {
      const errorMessage = e.message || "An unknown error occurred during repair.";
      setError(errorMessage);
      triggerToast(errorMessage, 'error');
    } finally {
      setIsRepairing(false);
    }
  };
  
  const isGenerateDisabled = !uploadedFile 
    || !selectedDesignType 
    || isLoading 
    || isRepairing 
    || (showContinuityPrompt && useContinuity === null);

  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans">
      <Header />
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <main className="container mx-auto p-4 sm:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          
          <div className="lg:col-span-2 flex flex-col gap-8">
            <ImageUploader 
              onImageUpload={handleImageUpload}
              previewUrl={imagePreviewUrl}
              imageType={imageType}
            />
             {showContinuityPrompt && (
              <ContinuitySelector
                selectedChoice={useContinuity}
                onSelectChoice={handleContinuitySelection}
              />
            )}
            {imageType && (
              <DesignTypeSelector 
                selectedType={selectedDesignType}
                onSelectType={setSelectedDesignType}
                disabled={showContinuityPrompt && useContinuity === null}
              />
            )}
            <StyleSelector
              styles={MOCKUP_STYLES}
              selectedStyle={selectedStyle}
              onStyleSelect={setSelectedStyle}
              disabled={!uploadedFile || !selectedDesignType || useContinuity === true || (showContinuityPrompt && useContinuity === null)}
            />
            <div className="flex flex-col gap-4">
              <button
                onClick={() => handleGenerateClick()}
                disabled={isGenerateDisabled}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white font-bold py-4 px-6 rounded-lg shadow-lg hover:bg-indigo-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 disabled:scale-100"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.636-6.364l-.707-.707M12 21v-1m-6.364-1.636l.707-.707" />
                    </svg>
                    Generate Mockup
                  </>
                )}
              </button>
              {showImageRepairOption && (
                 <button
                  onClick={handleRepairAndRetry}
                  disabled={isRepairing || isLoading}
                  className="w-full flex items-center justify-center gap-2 bg-amber-600 text-white font-bold py-4 px-6 rounded-lg shadow-lg hover:bg-amber-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all duration-300"
                >
                   {isRepairing ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Repairing Image...
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      Remove Person & Retry
                    </>
                  )}
                 </button>
              )}
            </div>
          </div>

          <div className="lg:col-span-3">
             <MockupDisplay 
                mockupUrl={generatedMockup}
                isLoading={isLoading || isRepairing}
                error={error}
             />
          </div>

        </div>
      </main>
    </div>
  );
};

export default App;