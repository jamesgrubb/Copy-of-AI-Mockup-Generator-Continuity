import React from 'react';

interface ContinuitySelectorProps {
  selectedChoice: boolean | null;
  onSelectChoice: (choice: boolean) => void;
}

const ContinuitySelector: React.FC<ContinuitySelectorProps> = ({ selectedChoice, onSelectChoice }) => {
  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-inner -mt-4 animate-fade-in">
      <h2 className="text-lg font-semibold text-white mb-3">Match the previous scene?</h2>
      <p className="text-sm text-gray-400 mb-4">
        Create the next mockup in the same environment for a consistent look.
      </p>
      <div className="flex gap-3">
        <button
          onClick={() => onSelectChoice(true)}
          className={`w-full p-3 text-sm font-medium rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-500 ${
            selectedChoice === true
              ? 'bg-indigo-600 text-white shadow-md'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          Yes, Match Scene
        </button>
        <button
          onClick={() => onSelectChoice(false)}
          className={`w-full p-3 text-sm font-medium rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-500 ${
            selectedChoice === false
              ? 'bg-indigo-600 text-white shadow-md'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          No, New Scene
        </button>
      </div>
    </div>
  );
};

export default ContinuitySelector;