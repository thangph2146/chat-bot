'use client';

import { 
  postDifyChatStream, 
  DifyChatRequest, 
  DifyStreamingCallbacks,
  DifyChatResponse 
} from './call-api-dify';

// ==================== TYPES ====================
export interface TTSOptions {
  enabled: boolean;
  autoPlay: boolean;
  voice?: SpeechSynthesisVoice | null;
  rate?: number;
  pitch?: number;
  volume?: number;
  language?: 'vi-VN' | 'en-US';
}

export interface RealtimeTTSCallbacks extends Omit<DifyStreamingCallbacks, 'onMessage'> {
  onMessage: (message: string) => void;
  onTTSStart?: (text: string) => void;
  onTTSEnd?: () => void;
  onTTSError?: (error: Error) => void;
  onBotStateChange?: (state: 'thinking' | 'speaking' | 'idle') => void;
}

export interface StreamingTTSManager {
  currentUtterance: SpeechSynthesisUtterance | null;
  isPlaying: boolean;
  textBuffer: string;
  lastSentenceEnd: number;
  voices: SpeechSynthesisVoice[];
  options: TTSOptions;
}

// ==================== TTS UTILITIES ====================
class RealtimeTTSService {
  private manager: StreamingTTSManager;
  private sentenceEndRegex = /[.!?。！？]\s*/;
  private minSentenceLength = 10;
  private speakTimeout: NodeJS.Timeout | null = null;

  constructor(options: TTSOptions = { enabled: true, autoPlay: true }) {
    this.manager = {
      currentUtterance: null,
      isPlaying: false,
      textBuffer: '',
      lastSentenceEnd: 0,
      voices: [],
      options,
    };

    this.initializeVoices();
  }

  private initializeVoices = (): void => {
    const loadVoices = () => {
      const voices = speechSynthesis.getVoices();
      this.manager.voices = voices;
      
      // Set default Vietnamese voice if available
      if (!this.manager.options.voice && voices.length > 0) {
        const vietnameseVoice = voices.find(voice => 
          voice.lang.includes('vi') || voice.name.toLowerCase().includes('vietnam')
        );
        const defaultVoice = vietnameseVoice || voices.find(voice => 
          voice.lang.includes(this.manager.options.language || 'vi-VN')
        ) || voices[0];
        
        this.manager.options.voice = defaultVoice;
      }
    };

    loadVoices();
    
    // Handle voice loading for different browsers
    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = loadVoices;
    }

