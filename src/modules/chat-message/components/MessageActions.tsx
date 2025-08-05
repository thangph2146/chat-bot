import React, { useState, useCallback } from 'react';
import { MessageAction } from '../types';
import { cn } from '@/lib/utils';
import {
  FaEdit,
  FaTrash,
  FaCopy,
  FaReply,
  FaRedo,
  FaBookmark,
  FaShare,
  FaEllipsisV,
  FaCheck,
} from 'react-icons/fa';

interface MessageActionsProps {
  messageId: string;
  messageRole: 'user' | 'model' | 'system';
  onAction: (action: MessageAction, data?: unknown) => void;
  className?: string;
  compact?: boolean;
}

interface ActionConfig {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  action: MessageAction;
  color: string;
  hoverColor: string;
  requiresConfirm?: boolean;
  disabled?: boolean;
}

export const MessageActions: React.FC<MessageActionsProps> = ({
  messageId,
  messageRole,
  onAction,
  className,
  compact = false,
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [copiedAction, setCopiedAction] = useState<string | null>(null);
  const [confirmingAction, setConfirmingAction] = useState<MessageAction | null>(null);

  // Define available actions based on message role
  const getAvailableActions = useCallback((): ActionConfig[] => {
    const baseActions: ActionConfig[] = [
      {
        icon: FaCopy,
        label: 'Sao chép',
        action: 'copy',
        color: 'text-gray-600',
        hoverColor: 'hover:text-gray-800',
      },
    ];

    if (messageRole === 'user') {
      return [
        ...baseActions,
        {
          icon: FaEdit,
          label: 'Chỉnh sửa',
          action: 'edit',
          color: 'text-blue-700',
          hoverColor: 'hover:text-blue-800',
        },
        {
          icon: FaTrash,
          label: 'Xóa',
          action: 'delete',
          color: 'text-red-700',
          hoverColor: 'hover:text-red-800',
          requiresConfirm: true,
        },
      ];
    }

    if (messageRole === 'model') {
      return [
        ...baseActions,
        {
          icon: FaRedo,
          label: 'Tạo lại',
          action: 'regenerate',
          color: 'text-blue-700',
          hoverColor: 'hover:text-blue-800',
        },
        {
          icon: FaReply,
          label: 'Trả lời',
          action: 'reply',
          color: 'text-blue-700',
          hoverColor: 'hover:text-blue-800',
        },
        {
          icon: FaBookmark,
          label: 'Lưu',
          action: 'bookmark',
          color: 'text-blue-700',
          hoverColor: 'hover:text-blue-800',
        },
        {
          icon: FaShare,
          label: 'Chia sẻ',
          action: 'share',
          color: 'text-blue-700',
          hoverColor: 'hover:text-blue-800',
        },
      ];
    }

    return baseActions;
  }, [messageRole]);

  const availableActions = getAvailableActions();

  const handleActionClick = useCallback(async (actionConfig: ActionConfig) => {
    const { action, requiresConfirm } = actionConfig;

    if (requiresConfirm && confirmingAction !== action) {
      setConfirmingAction(action);
      return;
    }

    // Handle copy action with feedback
    if (action === 'copy') {
      setCopiedAction(action);
      setTimeout(() => setCopiedAction(null), 2000);
    }

    // Reset confirmation state
    setConfirmingAction(null);
    setShowDropdown(false);

    // Execute action
    onAction(action, { messageId });
  }, [messageId, onAction, confirmingAction]);

  const handleCancelConfirm = useCallback(() => {
    setConfirmingAction(null);
  }, []);

  const renderActionButton = useCallback((actionConfig: ActionConfig) => {
    const { icon: Icon, label, action, color, hoverColor } = actionConfig;
    const isConfirming = confirmingAction === action;
    const isCopied = copiedAction === action;

    if (isConfirming) {
      return (
        <div key={action} className="flex items-center gap-2">
          <button
            onClick={() => handleActionClick(actionConfig)}
            className="px-3 py-1.5 text-xs font-medium bg-red-700 text-white rounded-lg hover:bg-red-800 transition-all duration-200 shadow-md"
            title="Xác nhận xóa"
          >
            Xóa
          </button>
          <button
            onClick={handleCancelConfirm}
            className="px-3 py-1.5 text-xs font-medium bg-white text-gray-700 rounded-lg hover:bg-gray-50 transition-all duration-200 shadow-md border border-gray-300"
            title="Hủy"
          >
            Hủy
          </button>
        </div>
      );
    }

    return (
      <button
        key={action}
        onClick={() => handleActionClick(actionConfig)}
        className={cn(
          'p-2 rounded-lg transition-all duration-200',
          'bg-white shadow-md hover:shadow-lg border border-gray-200 hover:border-blue-700/30',
          color,
          hoverColor,
          {
            'p-1.5': compact,
          }
        )}
        title={label}
      >
        {isCopied ? (
          <FaCheck className={cn('w-4 h-4 text-green-500', { 'w-3 h-3': compact })} />
        ) : (
          <Icon className={cn('w-4 h-4', { 'w-3 h-3': compact })} />
        )}
      </button>
    );
  }, [compact, confirmingAction, copiedAction, handleActionClick, handleCancelConfirm]);

  const renderCompactActions = useCallback(() => {
    const primaryActions = availableActions.slice(0, 2);
    const secondaryActions = availableActions.slice(2);

    return (
      <div className="flex items-center gap-1">
        {/* Primary actions */}
        {primaryActions.map((action) => renderActionButton(action))}
        
        {/* Dropdown for secondary actions */}
        {secondaryActions.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="p-2 rounded-lg bg-white shadow-md hover:shadow-lg border border-gray-200 hover:border-blue-700/30 text-blue-700 hover:text-blue-800 transition-all duration-200"
              title="Thêm hành động"
            >
              <FaEllipsisV className="w-4 h-4" />
            </button>
            
            {showDropdown && (
              <div className="absolute top-full right-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-10 min-w-[140px]">
                {secondaryActions.map((action) => (
                  <button
                    key={action.action}
                    onClick={() => handleActionClick(action)}
                    className={cn(
                      'w-full px-4 py-2 text-left text-sm font-medium transition-all duration-200 flex items-center gap-3 rounded-md mx-1',
                      action.color,
                      action.hoverColor,
                      'hover:bg-gray-50'
                    )}
                  >
                    <action.icon className="w-3.5 h-3.5" />
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }, [availableActions, showDropdown, renderActionButton, handleActionClick]);

  const renderFullActions = useCallback(() => {
    return (
      <div className="flex items-center gap-1">
        {availableActions.map((action) => renderActionButton(action))}
      </div>
    );
  }, [availableActions, renderActionButton]);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = () => {
      if (showDropdown) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDropdown]);

  return (
    <div className={cn('flex items-center', className)}>
      {compact ? renderCompactActions() : renderFullActions()}
    </div>
  );
};

export default MessageActions;