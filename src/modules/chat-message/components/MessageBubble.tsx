import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Message, MessageAction, MessageBubbleConfig } from '../types';
import { MarkdownRenderer } from './MarkdownRenderer';
import { MessageActions } from './MessageActions';
import { MessageStatus } from './MessageStatus';
import { formatTimestamp } from '../utils/dateUtils';
import { cn } from '@/lib/utils';
import '../styles/animations.css';

interface MessageBubbleProps {
  message: Message;
  config?: Partial<MessageBubbleConfig>;
  onAction?: (messageId: string, action: MessageAction, data?: unknown) => void;
  isSelected?: boolean;
  isEditing?: boolean;
  onEditSave?: (messageId: string, newContent: string) => void;
  onEditCancel?: () => void;
  className?: string;
  isStreaming?: boolean;
  streamingContent?: string;
}

const defaultConfig: MessageBubbleConfig = {
  maxWidth: 'max-w-[80vw]',
  showAvatar: false,
  showTimestamp: true,
  showStatus: true,
  enableActions: true,
  animateEntry: false,
};

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  config = {},
  onAction,
  isSelected = false,
  isEditing = false,
  onEditSave,
  onEditCancel,
  className,
  isStreaming = false,
  streamingContent = '',
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [showActions, setShowActions] = useState(false);
  const [displayedContent, setDisplayedContent] = useState('');
  const [showCursor, setShowCursor] = useState(true);
  const finalConfig = { ...defaultConfig, ...config };
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'model';
  const isSystem = message.role === 'system';

  // Streaming animation effect
  useEffect(() => {
    if (isStreaming && streamingContent && isAssistant) {
      let index = 0;
      const interval = setInterval(() => {
        if (index <= streamingContent.length) {
          setDisplayedContent(streamingContent.slice(0, index));
          index++;
        } else {
          clearInterval(interval);
        }
      }, 30); // Typing speed
      
      return () => clearInterval(interval);
    } else if (!isStreaming) {
      setDisplayedContent('');
    }
  }, [isStreaming, streamingContent, isAssistant]);

  // Cursor blinking effect
  useEffect(() => {
    if (isStreaming && isAssistant) {
      const interval = setInterval(() => {
        setShowCursor(prev => !prev);
      }, 500);
      
      return () => clearInterval(interval);
    } else {
      setShowCursor(false);
    }
  }, [isStreaming, isAssistant]);

  // Combine all text parts for editing
  const fullText = useMemo(() => {
    if (!message.parts || !Array.isArray(message.parts)) {
      return '';
    }
    return message.parts.map(part => part.text || '').join('\n');
  }, [message.parts]);

  // Initialize edit content when editing starts
  React.useEffect(() => {
    if (isEditing) {
      setEditContent(fullText);
    }
  }, [isEditing, fullText]);

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
    if (finalConfig.enableActions) {
      setShowActions(true);
    }
  }, [finalConfig.enableActions]);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    setShowActions(false);
  }, []);

  const handleAction = useCallback((action: MessageAction, data?: unknown) => {
    onAction?.(message.id, action, data);
  }, [message.id, onAction]);

  const handleEditSave = useCallback(() => {
    if (editContent.trim() && onEditSave) {
      onEditSave(message.id, editContent.trim());
    }
  }, [message.id, editContent, onEditSave]);

  const handleEditCancel = useCallback(() => {
    setEditContent(fullText);
    onEditCancel?.();
  }, [fullText, onEditCancel]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleEditSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleEditCancel();
    }
  }, [handleEditSave, handleEditCancel]);

  // Determine bubble styling
  const bubbleClasses = cn(
    'group relative px-6 py-4 rounded-2xl transition-all duration-200 border',
    finalConfig.maxWidth,
    {
      // User messages (right side) - Professional blue-700 design
      'bg-blue-700 text-white ml-auto shadow-lg border-blue-700/50': isUser,
      'hover:bg-blue-800 hover:shadow-xl hover:border-blue-600': isUser && isHovered,
      
      // Assistant messages (left side) - Clean white with subtle accents
      'bg-white text-gray-800 border-gray-200 mr-auto shadow-md': isAssistant,
      'hover:bg-gray-50 hover:border-blue-700/30 hover:shadow-lg': isAssistant && isHovered,
      
      // System messages (center) - Red-700 accent for important notifications
      'bg-red-700/10 text-red-800 mx-auto text-center text-sm border-red-700/30 shadow-sm': isSystem,
      
      // Selection state - Professional blue-700 ring
      'ring-2 ring-blue-700/60 shadow-xl border-blue-700/70': isSelected,
    },
    className
  );

  const containerClasses = cn(
    'flex mb-6 transition-all duration-200 group/container animate-fade-in-up',
    {
      'justify-end': isUser,
      'justify-start': isAssistant,
      'justify-center': isSystem,
    }
  );

  return (
    <div 
      className={containerClasses}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="relative max-w-[80%]">
        {/* Message Bubble */}
        <div className={bubbleClasses}>
          {/* Editing Mode */}
          {isEditing ? (
            <div className="space-y-4">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full min-h-[120px] p-4 border-2 border-blue-700/30 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-700/40 focus:border-blue-700 text-gray-800 bg-white shadow-sm transition-all duration-200 font-medium placeholder:text-gray-400"
                placeholder="Chỉnh sửa tin nhắn của bạn..."
                autoFocus
              />
              <div className="flex gap-4 justify-end">
                <button
                  onClick={handleEditCancel}
                  className="px-5 py-2 bg-white text-gray-700 rounded-lg hover:bg-gray-100 transition-all duration-200 font-medium shadow-sm border border-gray-300 hover:border-gray-400"
                >
                  Hủy
                </button>
                <button
                  onClick={handleEditSave}
                  disabled={!editContent.trim()}
                  className="px-5 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition-all duration-200 font-medium shadow-sm border border-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Lưu
                </button>
              </div>
            </div>
          ) : (
            /* Normal Display Mode */
            <div className="space-y-3">
              {/* Message Content */}
              <div className="prose prose-sm w-fit max-w-[75vw]">
                {/* Streaming content for assistant messages */}
                {isStreaming && isAssistant && streamingContent ? (
                  <div className="w-fit leading-relaxed relative">
                    <div className={cn('whitespace-pre-wrap break-words w-fit font-medium leading-relaxed', {
                      'text-gray-800': isAssistant,
                    })}>
                      <MarkdownRenderer 
                        content={displayedContent}
                        className="prose-blue"
                      />
                      {/* Streaming cursor */}
                       <span className={cn(
                         'inline-block w-0.5 h-5 bg-blue-600 ml-1 streaming-cursor',
                         showCursor ? 'opacity-100' : 'opacity-0'
                       )} />
                    </div>
                  </div>
                ) : (
                  /* Regular message content */
                  message.parts && Array.isArray(message.parts) && message.parts.length > 0 ? message.parts.map((part, index) => (
                    <div key={index} className="w-fit leading-relaxed">
                      {part.type === 'markdown' || isAssistant ? (
                        <MarkdownRenderer 
                          content={part.text || ''}
                          className={cn({
                            'prose-invert': isUser,
                            'prose-blue': isAssistant,
                          })}
                        />
                      ) : (
                        <div className={cn('whitespace-pre-wrap break-words w-fit font-medium leading-relaxed', {
                          'text-white': isUser,
                          'text-gray-800': isAssistant,
                          'text-blue-800': isSystem,
                        })}>
                          {part.text || ''}
                        </div>
                      )}
                    </div>
                  )) : (
                    /* Hiển thị placeholder cho tin nhắn trống */
                    isAssistant ? (
                      <div className="text-gray-400 italic font-medium">
                        <span className="inline-block w-0.5 h-5 bg-blue-600 ml-1 animate-pulse" />
                      </div>
                    ) : (
                      <div className="text-gray-400 italic font-medium">
                        Không có nội dung
                      </div>
                    )
                  )
                )}
              </div>

              {/* Message Metadata */}
              <div className="flex items-center justify-between text-xs mt-3 opacity-75">
                {finalConfig.showTimestamp && (
                  <span className={cn('font-medium', {
                    'text-blue-100': isUser,
                    'text-gray-500': isAssistant,
                    'text-red-700': isSystem,
                  })}>
                    {formatTimestamp(message.timestamp)}
                  </span>
                )}
                
                {finalConfig.showStatus && message.status && (
                  <MessageStatus 
                    status={message.status}
                    className={cn({
                      'text-blue-100': isUser,
                      'text-gray-500': isAssistant,
                      'text-red-700': isSystem,
                    })}
                  />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Message Actions */}
        {!isEditing && finalConfig.enableActions && (showActions || isSelected) && (
          <MessageActions
            messageId={message.id}
            messageRole={message.role}
            onAction={handleAction}
            className={cn(
              'absolute top-2 transition-all duration-200 z-10',
              {
                'right-full mr-2': isUser,
                'left-full ml-2': isAssistant,
                'opacity-0 group-hover:opacity-100': !isSelected,
                'opacity-100': isSelected,
              }
            )}
          />
        )}
      </div>
    </div>
  );
};

export default MessageBubble;