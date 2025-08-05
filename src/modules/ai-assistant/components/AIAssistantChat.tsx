'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { BotAvatar } from './BotAvatar';
import { useAIAssistant } from '../hooks/useAIAssistant';
import { AIAssistantConfig } from '../types';
import { cn } from '@/lib/utils';
// No icons needed for pure animation interface

interface AIAssistantChatProps {
  config?: Partial<AIAssistantConfig>;
  className?: string;
}

export const AIAssistantChat: React.FC<AIAssistantChatProps> = ({
  config: initialConfig,
  className,
}) => {
  // Client-side only rendering to prevent SSR issues
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  const {
    isLoading,
    error,
    botState,
    startListening,
    stopListening,
    voiceState,
    stopSpeaking,
    ttsState,
  } = useAIAssistant(initialConfig);

  // ==================== MAIN INTERACTION HANDLER ====================
  
  // Main interaction: Click avatar to start/stop voice recognition
  const handleAvatarClick = useCallback(() => {
    if (voiceState.isListening) {
      // Stop listening
      stopListening();
    } else if (ttsState.isPlaying) {
      // Stop speaking if bot is talking
      stopSpeaking();
    } else if (!isLoading && voiceState.isSupported) {
      // Start listening if ready
      startListening();
    }
  }, [voiceState.isListening, ttsState.isPlaying, isLoading, voiceState.isSupported, startListening, stopListening, stopSpeaking]);



  // Don't render anything until client-side
  if (!isClient) {
    return (
      <div className={cn('flex flex-col h-full relative overflow-hidden', className)}>
        <div className="flex-1 flex flex-col items-center justify-center relative">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50" />
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-40 h-40 rounded-full bg-gradient-to-br from-blue-200 to-blue-300 border-4 border-blue-400 animate-pulse" />
            <div className="mt-8 text-center">
              <p className="text-lg font-medium text-blue-600">Đang tải...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col h-full relative overflow-hidden', className)}>
      {/* Full Screen Centered Interface */}
      <div className="flex-1 flex flex-col items-center justify-center relative">
        {/* Background with gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50" />
        
        {/* Main Interactive Avatar */}
        <div className="relative z-10 flex flex-col items-center">
          {/* Multiple Layered Rings for Rich Visual Feedback */}
          <div className="relative">
            {/* Outer Ring - Main State Indicator */}
            <div className={cn(
              "absolute -inset-16 rounded-full transition-all duration-1000",
              {
                // Listening - Red pulsing energy
                "border-4 border-red-400/40 bg-red-50/20 animate-ping": voiceState.isListening,
                // Thinking - Yellow rotating energy
                "border-4 border-yellow-400/40 bg-yellow-50/20 animate-pulse": isLoading,
                // Speaking - Green flowing energy  
                "border-4 border-green-400/40 bg-green-50/20 animate-pulse": ttsState.isPlaying,
                // Idle - Soft blue breathing
                "border-2 border-blue-300/30 bg-blue-50/10": botState === 'idle' && !voiceState.isListening && !isLoading && !ttsState.isPlaying,
                // Greeting - Purple bouncing
                "border-4 border-purple-400/40 bg-purple-50/20 animate-bounce": botState === 'greeting',
              }
            )} />
            
            {/* Middle Ring */}
            <div className={cn(
              "absolute -inset-12 rounded-full transition-all duration-700 opacity-60",
              {
                "border-3 border-red-300/50 animate-ping": voiceState.isListening,
                "border-3 border-yellow-300/50 animate-spin": isLoading,
                "border-3 border-green-300/50 animate-pulse": ttsState.isPlaying,
                "border-2 border-blue-200/40": botState === 'idle' && !voiceState.isListening && !isLoading && !ttsState.isPlaying,
                "border-3 border-purple-300/50": botState === 'greeting',
              }
            )} />
            
            {/* Inner Ring */}
            <div className={cn(
              "absolute -inset-8 rounded-full transition-all duration-500 opacity-40",
              {
                "border-2 border-red-200/60 animate-ping": voiceState.isListening,
                "border-2 border-yellow-200/60 animate-pulse": isLoading,
                "border-2 border-green-200/60 animate-pulse": ttsState.isPlaying,
                "border-1 border-blue-100/50": botState === 'idle' && !voiceState.isListening && !isLoading && !ttsState.isPlaying,
                "border-2 border-purple-200/60": botState === 'greeting',
              }
            )} />

            {/* Enhanced Bot Avatar */}
            <div className="transform transition-all duration-300 hover:scale-105">
              <BotAvatar 
                state={botState} 
                size="xl"
                showStatusText={false}
                onClick={handleAvatarClick}
                className="cursor-pointer"
              />
            </div>
          </div>

          {/* Minimal Live Transcript - Only when listening */}
          {voiceState.isListening && voiceState.transcript && (
            <div className="mt-8 max-w-md">
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl px-6 py-4 border border-red-200/50 shadow-lg">
                <p className="text-gray-700 text-center font-medium">
                  &quot;{voiceState.transcript}&quot;
                </p>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Minimal Error Display */}
      {error && (
        <div className="absolute bottom-4 left-4 right-4 z-20">
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 shadow-lg">
            <div className="text-sm text-red-700 text-center">
              {error}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIAssistantChat;