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

export interface AIAssistantState {
  // Chat state
  messages: AIMessage[];
  currentMessage: string;
  isLoading: boolean;
  isStreaming: boolean;
  streamingContent: string;
  error: string | null;
  
  // Conversation state
  conversationId: string | null;
  messageId: string | null;
  
  // Bot state
  botState: 'idle' | 'listening' | 'thinking' | 'speaking' | 'greeting';
  botAnimation: 'idle' | 'wave' | 'nod' | 'speaking' | 'listening' | 'thinking';
  
  // TTS state
  ttsEnabled: boolean;
  isSpeaking: boolean;
  ttsQueue: string[];
  currentTTSText: string | null;
  ttsVoice: string | null;
  ttsSettings: {
    rate: number;
    pitch: number;
    volume: number;
    language: 'vi-VN' | 'en-US';
  };
  
  // UI state
  showWelcome: boolean;
  isFirstVisit: boolean;
  micPermission: 'granted' | 'denied' | 'prompt' | 'unknown';
  isListening: boolean;
  transcript: string;
  
  // Settings
  autoGreeting: boolean;
  autoTTS: boolean;
  keepConversation: boolean;
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
  
  // TTS state
  ttsEnabled: true,
  isSpeaking: false,
  ttsQueue: [],
  currentTTSText: null,
  ttsVoice: null,
  ttsSettings: {
    rate: 1.0,
    pitch: 1.0,
    volume: 0.8,
    language: 'vi-VN',
  },
  
  // UI state
  showWelcome: true,
  isFirstVisit: true,
  micPermission: 'unknown',
  isListening: false,
  transcript: '',
  
  // Settings
  autoGreeting: true,
  autoTTS: true,
  keepConversation: true,
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
    
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      if (action.payload) {
        state.botState = 'idle';
        state.botAnimation = 'idle';
      }
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
    
    // TTS actions
    setTTSEnabled: (state, action: PayloadAction<boolean>) => {
      state.ttsEnabled = action.payload;
    },
    
    setIsSpeaking: (state, action: PayloadAction<boolean>) => {
      state.isSpeaking = action.payload;
      if (action.payload) {
        state.botState = 'speaking';
        state.botAnimation = 'speaking';
      } else if (state.botState === 'speaking') {
        state.botState = 'idle';
        state.botAnimation = 'idle';
      }
    },
    
    addToTTSQueue: (state, action: PayloadAction<string>) => {
      state.ttsQueue.push(action.payload);
    },
    
    removeFromTTSQueue: (state) => {
      state.ttsQueue.shift();
    },
    
    clearTTSQueue: (state) => {
      state.ttsQueue = [];
      state.currentTTSText = null;
    },
    
    setCurrentTTSText: (state, action: PayloadAction<string | null>) => {
      state.currentTTSText = action.payload;
    },
    
    updateTTSSettings: (state, action: PayloadAction<Partial<AIAssistantState['ttsSettings']>>) => {
      state.ttsSettings = { ...state.ttsSettings, ...action.payload };
    },
    
    // Voice input actions
    setMicPermission: (state, action: PayloadAction<AIAssistantState['micPermission']>) => {
      state.micPermission = action.payload;
    },
    
    setIsListening: (state, action: PayloadAction<boolean>) => {
      state.isListening = action.payload;
      if (action.payload) {
        state.botState = 'listening';
        state.botAnimation = 'listening';
      } else if (state.botState === 'listening') {
        state.botState = 'idle';
        state.botAnimation = 'idle';
      }
    },
    
    setTranscript: (state, action: PayloadAction<string>) => {
      state.transcript = action.payload;
    },
    
    // UI actions
    setShowWelcome: (state, action: PayloadAction<boolean>) => {
      state.showWelcome = action.payload;
    },
    
    setIsFirstVisit: (state, action: PayloadAction<boolean>) => {
      state.isFirstVisit = action.payload;
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
    },
    
    // Conversation actions
    setConversationId: (state, action: PayloadAction<string | null>) => {
      state.conversationId = action.payload;
    },
    
    // Reset actions
    resetState: () => {
      return { ...initialState, isFirstVisit: false };
    },
    
    // Welcome greeting
    showGreeting: (state) => {
      state.botState = 'greeting';
      state.botAnimation = 'wave';
      state.showWelcome = true;
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
  
  // Streaming actions
  startStreaming,
  appendStreamingContent,
  stopStreaming,
  
  // Bot state actions
  setBotState,
  setBotAnimation,
  
  // TTS actions
  setTTSEnabled,
  setIsSpeaking,
  addToTTSQueue,
  removeFromTTSQueue,
  clearTTSQueue,
  setCurrentTTSText,
  updateTTSSettings,
  
  // Voice input actions
  setMicPermission,
  setIsListening,
  setTranscript,
  
  // UI actions
  setShowWelcome,
  setIsFirstVisit,
  
  // Settings actions
  updateSettings,
  
  // Conversation actions
  setConversationId,
  
  // Reset actions
  resetState,
  showGreeting,
} = aiAssistantSlice.actions;

// ==================== SELECTORS ====================
export const selectAIAssistant = (state: { aiAssistant: AIAssistantState }) => state.aiAssistant;
export const selectMessages = (state: { aiAssistant: AIAssistantState }) => state.aiAssistant.messages;
export const selectIsLoading = (state: { aiAssistant: AIAssistantState }) => state.aiAssistant.isLoading;
export const selectBotState = (state: { aiAssistant: AIAssistantState }) => state.aiAssistant.botState;
export const selectTTSEnabled = (state: { aiAssistant: AIAssistantState }) => state.aiAssistant.ttsEnabled;
export const selectIsSpeaking = (state: { aiAssistant: AIAssistantState }) => state.aiAssistant.isSpeaking;

export default aiAssistantSlice.reducer;