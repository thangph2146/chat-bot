// ==================== AI ASSISTANT TYPES ====================

export type BotState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'greeting';
export type BotAnimation = 'idle' | 'wave' | 'nod' | 'speaking' | 'listening' | 'thinking';

export interface BotPersonality {
  name: string;
  greeting: string[];
  personality: string;
  responseStyle: 'formal' | 'casual' | 'friendly' | 'professional';
  language: 'vi' | 'en' | 'both';
}

export interface ConversationContext {
  topic?: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
  userPreferences?: {
    communicationStyle?: string;
    interests?: string[];
    language?: 'vi' | 'en';
  };
}

export interface AIAssistantConfig {
  // Bot configuration
  personality: BotPersonality;
  enableGreeting: boolean;
  enableTTS: boolean;
  enableVoiceInput: boolean;
  enableAnimation: boolean;
  
  // TTS configuration
  ttsSettings: {
    autoPlay: boolean;
    voice?: string;
    rate: number;
    pitch: number;
    volume: number;
    language: 'vi-VN' | 'en-US';
  };
  
  // Voice input configuration
  voiceSettings: {
    continuous: boolean;
    interimResults: boolean;
    language: 'vi-VN' | 'en-US';
    timeout: number;
  };
  
  // UI configuration
  showAvatar: boolean;
  showTranscript: boolean;
  showDebugInfo: boolean;
  theme: 'light' | 'dark' | 'auto';
}

export interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  timestamp: number;
  metadata?: {
    ttsEnabled?: boolean;
    voiceInput?: boolean;
    processingTime?: number;
    tokens?: number;
  };
}

export interface VoiceInputState {
  isListening: boolean;
  transcript: string;
  confidence: number;
  error: string | null;
  isSupported: boolean;
}

export interface TTSState {
  isPlaying: boolean;
  currentText: string | null;
  queue: string[];
  error: string | null;
  isSupported: boolean;
}

export interface AIAssistantHookReturn {
  // State
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  botState: BotState;
  
  // Chat functions
  sendMessage: (message: string) => Promise<void>;
  clearChat: () => void;
  
  // Voice functions
  startListening: () => void;
  stopListening: () => void;
  voiceState: VoiceInputState;
  
  // TTS functions
  speak: (text: string) => void;
  stopSpeaking: () => void;
  ttsState: TTSState;
  
  // Bot functions
  triggerGreeting: () => void;
  setBotState: (state: BotState) => void;
  
  // Configuration
  config: AIAssistantConfig;
  updateConfig: (updates: Partial<AIAssistantConfig>) => void;
}

// Default configurations
export const defaultBotPersonality: BotPersonality = {
  name: 'AI Assistant',
  greeting: [
    'Xin chào! Tôi là trợ lý AI của bạn. Hôm nay tôi có thể giúp gì cho bạn?',
    'Chào bạn! Tôi sẵn sàng hỗ trợ bạn. Bạn muốn trò chuyện về gì?',
    'Xin chào! Rất vui được trò chuyện với bạn hôm nay. Tôi có thể giúp gì không?'
  ],
  personality: 'Tôi là một trợ lý AI thân thiện, nhiệt tình và luôn sẵn sàng giúp đỡ.',
  responseStyle: 'friendly',
  language: 'vi',
};

export const defaultAIAssistantConfig: AIAssistantConfig = {
  // Bot configuration
  personality: defaultBotPersonality,
  enableGreeting: true,
  enableTTS: true,
  enableVoiceInput: true,
  enableAnimation: true,
  
  // TTS configuration
  ttsSettings: {
    autoPlay: true,
    rate: 1.0,
    pitch: 1.0,
    volume: 0.8,
    language: 'vi-VN',
  },
  
  // Voice input configuration
  voiceSettings: {
    continuous: false,
    interimResults: true,
    language: 'vi-VN',
    timeout: 5000,
  },
  
  // UI configuration
  showAvatar: true,
  showTranscript: true,
  showDebugInfo: false,
  theme: 'light',
};