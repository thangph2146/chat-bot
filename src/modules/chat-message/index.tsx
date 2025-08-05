'use client';

import React, { useEffect, useRef } from "react";
import { useChatMessage } from "./hooks/useChatMessage";

import { MessageBubble } from "./components/MessageBubble";
import { ChatInput } from "./components/ChatInput";
import { ConversationHistory } from "./components/ConversationHistory";
import { TypingIndicator } from "./components/TypingIndicator";
import { LoadingMessage } from "./components/LoadingMessage";
import { FaComments, FaBars, FaTimes } from "react-icons/fa";


const ChatMessage = () => {
  const {
    messages,
    input,
    loading,
    error,
    setInput,
    sendMessage,

    conversations,
    streamingState,
    uiState,
    setInputFocus,
    setMarkdownPreview,
    toggleConversationHistory,
    deleteConversation
  } = useChatMessage();

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleMessageAction = (messageId: string, action: string, data?: unknown) => {
    switch (action) {
      case 'edit':
        console.log('Edit message:', messageId);
        break;
      case 'delete':
        console.log('Delete message:', messageId);
        break;
      case 'copy':
        if (typeof data === 'string') {
          navigator.clipboard.writeText(data);
        }
        break;
      case 'reply':
        console.log('Reply to message:', messageId);
        break;
      case 'regenerate':
        console.log('Regenerate message:', messageId);
        break;
      case 'bookmark':
        console.log('Bookmark message:', messageId);
        break;
      case 'share':
        console.log('Share message:', messageId);
        break;
      default:
        console.log('Unknown action:', action, messageId, data);
    }
  };
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current && uiState.isScrolledToBottom) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, streamingState.accumulatedContent, uiState.isScrolledToBottom]);

  const handleSendMessage = (message: string) => {
    sendMessage(message);
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Conversation History Sidebar */}
      {uiState.showConversationHistory && (
        <div className="w-80 bg-white/95 backdrop-blur-sm border-r border-blue-100 flex-shrink-0 shadow-lg">
          <ConversationHistory
            conversations={conversations}
            currentConversationId={undefined}
            onSelectConversation={(id) => {
              // Handle conversation selection
              console.log('Selected conversation:', id);
            }}
            onDeleteConversation={deleteConversation}
            onRenameConversation={(conversationId, newTitle) => {
              // Handle conversation rename
              console.log('Rename conversation:', conversationId, newTitle);
            }}
            onArchiveConversation={(conversationId) => {
              // Handle conversation archive
              console.log('Archive conversation:', conversationId);
            }}
            onPinConversation={(conversationId) => {
              // Handle conversation pin
              console.log('Pin conversation:', conversationId);
            }}
            onCreateConversation={() => {
              // Handle new conversation creation
              console.log('Create new conversation');
            }}
          />
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex flex-col flex-1 mx-auto bg-white/90 backdrop-blur-sm shadow-2xl border border-blue-100">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 to-blue-800 text-white p-6 flex justify-between items-center border-b border-blue-600">
          <div className="flex items-center gap-4">
            <button
              onClick={toggleConversationHistory}
              className="p-3 hover:bg-blue-600/50 rounded-xl transition-all duration-200 hover:scale-105"
              title="Toggle conversation history"
            >
              {uiState.showConversationHistory ? <FaTimes className="w-5 h-5" /> : <FaBars className="w-5 h-5" />}
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <FaComments className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold">AI Chat Assistant</h1>
                <p className="text-blue-200 text-sm">Chat với AI</p>
              </div>
            </div>
            {streamingState.isStreaming && (
              <div className="flex items-center gap-3 bg-white/10 px-4 py-2 rounded-full">
                <div className="w-2 h-2 bg-blue-300 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium">Đang nhận phản hồi...</span>
              </div>
            )}
          </div>

        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gradient-to-b from-white/50 to-blue-50/30" ref={messagesContainerRef}>
          {messages.map((message) => {
            const isStreamingMessage = streamingState.isStreaming &&
              streamingState.currentMessageId === message.id;

            return (
              <MessageBubble
                key={message.id}
                message={message}
                isSelected={uiState.selectedMessageId === message.id}
                isEditing={uiState.editingMessageId === message.id}
                onAction={handleMessageAction}
                isStreaming={isStreamingMessage}
                streamingContent={isStreamingMessage ? streamingState.accumulatedContent : ''}
              />
            );
          })}

          {/* Show typing indicator when AI is responding */}
          {streamingState.isStreaming && (
            <TypingIndicator variant="receiving" />
          )}


          <div ref={messagesEndRef} />

          {loading && (
            <LoadingMessage type="sending" message="Đang phân tích câu hỏi..." />
          )}

          {error && (
            <LoadingMessage type="error" message={`Lỗi: ${error}`} />
          )}
        </div>

        {/* Input Area */}
        <div className="border-t border-blue-100 bg-white/80 backdrop-blur-sm">
          <ChatInput
            value={input}
            onChange={setInput}
            onSend={handleSendMessage}
            disabled={loading}
            placeholder="Nhập tin nhắn của bạn..."
            showMarkdownPreview={uiState.showMarkdownPreview}
            onToggleMarkdownPreview={() => setMarkdownPreview(!uiState.showMarkdownPreview)}
            onFocus={() => setInputFocus(true)}
            onBlur={() => setInputFocus(false)}
            maxLength={4000}
            showCharacterCount={true}
            enableFileUpload={true}
            enableVoiceInput={true}
            onFileUpload={(files) => {
              // Handle file upload
              console.log('Files uploaded:', files);
            }}
            onVoiceInput={(transcript) => {
              // Handle voice input
              setInput(transcript);
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
