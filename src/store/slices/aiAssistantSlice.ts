import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// ==================== TYPES ====================
export interface AIMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  timestamp: number;
  isStreaming?: boolean;
  ttsEnabled?: boolean;
  ttsStatus?: 'idle' | 'playing' | 'paused' | 'completed';
}

export interface AIError {
  type: 'api' | 'tts' | 'voice' | 'network' | 'permission' | 'unknown';
  code?: string;
  message: string;
  timestamp: number;
  recoverable: boolean;
  retryAction?: string;
}

export interface VoiceInputState {
  isListening: boolean;
  transcript: string;
  confidence: number;
  error: string | null;
  isSupported: boolean;
  permission: 'granted' | 'denied' | 'prompt' | 'unknown';
}

export interface TTSState {
  isPlaying: boolean;
  currentText: string | null;
  queue: string[];
  error: string | null;
  isSupported: boolean;
  voice: SpeechSynthesisVoice | null;
}

export interface AIAssistantState {
  // Chat state
  messages: AIMessage[];
  currentMessage: string;
  isLoading: boolean;
  isStreaming: boolean;
  streamingContent: string;
  error: AIError | null;
  
  // Conversation state
  conversationId: string | null;
  messageId: string | null;
  
  // Bot state
  botState: 'idle' | 'listening' | 'thinking' | 'speaking' | 'greeting';
  botAnimation: 'idle' | 'wave' | 'nod' | 'speaking' | 'listening' | 'thinking';
  
  // Consolidated TTS state
  tts: TTSState;
  ttsEnabled: boolean;
  ttsSettings: {
    rate: number;
    pitch: number;
    volume: number;
    language: 'vi-VN' | 'en-US';
  };
  
  // Consolidated Voice Input state
  voice: VoiceInputState;
  
  // UI state
  showWelcome: boolean;
  isFirstVisit: boolean;
  
  // Settings
  autoGreeting: boolean;
  autoTTS: boolean;
  keepConversation: boolean;
  
  // Performance & Debug
  lastActivity: number;
  debugMode: boolean;
}

const initialState: AIAssistantState = {
  // Chat state
  messages: [],
  currentMessage: '',
  isLoading: false,
  isStreaming: false,
  streamingContent: '',
  error: null,
  
  // Conversation state
  conversationId: null,
  messageId: null,
  
  // Bot state
  botState: 'idle',
  botAnimation: 'idle',
  
  // Consolidated TTS state
  tts: {
    isPlaying: false,
    currentText: null,
    queue: [],
    error: null,
    isSupported: typeof window !== 'undefined' && 'speechSynthesis' in window,
    voice: null,
  },
  ttsEnabled: true,
  ttsSettings: {
    rate: 1.4, // Optimized speed
    pitch: 1.1,
    volume: 0.9,
    language: 'vi-VN',
  },
  
  // Consolidated Voice Input state
  voice: {
    isListening: false,
    transcript: '',
    confidence: 0,
    error: null,
    isSupported: typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window),
    permission: 'unknown',
  },
  
  // UI state
  showWelcome: true,
  isFirstVisit: true,
  
  // Settings
  autoGreeting: true,
  autoTTS: true,
  keepConversation: true,
  
  // Performance & Debug
  lastActivity: Date.now(),
  debugMode: false,
};

