import { useState, useEffect, useRef, useCallback } from 'react';

interface UseTextToSpeechOptions {
  autoPlay?: boolean;
  voice?: SpeechSynthesisVoice | null;
  pitch?: number;
  rate?: number;
  volume?: number;
}

interface UseTextToSpeechReturn {
  isPlaying: boolean;
  isPaused: boolean;
  availableVoices: SpeechSynthesisVoice[];
  currentVoice: SpeechSynthesisVoice | null;
  pitch: number;
  rate: number;
  volume: number;
  play: (text: string) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  setVoice: (voice: SpeechSynthesisVoice | null) => void;
  setPitch: (pitch: number) => void;
  setRate: (rate: number) => void;
  setVolume: (volume: number) => void;
}

export const useTextToSpeech = (options: UseTextToSpeechOptions = {}): UseTextToSpeechReturn => {
  const {
    voice: initialVoice = null,
    pitch: initialPitch = 1,
    rate: initialRate = 1,
    volume: initialVolume = 1,
  } = options;

  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [currentVoice, setCurrentVoice] = useState<SpeechSynthesisVoice | null>(initialVoice);
  const [pitch, setPitch] = useState(initialPitch);
  const [rate, setRate] = useState(initialRate);
  const [volume, setVolume] = useState(initialVolume);

  const synth = useRef<SpeechSynthesis | null>(null);
  const currentUtterance = useRef<SpeechSynthesisUtterance | null>(null);

  // Initialize speech synthesis
  useEffect(() => {
    synth.current = window.speechSynthesis;
    
    const loadVoices = () => {
      const voices = synth.current?.getVoices() || [];
      setAvailableVoices(voices);
      if (voices.length > 0 && !currentVoice) {
        setCurrentVoice(voices[0]);
      }
    };

    if (synth.current?.getVoices().length === 0) {
      synth.current.onvoiceschanged = loadVoices;
    } else {
      loadVoices();
    }

    return () => {
      if (synth.current) {
        synth.current.cancel();
      }
    };
  }, [currentVoice]);

  const createUtterance = useCallback((text: string): SpeechSynthesisUtterance => {
    const utterance = new SpeechSynthesisUtterance(text);
    
    utterance.voice = currentVoice;
    utterance.pitch = pitch;
    utterance.rate = rate;
    utterance.volume = volume;
    
    utterance.onstart = () => {
      setIsPlaying(true);
      setIsPaused(false);
    };
    
    utterance.onend = () => {
      setIsPlaying(false);
      setIsPaused(false);
      currentUtterance.current = null;
    };
    
    utterance.onpause = () => {
      setIsPaused(true);
    };
    
    utterance.onresume = () => {
      setIsPaused(false);
    };
    
    utterance.onerror = (event) => {
      console.error('Text-to-speech error:', event);
      setIsPlaying(false);
      setIsPaused(false);
      currentUtterance.current = null;
    };

    return utterance;
  }, [currentVoice, pitch, rate, volume]);

  const play = useCallback((text: string) => {
    if (!synth.current || !text.trim()) return;

    // Stop any current speech
    synth.current.cancel();
    currentUtterance.current = null;

    // Create new utterance
    const utterance = createUtterance(text);
    currentUtterance.current = utterance;
    
    synth.current.speak(utterance);
  }, [createUtterance]);

  const pause = useCallback(() => {
    if (synth.current && isPlaying) {
      synth.current.pause();
    }
  }, [isPlaying]);

  const resume = useCallback(() => {
    if (synth.current && isPaused) {
      synth.current.resume();
    }
  }, [isPaused]);

  const stop = useCallback(() => {
    if (synth.current) {
      synth.current.cancel();
      setIsPlaying(false);
      setIsPaused(false);
      currentUtterance.current = null;
    }
  }, []);

  return {
    isPlaying,
    isPaused,
    availableVoices,
    currentVoice,
    pitch,
    rate,
    volume,
    play,
    pause,
    resume,
    stop,
    setVoice: setCurrentVoice,
    setPitch,
    setRate,
    setVolume,
  };
}; 