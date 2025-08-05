'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  selectAIAssistant,
  addMessage,
  setCurrentMessage,
  setLoading,
  setError,
  setBotState,
  startStreaming,
  appendStreamingContent,
  stopStreaming,
  setTTSEnabled,
  setIsSpeaking,
  setIsListening,
  setTranscript,
  clearMessages,
  showGreeting,
  setConversationId,
} from '@/store/slices/aiAssistantSlice';
import { callDifyWithRealtimeTTS, RealtimeTTSCallbacks } from '@/lib/axios/call-api-dify-realtime-TTS';
import { DifyChatRequest } from '@/lib/axios/call-api-dify';
import { 
  AIAssistantHookReturn, 
  AIAssistantConfig, 
  defaultAIAssistantConfig,
  ChatMessage,
  VoiceInputState,
  TTSState,
  BotState 
} from '../types';

// Voice input hook
interface SpeechRecognitionType {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionEvent {
  results: {
    [key: number]: {
      [key: number]: {
        transcript: string;
        confidence: number;
      };
      isFinal: boolean;
    };
  };
}

interface SpeechRecognitionErrorEvent {
  error: string;
}

const useVoiceInput = () => {
  const [recognition, setRecognition] = useState<SpeechRecognitionType | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const windowAny = window as any;
      const SpeechRecognitionConstructor = 
        windowAny.SpeechRecognition || 
        windowAny.webkitSpeechRecognition;
        
      if (SpeechRecognitionConstructor) {
        setIsSupported(true);
        const recognitionInstance = new SpeechRecognitionConstructor() as SpeechRecognitionType;
        recognitionInstance.continuous = false;
        recognitionInstance.interimResults = true;
        recognitionInstance.lang = 'vi-VN';
        setRecognition(recognitionInstance);
      }
    }
  }, []);
  
  return { recognition, isSupported };
};