// ==================== SLICE ====================
const aiAssistantSlice = createSlice({
  name: 'aiAssistant',
  initialState,
  reducers: {
    // Chat actions
    setCurrentMessage: (state, action: PayloadAction<string>) => {
      state.currentMessage = action.payload;
    },
    
    addMessage: (state, action: PayloadAction<Omit<AIMessage, 'id' | 'timestamp'>>) => {
      const message: AIMessage = {
        ...action.payload,
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
      };
      state.messages.push(message);
    },
    
    updateMessage: (state, action: PayloadAction<{ id: string; updates: Partial<AIMessage> }>) => {
      const { id, updates } = action.payload;
      const messageIndex = state.messages.findIndex(msg => msg.id === id);
      if (messageIndex !== -1) {
        state.messages[messageIndex] = { ...state.messages[messageIndex], ...updates };
      }
    },
    
    clearMessages: (state) => {
      state.messages = [];
      state.conversationId = null;
      state.messageId = null;
    },
    
    // Loading states
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
      if (action.payload) {
        state.botState = 'thinking';
        state.botAnimation = 'thinking';
      }
    },
    
    setError: (state, action: PayloadAction<AIError | null>) => {
      state.error = action.payload;
      state.lastActivity = Date.now();
      if (action.payload) {
        state.botState = 'idle';
        state.botAnimation = 'idle';
      }
    },
    
    // Enhanced error actions
    setApiError: (state, action: PayloadAction<{ message: string; code?: string; recoverable?: boolean }>) => {
      const { message, code, recoverable = true } = action.payload;
      state.error = {
        type: 'api',
        code,
        message,
        timestamp: Date.now(),
        recoverable,
        retryAction: recoverable ? 'retry_api_call' : undefined,
      };
      state.botState = 'idle';
      state.botAnimation = 'idle';
      state.lastActivity = Date.now();
    },
    
    clearError: (state) => {
      state.error = null;
      state.lastActivity = Date.now();
    },
    
    // Streaming actions
    startStreaming: (state, action: PayloadAction<{ messageId: string }>) => {
      state.isStreaming = true;
      state.streamingContent = '';
      state.botState = 'speaking';
      state.botAnimation = 'speaking';
      state.messageId = action.payload.messageId;
    },
    
    appendStreamingContent: (state, action: PayloadAction<string>) => {
      state.streamingContent += action.payload;
      // Update the corresponding message
      if (state.messageId) {
        const messageIndex = state.messages.findIndex(msg => msg.id === state.messageId);
        if (messageIndex !== -1) {
          state.messages[messageIndex].content = state.streamingContent;
        }
      }
    },
    
    stopStreaming: (state) => {
      state.isStreaming = false;
      state.streamingContent = '';
      state.botState = 'idle';
      state.botAnimation = 'idle';
    },
    
    // Bot state actions
    setBotState: (state, action: PayloadAction<AIAssistantState['botState']>) => {
      state.botState = action.payload;
      // Update animation based on state
      switch (action.payload) {
        case 'greeting':
          state.botAnimation = 'wave';
          break;
        case 'listening':
          state.botAnimation = 'listening';
          break;
        case 'thinking':
          state.botAnimation = 'thinking';
          break;
        case 'speaking':
          state.botAnimation = 'speaking';
          break;
        default:
          state.botAnimation = 'idle';
      }
    },
    
    setBotAnimation: (state, action: PayloadAction<AIAssistantState['botAnimation']>) => {
      state.botAnimation = action.payload;
    },
    
    // Enhanced TTS actions using consolidated state
    setTTSEnabled: (state, action: PayloadAction<boolean>) => {
      state.ttsEnabled = action.payload;
      state.lastActivity = Date.now();
    },
    
    updateTTSState: (state, action: PayloadAction<Partial<TTSState>>) => {
      state.tts = { ...state.tts, ...action.payload };
      state.lastActivity = Date.now();
      
      // Auto-sync bot state with TTS
      if (action.payload.isPlaying !== undefined) {
        if (action.payload.isPlaying) {
          state.botState = 'speaking';
          state.botAnimation = 'speaking';
        } else if (state.botState === 'speaking') {
          state.botState = 'idle';
          state.botAnimation = 'idle';
        }
      }
    },
    
    setIsSpeaking: (state, action: PayloadAction<boolean>) => {
      state.tts.isPlaying = action.payload;
      state.lastActivity = Date.now();
      if (action.payload) {
        state.botState = 'speaking';
        state.botAnimation = 'speaking';
      } else if (state.botState === 'speaking') {
        state.botState = 'idle';
        state.botAnimation = 'idle';
      }
    },
    
    addToTTSQueue: (state, action: PayloadAction<string>) => {
      state.tts.queue.push(action.payload);
      state.lastActivity = Date.now();
    },
    
    removeFromTTSQueue: (state) => {
      state.tts.queue.shift();
      state.lastActivity = Date.now();
    },
    
    clearTTSQueue: (state) => {
      state.tts.queue = [];
      state.tts.currentText = null;
      state.lastActivity = Date.now();
    },
    
    setCurrentTTSText: (state, action: PayloadAction<string | null>) => {
      state.tts.currentText = action.payload;
      state.lastActivity = Date.now();
    },
    
    updateTTSSettings: (state, action: PayloadAction<Partial<AIAssistantState['ttsSettings']>>) => {
      state.ttsSettings = { ...state.ttsSettings, ...action.payload };
      state.lastActivity = Date.now();
    },
    
    setTTSError: (state, action: PayloadAction<string | null>) => {
      state.tts.error = action.payload;
      if (action.payload) {
        state.error = {
          type: 'tts',
          message: action.payload,
          timestamp: Date.now(),
          recoverable: true,
          retryAction: 'retry_tts',
        };
      }
      state.lastActivity = Date.now();
    },
    
    // Enhanced Voice input actions using consolidated state
    updateVoiceState: (state, action: PayloadAction<Partial<VoiceInputState>>) => {
      state.voice = { ...state.voice, ...action.payload };
      state.lastActivity = Date.now();
      
      // Auto-sync bot state with voice listening
      if (action.payload.isListening !== undefined) {
        if (action.payload.isListening) {
          state.botState = 'listening';
          state.botAnimation = 'listening';
        } else if (state.botState === 'listening') {
          state.botState = 'idle';
          state.botAnimation = 'idle';
        }
      }
    },
    
    setMicPermission: (state, action: PayloadAction<VoiceInputState['permission']>) => {
      state.voice.permission = action.payload;
      state.lastActivity = Date.now();
    },
    
    setIsListening: (state, action: PayloadAction<boolean>) => {
      state.voice.isListening = action.payload;
      state.lastActivity = Date.now();
      if (action.payload) {
        state.botState = 'listening';
        state.botAnimation = 'listening';
      } else if (state.botState === 'listening') {
        state.botState = 'idle';
        state.botAnimation = 'idle';
      }
    },
    
    setTranscript: (state, action: PayloadAction<string>) => {
      state.voice.transcript = action.payload;
      state.lastActivity = Date.now();
    },
    
    setVoiceConfidence: (state, action: PayloadAction<number>) => {
      state.voice.confidence = action.payload;
      state.lastActivity = Date.now();
    },
    
    setVoiceError: (state, action: PayloadAction<string | null>) => {
      state.voice.error = action.payload;
      if (action.payload) {
        state.error = {
          type: 'voice',
          message: action.payload,
          timestamp: Date.now(),
          recoverable: true,
          retryAction: 'retry_voice_input',
        };
      }
      state.lastActivity = Date.now();
    },
    
    // UI actions
    setShowWelcome: (state, action: PayloadAction<boolean>) => {
      state.showWelcome = action.payload;
      state.lastActivity = Date.now();
    },
    
    setIsFirstVisit: (state, action: PayloadAction<boolean>) => {
      state.isFirstVisit = action.payload;
      state.lastActivity = Date.now();
    },
    
    // Settings actions
    updateSettings: (state, action: PayloadAction<{
      autoGreeting?: boolean;
      autoTTS?: boolean;
      keepConversation?: boolean;
    }>) => {
      const { autoGreeting, autoTTS, keepConversation } = action.payload;
      if (autoGreeting !== undefined) state.autoGreeting = autoGreeting;
      if (autoTTS !== undefined) state.autoTTS = autoTTS;
      if (keepConversation !== undefined) state.keepConversation = keepConversation;
      state.lastActivity = Date.now();
    },
    
    // Conversation actions
    setConversationId: (state, action: PayloadAction<string | null>) => {
      state.conversationId = action.payload;
      state.lastActivity = Date.now();
    },
    
    // Debug actions
    setDebugMode: (state, action: PayloadAction<boolean>) => {
      state.debugMode = action.payload;
      state.lastActivity = Date.now();
    },
    
    updateLastActivity: (state) => {
      state.lastActivity = Date.now();
    },
    
    // Reset actions
    resetState: () => {
      return { ...initialState, isFirstVisit: false, lastActivity: Date.now() };
    },
    
    // Soft reset - keep important state
    softReset: (state) => {
      state.messages = [];
      state.conversationId = null;
      state.messageId = null;
      state.error = null;
      state.isLoading = false;
      state.isStreaming = false;
      state.streamingContent = '';
      state.botState = 'idle';
      state.botAnimation = 'idle';
      state.tts.queue = [];
      state.tts.currentText = null;
      state.tts.isPlaying = false;
      state.voice.transcript = '';
      state.voice.confidence = 0;
      state.voice.isListening = false;
      state.lastActivity = Date.now();
    },
    
    // Welcome greeting
    showGreeting: (state) => {
      state.botState = 'greeting';
      state.botAnimation = 'wave';
      state.showWelcome = true;
      state.lastActivity = Date.now();
    },
  },
});

