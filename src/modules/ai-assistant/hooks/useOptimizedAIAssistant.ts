'use client';

import { useCallback, useEffect, useRef, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  selectAIAssistant,
  selectTTS,
  selectVoice,
  selectCanInteract,
  selectSystemStatus,
  addMessage,
  setCurrentMessage,
  setLoading,
  setApiError,
  setError,
  setBotState,
  startStreaming,
  appendStreamingContent,
  stopStreaming,
  updateTTSState,
  updateVoiceState,
  setConversationId,
  updateLastActivity,
} from '@/store/slices/aiAssistantSlice';
import { 
  showSuccess, 
  showError, 
  showWarning 
} from '@/store/slices/notificationSlice';
import { callDifyWithRealtimeTTS, RealtimeTTSCallbacks } from '@/lib/axios/call-api-dify-realtime-TTS';
import { DifyChatRequest } from '@/lib/axios/call-api-dify';
import { AIAssistantConfig, defaultAIAssistantConfig } from '../types';

// Speech Recognition types
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

export const useOptimizedAIAssistant = (config: Partial<AIAssistantConfig> = {}) => {
  const dispatch = useDispatch();
  
  // Redux selectors
  const aiState = useSelector(selectAIAssistant);
  const ttsState = useSelector(selectTTS);
  const voiceState = useSelector(selectVoice);
  const canInteract = useSelector(selectCanInteract);
  const systemStatus = useSelector(selectSystemStatus);
  
  // Memoized configuration to prevent unnecessary re-renders
  const fullConfig = useMemo(() => ({
    ...defaultAIAssistantConfig,
    ...config,
  }), [config]);
  
  // Refs
  const recognitionRef = useRef<SpeechRecognitionType | null>(null);
  const currentStreamingMessageRef = useRef<string | null>(null);
  const greetingShownRef = useRef(false);

  // ==================== INITIALIZATION ====================
  
  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const windowAny = window as any;
      const SpeechRecognitionConstructor = 
        windowAny.SpeechRecognition || 
        windowAny.webkitSpeechRecognition;
        
      if (SpeechRecognitionConstructor) {
        const recognition = new SpeechRecognitionConstructor() as SpeechRecognitionType;
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'vi-VN';
        recognitionRef.current = recognition;
        
        // Update voice support status
        dispatch(updateVoiceState({ isSupported: true }));
      } else {
        dispatch(updateVoiceState({ isSupported: false }));
        dispatch(showWarning({ 
          message: 'Trình duyệt không hỗ trợ nhận diện giọng nói. Hãy sử dụng Chrome, Edge hoặc Safari.',
          duration: 8000 
        }));
      }
    } catch (error) {
      console.error('Error initializing Speech Recognition:', error);
      dispatch(updateVoiceState({ isSupported: false }));
    }
  }, [dispatch]);

  // Initialize TTS support
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const ttsSupported = 'speechSynthesis' in window;
    dispatch(updateTTSState({ isSupported: ttsSupported }));
    
    if (!ttsSupported) {
      dispatch(showWarning({ 
        message: 'Trình duyệt không hỗ trợ Text-to-Speech.',
        duration: 6000 
      }));
    }
  }, [dispatch]);

  // ==================== CHAT FUNCTIONS ====================
  
  const sendMessage = useCallback(async (message: string) => {
    if (!message.trim() || aiState.isLoading) return;
    
    try {
      dispatch(updateLastActivity());
      
      // Add user message
      dispatch(addMessage({
        content: message.trim(),
        role: 'user',
      }));
      
      // Clear current message and set loading
      dispatch(setCurrentMessage(''));
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
      
      // Prepare API request
      const request: DifyChatRequest = {
        inputs: {},
        query: message.trim(),
        response_mode: 'streaming',
        conversation_id: aiState.conversationId || undefined,
        user: 'user',
      };
      
      // Prepare TTS callbacks
      const callbacks: RealtimeTTSCallbacks = {
        onStart: () => {
          dispatch(startStreaming({ messageId: assistantMessageId }));
        },
        
        onMessage: (chunk: string) => {
          dispatch(appendStreamingContent(chunk));
        },
        
        onComplete: (result) => {
          dispatch(stopStreaming());
          dispatch(setLoading(false));
          dispatch(setBotState('idle'));
          
          if (result.conversationId) {
            dispatch(setConversationId(result.conversationId));
          }
          
          dispatch(showSuccess({ 
            message: 'Câu trả lời đã được tạo thành công!',
            duration: 2000 
          }));
        },
        
        onError: (error) => {
          dispatch(setApiError({ 
            message: error.message,
            recoverable: true 
          }));
          dispatch(setLoading(false));
          dispatch(setBotState('idle'));
          dispatch(stopStreaming());
          
          dispatch(showError({ 
            message: `Lỗi API: ${error.message}`,
            duration: 6000 
          }));
        },
        
        onTTSStart: (text) => {
          dispatch(updateTTSState({ 
            isPlaying: true, 
            currentText: text 
          }));
        },
        
        onTTSEnd: () => {
          dispatch(updateTTSState({ 
            isPlaying: false, 
            currentText: null 
          }));
        },
        
        onTTSError: (error) => {
          if (!error.message.includes('interrupted') && !error.message.includes('canceled')) {
            dispatch(showError({ 
              message: `Lỗi TTS: ${error.message}`,
              duration: 4000 
            }));
          }
          dispatch(updateTTSState({ 
            isPlaying: false, 
            error: error.message 
          }));
        },
        
        onBotStateChange: (state) => {
          dispatch(setBotState(state as 'idle' | 'listening' | 'thinking' | 'speaking' | 'greeting'));
        },
      };
      
      // Call API with TTS
      await callDifyWithRealtimeTTS(request, callbacks, {
        enabled: fullConfig.enableTTS && fullConfig.ttsSettings.autoPlay,
        autoPlay: fullConfig.ttsSettings.autoPlay,
        rate: fullConfig.ttsSettings.rate,
        pitch: fullConfig.ttsSettings.pitch,
        volume: fullConfig.ttsSettings.volume,
        language: fullConfig.ttsSettings.language,
      });
      
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = error instanceof Error ? error.message : 'Đã xảy ra lỗi không xác định';
      
      dispatch(setApiError({
        message: errorMessage,
        recoverable: true
      }));
      dispatch(setLoading(false));
      dispatch(setBotState('idle'));
      
      dispatch(showError({ 
        message: errorMessage,
        duration: 6000 
      }));
    }
  }, [aiState.isLoading, aiState.conversationId, fullConfig, dispatch]);
  
  // ==================== VOICE FUNCTIONS ====================
  
  const startListening = useCallback(() => {
    if (!recognitionRef.current || !voiceState.isSupported) {
      dispatch(showWarning({ 
        message: 'Trình duyệt không hỗ trợ nhận diện giọng nói',
        duration: 4000 
      }));
      return;
    }
    
    try {
      dispatch(updateVoiceState({ isListening: true, error: null }));
      dispatch(setBotState('listening'));
      dispatch(updateLastActivity());
      
      const recognition = recognitionRef.current;
      
      recognition.onstart = () => {
        console.log('🎤 Voice recognition started');
      };
      
      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = event.results[0][0].transcript;
        const confidence = event.results[0][0].confidence;
        
        dispatch(updateVoiceState({ 
          transcript, 
          confidence 
        }));
        
        // If final result, send message
        if (event.results[0].isFinal && transcript.trim()) {
          sendMessage(transcript.trim());
          // Use ref to avoid dependency issues
          if (recognitionRef.current) {
            recognitionRef.current.stop();
          }
          dispatch(updateVoiceState({ isListening: false }));
          dispatch(setBotState('idle'));  
        }
      };
      
      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        const errorMessage = `Lỗi nhận diện giọng nói: ${event.error}`;
        dispatch(updateVoiceState({ 
          error: errorMessage, 
          isListening: false 
        }));
        dispatch(setBotState('idle'));
        
        dispatch(showError({ 
          message: errorMessage,
          duration: 5000 
        }));
      };
      
      recognition.onend = () => {
        dispatch(updateVoiceState({ isListening: false }));
        dispatch(setBotState('idle'));
      };
      
      recognition.start();
      
    } catch (error) {
      console.error('Error starting voice recognition:', error);
      dispatch(updateVoiceState({ 
        error: 'Không thể khởi động nhận diện giọng nói', 
        isListening: false 
      }));
      dispatch(setBotState('idle'));
      
      dispatch(showError({ 
        message: 'Không thể khởi động nhận diện giọng nói',
        duration: 4000 
      }));
    }
  }, [voiceState.isSupported, dispatch, sendMessage]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    dispatch(updateVoiceState({ isListening: false }));
    dispatch(setBotState('idle'));
    dispatch(updateLastActivity());
  }, [dispatch]);

  // ==================== TTS FUNCTIONS ====================
  
  const stopSpeaking = useCallback(() => {
    if (typeof window !== 'undefined') {
      try {
        speechSynthesis.cancel();
      } catch {
        console.log('ℹ️ TTS stop - normal behavior');
      }
    }
    dispatch(updateTTSState({ 
      isPlaying: false, 
      currentText: null 
    }));
    dispatch(updateLastActivity());
  }, [dispatch]);

  // ==================== UTILITY FUNCTIONS ====================
  
  const clearErrorHandler = useCallback(() => {
    dispatch(setError(null));
  }, [dispatch]);

  const triggerGreeting = useCallback(() => {
    if (!fullConfig.enableGreeting || greetingShownRef.current) return;
    
    greetingShownRef.current = true;
    dispatch(setBotState('greeting'));
    
    const greetings = fullConfig.personality.greeting;
    const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];
    
    setTimeout(() => {
      dispatch(addMessage({
        content: randomGreeting,
        role: 'assistant',
      }));
      
      setTimeout(() => {
        dispatch(setBotState('idle'));
      }, 3000);
    }, 1000);
  }, [fullConfig, dispatch]);

  // Auto greeting effect
  useEffect(() => {
    if (fullConfig.enableGreeting && aiState.isFirstVisit && !greetingShownRef.current) {
      setTimeout(triggerGreeting, 1500);
    }
  }, [fullConfig.enableGreeting, aiState.isFirstVisit, triggerGreeting]);

  // ==================== RETURN ====================
  
  return {
    // State
    messages: aiState.messages,
    isLoading: aiState.isLoading,
    error: aiState.error,
    botState: aiState.botState,
    ttsState,
    voiceState,
    canInteract,
    systemStatus,
    
    // Actions
    sendMessage,
    startListening,
    stopListening,
    stopSpeaking,
    clearError: clearErrorHandler,
    triggerGreeting,
    
    // Utilities
    config: fullConfig,
  };
};

export default useOptimizedAIAssistant;