'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent {
  error: string;
  message: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: ((this: SpeechRecognition, ev: Event) => void) | null;
  onend: ((this: SpeechRecognition, ev: Event) => void) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => void) | null;
}

declare global {
  interface Window {
    webkitSpeechRecognition?: {
      new (): SpeechRecognition;
    };
  }
}

interface UseVoiceInputOptions {
  continuous?: boolean;
  interimResults?: boolean;
  lang?: string;
  onTranscript?: (transcript: string) => void;
  onError?: (error: string) => void;
}

interface UseVoiceInputReturn {
  isRecording: boolean;
  transcript: string;
  error: string | null;
  isSupported: boolean;
  startRecording: () => void;
  stopRecording: () => void;
  resetTranscript: () => void;
  resetError: () => void;
}

export const useVoiceInput = ({
  continuous = false,
  interimResults = true,
  lang = 'vi-VN',
  onTranscript,
  onError
}: UseVoiceInputOptions = {}): UseVoiceInputReturn => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isRecordingRef = useRef(false);

  // Check browser support
  useEffect(() => {
    if (typeof window === 'undefined') {
      setIsSupported(false);
      return;
    }
    
    const SpeechRecognitionAPI = (typeof SpeechRecognition !== 'undefined' ? SpeechRecognition : window.webkitSpeechRecognition) as {
      new (): SpeechRecognition;
    };
    setIsSupported(!!SpeechRecognitionAPI);
    
    if (SpeechRecognitionAPI) {
      recognitionRef.current = new SpeechRecognitionAPI();
    }
  }, []);

  // Setup recognition instance
  useEffect(() => {
    const recognition = recognitionRef.current;
    if (!recognition) return;

    recognition.continuous = continuous;
    recognition.interimResults = interimResults;
    recognition.lang = lang;

    recognition.onstart = () => {
      setIsRecording(true);
      isRecordingRef.current = true;
      setError(null);
    };

    recognition.onend = () => {
      setIsRecording(false);
      isRecordingRef.current = false;
      
      // Auto-submit transcript when recording ends
      if (transcript.trim()) {
        onTranscript?.(transcript.trim());
        setTranscript('');
      }
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcriptText = result[0].transcript;

        if (result.isFinal) {
          finalTranscript += transcriptText;
        } else {
          interimTranscript += transcriptText;
        }
      }

      // Update transcript with final + interim results
      const combinedTranscript = finalTranscript || interimTranscript;
      if (combinedTranscript.trim()) {
        setTranscript(combinedTranscript.trim());
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      let errorMessage = 'Lỗi nhận diện giọng nói';
      
      switch (event.error) {
        case 'no-speech':
          errorMessage = 'Không phát hiện giọng nói';
          break;
        case 'audio-capture':
          errorMessage = 'Không thể truy cập microphone';
          break;
        case 'not-allowed':
          errorMessage = 'Quyền truy cập microphone bị từ chối';
          break;
        case 'network':
          errorMessage = 'Lỗi kết nối mạng';
          break;
        case 'service-not-allowed':
          errorMessage = 'Dịch vụ nhận diện giọng nói không khả dụng';
          break;
        default:
          errorMessage = `Lỗi nhận diện giọng nói: ${event.error}`;
      }
      
      setError(errorMessage);
      setIsRecording(false);
      isRecordingRef.current = false;
      onError?.(errorMessage);
    };

    return () => {
      if (isRecordingRef.current) {
        recognition.stop();
      }
    };
  }, [continuous, interimResults, lang, transcript, onTranscript, onError]);

  const startRecording = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition || isRecordingRef.current) return;

    try {
      setError(null);
      setTranscript('');
      recognition.start();
    } catch (error) {
      console.error('Error starting speech recognition:', error);
      setError('Không thể bắt đầu nhận diện giọng nói');
    }
  }, []);

  const stopRecording = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition || !isRecordingRef.current) return;

    try {
      recognition.stop();
    } catch (error) {
      console.error('Error stopping speech recognition:', error);
    }
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setError(null);
  }, []);

  const resetError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isRecording,
    transcript,
    error,
    isSupported,
    startRecording,
    stopRecording,
    resetTranscript,
    resetError
  };
};

export default useVoiceInput;