'use client';

import React, { useEffect, useState } from 'react';
import AIAssistantModule from '@/modules/ai-assistant';
import { defaultBotPersonality } from '@/modules/ai-assistant/types';

export default function AIAssistantPage() {
  // Client-side only rendering to prevent SSR issues
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  const customConfig = {
    personality: {
      ...defaultBotPersonality,
      name: 'Trợ lý AI Hub',
      greeting: [
        'Xin chào! Tôi là Trợ lý AI Hub, rất vui được gặp bạn!',
        'Chào bạn! Tôi sẵn sàng hỗ trợ bạn với mọi câu hỏi. Hôm nay tôi có thể giúp gì?',
        'Xin chào! Tôi là AI Assistant của Hub Education. Tôi có thể giúp bạn tìm hiểu thông tin, giải đáp câu hỏi và hỗ trợ học tập!',
        'Chào mừng bạn đến với AI Assistant! Tôi ở đây để giúp bạn. Bạn muốn trò chuyện về chủ đề gì?'
      ],
      personality: 'Tôi là trợ lý AI thân thiện của Hub Education, chuyên hỗ trợ học tập và giải đáp thắc mắc. Tôi luôn nhiệt tình, kiên nhẫn và sẵn sàng giúp đỡ.',
    },
    enableGreeting: true,
    enableTTS: true,
    enableVoiceInput: true,
    enableAnimation: true,
    ttsSettings: {
      autoPlay: true,
      rate: 1.0,
      pitch: 1.0,
      volume: 0.8,
      language: 'vi-VN' as const,
    },
    voiceSettings: {
      continuous: false,
      interimResults: true,
      language: 'vi-VN' as const,
      timeout: 5000,
    },
    showAvatar: true,
    showTranscript: true,
    showDebugInfo: false,
    theme: 'light' as const,
  };

  // Don't render anything until client-side
  if (!isClient) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-40 h-40 rounded-full bg-gradient-to-br from-blue-200 to-blue-300 border-4 border-blue-400 animate-pulse mx-auto mb-4" />
          <p className="text-lg font-medium text-blue-600">Đang tải AI Assistant...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Main Content */}
      <div className="h-full bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20 overflow-hidden">
        <AIAssistantModule
          config={customConfig}
          className="h-full"
        />
      </div>
    </div>
  );
}