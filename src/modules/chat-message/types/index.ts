// ===== CORE MESSAGE TYPES =====

/**
 * Represents different types of message content
 */
export type MessageContentType = 'text' | 'markdown' | 'code' | 'image' | 'file';

/**
 * Represents a single part of a message
 */
export interface MessagePart {
  text: string;
  type?: MessageContentType;
}

/**
 * Core message interface with comprehensive typing
 */
export interface Message {
  id: string;
  role: 'user' | 'model' | 'system';
  parts: MessagePart[];
  timestamp: number;
  conversationId?: string;
  messageId?: string;
  status?: MessageStatus;
  metadata?: MessageMetadata;
}

/**
 * Message status for tracking delivery and processing
 */
export type MessageStatus = 
  | 'pending'
  | 'sending'
  | 'sent'
  | 'delivered'
  | 'failed'
  | 'streaming'
  | 'completed';

/**
 * Additional metadata for messages
 */
export interface MessageMetadata {
  tokens?: number;
  model?: string;
  temperature?: number;
  processingTime?: number;
  error?: string;
  retryCount?: number;
}

// ===== CONVERSATION TYPES =====

/**
 * Represents a conversation/chat session
 */
export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
  userId?: string;
  metadata?: ConversationMetadata;
}

/**
 * Conversation metadata
 */
export interface ConversationMetadata {
  totalMessages: number;
  totalTokens?: number;
  lastActivity: number;
  tags?: string[];
  archived?: boolean;
  pinned?: boolean;
}

// ===== UI STATE TYPES =====

/**
 * Chat UI state interface
 */
export interface ChatUIState {
  input: string;
  isLoading: boolean;
  error: string | null;
  isTyping: boolean;
  selectedMessages: string[];
  editingMessageId: string | null;
  replyToMessageId: string | null;
  showMarkdownPreview: boolean;
  isScrolledToBottom: boolean;
  isInputFocused: boolean;
  selectedMessageId: string | null;
  showConversationHistory: boolean;
}

/**
 * Chat view modes
 */
export type ChatViewMode = 'chat' | 'history' | 'search' | 'settings';

// ===== STREAMING TYPES =====

/**
 * Streaming message chunk from SSE
 */
export interface StreamingChunk {
  id: string;
  event: string;
  data: string;
  conversationId?: string;
  messageId?: string;
}

/**
 * Streaming state
 */
export interface StreamingState {
  isStreaming: boolean;
  currentMessageId: string | null;
  buffer: string;
  error: string | null;
  accumulatedContent: string;
  streamId: string | null;
  currentChunk: string | null;
}

// ===== ACTION TYPES =====

/**
 * Available message actions
 */
export type MessageAction = 
  | 'edit'
  | 'delete'
  | 'copy'
  | 'reply'
  | 'regenerate'
  | 'bookmark'
  | 'share';

/**
 * Message action payload
 */
export interface MessageActionPayload {
  messageId: string;
  action: MessageAction;
  data?: unknown;
}

// ===== API TYPES =====

/**
 * API request for sending messages
 */
export interface SendMessageRequest {
  message: string;
  conversationId?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * API response for message operations
 */
export interface MessageResponse {
  message: Message;
  conversationId: string;
  success: boolean;
  error?: string;
}

/**
 * Conversation list response
 */
export interface ConversationListResponse {
  conversations: Conversation[];
  total: number;
  page: number;
  limit: number;
}

// ===== HISTORY MANAGEMENT TYPES =====

/**
 * History filter options
 */
export interface HistoryFilter {
  dateRange?: {
    start: Date;
    end: Date;
  };
  searchQuery?: string;
  tags?: string[];
  userId?: string;
}

/**
 * History sort options
 */
export type HistorySortBy = 'date' | 'title' | 'messageCount' | 'lastActivity';
export type HistorySortOrder = 'asc' | 'desc';

export interface HistorySort {
  by: HistorySortBy;
  order: HistorySortOrder;
}

// ===== EXPORT ALL =====
export * from './markdown';
export * from './ui';