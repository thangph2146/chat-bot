'use client';

import React, { useState, useEffect, useRef } from "react";
import { FaPlay, FaPause, FaVolumeUp } from "react-icons/fa";
import { getDefaultVoice, getVietnameseVoices } from "../utils/speechUtils";

interface QuickTextToSpeechProps {
  text: string;
  className?: string;
  autoPlay?: boolean;
}

export const QuickTextToSpeech: React.FC<QuickTextToSpeechProps> = ({ 
  text, 
  className = "",
  autoPlay = false
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const synth = useRef<SpeechSynthesis | null>(null);
  const utterance = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    synth.current = window.speechSynthesis;
    
    // Đợi voices load xong
    const loadVoices = () => {
      // Không cần làm gì, chỉ đảm bảo voices đã load
    };
    
    if (synth.current?.getVoices().length === 0) {
      synth.current.onvoiceschanged = loadVoices;
    }
    
    return () => {
      if (synth.current) {
        synth.current.cancel();
      }
    };
  }, []);

  useEffect(() => {
    if (text && synth.current && autoPlay) {
      handlePlay();
    }
  }, [text, autoPlay]);

  const handlePlay = () => {
    if (!synth.current || !text.trim()) return;

    // Dừng phát hiện tại nếu có
    synth.current.cancel();

    // Tạo utterance mới
    const u = new SpeechSynthesisUtterance(text);
    
    // Thiết lập thuộc tính với voice tiếng Việt mặc định
    u.voice = getDefaultVoice();
    u.rate = 1.3; // Tốc độ nhanh hơn cho tiếng Việt
    u.pitch = 1;
    u.volume = 0.8;
    
    // Event listeners
    u.onstart = () => {
      setIsPlaying(true);
      setIsPaused(false);
    };
    
    u.onend = () => {
      setIsPlaying(false);
      setIsPaused(false);
    };
    
    u.onpause = () => {
      setIsPaused(true);
    };
    
    u.onresume = () => {
      setIsPaused(false);
    };
    
    u.onerror = (event) => {
      console.error('Text-to-speech error:', event);
      setIsPlaying(false);
      setIsPaused(false);
    };

    utterance.current = u;
    synth.current.speak(u);
  };

  const handlePause = () => {
    if (synth.current && isPlaying) {
      synth.current.pause();
    }
  };

  const handleResume = () => {
    if (synth.current && isPaused) {
      synth.current.resume();
    }
  };

  const handleStop = () => {
    if (synth.current) {
      synth.current.cancel();
      setIsPlaying(false);
      setIsPaused(false);
    }
  };

  if (!text.trim()) {
    return null;
  }

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <button
        onClick={isPlaying ? (isPaused ? handleResume : handlePause) : handlePlay}
        className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-md transition-colors"
        title={isPlaying ? (isPaused ? 'Tiếp tục phát' : 'Tạm dừng') : 'Phát âm thanh'}
      >
        {isPlaying && !isPaused ? (
          <FaPause className="w-3 h-3" />
        ) : (
          <FaPlay className="w-3 h-3" />
        )}
        <FaVolumeUp className="w-3 h-3" />
      </button>
      
      {isPlaying && (
        <button
          onClick={handleStop}
          className="px-2 py-1 text-xs bg-red-100 hover:bg-red-200 text-red-700 rounded-md transition-colors"
          title="Dừng phát"
        >
          Dừng
        </button>
      )}
    </div>
  );
}; 