'use client';

import React, { useState, useEffect, useRef, useCallback } from "react";
import { FaPlay, FaPause, FaVolumeUp } from "react-icons/fa";
import { getDefaultVoice } from "../utils/speechUtils";
import logger from "@/lib/logger";

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
  const [playState, setPlayState] = useState<'idle' | 'playing' | 'paused'>('idle');
  const synth = useRef<SpeechSynthesis | null>(null);
  const utterance = useRef<SpeechSynthesisUtterance | null>(null);
  
  // Computed states (removed unused ones)

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

  const handlePlayInternal = useCallback(() => {
    if (!synth.current || !text.trim()) return;

    // Dừng phát hiện tại nếu có
    if (playState !== 'idle') {
      synth.current.cancel();
    }

    // Tạo utterance mới
    const u = new SpeechSynthesisUtterance(text);
    
    // Thiết lập thuộc tính với voice tiếng Việt mặc định
    u.voice = getDefaultVoice();
    u.rate = 1.3; // Tốc độ nhanh hơn cho tiếng Việt
    u.pitch = 1;
    u.volume = 0.8;
    
    // Event listeners
    u.onstart = () => {
      logger.info('Speech started');
      setPlayState('playing');
    };
    
    u.onend = () => {
      logger.info('Speech ended');
      setPlayState('idle');
    };
    
    u.onpause = () => {
      logger.info('Speech paused (event)');
      // State đã được set trong handlePause, chỉ log
    };
    
    u.onresume = () => {
      logger.info('Speech resumed (event)');
      // State đã được set trong handleResume, chỉ log
    };
    
    u.onerror = (event) => {
      logger.error('Text-to-speech error:', event);
      
      // Xử lý các loại lỗi khác nhau
      if (event.error === 'interrupted') {
        // Lỗi interrupted thường xảy ra khi cancel hoặc tạo utterance mới
        logger.info('Speech was interrupted, this is normal when stopping or creating new utterance');
      } else if (event.error === 'canceled') {
        logger.info('Speech was canceled');
      } else {
        logger.error('Speech synthesis error:', event.error);
      }
      
      setPlayState('idle');
    };

    utterance.current = u;
    synth.current.speak(u);
  }, [text, playState]);

  useEffect(() => {
    if (text && synth.current && autoPlay) {
      handlePlayInternal();
    }
  }, [text, autoPlay, handlePlayInternal]);

  const handlePlay = () => {
    handlePlayInternal();
  };

  const handlePause = () => {
    if (synth.current && playState === 'playing') {
      try {
        logger.info('Attempting to pause speech...');
        synth.current.pause();
        // Set state ngay lập tức vì onpause event không luôn trigger
        logger.info('State changed: playing → paused');
        setPlayState('paused');
      } catch (error) {
        logger.error('Error pausing speech:', error);
        // Nếu pause thất bại, reset trạng thái
        setPlayState('idle');
      }
    }
  };

  const handleResume = () => {
    if (synth.current && playState === 'paused') {
      try {
        logger.info('Attempting to resume speech...');
        synth.current.resume();
        // Set state ngay lập tức vì onresume event không luôn trigger
        logger.info('State changed: paused → playing');
        setPlayState('playing');
      } catch (error) {
        logger.error('Error resuming speech:', error);
        // Nếu resume thất bại, tạo utterance mới
        logger.info('Resume failed, creating new utterance...');
        setPlayState('idle'); 
        handlePlay();
      }
    }
  };

  const handleStop = () => {
    if (synth.current) {
      // Reset trạng thái trước khi cancel để tránh lỗi
      setPlayState('idle');
      synth.current.cancel();
    }
  };

  if (!text.trim()) {
    return null;
  }

  const handleButtonClick = () => {
    logger.info('Button clicked, current state:', playState);
    
    switch (playState) {
      case 'idle':
        logger.info('Action: Starting playback');
        handlePlay();
        break;
      case 'playing':
        logger.info('Action: Pausing playback');
        handlePause();
        break;
      case 'paused':
        logger.info('Action: Resuming playback');
        handleResume();
        break;
      default:
        logger.warn('Unknown playState:', playState);
    }
  };

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <button
        onClick={handleButtonClick}
        className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-md transition-colors"
        title={
          playState === 'idle' ? 'Phát âm thanh' :
          playState === 'playing' ? 'Tạm dừng' :
          'Tiếp tục phát'
        }
      >
        {playState === 'playing' ? (
          <FaPause className="w-3 h-3" />
        ) : (
          <FaPlay className="w-3 h-3" />
        )}
        <FaVolumeUp className="w-3 h-3" />
      </button>

      {playState !== 'idle' && (
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