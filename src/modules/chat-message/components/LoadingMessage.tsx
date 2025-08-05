import React from 'react';
import { cn } from '@/lib/utils';
import '../styles/animations.css';

interface LoadingMessageProps {
  className?: string;
  message?: string;
  type?: 'sending' | 'error';
}

export const LoadingMessage: React.FC<LoadingMessageProps> = ({
  className,
  message,
  type = 'sending'
}) => {
  const isError = type === 'error';
  
  return (
    <div className={cn('flex justify-center mb-6', className)}>
      <div className={cn(
        'px-6 py-4 rounded-2xl border shadow-sm max-w-md',
        'animate-in fade-in-0 slide-in-from-bottom-2 duration-300',
        isError 
          ? 'bg-red-50 border-red-200 text-red-700'
          : 'bg-blue-50 border-blue-200 text-blue-700'
      )}>
        <div className="flex items-center gap-3">
          {isError ? (
            // Error icon
            <div className="relative">
              <div className="w-4 h-4 bg-red-700 rounded-full flex items-center justify-center">
                <div className="w-1 h-1 bg-white rounded-full" />
              </div>
              <div className="absolute inset-0 w-4 h-4 bg-red-700 rounded-full animate-ping opacity-30" />
            </div>
          ) : (
            // Loading spinner
            <div className="relative">
              <div className="w-4 h-4 border-2 border-blue-700 border-t-transparent rounded-full animate-spin" />
              <div className="absolute inset-0 w-4 h-4 border border-blue-300 rounded-full animate-pulse" />
            </div>
          )}
          
          <span className="text-sm font-medium">
            {message || (isError ? 'Có lỗi xảy ra' : 'Đang gửi tin nhắn...')}
          </span>
          
          {/* Shimmer effect for sending */}
          {!isError && (
            <div className="spinner-dots">
              <div></div>
              <div></div>
              <div></div>
              <div></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoadingMessage;