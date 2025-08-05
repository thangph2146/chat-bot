'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { Conversation, HistorySort, HistorySortBy, HistorySortOrder } from '../types';
import { cn } from '@/lib/utils';
import {
  FaSearch,
  FaFilter,
  FaTrash,
  FaEdit,
  FaComments,
  FaClock,
  FaTag,
  FaArchive,
  FaEllipsisV,
  FaPlus,
  FaSpinner,
} from 'react-icons/fa';
import { formatRelativeTime } from '../utils/dateUtils';

interface ConversationHistoryProps {
  conversations: Conversation[];
  currentConversationId?: string;
  onSelectConversation: (conversationId: string) => void;
  onCreateConversation: () => void;
  onDeleteConversation: (conversationId: string) => void;
  onRenameConversation: (conversationId: string, newTitle: string) => void;
  onArchiveConversation: (conversationId: string) => void;
  onPinConversation: (conversationId: string) => void;
  className?: string;
  loading?: boolean;
}

export const ConversationHistory: React.FC<ConversationHistoryProps> = ({
  conversations,
  currentConversationId,
  onSelectConversation,
  onCreateConversation,
  onDeleteConversation,
  onRenameConversation,
  onArchiveConversation,
  onPinConversation,
  className,
  loading = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const [sort, setSort] = useState<HistorySort>({ by: 'lastActivity', order: 'desc' });
  const [showFilters, setShowFilters] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [selectedConversations, setSelectedConversations] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);

  // Filter and sort conversations
  const filteredAndSortedConversations = useMemo(() => {
    const filtered = conversations.filter(conv => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const titleMatch = conv.title.toLowerCase().includes(query);
        const messageMatch = conv.messages.some(msg => 
          msg.parts.some(part => part.text.toLowerCase().includes(query))
        );
        if (!titleMatch && !messageMatch) return false;
      }

      return true;
    });

    // Sort conversations
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sort.by) {
        case 'date':
          comparison = a.createdAt - b.createdAt;
          break;
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'messageCount':
          comparison = a.messages.length - b.messages.length;
          break;
        case 'lastActivity':
        default:
          comparison = a.updatedAt - b.updatedAt;
          break;
      }

      return sort.order === 'asc' ? comparison : -comparison;
    });

    // Prioritize pinned conversations
    const pinned = filtered.filter(conv => conv.metadata?.pinned);
    const unpinned = filtered.filter(conv => !conv.metadata?.pinned);
    
    return [...pinned, ...unpinned];
  }, [conversations, searchQuery, sort]);

  const handleEditStart = useCallback((conversation: Conversation) => {
    setEditingId(conversation.id);
    setEditingTitle(conversation.title);
  }, []);

  const handleEditSave = useCallback(() => {
    if (editingId && editingTitle.trim()) {
      onRenameConversation(editingId, editingTitle.trim());
    }
    setEditingId(null);
    setEditingTitle('');
  }, [editingId, editingTitle, onRenameConversation]);

  const handleEditCancel = useCallback(() => {
    setEditingId(null);
    setEditingTitle('');
  }, []);



  const handleBulkAction = useCallback((action: 'delete' | 'archive') => {
    selectedConversations.forEach(id => {
      if (action === 'delete') {
        onDeleteConversation(id);
      } else if (action === 'archive') {
        onArchiveConversation(id);
      }
    });
    setSelectedConversations(new Set());
    setShowBulkActions(false);
  }, [selectedConversations, onDeleteConversation, onArchiveConversation]);

  const toggleConversationSelection = useCallback((id: string) => {
    setSelectedConversations(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const renderConversationItem = useCallback((conversation: Conversation) => {
    const isSelected = conversation.id === currentConversationId;
    const isEditing = editingId === conversation.id;
    const isChecked = selectedConversations.has(conversation.id);
    const isPinned = conversation.metadata?.pinned;
    const isArchived = conversation.metadata?.archived;

    return (
      <div
        key={conversation.id}
        className={cn(
          'group relative mx-2 mb-2 p-4 rounded-lg transition-all duration-200 cursor-pointer border',
          {
            'bg-blue-700 text-white shadow-md border-blue-700': isSelected,
            'bg-white hover:bg-gray-50 border-gray-200 hover:border-blue-300': !isSelected && !isArchived,
            'opacity-50 bg-gray-100 border-gray-200': isArchived,
          }
        )}
        onClick={() => !isEditing && onSelectConversation(conversation.id)}
      >
        <div className="flex items-start gap-4">
          {/* Selection Checkbox */}
          {showBulkActions && (
            <input
              type="checkbox"
              checked={isChecked}
              onChange={() => toggleConversationSelection(conversation.id)}
              onClick={(e) => e.stopPropagation()}
              className="mt-1.5 w-4 h-4 text-blue-700 bg-white border-2 border-gray-300 rounded focus:ring-blue-700 focus:ring-2"
            />
          )}

          {/* Pin Indicator */}
          {isPinned && (
            <FaSpinner className={cn(
              'w-4 h-4 mt-1 flex-shrink-0',
              isSelected ? 'text-yellow-300' : 'text-yellow-500'
            )} />
          )}

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Title */}
            {isEditing ? (
              <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                <input
                  type="text"
                  value={editingTitle}
                  onChange={(e) => setEditingTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleEditSave();
                    if (e.key === 'Escape') handleEditCancel();
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-700 focus:border-blue-700"
                  autoFocus
                />
                <button
                  onClick={handleEditSave}
                  className="p-1.5 rounded-lg bg-blue-700 text-white hover:bg-blue-800 transition-colors"
                >
                  ✓
                </button>
                <button
                  onClick={handleEditCancel}
                  className="p-1.5 rounded-lg bg-red-700 text-white hover:bg-red-800 transition-colors"
                >
                  ✕
                </button>
              </div>
            ) : (
              <h3 className={cn(
                'font-semibold text-base truncate',
                {
                  'text-white': isSelected,
                  'text-gray-900': !isSelected,
                }
              )}>
                {conversation.title}
              </h3>
            )}

            {/* Metadata */}
            <div className={cn(
              'flex items-center gap-4 mt-2 text-sm',
              isSelected ? 'text-blue-100' : 'text-gray-600'
            )}>
              <div className="flex items-center gap-1.5">
                <FaComments className="w-3.5 h-3.5" />
                <span className="font-medium">{conversation.messages.length}</span>
              </div>
              
              <div className="flex items-center gap-1.5">
                <FaClock className="w-3.5 h-3.5" />
                <span>{formatRelativeTime(conversation.updatedAt)}</span>
              </div>

              {conversation.metadata?.tags && conversation.metadata.tags.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <FaTag className="w-3.5 h-3.5" />
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                    {conversation.metadata.tags[0]}
                  </span>
                  {conversation.metadata.tags.length > 1 && (
                    <span className="text-xs">+{conversation.metadata.tags.length - 1}</span>
                  )}
                </div>
              )}
            </div>

            {/* Last Message Preview */}
            {conversation.messages.length > 0 && (
              <p className={cn(
                'text-sm mt-2 line-clamp-2 leading-relaxed',
                isSelected ? 'text-blue-100' : 'text-gray-500'
              )}>
                {conversation.messages[conversation.messages.length - 1].parts[0]?.text}
              </p>
            )}
          </div>

          {/* Actions */}
          {!isEditing && (
            <div className="opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPinConversation(conversation.id);
                }}
                className={cn(
                  'p-2 rounded-lg transition-all duration-200',
                  {
                    'text-yellow-600 bg-yellow-50 hover:bg-yellow-100': isPinned && isSelected,
                    'text-white/70 hover:text-white hover:bg-white/20': !isPinned && isSelected,
                    'text-gray-500 hover:text-blue-700 hover:bg-blue-50': !isPinned && !isSelected,
                  }
                )}
                title={isPinned ? 'Bỏ ghim' : 'Ghim'}
              >
                <FaSpinner className="w-3.5 h-3.5" />
              </button>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleEditStart(conversation);
                }}
                className={cn(
                  'p-2 rounded-lg transition-all duration-200',
                  isSelected 
                    ? 'text-white/70 hover:text-white hover:bg-white/20'
                    : 'text-gray-500 hover:text-blue-700 hover:bg-blue-50'
                )}
                title="Đổi tên"
              >
                <FaEdit className="w-3.5 h-3.5" />
              </button>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onArchiveConversation(conversation.id);
                }}
                className={cn(
                  'p-2 rounded-lg transition-all duration-200',
                  isSelected 
                    ? 'text-white/70 hover:text-white hover:bg-white/20'
                    : 'text-gray-500 hover:text-blue-700 hover:bg-blue-50'
                )}
                title={isArchived ? 'Bỏ lưu trữ' : 'Lưu trữ'}
              >
                <FaArchive className="w-3.5 h-3.5" />
              </button>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm('Bạn có chắc chắn muốn xóa cuộc trò chuyện này?')) {
                    onDeleteConversation(conversation.id);
                  }
                }}
                className={cn(
                  'p-2 rounded-lg transition-all duration-200',
                  isSelected 
                    ? 'text-red-300 hover:text-red-200 hover:bg-red-500/20'
                    : 'text-red-600 hover:text-red-700 hover:bg-red-50'
                )}
                title="Xóa"
              >
                <FaTrash className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }, [
    currentConversationId,
    editingId,
    editingTitle,
    selectedConversations,
    showBulkActions,
    onSelectConversation,
    onPinConversation,
    onArchiveConversation,
    onDeleteConversation,
    handleEditStart,
    handleEditSave,
    handleEditCancel,
    toggleConversationSelection,
  ]);

  return (
    <div className={cn('h-full flex flex-col bg-white border-r border-gray-200', className)}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">Lịch sử trò chuyện</h2>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowBulkActions(!showBulkActions)}
              className={cn(
                'p-2 rounded-lg transition-all duration-200',
                {
                  'bg-blue-700 text-white': showBulkActions,
                  'text-gray-500 hover:text-blue-700 hover:bg-blue-50 border border-gray-300': !showBulkActions,
                }
              )}
              title="Chọn nhiều"
            >
              <FaEllipsisV className="w-4 h-4" />
            </button>
            
            <button
              onClick={onCreateConversation}
              className="p-2 rounded-lg bg-blue-700 text-white hover:bg-blue-800 transition-all duration-200"
              title="Tạo cuộc trò chuyện mới"
            >
              <FaPlus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm cuộc trò chuyện..."
            className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700 focus:border-blue-700 bg-white transition-all duration-200 placeholder-gray-400"
          />
        </div>

        {/* Filters and Sort */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
              {
                'bg-blue-700 text-white': showFilters,
                'text-gray-600 hover:text-blue-700 hover:bg-blue-50 border border-gray-300': !showFilters,
              }
            )}
          >
            <FaFilter className="w-3 h-3" />
            Lọc
          </button>
          
          <select
            value={`${sort.by}-${sort.order}`}
            onChange={(e) => {
              const [by, order] = e.target.value.split('-') as [HistorySortBy, HistorySortOrder];
              setSort({ by, order });
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-700 focus:border-blue-700 bg-white transition-all duration-200"
          >
            <option value="lastActivity-desc">Hoạt động gần nhất</option>
            <option value="lastActivity-asc">Hoạt động cũ nhất</option>
            <option value="date-desc">Tạo mới nhất</option>
            <option value="date-asc">Tạo cũ nhất</option>
            <option value="title-asc">Tên A-Z</option>
            <option value="title-desc">Tên Z-A</option>
            <option value="messageCount-desc">Nhiều tin nhắn nhất</option>
            <option value="messageCount-asc">Ít tin nhắn nhất</option>
          </select>
        </div>

        {/* Bulk Actions */}
        {showBulkActions && selectedConversations.size > 0 && (
          <div className="flex items-center gap-3 mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <span className="text-sm font-medium text-gray-700">
              Đã chọn {selectedConversations.size} cuộc trò chuyện
            </span>
            <button
              onClick={() => handleBulkAction('archive')}
              className="px-4 py-2 bg-blue-700 text-white rounded-lg text-sm font-medium hover:bg-blue-800 transition-all duration-200"
            >
              Lưu trữ
            </button>
            <button
              onClick={() => {
                if (window.confirm(`Bạn có chắc chắn muốn xóa ${selectedConversations.size} cuộc trò chuyện?`)) {
                  handleBulkAction('delete');
                }
              }}
              className="px-4 py-2 bg-red-700 text-white rounded-lg text-sm font-medium hover:bg-red-800 transition-all duration-200"
            >
              Xóa
            </button>
          </div>
        )}
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto bg-gray-50">
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-gray-200 border-t-blue-700"></div>
          </div>
        ) : filteredAndSortedConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-gray-600">
            <FaComments className="w-16 h-16 mb-6 opacity-60" />
            <p className="text-center font-medium text-lg mb-2">
              {searchQuery ? 'Không tìm thấy cuộc trò chuyện nào' : 'Chưa có cuộc trò chuyện nào'}
            </p>
            <p className="text-center text-gray-500 text-sm mb-4">
              {searchQuery ? 'Thử tìm kiếm với từ khóa khác' : 'Bắt đầu cuộc trò chuyện đầu tiên của bạn'}
            </p>
            {!searchQuery && (
              <button
                onClick={onCreateConversation}
                className="px-6 py-3 bg-blue-700 text-white rounded-lg font-medium hover:bg-blue-800 transition-all duration-200"
              >
                Tạo cuộc trò chuyện đầu tiên
              </button>
            )}
          </div>
        ) : (
          <div className="p-2">
            {filteredAndSortedConversations.map(renderConversationItem)}
          </div>
        )}
      </div>
    </div>
  );
};

export default ConversationHistory;