'use client';

import React from 'react';
import { useVoiceInput } from '../hooks/useVoiceInput';

export const VoiceInputDebug: React.FC = () => {
  const {
    isRecording,
    transcript,
    error,
    isSupported,
    startRecording,
    stopRecording,
    resetError
  } = useVoiceInput({
    onTranscript: (transcript) => {
      console.log('Transcript received:', transcript);
    },
    onError: (error) => {
      console.error('Voice error:', error);
    }
  });

  return (
    <div className="p-4 bg-gray-100 rounded-lg border">
      <h3 className="font-bold mb-2">Voice Input Debug</h3>
      <div className="space-y-2 text-sm">
        <div>
          <strong>Supported:</strong> {isSupported ? '✅ Yes' : '❌ No'}
        </div>
        <div>
          <strong>Recording:</strong> {isRecording ? '🔴 Yes' : '⚪ No'}
        </div>
        <div>
          <strong>Transcript:</strong> {transcript || 'None'}
        </div>
        <div>
          <strong>Error:</strong> {error || 'None'}
        </div>
        <div className="flex gap-2">
          <button
            onClick={startRecording}
            disabled={!isSupported || isRecording}
            className="px-3 py-1 bg-blue-500 text-white rounded disabled:bg-gray-300"
          >
            Start
          </button>
          <button
            onClick={stopRecording}
            disabled={!isSupported || !isRecording}
            className="px-3 py-1 bg-red-500 text-white rounded disabled:bg-gray-300"
          >
            Stop
          </button>
          <button
            onClick={resetError}
            className="px-3 py-1 bg-gray-500 text-white rounded"
          >
            Reset Error
          </button>
        </div>
      </div>
    </div>
  );
}; 