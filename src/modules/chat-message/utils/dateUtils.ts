/**
 * Utility functions for date formatting and manipulation
 */

/**
 * Format timestamp to readable date string
 */
export const formatTimestamp = (timestamp: number): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  // If today, show time only
  if (diffInDays === 0) {
    return date.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  // If yesterday, show "Hôm qua"
  if (diffInDays === 1) {
    return 'Hôm qua';
  }

  // If this week, show day name
  if (diffInDays < 7) {
    return date.toLocaleDateString('vi-VN', {
      weekday: 'long',
    });
  }

  // If this year, show date without year
  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
    });
  }

  // Show full date
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

/**
 * Format timestamp to relative time string (e.g., "2 phút trước")
 */
export const formatRelativeTime = (timestamp: number): string => {
  const now = new Date().getTime();
  const diffInMs = now - timestamp;
  const diffInSeconds = Math.floor(diffInMs / 1000);
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);
  const diffInWeeks = Math.floor(diffInDays / 7);
  const diffInMonths = Math.floor(diffInDays / 30);
  const diffInYears = Math.floor(diffInDays / 365);

  if (diffInSeconds < 60) {
    return 'Vừa xong';
  }

  if (diffInMinutes < 60) {
    return `${diffInMinutes} phút trước`;
  }

  if (diffInHours < 24) {
    return `${diffInHours} giờ trước`;
  }

  if (diffInDays < 7) {
    return `${diffInDays} ngày trước`;
  }

  if (diffInWeeks < 4) {
    return `${diffInWeeks} tuần trước`;
  }

  if (diffInMonths < 12) {
    return `${diffInMonths} tháng trước`;
  }

  return `${diffInYears} năm trước`;
};

/**
 * Format timestamp to detailed string
 */
export const formatDetailedTimestamp = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

/**
 * Check if timestamp is today
 */
export const isToday = (timestamp: number): boolean => {
  const date = new Date(timestamp);
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
};

/**
 * Check if timestamp is yesterday
 */
export const isYesterday = (timestamp: number): boolean => {
  const date = new Date(timestamp);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return (
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear()
  );
};

/**
 * Check if timestamp is this week
 */
export const isThisWeek = (timestamp: number): boolean => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  return diffInDays >= 0 && diffInDays < 7;
};

/**
 * Get start of day timestamp
 */
export const getStartOfDay = (timestamp: number): number => {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
};

/**
 * Get end of day timestamp
 */
export const getEndOfDay = (timestamp: number): number => {
  const date = new Date(timestamp);
  date.setHours(23, 59, 59, 999);
  return date.getTime();
};

/**
 * Get date range for filtering
 */
export const getDateRange = (period: 'today' | 'yesterday' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth'): { start: Date; end: Date } => {
  const now = new Date();
  const start = new Date();
  const end = new Date();

  switch (period) {
    case 'today':
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;

    case 'yesterday':
      start.setDate(now.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      end.setDate(now.getDate() - 1);
      end.setHours(23, 59, 59, 999);
      break;

    case 'thisWeek':
      const dayOfWeek = now.getDay();
      start.setDate(now.getDate() - dayOfWeek);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;

    case 'lastWeek':
      const lastWeekStart = now.getDate() - now.getDay() - 7;
      start.setDate(lastWeekStart);
      start.setHours(0, 0, 0, 0);
      end.setDate(lastWeekStart + 6);
      end.setHours(23, 59, 59, 999);
      break;

    case 'thisMonth':
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(now.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
      break;

    case 'lastMonth':
      start.setMonth(now.getMonth() - 1, 1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(now.getMonth(), 0);
      end.setHours(23, 59, 59, 999);
      break;

    default:
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
  }

  return { start, end };
};

/**
 * Format duration in milliseconds to human readable string
 */
export const formatDuration = (durationMs: number): string => {
  const seconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days} ngày ${hours % 24} giờ`;
  }

  if (hours > 0) {
    return `${hours} giờ ${minutes % 60} phút`;
  }

  if (minutes > 0) {
    return `${minutes} phút ${seconds % 60} giây`;
  }

  return `${seconds} giây`;
};

/**
 * Parse date string to timestamp
 */
export const parseDateString = (dateString: string): number => {
  const date = new Date(dateString);
  return date.getTime();
};

/**
 * Validate date range
 */
export const isValidDateRange = (start: Date, end: Date): boolean => {
  return start <= end;
};

/**
 * Get timezone offset in hours
 */
export const getTimezoneOffset = (): number => {
  return new Date().getTimezoneOffset() / 60;
};

/**
 * Convert timestamp to ISO string
 */
export const toISOString = (timestamp: number): string => {
  return new Date(timestamp).toISOString();
};

/**
 * Convert ISO string to timestamp
 */
export const fromISOString = (isoString: string): number => {
  return new Date(isoString).getTime();
};