'use client';

import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  selectVisibleToasts, 
  removeNotification, 
  markAsRead 
} from '@/store/slices/notificationSlice';
import { cn } from '@/lib/utils';

// Icons for different toast types
const toastIcons = {
  success: '✅',
  error: '❌', 
  warning: '⚠️',
  info: 'ℹ️',
};

const toastStyles = {
  success: 'bg-green-50 border-green-200 text-green-800',
  error: 'bg-red-50 border-red-200 text-red-800',
  warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  info: 'bg-blue-50 border-blue-200 text-blue-800',
};

interface ToastItemProps {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
  duration?: number;
  onClose: () => void;
}

const ToastItem: React.FC<ToastItemProps> = ({
  id,
  type,
  title,
  message,
  duration = 4000,
  onClose,
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (duration === 0) return; // Permanent toast

    // Progress bar animation
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev - (100 / (duration / 100));
        return Math.max(0, newProgress);
      });
    }, 100);

    // Auto-dismiss timer
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300); // Wait for exit animation
    }, duration);

    return () => {
      clearInterval(progressInterval);
      clearTimeout(timer);
    };
  }, [duration, onClose]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-lg border shadow-lg transition-all duration-300 mb-2 min-w-80 max-w-md',
        toastStyles[type],
        isVisible 
          ? 'transform translate-x-0 opacity-100' 
          : 'transform translate-x-full opacity-0'
      )}
    >
      {/* Progress bar */}
      {duration > 0 && (
        <div className="absolute top-0 left-0 h-1 bg-current opacity-30 transition-all duration-100 ease-linear" 
             style={{ width: `${progress}%` }} />
      )}

      <div className="p-4">
        <div className="flex items-start">
          {/* Icon */}
          <div className="flex-shrink-0 mr-3 text-xl">
            {toastIcons[type]}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {title && (
              <h4 className="text-sm font-semibold mb-1 truncate">
                {title}
              </h4>
            )}
            <p className="text-sm leading-relaxed break-words">
              {message}
            </p>
          </div>

          {/* Close button */}
          <button
            onClick={handleClose}
            className="flex-shrink-0 ml-3 p-1 rounded-full hover:bg-black/10 transition-colors"
            aria-label="Đóng thông báo"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

const ToastContainer: React.FC = () => {
  const dispatch = useDispatch();
  const toasts = useSelector(selectVisibleToasts);

  const handleRemoveToast = (id: string) => {
    dispatch(markAsRead(id));
    setTimeout(() => {
      dispatch(removeNotification(id));
    }, 100);
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 pointer-events-none">
      <div className="pointer-events-auto">
        {toasts.map((toast) => (
          <ToastItem
            key={toast.id}
            id={toast.id}
            type={toast.type}
            title={toast.title}
            message={toast.message}
            duration={toast.duration}
            onClose={() => handleRemoveToast(toast.id)}
          />
        ))}
      </div>
    </div>
  );
};

export default ToastContainer;