// ==================== ACTIONS ====================
export const {
  // Chat actions
  setCurrentMessage,
  addMessage,
  updateMessage,
  clearMessages,
  
  // Loading states
  setLoading,
  setError,
  setApiError,
  clearError,
  
  // Streaming actions
  startStreaming,
  appendStreamingContent,
  stopStreaming,
  
  // Bot state actions
  setBotState,
  setBotAnimation,
  
  // Enhanced TTS actions
  setTTSEnabled,
  updateTTSState,
  setIsSpeaking,
  addToTTSQueue,
  removeFromTTSQueue,
  clearTTSQueue,
  setCurrentTTSText,
  updateTTSSettings,
  setTTSError,
  
  // Enhanced Voice input actions
  updateVoiceState,
  setMicPermission,
  setIsListening,
  setTranscript,
  setVoiceConfidence,
  setVoiceError,
  
  // UI actions
  setShowWelcome,
  setIsFirstVisit,
  
  // Settings actions
  updateSettings,
  
  // Conversation actions
  setConversationId,
  
  // Debug actions
  setDebugMode,
  updateLastActivity,
  
  // Reset actions
  resetState,
  softReset,
  showGreeting,
} = aiAssistantSlice.actions;

// ==================== SELECTORS ====================
export const selectAIAssistant = (state: { aiAssistant: AIAssistantState }) => state.aiAssistant;
export const selectMessages = (state: { aiAssistant: AIAssistantState }) => state.aiAssistant.messages;
export const selectIsLoading = (state: { aiAssistant: AIAssistantState }) => state.aiAssistant.isLoading;
export const selectBotState = (state: { aiAssistant: AIAssistantState }) => state.aiAssistant.botState;
export const selectError = (state: { aiAssistant: AIAssistantState }) => state.aiAssistant.error;

