'use client';

import React, { useEffect, useState } from 'react';
import { BotState, BotAnimation } from '../types';
import { cn } from '@/lib/utils';

interface BotAvatarProps {
  state: BotState;
  animation?: BotAnimation;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showStatusText?: boolean;
  className?: string;
  onClick?: () => void;
}

export const BotAvatar: React.FC<BotAvatarProps> = ({
  state,
  animation,
  size = 'lg',
  showStatusText = true,
  className,
  onClick,
}) => {
  const [currentAnimation, setCurrentAnimation] = useState<BotAnimation>(animation || 'idle');
  const [isAnimating, setIsAnimating] = useState(false);

  // Update animation based on state
  useEffect(() => {
    const newAnimation = animation || getAnimationFromState(state);
    if (newAnimation !== currentAnimation) {
      setIsAnimating(true);
      setCurrentAnimation(newAnimation);
      
      // Reset animation flag after animation duration
      setTimeout(() => setIsAnimating(false), 600);
    }
  }, [state, animation, currentAnimation]);

  const getAnimationFromState = (botState: BotState): BotAnimation => {
    switch (botState) {
      case 'greeting': return 'wave';
      case 'listening': return 'listening';
      case 'thinking': return 'thinking';
      case 'speaking': return 'speaking';
      default: return 'idle';
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm': return 'w-16 h-16';
      case 'md': return 'w-24 h-24';
      case 'lg': return 'w-32 h-32';
      case 'xl': return 'w-40 h-40';
      default: return 'w-32 h-32';
    }
  };

  const getStatusText = () => {
    switch (state) {
      case 'greeting': return 'Đang chào hỏi...';
      case 'listening': return 'Đang lắng nghe...';
      case 'thinking': return 'Đang suy nghĩ...';
      case 'speaking': return 'Đang trả lời...';
      default: return 'Sẵn sàng trò chuyện';
    }
  };

  const getStatusColor = () => {
    switch (state) {
      case 'greeting': return 'text-green-600';
      case 'listening': return 'text-blue-600';
      case 'thinking': return 'text-yellow-600';
      case 'speaking': return 'text-purple-600';
      default: return 'text-gray-600';
    }
  };

  const renderBotFace = () => {
    // Eyes
    const eyeClasses = cn('absolute bg-gray-800 rounded-full transition-all duration-300', {
      // Eye positions and sizes based on size
      'w-2 h-2': size === 'sm',
      'w-3 h-3': size === 'md', 
      'w-4 h-4': size === 'lg',
      'w-5 h-5': size === 'xl',
      // Animation states
      'animate-pulse': currentAnimation === 'thinking',
      'w-1 h-4': currentAnimation === 'listening' && size === 'lg', // Squinted eyes when listening
      'w-1 h-5': currentAnimation === 'listening' && size === 'xl',
    });

    // Mouth
    const mouthClasses = cn('absolute bg-gray-800 rounded-full transition-all duration-300', {
      // Mouth sizes
      'w-4 h-2': size === 'sm',
      'w-6 h-2': size === 'md',
      'w-8 h-3': size === 'lg', 
      'w-10 h-4': size === 'xl',
      // Mouth animations
      'animate-pulse': currentAnimation === 'speaking',
      'rounded-full': currentAnimation === 'speaking',
      'h-1': currentAnimation === 'thinking',
    });

    const centerOffset = {
      sm: { eye: 6, mouth: 10 },
      md: { eye: 8, mouth: 14 },
      lg: { eye: 12, mouth: 20 },
      xl: { eye: 16, mouth: 26 },
    }[size];

    return (
      <>
        {/* Left Eye */}
        <div 
          className={eyeClasses}
          style={{ 
            left: `calc(50% - ${centerOffset.eye + (size === 'sm' ? 4 : size === 'md' ? 6 : size === 'lg' ? 8 : 10)}px)`,
            top: `calc(50% - ${centerOffset.eye}px)`
          }}
        />
        
        {/* Right Eye */}
        <div 
          className={eyeClasses}
          style={{ 
            right: `calc(50% - ${centerOffset.eye + (size === 'sm' ? 4 : size === 'md' ? 6 : size === 'lg' ? 8 : 10)}px)`,
            top: `calc(50% - ${centerOffset.eye}px)`
          }}
        />
        
        {/* Mouth */}
        <div 
          className={mouthClasses}
          style={{ 
            left: '50%',
            top: `calc(50% + ${centerOffset.mouth}px)`,
            transform: 'translateX(-50%)'
          }}
        />
      </>
    );
  };

  const getAvatarClasses = () => {
    return cn(
      'relative rounded-full border-4 transition-all duration-500 cursor-pointer select-none',
      getSizeClasses(),
      {
        // Enhanced base colors with stronger gradients
        'bg-gradient-to-br from-blue-200 to-blue-300 border-blue-400 shadow-blue-200/50': state === 'idle',
        'bg-gradient-to-br from-green-200 to-green-300 border-green-400 shadow-green-200/50': state === 'greeting', 
        'bg-gradient-to-br from-red-200 to-red-300 border-red-400 shadow-red-300/60': state === 'listening',
        'bg-gradient-to-br from-yellow-200 to-orange-300 border-yellow-400 shadow-yellow-300/60': state === 'thinking',
        'bg-gradient-to-br from-purple-200 to-purple-300 border-purple-400 shadow-purple-300/60': state === 'speaking',
        
        // Enhanced animations
        'animate-bounce': currentAnimation === 'wave' && isAnimating,
        'animate-pulse scale-105': currentAnimation === 'listening',
        'animate-spin': currentAnimation === 'thinking',
        
        // Enhanced hover and interaction effects
        'hover:scale-110 hover:shadow-2xl active:scale-95': onClick,
        'shadow-lg': !isAnimating,
        'shadow-2xl': isAnimating,
        
        // Glow effects for different states
        'shadow-blue-300/40': state === 'idle' && onClick,
        'shadow-red-400/60': state === 'listening',
        'shadow-yellow-400/60': state === 'thinking', 
        'shadow-purple-400/60': state === 'speaking',
        'shadow-green-400/60': state === 'greeting',
      },
      className
    );
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      {/* Bot Avatar */}
      <div 
        className={getAvatarClasses()}
        onClick={onClick}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        onKeyDown={onClick ? (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick();
          }
        } : undefined}
      >
        {/* Face elements */}
        {renderBotFace()}
        
        {/* Breathing animation ring */}
        <div className={cn(
          'absolute inset-0 rounded-full border-2 border-opacity-30 transition-all duration-1000',
          {
            'border-blue-400 animate-ping': state === 'listening',
            'border-yellow-400': state === 'thinking',
            'border-purple-400 animate-pulse': state === 'speaking',
            'border-green-400': state === 'greeting',
            'border-gray-300': state === 'idle',
          }
        )} />
        
        {/* Wave animation for greeting */}
        {currentAnimation === 'wave' && (
          <div className="absolute -top-2 -right-2 text-2xl animate-bounce">
            👋
          </div>
        )}
        
        {/* Sound waves for speaking */}
        {state === 'speaking' && (
          <div className="absolute -right-8 top-1/2 transform -translate-y-1/2">
            <div className="flex space-x-1">
              <div className="w-1 bg-purple-400 rounded-full animate-pulse" style={{ height: '12px', animationDelay: '0ms' }} />
              <div className="w-1 bg-purple-400 rounded-full animate-pulse" style={{ height: '20px', animationDelay: '150ms' }} />
              <div className="w-1 bg-purple-400 rounded-full animate-pulse" style={{ height: '16px', animationDelay: '300ms' }} />
              <div className="w-1 bg-purple-400 rounded-full animate-pulse" style={{ height: '24px', animationDelay: '450ms' }} />
            </div>
          </div>
        )}
        
        {/* Listening indicator */}
        {state === 'listening' && (
          <div className="absolute -left-8 top-1/2 transform -translate-y-1/2">
            <div className="w-6 h-6 border-2 border-blue-400 rounded-full animate-ping" />
          </div>
        )}
        
        {/* Thinking dots */}
        {state === 'thinking' && (
          <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
      </div>
      
      {/* Status Text */}
      {showStatusText && (
        <div className={cn(
          'text-sm font-medium text-center transition-colors duration-300 px-3 py-1 rounded-full bg-white/80 backdrop-blur-sm border',
          getStatusColor()
        )}>
          {getStatusText()}
        </div>
      )}
      
      {/* Enhanced Interactive hint */}
      {onClick && state === 'idle' && (
        <div className="text-sm text-blue-600 text-center animate-pulse font-medium bg-blue-50 px-4 py-2 rounded-full border border-blue-200">
          ✨ Chạm để bắt đầu nói chuyện
        </div>
      )}
    </div>
  );
};

export default BotAvatar;