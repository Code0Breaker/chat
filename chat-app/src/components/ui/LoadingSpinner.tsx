import React from 'react';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  color?: string;
  className?: string;
  text?: string;
}

/**
 * Reusable loading spinner component
 */
export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'medium',
  color = 'currentColor',
  className = '',
  text,
}) => {
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-8 h-8',
    large: 'w-12 h-12',
  };

  return (
    <div className={`loading-spinner-container ${className}`}>
      <div
        className={`loading-spinner ${sizeClasses[size]}`}
        style={{ color }}
        role="status"
        aria-label="Loading"
      >
        <svg
          className="animate-spin"
          fill="none"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      </div>
      {text && <span className="loading-text">{text}</span>}
    </div>
  );
};

/**
 * Overlay loading spinner for full-screen loading
 */
export const LoadingOverlay: React.FC<{ isVisible: boolean; text?: string }> = ({
  isVisible,
  text = 'Loading...',
}) => {
  if (!isVisible) return null;

  return (
    <div className="loading-overlay">
      <div className="loading-overlay-content">
        <LoadingSpinner size="large" />
        {text && <p className="loading-overlay-text">{text}</p>}
      </div>
    </div>
  );
};

/**
 * Inline loading component for buttons
 */
export const ButtonLoading: React.FC<{ isLoading: boolean; children: React.ReactNode }> = ({
  isLoading,
  children,
}) => {
  return (
    <>
      {isLoading && <LoadingSpinner size="small" className="button-spinner" />}
      {children}
    </>
  );
};

export default LoadingSpinner; 