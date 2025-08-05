'use client';

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { BotState, BotAnimation } from '../types';
import { cn } from '@/lib/utils';

interface BotAvatarProps {
  state: BotState;
  animation?: BotAnimation;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showStatusText?: boolean;
  className?: string;
  onClick?: () => void;
  // Enhanced props
  isInteractive?: boolean;
  showPulse?: boolean;
  customColor?: string;
  disabled?: boolean;
  confidence?: number; // For voice confidence display
  isProcessing?: boolean;
  theme?: 'default' | 'minimal' | 'vibrant' | 'neon';
  enableHaptic?: boolean;
  enableSound?: boolean;
}

export const BotAvatar: React.FC<BotAvatarProps> = ({
  state,
  animation,
  size = 'lg',
  showStatusText = true,
  className,
  onClick,
  // Enhanced props with defaults
  isInteractive = true,
  showPulse = true,
  customColor,
  disabled = false,
  confidence = 0,
  isProcessing = false,
  theme = 'default',
  enableHaptic = true,
  enableSound = false,
}) => {
  const [currentAnimation, setCurrentAnimation] = useState<BotAnimation>(animation || 'idle');
  const [isAnimating, setIsAnimating] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [soundEnabled] = useState(enableSound);
  const avatarRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Enhanced interaction handlers with haptic feedback
  const triggerHaptic = useCallback(() => {
    if (!enableHaptic || !navigator.vibrate) return;

    const hapticPattern = {
      idle: [50],
      greeting: [100, 50, 100],
      listening: [30, 30, 30],
      thinking: [50, 100, 50],
      speaking: [20, 20, 20, 20],
    };

    navigator.vibrate(hapticPattern[state] || [50]);
  }, [enableHaptic, state]);

  const playInteractionSound = useCallback(() => {
    if (!soundEnabled || !audioContextRef.current) return;

    try {
      const oscillator = audioContextRef.current.createOscillator();
      const gainNode = audioContextRef.current.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContextRef.current.destination);

      const frequency = {
        idle: 440,
        greeting: 523,
        listening: 659,
        thinking: 392,
        speaking: 784,
      }[state] || 440;

      oscillator.frequency.setValueAtTime(frequency, audioContextRef.current.currentTime);
      gainNode.gain.setValueAtTime(0.1, audioContextRef.current.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + 0.1);

      oscillator.start(audioContextRef.current.currentTime);
      oscillator.stop(audioContextRef.current.currentTime + 0.1);
    } catch {
      console.log('Sound playback not supported');
    }
  }, [soundEnabled, state]);

  const handleMouseEnter = useCallback(() => {
    if (isInteractive && !disabled) {
      setIsHovered(true);
      triggerHaptic();
      playInteractionSound();
    }
  }, [isInteractive, disabled, triggerHaptic, playInteractionSound]);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    setIsPressed(false);
  }, []);

  const handleMouseDown = useCallback(() => {
    if (isInteractive && !disabled) {
      setIsPressed(true);
      triggerHaptic();
    }
  }, [isInteractive, disabled, triggerHaptic]);

  const handleMouseUp = useCallback(() => {
    setIsPressed(false);
  }, []);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (disabled || !onClick) return;
    e.preventDefault();
    triggerHaptic();
    playInteractionSound();
    onClick();
  }, [disabled, onClick, triggerHaptic, playInteractionSound]);

  // Initialize audio context
  useEffect(() => {
    if (soundEnabled && typeof window !== 'undefined') {
      audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }

    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [soundEnabled]);

  // Update animation based on state with enhanced timing
  useEffect(() => {
    const newAnimation = animation || getAnimationFromState(state);
    if (newAnimation !== currentAnimation) {
      setIsAnimating(true);
      setCurrentAnimation(newAnimation);

      // Dynamic animation duration based on state
      const duration = newAnimation === 'thinking' ? 1200 :
        newAnimation === 'wave' ? 1000 :
          newAnimation === 'speaking' ? 800 : 600;

      const timeoutId = setTimeout(() => setIsAnimating(false), duration);
      return () => clearTimeout(timeoutId);
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
    // Eyes with enhanced expressions
    const eyeClasses = cn('absolute bg-gray-800 rounded-full transition-all duration-300', {
      // Eye positions and sizes based on size
      'w-2 h-2': size === 'sm',
      'w-3 h-3': size === 'md',
      'w-4 h-4': size === 'lg',
      'w-5 h-5': size === 'xl',
      // Animation states with enhanced expressions
      'animate-pulse': currentAnimation === 'thinking',
      'w-1 h-4': currentAnimation === 'listening' && size === 'lg', // Squinted eyes when listening
      'w-1 h-5': currentAnimation === 'listening' && size === 'xl',
      'scale-110': currentAnimation === 'speaking', // Wider eyes when speaking
      'opacity-60': currentAnimation === 'thinking', // Dimmed eyes when thinking
    });

    // Mouth with enhanced animations
    const mouthClasses = cn('absolute bg-gray-800 rounded-full transition-all duration-300', {
      // Mouth sizes
      'w-4 h-2': size === 'sm',
      'w-6 h-2': size === 'md',
      'w-8 h-3': size === 'lg',
      'w-10 h-4': size === 'xl',
      // Enhanced mouth animations
      'animate-pulse scale-110': currentAnimation === 'speaking',
      'rounded-full': currentAnimation === 'speaking',
      'h-1': currentAnimation === 'thinking',
      'scale-90': currentAnimation === 'listening', // Smaller mouth when listening
      'bg-gray-600': currentAnimation === 'thinking', // Different color when thinking
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

  // Memoized theme-based colors with new neon theme
  const themeColors = useMemo(() => {
    if (customColor) return customColor;

    const themes = {
      default: {
        idle: 'from-blue-200 to-blue-300 border-blue-400 shadow-blue-200/50',
        greeting: 'from-green-200 to-green-300 border-green-400 shadow-green-200/50',
        listening: 'from-red-200 to-red-300 border-red-400 shadow-red-300/60',
        thinking: 'from-yellow-200 to-orange-300 border-yellow-400 shadow-yellow-300/60',
        speaking: 'from-purple-200 to-purple-300 border-purple-400 shadow-purple-300/60',
      },
      minimal: {
        idle: 'from-gray-100 to-gray-200 border-gray-300 shadow-gray-200/30',
        greeting: 'from-green-100 to-green-200 border-green-300 shadow-green-200/30',
        listening: 'from-blue-100 to-blue-200 border-blue-300 shadow-blue-200/30',
        thinking: 'from-yellow-100 to-yellow-200 border-yellow-300 shadow-yellow-200/30',
        speaking: 'from-purple-100 to-purple-200 border-purple-300 shadow-purple-200/30',
      },
      vibrant: {
        idle: 'from-blue-300 to-blue-400 border-blue-500 shadow-blue-300/70',
        greeting: 'from-green-300 to-green-400 border-green-500 shadow-green-300/70',
        listening: 'from-red-300 to-red-400 border-red-500 shadow-red-300/70',
        thinking: 'from-yellow-300 to-orange-400 border-orange-500 shadow-orange-300/70',
        speaking: 'from-purple-300 to-purple-400 border-purple-500 shadow-purple-300/70',
      },
      neon: {
        idle: 'from-cyan-300 to-blue-400 border-cyan-400 shadow-cyan-300/80',
        greeting: 'from-emerald-300 to-green-400 border-emerald-400 shadow-emerald-300/80',
        listening: 'from-pink-300 to-red-400 border-pink-400 shadow-pink-300/80',
        thinking: 'from-amber-300 to-yellow-400 border-amber-400 shadow-amber-300/80',
        speaking: 'from-violet-300 to-purple-400 border-violet-400 shadow-violet-300/80',
      },
    };

    return themes[theme][state] || themes[theme].idle;
  }, [customColor, theme, state]);

  const getAvatarClasses = () => {
    return cn(
      'relative rounded-full border-4 transition-all duration-500 select-none',
      getSizeClasses(),
      `bg-gradient-to-br ${themeColors}`,
      {
        // Cursor states
        'cursor-pointer': isInteractive && !disabled,
        'cursor-not-allowed': disabled,
        'cursor-default': !isInteractive,

        // Interactive states
        'opacity-50': disabled,
        'transform transition-transform duration-200': isInteractive,

        // Enhanced animations with better performance
        'animate-bounce': currentAnimation === 'wave' && isAnimating,
        'animate-pulse scale-105': currentAnimation === 'listening' && showPulse,
        'animate-spin': currentAnimation === 'thinking',

        // Hover and press states with enhanced feedback
        'hover:scale-110 hover:shadow-2xl': isInteractive && !disabled && isHovered,
        'scale-95': isPressed,
        'scale-105': isHovered && !isPressed,

        // Shadow variations with theme-specific enhancements
        'shadow-lg': !isAnimating,
        'shadow-2xl': isAnimating,
        'shadow-cyan-500/50': theme === 'neon' && isAnimating,

        // Processing state
        'animate-pulse': isProcessing,

        // Neon theme specific effects
        'ring-2 ring-cyan-400/50': theme === 'neon' && isHovered,
      },
      className
    );
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      {/* Bot Avatar Container */}
      <div className="relative">
        {/* Confidence Ring with enhanced visualization */}
        {confidence > 0 && state === 'listening' && (
          <div
            className="absolute -inset-4 rounded-full border-2 border-red-300 transition-all duration-300"
            style={{
              background: `conic-gradient(from 0deg, #f87171 ${confidence * 360}deg, transparent ${confidence * 360}deg)`,
              opacity: 0.4,
              animation: 'pulse 2s infinite',
            }}
          />
        )}

        {/* Main Bot Avatar */}
        <div
          ref={avatarRef}
          className={getAvatarClasses()}
          onClick={handleClick}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          role={isInteractive ? 'button' : undefined}
          tabIndex={isInteractive && !disabled ? 0 : undefined}
          aria-label={`AI Bot - ${getStatusText()}`}
          aria-disabled={disabled}
          onKeyDown={isInteractive ? (e) => {
            if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
              e.preventDefault();
              handleClick(e as unknown as React.MouseEvent<HTMLDivElement>);
            }
          } : undefined}
        >
          {/* Face elements */}
          {renderBotFace()}

          {/* Enhanced breathing animation ring */}
          {showPulse && (
            <div className={cn(
              'absolute inset-0 rounded-full border-2 border-opacity-40 transition-all duration-1000',
              {
                'border-blue-400 animate-ping': state === 'listening',
                'border-yellow-400 animate-pulse': state === 'thinking',
                'border-purple-400 animate-pulse': state === 'speaking',
                'border-green-400 animate-bounce': state === 'greeting',
                'border-gray-300': state === 'idle',
                // Enhanced pulse for interactive states
                'border-blue-500 animate-ping': isHovered && state === 'idle',
                // Neon theme specific
                'border-cyan-400 animate-ping': theme === 'neon' && state === 'listening',
              }
            )} />
          )}

          {/* Processing indicator with enhanced animation */}
          {isProcessing && (
            <div className="absolute inset-0 rounded-full border-2 border-cyan-400 animate-spin opacity-60" />
          )}

          {/* Enhanced Wave animation for greeting */}
          {currentAnimation === 'wave' && (
            <div className="absolute -top-3 -right-3 text-3xl animate-bounce filter drop-shadow-lg">
              👋
            </div>
          )}

          {/* Enhanced Sound waves for speaking with better timing */}
          {state === 'speaking' && (
            <div className="absolute -right-10 top-1/2 transform -translate-y-1/2">
              <div className="flex space-x-1">
                <div className="w-1.5 bg-purple-400 rounded-full animate-pulse shadow-sm" style={{ height: '16px', animationDelay: '0ms' }} />
                <div className="w-1.5 bg-purple-500 rounded-full animate-pulse shadow-sm" style={{ height: '24px', animationDelay: '150ms' }} />
                <div className="w-1.5 bg-purple-400 rounded-full animate-pulse shadow-sm" style={{ height: '20px', animationDelay: '300ms' }} />
                <div className="w-1.5 bg-purple-500 rounded-full animate-pulse shadow-sm" style={{ height: '28px', animationDelay: '450ms' }} />
                <div className="w-1.5 bg-purple-400 rounded-full animate-pulse shadow-sm" style={{ height: '18px', animationDelay: '600ms' }} />
              </div>
            </div>
          )}

          {/* Enhanced Listening indicator with better visual feedback */}
          {state === 'listening' && (
            <div className="absolute -left-10 top-1/2 transform -translate-y-1/2">
              <div className="relative">
                <div className="w-8 h-8 border-3 border-red-400 rounded-full animate-ping opacity-75" />
                <div className="absolute inset-2 w-4 h-4 bg-red-400 rounded-full animate-pulse" />
              </div>
            </div>
          )}

          {/* Enhanced Thinking dots with better timing */}
          {state === 'thinking' && (
            <div className="absolute -bottom-10 left-1/2 transform -translate-x-1/2">
              <div className="flex space-x-2">
                <div className="w-3 h-3 bg-yellow-400 rounded-full animate-bounce shadow-sm" style={{ animationDelay: '0ms' }} />
                <div className="w-3 h-3 bg-orange-400 rounded-full animate-bounce shadow-sm" style={{ animationDelay: '200ms' }} />
                <div className="w-3 h-3 bg-yellow-400 rounded-full animate-bounce shadow-sm" style={{ animationDelay: '400ms' }} />
              </div>
            </div>
          )}

          {/* Hover effect ripple with theme-specific colors */}
          {isHovered && isInteractive && !disabled && (
            <div className={cn(
              "absolute inset-0 rounded-full animate-ping",
              {
                'bg-white/20': theme !== 'neon',
                'bg-cyan-400/30': theme === 'neon',
              }
            )} />
          )}
        </div>
      </div>

      {/* Enhanced Status Text with better styling */}
      {showStatusText && (
        <div className={cn(
          'text-sm font-medium text-center transition-all duration-300 px-4 py-2 rounded-full bg-white/90 backdrop-blur-sm border shadow-sm',
          getStatusColor(),
          {
            'animate-pulse': isAnimating,
            'scale-105': isHovered && isInteractive,
            'bg-cyan-50/90 border-cyan-200': theme === 'neon',
          }
        )}>
          {getStatusText()}
          {confidence > 0 && state === 'listening' && (
            <span className="ml-2 text-xs opacity-75">
              ({Math.round(confidence * 100)}%)
            </span>
          )}
        </div>
      )}

      {/* Enhanced Interactive hint with dynamic messaging */}
      {isInteractive && !disabled && (
        <>
          {state === 'idle' && !isHovered && (
            <div className={cn(
              "text-sm text-center animate-pulse font-medium px-4 py-2 rounded-full border shadow-sm",
              {
                'text-blue-600 bg-blue-50 border-blue-200': theme !== 'neon',
                'text-cyan-600 bg-cyan-50 border-cyan-200': theme === 'neon',
              }
            )}>
              ✨ Chạm để bắt đầu nói chuyện
            </div>
          )}

          {state === 'idle' && isHovered && (
            <div className={cn(
              "text-sm text-center font-semibold px-4 py-2 rounded-full border-2 shadow-md transform scale-105",
              {
                'text-blue-700 bg-blue-100 border-blue-300': theme !== 'neon',
                'text-cyan-700 bg-cyan-100 border-cyan-300': theme === 'neon',
              }
            )}>
              🚀 Nhấp ngay!
            </div>
          )}

          {state === 'speaking' && (
            <div className="text-sm text-purple-600 text-center font-medium bg-purple-50 px-4 py-2 rounded-full border border-purple-200">
              🤫 Chạm để dừng
            </div>
          )}
        </>
      )}

      {/* Disabled state hint */}
      {disabled && (
        <div className="text-sm text-gray-500 text-center font-medium bg-gray-50 px-4 py-2 rounded-full border border-gray-200 opacity-75">
          🚫 Tạm thời không khả dụng
        </div>
      )}
    </div>
  );
};

export default BotAvatar;