    // Retry voice loading after a delay (for some browsers)
    setTimeout(loadVoices, 100);
  };

  private createUtterance = (text: string): SpeechSynthesisUtterance => {
    const utterance = new SpeechSynthesisUtterance(text);
    
    if (this.manager.options.voice) {
      utterance.voice = this.manager.options.voice;
    }
    
    utterance.rate = this.manager.options.rate || 1.4; // Tăng tốc độ mặc định
    utterance.pitch = this.manager.options.pitch || 1.1; // Tăng pitch mặc định
    utterance.volume = this.manager.options.volume || 0.9; // Tăng volume mặc định
    utterance.lang = this.manager.options.language || 'vi-VN';

    return utterance;
  };

  private speakText = (text: string, callbacks?: RealtimeTTSCallbacks): void => {
    if (!this.manager.options.enabled || !text.trim()) return;

    try {
      // Stop current speech if playing
      if (this.manager.isPlaying) {
        try {
          speechSynthesis.cancel();
        } catch {
          console.log('ℹ️ TTS cancel - normal behavior');
        }
      }

      const utterance = this.createUtterance(text);
      this.manager.currentUtterance = utterance;

      utterance.onstart = () => {
        this.manager.isPlaying = true;
        callbacks?.onTTSStart?.(text);
        callbacks?.onBotStateChange?.('speaking');
        console.log('🔊 TTS Started:', text.substring(0, 50) + '...');
      };

      utterance.onend = () => {
        this.manager.isPlaying = false;
        this.manager.currentUtterance = null;
        callbacks?.onTTSEnd?.();
        callbacks?.onBotStateChange?.('idle');
        console.log('🔇 TTS Ended');
      };

      utterance.onerror = (event) => {
        this.manager.isPlaying = false;
        this.manager.currentUtterance = null;
        
        // Handle different error types gracefully
        if (event.error === 'interrupted' || event.error === 'canceled') {
          // These are normal interruptions, not real errors
          console.log('ℹ️ TTS interrupted/canceled - normal behavior');
          callbacks?.onTTSEnd?.(); // Treat as normal end
          callbacks?.onBotStateChange?.('idle');
        } else {
          // Real error
          const errorMessage = `TTS Error: ${event.error}`;
          console.error('🚨 TTS Error:', event);
          const ttsError = new Error(errorMessage);
          callbacks?.onTTSError?.(ttsError);
          callbacks?.onBotStateChange?.('idle');
        }
      };

      // Add utterance to speech queue
      speechSynthesis.speak(utterance);
      
    } catch (error) {
      console.error('Error in speakText:', error);
      callbacks?.onTTSError?.(error as Error);
    }
  };

  private processTextBuffer = (callbacks?: RealtimeTTSCallbacks): void => {
    const buffer = this.manager.textBuffer;
    
    // Find complete sentences
    const sentences = buffer.split(this.sentenceEndRegex);
    
    if (sentences.length > 1) {
      // We have at least one complete sentence
      const completeSentences = sentences.slice(0, -1);
      const incompleteSentence = sentences[sentences.length - 1];
      
      // Join complete sentences
      const textToSpeak = completeSentences.join('. ').trim();
      
      if (textToSpeak && textToSpeak.length >= this.minSentenceLength) {
        // Speak the complete sentences
        this.speakText(textToSpeak, callbacks);
        
        // Update buffer with remaining incomplete sentence
        this.manager.textBuffer = incompleteSentence;
        this.manager.lastSentenceEnd = buffer.length - incompleteSentence.length;
      }
    }
  };

  private handleStreamingText = (newText: string, callbacks?: RealtimeTTSCallbacks): void => {
    this.manager.textBuffer += newText;
    
    // Clear existing timeout
    if (this.speakTimeout) {
      clearTimeout(this.speakTimeout);
    }
    
    // Process complete sentences immediately
    this.processTextBuffer(callbacks);
    
    // Set timeout to speak remaining text if no new text comes
    this.speakTimeout = setTimeout(() => {
      const remainingText = this.manager.textBuffer.slice(this.manager.lastSentenceEnd).trim();
      if (remainingText && remainingText.length >= 5) {
        this.speakText(remainingText, callbacks);
        this.manager.textBuffer = '';
        this.manager.lastSentenceEnd = 0;
      }
    }, 2000); // Wait 2 seconds for more text
  };

  public updateOptions = (newOptions: Partial<TTSOptions>): void => {
    this.manager.options = { ...this.manager.options, ...newOptions };
    
    // Update voice if language changed
    if (newOptions.language) {
      const voice = this.manager.voices.find(v => 
        v.lang.includes(newOptions.language!) || 
        v.name.toLowerCase().includes(newOptions.language === 'vi-VN' ? 'vietnam' : 'english')
      );
      if (voice) {
        this.manager.options.voice = voice;
      }
    }
  };

  public stop = (): void => {
    if (this.speakTimeout) {
      clearTimeout(this.speakTimeout);
      this.speakTimeout = null;
    }
    
    // Gracefully stop speech synthesis
    try {
      speechSynthesis.cancel();
    } catch {
      console.log('ℹ️ TTS stop - normal behavior');
    }
    
    this.manager.isPlaying = false;
    this.manager.currentUtterance = null;
    this.manager.textBuffer = '';
    this.manager.lastSentenceEnd = 0;
  };

  public pause = (): void => {
    try {
      speechSynthesis.pause();
    } catch {
      console.log('ℹ️ TTS pause - normal behavior');
    }
  };

  public resume = (): void => {
    try {
      speechSynthesis.resume();
    } catch {
      console.log('ℹ️ TTS resume - normal behavior');
    }
  };

  public getStatus = () => ({
    isPlaying: this.manager.isPlaying,
    hasBuffer: this.manager.textBuffer.length > 0,
    currentVoice: this.manager.options.voice?.name || 'Default',
    bufferLength: this.manager.textBuffer.length,
  });

  // Main method to handle streaming chat with TTS
  public streamChatWithTTS = async (
    request: DifyChatRequest,
    callbacks: RealtimeTTSCallbacks
  ): Promise<void> => {
    // Reset TTS state
    this.stop();
    
    // Indicate bot is thinking
    callbacks.onBotStateChange?.('thinking');
    
    // Ensure inputs parameter is always included (required by Dify API)
    const enhancedRequest: DifyChatRequest = {
      ...request,
      inputs: request.inputs || {}, // Default to empty object if not provided
      response_mode: 'streaming', // Ensure streaming mode
    };
    
    const enhancedCallbacks: DifyStreamingCallbacks = {
      onStart: () => {
        callbacks.onStart?.();
        console.log('🤖 Bot started thinking...');
      },
      
      onMessage: (message: string) => {
        // Handle regular message callback
        callbacks.onMessage(message);
        
        // Handle TTS if enabled
        if (this.manager.options.enabled && this.manager.options.autoPlay) {
          this.handleStreamingText(message, callbacks);
        }
      },
      
      onComplete: (result: DifyChatResponse) => {
        callbacks.onComplete(result);
        
        // Speak any remaining text
        if (this.manager.options.enabled) {
          const remainingText = this.manager.textBuffer.trim();
          if (remainingText) {
            this.speakText(remainingText, callbacks);
            this.manager.textBuffer = '';
            this.manager.lastSentenceEnd = 0;
          }
        }
        
        console.log('✅ Chat stream completed');
      },
      
      onError: (error: Error) => {
        callbacks.onError(error);
        callbacks.onBotStateChange?.('idle');
        this.stop();
        console.error('❌ Chat stream error:', error);
      },
    };

    console.log('🚀 Sending request to Dify API:', JSON.stringify(enhancedRequest, null, 2));

    // Start the streaming chat
    await postDifyChatStream(enhancedRequest, enhancedCallbacks);
  };
}

