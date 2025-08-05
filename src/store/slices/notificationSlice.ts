import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// ==================== TYPES ====================
export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
  duration?: number; // in milliseconds, 0 = permanent
  timestamp: number;
  isRead: boolean;
  action?: {
    label: string;
    callback: string; // function name or identifier
  };
}

export interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  showToasts: boolean;
  maxToasts: number;
  defaultDuration: number;
}

const initialState: NotificationState = {
  notifications: [],
  unreadCount: 0,
  showToasts: true,
  maxToasts: 3,
  defaultDuration: 4000, // 4 seconds
};

// ==================== SLICE ====================
const notificationSlice = createSlice({
  name: 'notification',
  initialState,
  reducers: {
    addNotification: (state, action: PayloadAction<Omit<Notification, 'id' | 'timestamp' | 'isRead'>>) => {
      const notification: Notification = {
        ...action.payload,
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        isRead: false,
        duration: action.payload.duration ?? state.defaultDuration,
      };
      
      state.notifications.unshift(notification);
      state.unreadCount += 1;
      
      // Keep only latest notifications (prevent memory bloat)
      if (state.notifications.length > 50) {
        state.notifications = state.notifications.slice(0, 50);
      }
    },

    removeNotification: (state, action: PayloadAction<string>) => {
      const index = state.notifications.findIndex(n => n.id === action.payload);
      if (index !== -1) {
        const notification = state.notifications[index];
        if (!notification.isRead) {
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
        state.notifications.splice(index, 1);
      }
    },

    markAsRead: (state, action: PayloadAction<string>) => {
      const notification = state.notifications.find(n => n.id === action.payload);
      if (notification && !notification.isRead) {
        notification.isRead = true;
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }
    },

    markAllAsRead: (state) => {
      state.notifications.forEach(n => {
        n.isRead = true;
      });
      state.unreadCount = 0;
    },

    clearNotifications: (state) => {
      state.notifications = [];
      state.unreadCount = 0;
    },

    clearReadNotifications: (state) => {
      state.notifications = state.notifications.filter(n => !n.isRead);
    },

    updateNotificationSettings: (state, action: PayloadAction<{
      showToasts?: boolean;
      maxToasts?: number;
      defaultDuration?: number;
    }>) => {
      const { showToasts, maxToasts, defaultDuration } = action.payload;
      if (showToasts !== undefined) state.showToasts = showToasts;
      if (maxToasts !== undefined) state.maxToasts = Math.max(1, maxToasts);
      if (defaultDuration !== undefined) state.defaultDuration = Math.max(1000, defaultDuration);
    },

    // Shorthand actions for common notification types
    showSuccess: (state, action: PayloadAction<{ message: string; title?: string; duration?: number }>) => {
      const { message, title, duration } = action.payload;
      const notification: Notification = {
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'success',
        title,
        message,
        duration: duration ?? state.defaultDuration,
        timestamp: Date.now(),
        isRead: false,
      };
      
      state.notifications.unshift(notification);
      state.unreadCount += 1;
    },

    showError: (state, action: PayloadAction<{ message: string; title?: string; duration?: number }>) => {
      const { message, title, duration } = action.payload;
      const notification: Notification = {
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'error',
        title: title || 'Lỗi',
        message,
        duration: duration ?? 6000, // Errors shown longer
        timestamp: Date.now(),
        isRead: false,
      };
      
      state.notifications.unshift(notification);
      state.unreadCount += 1;
    },

    showWarning: (state, action: PayloadAction<{ message: string; title?: string; duration?: number }>) => {
      const { message, title, duration } = action.payload;
      const notification: Notification = {
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'warning',
        title: title || 'Cảnh báo',
        message,
        duration: duration ?? state.defaultDuration,  
        timestamp: Date.now(),
        isRead: false,
      };
      
      state.notifications.unshift(notification);
      state.unreadCount += 1;
    },

    showInfo: (state, action: PayloadAction<{ message: string; title?: string; duration?: number }>) => {
      const { message, title, duration } = action.payload;
      const notification: Notification = {
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'info',
        title: title || 'Thông tin',
        message,
        duration: duration ?? state.defaultDuration,
        timestamp: Date.now(),
        isRead: false,
      };
      
      state.notifications.unshift(notification);
      state.unreadCount += 1;
    },
  },
});

// ==================== ACTIONS ====================
export const {
  addNotification,
  removeNotification,
  markAsRead,
  markAllAsRead,
  clearNotifications,
  clearReadNotifications,
  updateNotificationSettings,
  showSuccess,
  showError,
  showWarning,
  showInfo,
} = notificationSlice.actions;

// ==================== SELECTORS ====================
export const selectNotifications = (state: { notification: NotificationState }) => state.notification.notifications;
export const selectUnreadCount = (state: { notification: NotificationState }) => state.notification.unreadCount;
export const selectNotificationSettings = (state: { notification: NotificationState }) => ({
  showToasts: state.notification.showToasts,
  maxToasts: state.notification.maxToasts,
  defaultDuration: state.notification.defaultDuration,
});

// Get visible toasts (unread, limited by maxToasts)
export const selectVisibleToasts = (state: { notification: NotificationState }) => {
  const { notifications, maxToasts, showToasts } = state.notification;
  if (!showToasts) return [];
  
  return notifications
    .filter(n => !n.isRead && n.duration !== 0)
    .slice(0, maxToasts);
};

export default notificationSlice.reducer;