import React from 'react';
import { cn } from '@/lib/utils';
import '../styles/animations.css';

interface TypingIndicatorProps {
  className?: string;
  message?: string;
  variant?: 'sending' | 'receiving' | 'processing';
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({
  className,
  message,
  variant = 'receiving'
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'sending':
        return {
          container: 'bg-blue-50 border-blue-200 text-blue-700',
          spinner: 'border-blue-700',
          dots: 'bg-blue-700'
        };
      case 'processing':
        return {
          container: 'bg-amber-50 border-amber-200 text-amber-700',
          spinner: 'border-amber-700',
          dots: 'bg-amber-700'
        };
      default: // receiving
        return {
          container: 'bg-gray-50 border-gray-200 text-gray-700',
          spinner: 'border-gray-700',
          dots: 'bg-gray-700'
        };
    }
  };

  const styles = getVariantStyles();

  const getDefaultMessage = () => {
    switch (variant) {
      case 'sending':
        return 'Đang gửi tin nhắn...';
      case 'processing':
        return 'Đang xử lý...';
      default:
        return 'AI đang trả lời...';
    }
  };

  return (
    <div className={cn('flex justify-start mb-6', className)}>
      <div className={cn(
        'px-6 py-4 rounded-2xl border shadow-sm max-w-xs',
        'animate-in fade-in-0 slide-in-from-left-2 duration-300',
        styles.container
      )}>
        <div className="flex items-center gap-3">
          {/* Animated dots */}
          <div className="flex gap-1">
            <div className={cn(
              'w-2 h-2 rounded-full typing-dot',
              styles.dots
            )} />
            <div className={cn(
              'w-2 h-2 rounded-full typing-dot',
              styles.dots
            )} />
            <div className={cn(
              'w-2 h-2 rounded-full typing-dot',
              styles.dots
            )} />
          </div>
          
          {/* Message text */}
          <span className="text-sm font-medium">
            {message || getDefaultMessage()}
          </span>
          
          {/* Pulse effect for receiving */}
          {variant === 'receiving' && (
            <div className="relative">
              <div className={cn(
                'w-3 h-3 rounded-full',
                styles.dots
              )} />
              <div className={cn(
                'absolute inset-0 w-3 h-3 rounded-full animate-ping opacity-75',
                styles.dots
              )} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TypingIndicator;