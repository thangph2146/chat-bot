import { useCallback } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  sendMessageWithLogging,
  setInput,
  clearMessages,
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

} from "@/store/slices/messageSlice";
import { 
  ChatUIState, 
  Conversation,
} from "../types";
// Legacy Message interface for backward compatibility
export interface LegacyMessage {
  role: "user" | "model";
  parts: { text: string }[];
  id: string;
  timestamp: number;
  conversationId?: string;
  messageId?: string;
}

export const useChatMessage = () => {
  const dispatch = useAppDispatch();
  const { 
    messages, 
    conversations, 
    input, 
    isLoading, 
    error, 
    currentConversationId, 
    streamingState, 
    uiState
  } = useAppSelector((state) => state.message);

  const handleSetInput = useCallback(
    (value: string) => {
      dispatch(setInput(value));
    },
    [dispatch]
  );

  const sendMessage = useCallback(
    (messageText: string, userId?: string) => {
      if (!messageText.trim()) return;

      // Gửi tin nhắn với logging
      dispatch(sendMessageWithLogging({ messageText, userId }));
    },
    [dispatch]
  );

  const clearAllMessages = useCallback(() => {
    dispatch(clearMessages());
  }, [dispatch]);

  // Streaming functions
  const handleStartStreaming = useCallback((streamId: string) => {
    dispatch(startStreaming({ streamId }));
  }, [dispatch]);

  const handleUpdateStreamingContent = useCallback((messageId: string, content: string) => {
    dispatch(updateStreamingContent({ messageId, content }));
  }, [dispatch]);

  const handleStopStreaming = useCallback((messageId: string, finalContent: string) => {
    dispatch(stopStreaming({ messageId, finalContent }));
  }, [dispatch]);

  const handleSetStreamingError = useCallback((messageId: string, error: string) => {
    dispatch(setStreamingError({ messageId, error }));
  }, [dispatch]);

  // UI state functions
  const handleUpdateUIState = useCallback((updates: Partial<ChatUIState>) => {
    dispatch(updateUIState(updates));
  }, [dispatch]);

  const handleSetInputFocus = useCallback((focused: boolean) => {
    dispatch(setInputFocus(focused));
  }, [dispatch]);

  const handleSetMarkdownPreview = useCallback((show: boolean) => {
    dispatch(setMarkdownPreview(show));
  }, [dispatch]);

  const handleSetSelectedMessage = useCallback((messageId: string | null) => {
    dispatch(setSelectedMessage(messageId));
  }, [dispatch]);

  const handleSetEditingMessage = useCallback((messageId: string | null) => {
    dispatch(setEditingMessage(messageId));
  }, [dispatch]);

  const handleToggleConversationHistory = useCallback(() => {
    dispatch(toggleConversationHistory());
  }, [dispatch]);

  // Conversation management functions
  const handleAddConversation = useCallback((conversation: Conversation) => {
    dispatch(addConversation(conversation));
  }, [dispatch]);

  const handleUpdateConversation = useCallback((id: string, updates: Partial<Conversation>) => {
    dispatch(updateConversation({ id, updates }));
  }, [dispatch]);

  const handleDeleteConversation = useCallback((id: string) => {
    dispatch(deleteConversation(id));
  }, [dispatch]);


  return {
    // Basic state
    messages,
    conversations,
    input,
    loading: isLoading,
    error,
    currentConversationId,
    streamingState,
    uiState,

    // Basic functions
    setInput: handleSetInput,
    sendMessage,
    clearMessages: clearAllMessages,

    
    // Streaming functions
    startStreaming: handleStartStreaming,
    updateStreamingContent: handleUpdateStreamingContent,
    stopStreaming: handleStopStreaming,
    setStreamingError: handleSetStreamingError,
    
    // UI state functions
    updateUIState: handleUpdateUIState,
    setInputFocus: handleSetInputFocus,
    setMarkdownPreview: handleSetMarkdownPreview,
    setSelectedMessage: handleSetSelectedMessage,
    setEditingMessage: handleSetEditingMessage,
    toggleConversationHistory: handleToggleConversationHistory,
    
    // Conversation management
    addConversation: handleAddConversation,
    updateConversation: handleUpdateConversation,
    deleteConversation: handleDeleteConversation,
  };
};