export const useAIAssistant = (initialConfig?: Partial<AIAssistantConfig>): AIAssistantHookReturn => {
  const dispatch = useDispatch();
  const aiState = useSelector(selectAIAssistant);
  const { recognition, isSupported: voiceSupported } = useVoiceInput();
  
  // Configuration state
  const [config, setConfig] = useState<AIAssistantConfig>({
    ...defaultAIAssistantConfig,
    ...initialConfig,
  });
  
  // Local states
  const [voiceState, setVoiceState] = useState<VoiceInputState>({
    isListening: false,
    transcript: '',
    confidence: 0,
    error: null,
    isSupported: voiceSupported,
  });
  
  const [ttsState, setTTSState] = useState<TTSState>({
    isPlaying: false,
    currentText: null,
    queue: [],
    error: null,
    isSupported: typeof window !== 'undefined' && 'speechSynthesis' in window,
  });
  
  // Refs
  const greetingShownRef = useRef(false);
  const currentStreamingMessageRef = useRef<string | null>(null);
  
  // Convert AI state messages to ChatMessage format
  const messages: ChatMessage[] = aiState.messages.map(msg => ({
    id: msg.id,
    content: msg.content,
    role: msg.role,
    timestamp: msg.timestamp,
    metadata: {
      ttsEnabled: msg.ttsEnabled,
    },
  }));

  // ==================== CHAT FUNCTIONS ====================
  
  const sendMessage = useCallback(async (message: string) => {
    if (!message.trim() || aiState.isLoading) return;
    
    try {
      // Add user message
      dispatch(addMessage({
        content: message.trim(),
        role: 'user',
      }));
      
      // Clear current message
      dispatch(setCurrentMessage(''));
      
      // Set loading state
      dispatch(setLoading(true));
      dispatch(setBotState('thinking'));
      
      // Create assistant message placeholder
      const assistantMessageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      dispatch(addMessage({
        content: '',
        role: 'assistant',
        isStreaming: true,
      }));
      
      currentStreamingMessageRef.current = assistantMessageId;
      
      // Prepare request - ensure inputs is always included (required by Dify API)
      const request: DifyChatRequest = {
        inputs: {}, // Required parameter for Dify API
        query: message.trim(),
        response_mode: 'streaming',
        conversation_id: aiState.conversationId || undefined,
        user: 'user',
      };
      
      console.log('🚀 Preparing AI Assistant request:', JSON.stringify(request, null, 2));
      
      // Prepare callbacks
      const callbacks: RealtimeTTSCallbacks = {
        onStart: () => {
          dispatch(startStreaming({ messageId: assistantMessageId }));
          console.log('🤖 Started streaming response');
        },
        
        onMessage: (chunk: string) => {
          dispatch(appendStreamingContent(chunk));
        },
        
        onComplete: (result) => {
          dispatch(stopStreaming());
          dispatch(setLoading(false));
          dispatch(setBotState('idle'));
          
          // Update conversation ID
          if (result.conversationId) {
            dispatch(setConversationId(result.conversationId));
          }
          
          console.log('✅ Completed streaming response');
        },
        
        onError: (error) => {
          dispatch(setError(error.message));
          dispatch(setLoading(false));
          dispatch(setBotState('idle'));
          dispatch(stopStreaming());
          console.error('❌ Error in streaming:', error);
        },
        
        onTTSStart: (text) => {
          setTTSState(prev => ({
            ...prev,
            isPlaying: true,
            currentText: text,
          }));
          dispatch(setIsSpeaking(true));
        },
        
        onTTSEnd: () => {
          setTTSState(prev => ({
            ...prev,
            isPlaying: false,
            currentText: null,
          }));
          dispatch(setIsSpeaking(false));
        },
        
        onTTSError: (error) => {
          setTTSState(prev => ({
            ...prev,
            error: error.message,
            isPlaying: false,
          }));
          dispatch(setIsSpeaking(false));
          console.error('🔊 TTS Error:', error);
        },
        
        onBotStateChange: (state) => {
          dispatch(setBotState(state as BotState));
        },
      };
      
      // Call API with TTS
      await callDifyWithRealtimeTTS(request, callbacks, {
        enabled: config.enableTTS && config.ttsSettings.autoPlay,
        autoPlay: config.ttsSettings.autoPlay,
        rate: config.ttsSettings.rate,
        pitch: config.ttsSettings.pitch,
        volume: config.ttsSettings.volume,
        language: config.ttsSettings.language,
      });
      
    } catch (error) {
      console.error('Error sending message:', error);
      dispatch(setError(error instanceof Error ? error.message : 'Đã xảy ra lỗi không xác định'));
      dispatch(setLoading(false));
      dispatch(setBotState('idle'));
    }
  }, [aiState.isLoading, aiState.conversationId, config, dispatch]);
  
  const clearChat = useCallback(() => {
    dispatch(clearMessages());
    dispatch(setError(null));
    currentStreamingMessageRef.current = null;
  }, [dispatch]);

  // ==================== VOICE FUNCTIONS ====================
  
  const stopListening = useCallback(() => {
    if (recognition) {
      recognition.stop();
    }
    setVoiceState(prev => ({ ...prev, isListening: false }));
    dispatch(setIsListening(false));
    dispatch(setBotState('idle'));
  }, [recognition, dispatch]);

  const startListening = useCallback(() => {
    if (!recognition || !voiceSupported) {
      setVoiceState(prev => ({
        ...prev,
        error: 'Trình duyệt không hỗ trợ nhận diện giọng nói',
      }));
      return;
    }
    
    try {
      dispatch(setIsListening(true));
      dispatch(setBotState('listening'));
      setVoiceState(prev => ({ ...prev, isListening: true, error: null }));
      
      recognition.onstart = () => {
        console.log('🎤 Voice recognition started');
      };
      
      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = event.results[0][0].transcript;
        const confidence = event.results[0][0].confidence;
        
        setVoiceState(prev => ({
          ...prev,
          transcript,
          confidence,
        }));
        
        dispatch(setTranscript(transcript));
        
        // If final result, send message
        if (event.results[0].isFinal && transcript.trim()) {
          sendMessage(transcript.trim());
          stopListening();
        }
      };
      
      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        const errorMessage = `Lỗi nhận diện giọng nói: ${event.error}`;
        setVoiceState(prev => ({
          ...prev,
          error: errorMessage,
          isListening: false,
        }));
        dispatch(setIsListening(false));
        dispatch(setBotState('idle'));
      };
      
      recognition.onend = () => {
        setVoiceState(prev => ({ ...prev, isListening: false }));
        dispatch(setIsListening(false));
        dispatch(setBotState('idle'));
      };
      
      recognition.start();
      
    } catch (error) {
      console.error('Error starting voice recognition:', error);
      setVoiceState(prev => ({
        ...prev,
        error: 'Không thể khởi động nhận diện giọng nói',
        isListening: false,
      }));
      dispatch(setIsListening(false));
      dispatch(setBotState('idle'));
    }
  }, [recognition, voiceSupported, dispatch, sendMessage, stopListening]);

  // ==================== TTS FUNCTIONS ====================
  
  const speak = useCallback((text: string) => {
    if (!ttsState.isSupported || !config.enableTTS || typeof window === 'undefined') return;
    
    try {
      speechSynthesis.cancel(); // Stop current speech
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = config.ttsSettings.rate;
      utterance.pitch = config.ttsSettings.pitch;
      utterance.volume = config.ttsSettings.volume;
      utterance.lang = config.ttsSettings.language;
      
      utterance.onstart = () => {
        setTTSState(prev => ({
          ...prev,
          isPlaying: true,
          currentText: text,
        }));
        dispatch(setIsSpeaking(true));
      };
      
      utterance.onend = () => {
        setTTSState(prev => ({
          ...prev,
          isPlaying: false,
          currentText: null,
        }));
        dispatch(setIsSpeaking(false));
      };
      
      utterance.onerror = (error) => {
        setTTSState(prev => ({
          ...prev,
          error: `TTS Error: ${error.error}`,
          isPlaying: false,
        }));
        dispatch(setIsSpeaking(false));
      };
      
      speechSynthesis.speak(utterance);
      
    } catch (error) {
      console.error('Error in TTS:', error);
      setTTSState(prev => ({
        ...prev,
        error: 'Không thể phát âm thanh',
      }));
    }
  }, [config.enableTTS, config.ttsSettings, ttsState.isSupported, dispatch]);
  
  const stopSpeaking = useCallback(() => {
    if (typeof window !== 'undefined') {
      speechSynthesis.cancel();
    }
    setTTSState(prev => ({
      ...prev,
      isPlaying: false,
      currentText: null,
    }));
    dispatch(setIsSpeaking(false));
  }, [dispatch]);

  // ==================== BOT FUNCTIONS ====================
  
  const triggerGreeting = useCallback(() => {
    if (!config.enableGreeting || greetingShownRef.current) return;
    
    greetingShownRef.current = true;
    dispatch(showGreeting());
    
    // Select random greeting
    const greetings = config.personality.greeting;
    const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];
    
    // Add greeting message
    setTimeout(() => {
      dispatch(addMessage({
        content: randomGreeting,
        role: 'assistant',
      }));
      
      // Speak greeting if TTS is enabled
      if (config.enableTTS && config.ttsSettings.autoPlay) {
        speak(randomGreeting);
      }
      
      // Reset bot state after greeting
      setTimeout(() => {
        dispatch(setBotState('idle'));
      }, 3000);
    }, 1000);
  }, [config, dispatch, speak]);
  
  const setBotStateHandler = useCallback((state: BotState) => {
    dispatch(setBotState(state));
  }, [dispatch]);

  // ==================== CONFIGURATION ====================
  
  const updateConfig = useCallback((updates: Partial<AIAssistantConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
    
    // Update Redux state if needed
    if (updates.enableTTS !== undefined) {
      dispatch(setTTSEnabled(updates.enableTTS));
    }
  }, [dispatch]);

  // ==================== EFFECTS ====================
  
  // Auto greeting on first visit
  useEffect(() => {
    if (config.enableGreeting && aiState.isFirstVisit && !greetingShownRef.current) {
      setTimeout(triggerGreeting, 1000);
    }
  }, [config.enableGreeting, aiState.isFirstVisit, triggerGreeting]);
  
  // Update voice state support
  useEffect(() => {
    setVoiceState(prev => ({ ...prev, isSupported: voiceSupported }));
  }, [voiceSupported]);

  // ==================== RETURN ====================
  
  return {
    // State
    messages,
    isLoading: aiState.isLoading,
    error: aiState.error,
    botState: aiState.botState,
    
    // Chat functions
    sendMessage,
    clearChat,
    
    // Voice functions
    startListening,
    stopListening,
    voiceState,
    
    // TTS functions
    speak,
    stopSpeaking,
    ttsState,
    
    // Bot functions
    triggerGreeting,
    setBotState: setBotStateHandler,
    
    // Configuration
    config,
    updateConfig,
  };
};

export default useAIAssistant;