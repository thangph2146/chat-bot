// ===== UI COMPONENT TYPES =====

/**
 * Chat layout configuration
 */
export interface ChatLayoutConfig {
  showSidebar: boolean;
  sidebarWidth: number;
  showHeader: boolean;
  showFooter: boolean;
  compactMode: boolean;
  theme: 'light' | 'dark' | 'auto';
}

/**
 * Message bubble configuration
 */
export interface MessageBubbleConfig {
  maxWidth: string;
  showAvatar: boolean;
  showTimestamp: boolean;
  showStatus: boolean;
  enableActions: boolean;
  animateEntry: boolean;
}

/**
 * Input area configuration
 */
export interface InputAreaConfig {
  placeholder: string;
  maxLength: number;
  showCharCount: boolean;
  enableMarkdownPreview: boolean;
  enableFileUpload: boolean;
  enableVoiceInput: boolean;
  autoResize: boolean;
}

/**
 * Toolbar configuration
 */
export interface ToolbarConfig {
  showClearButton: boolean;
  showHistoryButton: boolean;
  showSettingsButton: boolean;
  showExportButton: boolean;
  customButtons?: ToolbarButton[];
}

/**
 * Custom toolbar button
 */
export interface ToolbarButton {
  id: string;
  label: string;
  icon?: React.ComponentType;
  onClick: () => void;
  disabled?: boolean;
  tooltip?: string;
}

/**
 * Modal state management
 */
export interface ModalState {
  isOpen: boolean;
  type: ModalType;
  data?: unknown;
}

/**
 * Modal types
 */
export type ModalType = 
  | 'confirm-delete'
  | 'edit-message'
  | 'conversation-settings'
  | 'export-chat'
  | 'import-chat'
  | 'user-settings';

/**
 * Toast notification
 */
export interface ToastNotification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

/**
 * Loading states
 */
export interface LoadingState {
  global: boolean;
  sending: boolean;
  loading: boolean;
  regenerating: boolean;
  deleting: string | null;
  editing: string | null;
}

/**
 * Scroll behavior
 */
export interface ScrollBehavior {
  autoScroll: boolean;
  scrollToBottom: boolean;
  smoothScroll: boolean;
  scrollThreshold: number;
}

/**
 * Keyboard shortcuts
 */
export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  action: () => void;
  description: string;
}

/**
 * Responsive breakpoints
 */
export interface ResponsiveConfig {
  mobile: number;
  tablet: number;
  desktop: number;
  wide: number;
}

/**
 * Animation configuration
 */
export interface AnimationConfig {
  enableTransitions: boolean;
  duration: number;
  easing: string;
  stagger: number;
}

/**
 * Accessibility configuration
 */
export interface AccessibilityConfig {
  enableScreenReader: boolean;
  enableKeyboardNavigation: boolean;
  enableHighContrast: boolean;
  fontSize: 'small' | 'medium' | 'large' | 'extra-large';
  reducedMotion: boolean;
}