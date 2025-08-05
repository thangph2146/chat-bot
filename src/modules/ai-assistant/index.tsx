'use client';

import React from 'react';
import { AIAssistantChat } from './components/AIAssistantChat';
import { defaultAIAssistantConfig } from './types';

interface AIAssistantModuleProps {
  config?: Partial<typeof defaultAIAssistantConfig>;
  className?: string;
  showHeader?: boolean;
  showSettings?: boolean;
}

const AIAssistantModule: React.FC<AIAssistantModuleProps> = (props) => {
  return <AIAssistantChat {...props} />;
};

export default AIAssistantModule;

// Export all components and hooks
export { BotAvatar, AIAssistantChat } from './components';
export { useAIAssistant } from './hooks/useAIAssistant';
export * from './types';

// Export services
export * from '@/lib/axios/call-api-dify-realtime-TTS';