// Enhanced TTS selectors
export const selectTTS = (state: { aiAssistant: AIAssistantState }) => state.aiAssistant.tts;
export const selectTTSEnabled = (state: { aiAssistant: AIAssistantState }) => state.aiAssistant.ttsEnabled;
export const selectIsSpeaking = (state: { aiAssistant: AIAssistantState }) => state.aiAssistant.tts.isPlaying;
export const selectTTSQueue = (state: { aiAssistant: AIAssistantState }) => state.aiAssistant.tts.queue;
export const selectTTSSettings = (state: { aiAssistant: AIAssistantState }) => state.aiAssistant.ttsSettings;

// Enhanced Voice selectors
export const selectVoice = (state: { aiAssistant: AIAssistantState }) => state.aiAssistant.voice;
export const selectIsListening = (state: { aiAssistant: AIAssistantState }) => state.aiAssistant.voice.isListening;
export const selectTranscript = (state: { aiAssistant: AIAssistantState }) => state.aiAssistant.voice.transcript;
export const selectVoiceConfidence = (state: { aiAssistant: AIAssistantState }) => state.aiAssistant.voice.confidence;
export const selectMicPermission = (state: { aiAssistant: AIAssistantState }) => state.aiAssistant.voice.permission;

// Performance selectors
export const selectLastActivity = (state: { aiAssistant: AIAssistantState }) => state.aiAssistant.lastActivity;
export const selectDebugMode = (state: { aiAssistant: AIAssistantState }) => state.aiAssistant.debugMode;

// Convenience selectors
export const selectIsActive = (state: { aiAssistant: AIAssistantState }) => {
  const assistant = state.aiAssistant;
  return assistant.voice.isListening || assistant.tts.isPlaying || assistant.isLoading || assistant.isStreaming;
};

export const selectCanInteract = (state: { aiAssistant: AIAssistantState }) => {
  const assistant = state.aiAssistant;
  return !assistant.isLoading && !assistant.isStreaming && assistant.voice.isSupported;
};

export const selectSystemStatus = (state: { aiAssistant: AIAssistantState }) => {
  const assistant = state.aiAssistant;
  return {
    ttsSupported: assistant.tts.isSupported,
    voiceSupported: assistant.voice.isSupported,
    hasPermission: assistant.voice.permission === 'granted',
    isActive: assistant.voice.isListening || assistant.tts.isPlaying || assistant.isLoading,
    lastActivity: assistant.lastActivity,
    debugMode: assistant.debugMode,
  };
};

export default aiAssistantSlice.reducer;