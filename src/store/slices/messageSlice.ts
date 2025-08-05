'use client';

import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { DifyChatRequest } from "@/lib/axios/call-api-dify";
import { 
  Conversation, 
  StreamingState, 
  ChatUIState,
} from "@/modules/chat-message/types";
import { difyService } from "@/services/dify/dify-service";

// Helper function to ensure message has valid parts
const ensureMessageParts = (message: Message): Message => {
  return {
    ...message,
    parts: message.parts && Array.isArray(message.parts) ? message.parts : [{ text: '' }]
  };
};

// Legacy Message interface for backward compatibility
export interface Message {
  id: string;
  role: "user" | "model";
  parts: { text: string }[];
  timestamp: number;
  conversationId?: string;
  messageId?: string;
}

interface MessageState {
  messages: Message[];
  conversations: Conversation[];
  input: string;
  isLoading: boolean;
  error: string | null;
  currentConversationId: string | null;
  streamingState: StreamingState;
  uiState: Partial<ChatUIState>;

}

const initialState: MessageState = {
  messages: [],
  conversations: [],
  input: "",
  isLoading: false,
  error: null,
  currentConversationId: null,
  streamingState: {
    isStreaming: false,
    streamId: null,
    currentMessageId: null,
    accumulatedContent: "",
    buffer: "",
    error: null,
    currentChunk: null
  },
  uiState: {
    isInputFocused: false,
    showMarkdownPreview: false,
    isScrolledToBottom: true,
    selectedMessageId: null,
    editingMessageId: null,
    showConversationHistory: false
  },

};

// Async thunk để gửi tin nhắn với logging
export const sendMessageWithLogging = createAsyncThunk(
  "message/sendMessageWithLogging",
  async (
    { messageText, userId }: { messageText: string; userId?: string },
    { dispatch, getState }
  ) => {
    const startTime = Date.now();
    const requestId = `req_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;



    try {
      let fullResponse = "";
      let conversationId = "";
      let messageId = "";
      
      const streamId = `stream_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const botMessageId = `msg_${Date.now()}`;
      
      dispatch({ type: 'message/startStreaming', payload: { streamId, messageId: botMessageId } });

      await new Promise<void>((resolve, reject) => {
        difyService.streamChatWithRetry(
          {
            inputs: {},
            query: messageText,
            response_mode: "streaming",
            conversation_id: (getState() as { message: MessageState }).message.currentConversationId || "",
            user: userId || "anonymous"
          } as DifyChatRequest,
          {
            onMessage: (message: string) => {
              fullResponse += message;
              dispatch({ type: 'message/updateStreamingContent', payload: { messageId: botMessageId, content: message } });
            },
            onComplete: (result: { fullMessage: string; conversationId: string | null; messageId: string | null }) => {
              fullResponse = result.fullMessage;
              conversationId = result.conversationId || "";
              messageId = result.messageId || botMessageId;
              dispatch({ type: 'message/stopStreaming', payload: { messageId: botMessageId, finalContent: fullResponse } });
              if (result.conversationId && result.conversationId !== (getState() as { message: MessageState }).message.currentConversationId) {
                dispatch({ type: 'message/setCurrentConversationId', payload: result.conversationId });
              }
              resolve();
            },
            onError: (error: Error) => {
              dispatch({ type: 'message/setStreamingError', payload: { messageId: botMessageId, error: error.message || 'Streaming error' } });
              reject(error);
            }
          }
        );
      });
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;



      return {
        response: { answer: fullResponse, fullMessage: fullResponse },
        responseTime,
        conversationId: conversationId || (getState() as { message: MessageState }).message.currentConversationId,
        messageId: messageId || `msg_${Date.now()}`,
      };
    } catch (error: unknown) {
      const endTime = Date.now();
      const responseTime = endTime - startTime;



      throw error;
    }
  }
);

