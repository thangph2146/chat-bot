'use client';

import React, { useState, useEffect, useRef } from "react";
import { FaPlay, FaPause, FaStop, FaVolumeUp } from "react-icons/fa";
import { getDefaultVoice, getVietnameseVoices, getEnglishVoices } from "../utils/speechUtils";

interface TextToSpeechProps {
  text: string;
  autoPlay?: boolean;
  className?: string;
}

export const TextToSpeech: React.FC<TextToSpeechProps> = ({ 
  text, 
  autoPlay = false,
  className = ""
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [utterance, setUtterance] = useState<SpeechSynthesisUtterance | null>(null);
  const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [pitch, setPitch] = useState(1);
  const [rate, setRate] = useState(1);
  const [volume, setVolume] = useState(1);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  
  const synth = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    synth.current = window.speechSynthesis;
    
    // Lấy danh sách voices có sẵn
    const loadVoices = () => {
      const voices = synth.current?.getVoices() || [];
      setAvailableVoices(voices);
      if (voices.length > 0 && !voice) {
        // Ưu tiên sử dụng voice tiếng Việt mặc định
        const defaultVoice = getDefaultVoice();
        setVoice(defaultVoice || voices[0]);
      }
    };

    // Đợi voices load xong
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
  }, [voice]);

  useEffect(() => {
    if (text && synth.current) {
      const u = new SpeechSynthesisUtterance(text);
      
      // Thiết lập các thuộc tính
      u.voice = voice;
      u.pitch = pitch;
      u.rate = rate;
      u.volume = volume;
      
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

      setUtterance(u);

      // Auto play nếu được bật
      if (autoPlay && text.trim()) {
        handlePlay();
      }
    }
  }, [text, voice, pitch, rate, volume, autoPlay]);

  const handlePlay = () => {
    if (!synth.current || !utterance) return;

    if (isPaused) {
      synth.current.resume();
    } else {
      // Cập nhật utterance với các thuộc tính mới
      utterance.voice = voice;
      utterance.pitch = pitch;
      utterance.rate = rate;
      utterance.volume = volume;
      synth.current.speak(utterance);
    }
  };

  const handlePause = () => {
    if (synth.current) {
      synth.current.pause();
    }
  };

  const handleStop = () => {
    if (synth.current) {
      synth.current.cancel();
      setIsPlaying(false);
      setIsPaused(false);
    }
  };

  const handleVoiceChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedVoice = availableVoices.find(v => v.name === event.target.value);
    setVoice(selectedVoice || null);
  };

  const handlePitchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPitch(parseFloat(event.target.value));
  };

  const handleRateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRate(parseFloat(event.target.value));
  };

  const handleVolumeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setVolume(parseFloat(event.target.value));
  };

  if (!text.trim()) {
    return null;
  }

  return (
    <div className={`bg-white/80 backdrop-blur-sm rounded-lg p-4 border border-blue-200 ${className}`}>
      <div className="flex items-center gap-3 mb-4">
        <FaVolumeUp className="text-blue-600 w-5 h-5" />
        <h3 className="text-lg font-semibold text-gray-800">Text-to-Speech</h3>
      </div>

      {/* Voice Selection */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Giọng đọc:
        </label>
        <select 
          value={voice?.name || ''} 
          onChange={handleVoiceChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {/* Tiếng Việt */}
          {getVietnameseVoices().length > 0 && (
            <optgroup label="🇻🇳 Tiếng Việt">
              {getVietnameseVoices().map((v) => (
                <option key={v.name} value={v.name}>
                  {v.name} ({v.lang})
                </option>
              ))}
            </optgroup>
          )}
          
          {/* Tiếng Anh */}
          {getEnglishVoices().length > 0 && (
            <optgroup label="🇺🇸 Tiếng Anh">
              {getEnglishVoices().map((v) => (
                <option key={v.name} value={v.name}>
                  {v.name} ({v.lang})
                </option>
              ))}
            </optgroup>
          )}
          
          {/* Các ngôn ngữ khác */}
          {availableVoices.filter(v => 
            !getVietnameseVoices().includes(v) && 
            !getEnglishVoices().includes(v)
          ).map((v) => (
            <option key={v.name} value={v.name}>
              {v.name} ({v.lang})
            </option>
          ))}
        </select>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tốc độ: {rate}x
          </label>
          <input
            type="range"
            min="0.5"
            max="2"
            step="0.1"
            value={rate}
            onChange={handleRateChange}
            className="w-full"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Cao độ: {pitch}
          </label>
          <input
            type="range"
            min="0.5"
            max="2"
            step="0.1"
            value={pitch}
            onChange={handlePitchChange}
            className="w-full"
          />
        </div>
      </div>

      {/* Volume */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Âm lượng: {Math.round(volume * 100)}%
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={volume}
          onChange={handleVolumeChange}
          className="w-full"
        />
      </div>

      {/* Playback Controls */}
      <div className="flex gap-2">
        <button
          onClick={handlePlay}
          disabled={!text.trim()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isPaused ? <FaPlay className="w-4 h-4" /> : <FaPlay className="w-4 h-4" />}
          {isPaused ? 'Tiếp tục' : 'Phát'}
        </button>
        
        {isPlaying && (
          <button
            onClick={handlePause}
            className="flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
          >
            <FaPause className="w-4 h-4" />
            Tạm dừng
          </button>
        )}
        
        <button
          onClick={handleStop}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          <FaStop className="w-4 h-4" />
          Dừng
        </button>
      </div>
    </div>
  );
}; 