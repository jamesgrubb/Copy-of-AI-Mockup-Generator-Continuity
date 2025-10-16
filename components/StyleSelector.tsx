
import React from 'react';
import { MockupStyle } from '../types';

interface StyleSelectorProps {
  styles: { id: MockupStyle; label: string }[];
  selectedStyle: MockupStyle;
  onStyleSelect: (style: MockupStyle) => void;
  disabled: boolean;
}

const StyleSelector: React.FC<StyleSelectorProps> = ({ styles, selectedStyle, onStyleSelect, disabled }) => {
  return (
    <div className={`bg-gray-800 p-6 rounded-lg shadow-inner transition-opacity duration-500 ${disabled ? 'opacity-50 cursor-not-allowed' : 'opacity-100'}`}>
      <h2 className="text-xl font-semibold text-white mb-4">2. Choose a Style</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {styles.map((style) => (
          <button
            key={style.id}
            onClick={() => onStyleSelect(style.id)}
            disabled={disabled}
            className={`p-3 text-sm font-medium rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-500 ${
              selectedStyle === style.id
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            } ${disabled ? 'cursor-not-allowed' : ''}`}
          >
            {style.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default StyleSelector;
