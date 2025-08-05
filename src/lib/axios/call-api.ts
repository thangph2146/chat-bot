'use client';

import axios from 'axios';
import { DifyService } from '../../../services/dify/dify-service';
import { DifyChatRequest, DifyStreamingCallbacks } from './call-api-dify';

// ==================== CONFIGURATION ====================
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds timeout
});

// ==================== INTERCEPTORS ====================
api.interceptors.request.use(
  (config) => {
    const token = process.env.NEXT_PUBLIC_DIFY_API_KEY || 'app-kyJ4IsXr0BvdaSuYBpdPISXH';
    if (token) {
      if (config.headers) {
        config.headers.Authorization = `Bearer ${token || 'app-kyJ4IsXr0BvdaSuYBpdPISXH'}`;
      } else {
        config.headers = { Authorization: `Bearer ${token || 'app-kyJ4IsXr0BvdaSuYBpdPISXH'}` };
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ==================== TYPES ====================
export interface ChatRequest {
  inputs?: Record<string, unknown>;
  query: string;
  response_mode: 'streaming' | 'blocking';
  conversation_id?: string;
  user?: string;
  files?: Array<{
    type: string;
    transfer_method: string;
    url: string;
  }>;
}

export interface ChatResponse {
  fullMessage: string;
  conversationId: string | null;
  messageId: string | null;
}

export interface StreamingCallbacks {
  onMessage: (message: string) => void;
  onComplete: (result: ChatResponse) => void;
  onError: (error: Error) => void;
  onStart?: () => void;
}

// ==================== DIFY SERVICE INSTANCE ====================
const difyService = new DifyService({
  retry: {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2
  },
  rateLimit: {
    maxRequestsPerMinute: 60,
    maxRequestsPerHour: 1000
  }
});

// ==================== STREAMING CHAT FUNCTION ====================
export const postChatStream = async (
  data: ChatRequest,
  callbacks: StreamingCallbacks
): Promise<void> => {
  try {
    // Call onStart callback if provided
    callbacks.onStart?.();

    // Convert to Dify format
    const difyRequest: DifyChatRequest = {
      inputs: data.inputs || {},
      query: data.query,
      response_mode: data.response_mode,
      conversation_id: data.conversation_id || '',
      user: data.user || 'default-user',
      files: data.files
    };

    const difyCallbacks: DifyStreamingCallbacks = {
      onMessage: callbacks.onMessage,
      onComplete: callbacks.onComplete,
      onError: callbacks.onError,
      onStart: callbacks.onStart
    };

    // Use DifyService with retry logic
    await difyService.streamChatWithRetry(difyRequest, difyCallbacks);

  } catch (error) {
    console.error('Error in streaming chat:', error);
    callbacks.onError(error as Error);
  }
};

// ==================== LEGACY API FUNCTIONS ====================
export const callApiRoute = {
  // Example function to make a GET request
  getData: async () => {
    try {
      const response = await api.get(API_ENDPOINTS.CHAT);
      return response.data;
    } catch (error) {
      console.error('Error fetching data:', error);
      throw error;
    }
  },

  // Example function to make a POST request
  postItem: async (data: unknown) => {
    try {
      const response = await api.post(API_ENDPOINTS.CHAT, data);
      return response.data;
    } catch (error) {
      console.error('Error posting item:', error);
      throw error;
    }
  },

  // Legacy streaming function - now uses DifyService
  postChatStream: async (
    data: unknown, 
    onMessage: (message: string) => void, 
    onComplete: (result: { fullMessage: string; conversationId: string | null; messageId: string | null }) => void, 
    onError: (error: Error) => void
  ) => {
    await postChatStream(
      data as ChatRequest,
      { onMessage, onComplete, onError }
    );
  },
};