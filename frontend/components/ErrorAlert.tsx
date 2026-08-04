'use client';

import { useState, useEffect } from 'react';

interface ErrorAlertProps {
  message: string;
  onClose?: () => void;
  autoClose?: number;
}

export function ErrorAlert({ message, onClose, autoClose = 5000 }: ErrorAlertProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (!autoClose) return;
    const timer = setTimeout(() => {
      setIsVisible(false);
      onClose?.();
    }, autoClose);
    return () => clearTimeout(timer);
  }, [autoClose, onClose]);

  if (!isVisible) return null;

  return (
    <div className="fixed top-4 right-4 max-w-sm z-50 animate-in slide-in-from-top">
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3">
        <div className="w-5 h-5 rounded-full bg-red-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-red-800 dark:text-red-400">{message}</p>
        </div>
        <button
          onClick={() => {
            setIsVisible(false);
            onClose?.();
          }}
          className="text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 flex-shrink-0 ml-2"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