const messageSlice = createSlice({
  name: "message",
  initialState,
  reducers: {
    setInput: (state, action: PayloadAction<string>) => {
      state.input = action.payload;
    },

    addMessage: (state, action: PayloadAction<Message>) => {
      const message = ensureMessageParts(action.payload);
      state.messages.push(message);
    },

    clearMessages: (state) => {
      state.messages = [];
      state.currentConversationId = null;
    },

    setCurrentConversationId: (state, action: PayloadAction<string | null>) => {
      state.currentConversationId = action.payload;
    },

    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },

    // Streaming state management
    startStreaming: (state, action: PayloadAction<{ streamId: string; messageId?: string }>) => {
      state.streamingState.isStreaming = true;
      state.streamingState.streamId = action.payload.streamId;
      state.streamingState.currentMessageId = action.payload.messageId || null;
      state.streamingState.accumulatedContent = "";
      state.streamingState.error = null;
    },

    updateStreamingContent: (state, action: PayloadAction<{ messageId: string; content: string }>) => {
      const { messageId, content } = action.payload;
      let message = state.messages.find(m => m.id === messageId);
      
      if (!message) {
        // Tạo bot message placeholder nếu chưa có
        message = {
          id: messageId,
          role: 'model',
          parts: [{ text: '' }],
          timestamp: Date.now(),
          conversationId: state.currentConversationId || undefined,
          messageId: messageId,
        };
        state.messages.push(ensureMessageParts(message));
      }
      
      message.parts[0].text += content;
       state.streamingState.accumulatedContent += content;
     },

     stopStreaming: (state, action: PayloadAction<{ messageId: string; finalContent: string }>) => {
      const { messageId, finalContent } = action.payload;
      const message = state.messages.find(m => m.id === messageId);
      if (message) {
        message.parts[0].text = finalContent;
      }
      state.streamingState.isStreaming = false;
      state.streamingState.streamId = null;
      state.streamingState.currentChunk = null;
    },

    setStreamingError: (state, action: PayloadAction<{ messageId: string; error: string }>) => {
      const { messageId, error } = action.payload;
      const message = state.messages.find(m => m.id === messageId);
      if (message) {
        message.parts[0].text = `Error: ${error}`;
      }
      state.streamingState.isStreaming = false;
      state.streamingState.error = error;
    },

    // UI state management
    updateUIState: (state, action: PayloadAction<Partial<ChatUIState>>) => {
      state.uiState = { ...state.uiState, ...action.payload };
    },

    setInputFocus: (state, action: PayloadAction<boolean>) => {
      state.uiState.isInputFocused = action.payload;
    },



    setMarkdownPreview: (state, action: PayloadAction<boolean>) => {
      state.uiState.showMarkdownPreview = action.payload;
    },

    setSelectedMessage: (state, action: PayloadAction<string | null>) => {
      state.uiState.selectedMessageId = action.payload;
    },

    setEditingMessage: (state, action: PayloadAction<string | null>) => {
      state.uiState.editingMessageId = action.payload;
    },

    toggleConversationHistory: (state) => {
      state.uiState.showConversationHistory = !state.uiState.showConversationHistory;
    },

    // Conversation management
    addConversation: (state, action: PayloadAction<Conversation>) => {
      state.conversations.unshift(action.payload);
    },

    updateConversation: (state, action: PayloadAction<{ id: string; updates: Partial<Conversation> }>) => {
      const index = state.conversations.findIndex(conv => conv.id === action.payload.id);
      if (index !== -1) {
        state.conversations[index] = { ...state.conversations[index], ...action.payload.updates };
      }
    },

    deleteConversation: (state, action: PayloadAction<string>) => {
      state.conversations = state.conversations.filter(conv => conv.id !== action.payload);
      if (state.currentConversationId === action.payload) {
        state.currentConversationId = null;
        state.messages = [];
      }
    },
  },

  extraReducers: (builder) => {
    builder
      .addCase(sendMessageWithLogging.pending, (state, action) => {
        state.isLoading = true;
        state.error = null;
        
        // Thêm user message ngay lập tức để đảm bảo thứ tự đúng
        const userMessage: Message = {
          id: `user_${Date.now()}`,
          role: "user",
          parts: [{ text: action.meta.arg.messageText }],
          timestamp: Date.now(),
          conversationId: state.currentConversationId || undefined,
        };
        state.messages.push(ensureMessageParts(userMessage));
      })
      .addCase(sendMessageWithLogging.fulfilled, (state, action) => {
        state.isLoading = false;

        // Chỉ cập nhật bot message đã có từ streaming, không tạo mới
        const existingBotMessage = state.messages.find(m => m.id === (action.payload.messageId || state.streamingState.currentMessageId));
        if (existingBotMessage) {
          // Cập nhật message đã có với nội dung cuối cùng
          existingBotMessage.parts = [{ text: action.payload.response?.fullMessage || state.streamingState.accumulatedContent }];
          existingBotMessage.conversationId = action.payload.conversationId || state.currentConversationId || undefined;
          existingBotMessage.messageId = action.payload.messageId;
          existingBotMessage.timestamp = Date.now();
        }

        // Cập nhật conversation ID
        if (action.payload.conversationId) {
          state.currentConversationId = action.payload.conversationId;
        }

        // Clear input and reset streaming state
        state.input = "";
        state.streamingState.accumulatedContent = "";
      })
      .addCase(sendMessageWithLogging.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || "Something went wrong";

        // Thêm tin nhắn lỗi vào danh sách
        const errorMessage: Message = {
          id: `error_${Date.now()}`,
          role: "model",
          parts: [
            {
              text: "Xin lỗi, đã xảy ra lỗi khi xử lý tin nhắn của bạn. Vui lòng thử lại.",
            },
          ],
          timestamp: Date.now(),
        };

        state.messages.push(ensureMessageParts(errorMessage));
      });
  },
});

export const {
  setInput,
  addMessage,
  clearMessages,
  setCurrentConversationId,
  setError,
  startStreaming,
  updateStreamingContent,
  stopStreaming,
  setStreamingError,
  updateUIState,
  setInputFocus,
  setMarkdownPreview,
  setSelectedMessage,
  setEditingMessage,
  toggleConversationHistory,
  addConversation,
  updateConversation,
  deleteConversation,
} = messageSlice.actions;

export default messageSlice.reducer;