// ==================== EXPORT FUNCTIONS ====================

// Create global TTS service instance
let ttsServiceInstance: RealtimeTTSService | null = null;

export const getRealtimeTTSService = (options?: TTSOptions): RealtimeTTSService => {
  if (!ttsServiceInstance) {
    ttsServiceInstance = new RealtimeTTSService(options);
  } else if (options) {
    ttsServiceInstance.updateOptions(options);
  }
  return ttsServiceInstance;
};

// Main function to call Dify API with realtime TTS
export const callDifyWithRealtimeTTS = async (
  request: DifyChatRequest,
  callbacks: RealtimeTTSCallbacks,
  ttsOptions?: TTSOptions
): Promise<void> => {
  const ttsService = getRealtimeTTSService(ttsOptions);
  await ttsService.streamChatWithTTS(request, callbacks);
};

// Utility functions
export const stopRealtimeTTS = (): void => {
  if (ttsServiceInstance) {
    ttsServiceInstance.stop();
  }
};

export const pauseRealtimeTTS = (): void => {
  if (ttsServiceInstance) {
    ttsServiceInstance.pause();
  }
};

export const resumeRealtimeTTS = (): void => {
  if (ttsServiceInstance) {
    ttsServiceInstance.resume();
  }
};

export const getTTSStatus = () => {
  return ttsServiceInstance?.getStatus() || {
    isPlaying: false,
    hasBuffer: false,
    currentVoice: 'Not initialized',
    bufferLength: 0,
  };
};

// Check TTS support
export const isTTSSupported = (): boolean => {
  return 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
};

const realtimeTTSAPI = {
  callDifyWithRealtimeTTS,
  getRealtimeTTSService,
  stopRealtimeTTS,
  pauseRealtimeTTS,
  resumeRealtimeTTS,
  getTTSStatus,
  isTTSSupported,
};

export default realtimeTTSAPI;