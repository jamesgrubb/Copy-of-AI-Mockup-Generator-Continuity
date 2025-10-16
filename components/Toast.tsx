import React, { useEffect, useState } from 'react';

interface ToastProps {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true); // Trigger fade-in animation
    const timer = setTimeout(() => {
      setVisible(false); // Trigger fade-out animation
      setTimeout(onClose, 500); // Allow fade-out to complete before unmounting
    }, 5000); // Toast visible for 5 seconds

    return () => clearTimeout(timer);
  }, [message, onClose]);

  const baseClasses = 'fixed top-8 right-8 max-w-sm w-full p-4 rounded-lg shadow-2xl text-white transition-all duration-500 transform';
  const typeClasses = {
    success: 'bg-green-600/90 backdrop-blur-sm border border-green-500',
    error: 'bg-red-600/90 backdrop-blur-sm border border-red-500',
  };
  const visibilityClasses = visible ? 'translate-x-0 opacity-100' : 'translate-x-12 opacity-0';

  return (
    <div className={`${baseClasses} ${typeClasses[type]} ${visibilityClasses}`} role="alert">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          {type === 'success' ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
        </div>
        <div className="ml-3">
          <p className="font-medium">{message}</p>
        </div>
        <button onClick={onClose} className="ml-auto -mx-1.5 -my-1.5 p-1.5 rounded-full inline-flex items-center justify-center hover:bg-white/20 transition-colors">
          <span className="sr-only">Close</span>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default Toast;
